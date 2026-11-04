-- Star Catcher: the database for the public top-10 leaderboard.
-- Paste this whole file into Supabase → SQL Editor → New query, then press Run.
-- It's safe to run again: it only creates what's missing and replaces the policies.

-- 1. The scores table. Each "constraint … check" is a rule the database enforces on every new score,
--    even if someone skips the game and sends a score straight to the database.
create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text not null,
  score      integer not null,
  constraint name_is_1_to_12_characters check (char_length(name) between 1 and 12),
  constraint name_has_only_letters_numbers_spaces check (name ~ '^[A-Za-z0-9À-ÖØ-öø-ÿ ]+$'),
  constraint name_has_no_spaces_at_the_ends check (name = btrim(name)),
  constraint score_is_0_to_100000 check (score between 0 and 100000)
);

-- Makes "the top 10" quick to find, even with thousands of scores.
create index if not exists scores_top_10 on public.scores (score desc, created_at);

-- 2. Row Level Security (RLS): once it's on, nobody can do anything through the API
--    unless a policy below allows it.
alter table public.scores enable row level security;

-- 3. Let players read and add scores through the API. (Many Supabase projects allow this by default.
--    Writing it here makes it work in every project.) The policies below still decide what's allowed.
grant select, insert on table public.scores to anon, authenticated;

-- 4. The policies.
-- Who can do what: anyone can read every score, so the game can show the top 10.
drop policy if exists "Anyone can read scores" on public.scores;
create policy "Anyone can read scores"
  on public.scores for select
  to anon, authenticated
  using (true);

-- Who can do what: anyone can add a score, stamped with the time it really arrived (no backdating).
drop policy if exists "Anyone can add a score" on public.scores;
create policy "Anyone can add a score"
  on public.scores for insert
  to anon, authenticated
  with check (created_at > now() - interval '1 minute' and created_at <= now());

-- There is no update or delete policy, on purpose: nobody can change or remove a score through the API,
-- not even their own. You, the owner, can delete scores (rude names, obvious cheats) in Supabase →
-- Table Editor → scores. The dashboard isn't limited by these policies.
