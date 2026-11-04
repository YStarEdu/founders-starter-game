// Policy test: loads supabase/setup.sql into PGlite (a real Postgres that runs inside Node, no internet needed),
// then acts as a player and checks every rule both ways: what's allowed works, what isn't is refused.
// Run it with: npm test   (or on its own: node tests/policies.mjs)
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const setupSql = readFileSync(new URL("../supabase/setup.sql", import.meta.url), "utf8");

// A small stand-in for what every Supabase project already has: the anon role (players who aren't
// signed in), the authenticated role (signed-in users), the auth schema and the storage tables.
const SUPABASE_STUB = `
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean not null default false);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets, name text not null);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant all on storage.buckets, storage.objects to anon, authenticated;
`;

// Many Supabase projects give anon and authenticated every privilege on new tables, and leave the
// real decisions to Row Level Security. Newer projects may not. We test both setups.
const DEFAULT_GRANTS = `
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`;

let passed = 0;
let failed = 0;

for (const withDefaultGrants of [true, false]) {
  console.log(withDefaultGrants ? "\nA project with Supabase's default grants" : "\nA project without default grants");
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  if (withDefaultGrants) await db.exec(DEFAULT_GRANTS);
  await loadSetupSql(db, "first");
  await loadSetupSql(db, "second"); // running the file again (after a change, say) must work too

  // Runs SQL as a player (role anon) or a signed-in user (role authenticated), inside a transaction.
  const as = (role, sql, params = []) =>
    db.transaction(async (tx) => {
      await tx.exec(`set local role ${role}`);
      return tx.query(sql, params);
    });
  const addScore = (role, name, score) => as(role, "insert into public.scores (name, score) values ($1, $2)", [name, score]);

  await allowed("a player can save a score", () => addScore("anon", "Ava", 42));
  await allowed("a signed-in user can save a score", () => addScore("authenticated", "Ben", 17));
  await allowed("a 12-character name is fine", () => addScore("anon", "Twelve chars", 5));
  await allowed("accented letters and spaces are fine", () => addScore("anon", "Zoé François", 64));
  await allowed("a score of 0 is fine", () => addScore("anon", "Cy", 0));
  await allowed("a score of 100000 is fine", () => addScore("anon", "Max", 100000));

  await refused("a 13-character name", () => addScore("anon", "Thirteen char", 5));
  await refused("an empty name", () => addScore("anon", "", 5));
  await refused("a name with symbols", () => addScore("anon", "<b>hi</b>", 5));
  await refused("a name with an emoji", () => addScore("anon", "Ava ⭐", 5));
  await refused("a name that starts with a space", () => addScore("anon", " Ava", 5));
  await refused("a negative score", () => addScore("anon", "Dee", -1));
  await refused("a score over 100000", () => addScore("anon", "Eve", 100001));
  await refused("a backdated score", () =>
    as("anon", "insert into public.scores (name, score, created_at) values ('Old', 5, '2020-01-01')"));
  await refused("a score dated in the future", () =>
    as("anon", "insert into public.scores (name, score, created_at) values ('Soon', 5, now() + interval '1 day')"));

  const scoresBefore = await count();
  for (const role of ["anon", "authenticated"]) {
    const who = role === "anon" ? "a player" : "a signed-in user";
    await check(`${who} can read every score`, async () => {
      expectEqual((await as(role, "select name, score from public.scores")).rows.length, scoresBefore);
    });
    await check(`${who} gets the top 10 in order`, async () => {
      const result = await as(role, "select name, score from public.scores order by score desc, created_at asc limit 10");
      expectEqual(result.rows.map((row) => row.name).slice(0, 3), ["Max", "Zoé François", "Ava"]);
    });
    await nothingChanged(`${who} can't change scores`, () => as(role, "update public.scores set score = 99999"));
    await nothingChanged(`${who} can't change their own score`, () => as(role, "update public.scores set score = 99999 where name = 'Ava'"));
    await nothingChanged(`${who} can't delete scores`, () => as(role, "delete from public.scores"));
  }

  await check("no score was changed or deleted", async () => {
    expectEqual(await count(), scoresBefore);
    expectEqual((await db.query("select count(*)::int as n from public.scores where score = 99999")).rows[0].n, 0);
  });

  await check("Row Level Security is on for every table", async () => {
    const result = await db.query("select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity");
    expectEqual(result.rows.map((row) => row.relname), []);
  });

  await check("scores has exactly two policies: select and insert", async () => {
    const result = await db.query("select cmd from pg_policies where schemaname = 'public' and tablename = 'scores' order by cmd");
    expectEqual(result.rows.map((row) => row.cmd), ["INSERT", "SELECT"]);
  });

  async function count() {
    return (await db.query("select count(*)::int as n from public.scores")).rows[0].n;
  }

  await db.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

// ---------- helpers ----------

// Runs supabase/setup.sql. If it fails, explains why in one line and stops.
async function loadSetupSql(db, time) {
  try {
    await db.exec(setupSql);
  } catch (error) {
    console.log(`  FAIL  supabase/setup.sql stopped with an error the ${time} time it ran: ${error.message}`);
    if (time === "second") console.log("        Tip: write 'drop policy if exists ...' before 'create policy ...', and 'if not exists' after 'create table'.");
    process.exit(1);
  }
}

// Runs one check and prints ok or FAIL. A check can return a short note to print after its name.
async function check(name, fn) {
  try {
    const note = await fn();
    passed++;
    console.log(`  ok    ${name}${note ? ` (${note})` : ""}`);
  } catch (error) {
    failed++;
    console.log("  FAIL ", name, "-", error.message);
  }
}

// The statement must work.
function allowed(name, fn) {
  return check(name, async () => {
    await fn();
  });
}

// The statement must be refused with an error. The note shows the database's reason.
function refused(name, fn) {
  return check(`refused: ${name}`, async () => {
    try {
      await fn();
    } catch (error) {
      return error.message.replace(/^new row (for relation "\w+" )?/, "").slice(0, 70);
    }
    throw new Error("expected the database to refuse this, but it was allowed");
  });
}

// An update or delete must either be refused or change 0 rows.
function nothingChanged(name, fn) {
  return check(name, async () => {
    let result;
    try {
      result = await fn();
    } catch (error) {
      return error.message.slice(0, 70);
    }
    if (result.affectedRows > 0) throw new Error(`expected 0 rows changed, but ${result.affectedRows} were`);
    return "0 rows changed";
  });
}

function expectEqual(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}
