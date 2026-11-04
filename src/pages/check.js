// The Permission check page (Week 5). It uses the same public key as your game, so it can only do
// what any player could do. Each line passes when the database answers the way your policies in
// supabase/setup.sql say it should. It never saves a valid score, so your leaderboard stays clean.
import { LOCAL_MODE } from "../config.js";
import { supabase } from "../supabase.js";

const scores = () => supabase.from("scores");

// "Refused" means the database said no: a security rule (42501) or a check constraint (23514).
const refused = (error) => error && (error.code === "42501" || error.code === "23514");
const refusedText = ({ error }) => (error ? `Refused: ${error.message}` : "It was saved! Delete it in the Table Editor, then check setup.sql.");

let rowsOnBoard = 0; // how many scores the first check could read

const CHECKS = [
  {
    title: "A player can read the leaderboard",
    run: () => scores().select("name, score").order("score", { ascending: false }).limit(10),
    passes: ({ data, error }) => !error && Array.isArray(data),
    explain: ({ data, error }) => {
      if (error) return error.message;
      rowsOnBoard = data.length;
      return `The database sent back ${data.length} ${data.length === 1 ? "score" : "scores"}.`;
    },
  },
  {
    title: "A player can't save a 13-character name",
    run: () => scores().insert({ name: "Thirteen char", score: 1 }),
    passes: ({ error }) => refused(error),
    explain: refusedText,
  },
  {
    title: "A player can't save a negative score",
    run: () => scores().insert({ name: "Check", score: -1 }),
    passes: ({ error }) => refused(error),
    explain: refusedText,
  },
  {
    title: "A player can't save a score over 100000",
    run: () => scores().insert({ name: "Check", score: 100001 }),
    passes: ({ error }) => refused(error),
    explain: refusedText,
  },
  {
    title: "A player can't backdate a score",
    run: () => scores().insert({ name: "Check", score: 0, created_at: "2020-01-01T00:00:00Z" }),
    passes: ({ error }) => refused(error),
    explain: refusedText,
  },
  {
    title: "A player can't change scores",
    run: () => scores().update({ score: 99999 }, { count: "exact" }).gte("score", 0),
    passes: ({ error, count }) => rowsOnBoard > 0 && (refused(error) || (!error && count === 0)),
    explain: (result) => countExplanation(result, "changed", "update"),
  },
  {
    title: "A player can't delete scores",
    run: () => scores().delete({ count: "exact" }).gte("score", 0),
    passes: ({ error, count }) => rowsOnBoard > 0 && (refused(error) || (!error && count === 0)),
    explain: (result) => countExplanation(result, "deleted", "delete"),
  },
];

function countExplanation({ error, count }, verb, command) {
  if (rowsOnBoard === 0) return "Can't tell yet: the leaderboard is empty. Play a round, save a score, then run the check again.";
  if (error) return `Refused: ${error.message}`;
  if (count === 0) return `0 scores were ${verb}.`;
  if (count === null || count === undefined) return `The database didn't say how many scores were ${verb}. Check the scores in the Table Editor.`;
  return `${count} scores were ${verb}! Remove the ${command} policy on scores.`;
}

document.querySelector(LOCAL_MODE ? "#check-local" : "#check-ready").hidden = false;
document.querySelector("#run-check").addEventListener("click", runChecks);

async function runChecks() {
  const button = document.querySelector("#run-check");
  const list = document.querySelector("#check-results");
  list.replaceChildren();
  button.disabled = true;

  let allPassed = true;
  for (const check of CHECKS) {
    let result;
    try {
      result = await check.run();
    } catch (error) {
      result = { error: { message: error.message } };
    }
    const passed = check.passes(result);
    allPassed &&= passed;
    list.append(resultLine(check.title, passed, check.explain(result)));
    if (!passed && check === CHECKS[0]) break; // if the leaderboard can't be read, nothing else can be checked
  }

  const summary = document.querySelector("#check-summary");
  summary.textContent = allPassed
    ? "All checks passed. Players can read and add scores, within the limits, and nothing else."
    : "Some checks didn't pass. Read each line, compare your policies with supabase/setup.sql, and see docs/week-05-permissions.md.";
  summary.hidden = false;
  button.disabled = false;
}

function resultLine(title, passed, detail) {
  const item = document.createElement("li");
  item.className = passed ? "pass" : "fail";
  const label = document.createElement("strong");
  label.textContent = passed ? "Pass: " : "Fail: ";
  const text = document.createElement("span");
  text.textContent = `${title}. ${detail}`;
  item.append(label, text);
  return item;
}
