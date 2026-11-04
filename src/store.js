// The data layer: the only file that knows where scores are saved.
// Local mode: in this browser (localStorage). Supabase mode: in the scores table of your database.
// main.js calls these functions the same way in both modes.
import { LOCAL_MODE } from "./config.js";
import { supabase } from "./supabase.js";
import { readJSON, writeJSON } from "./storage.js";

const LOCAL_SCORES_KEY = "star-catcher-scores";
const BEST_KEY = "star-catcher-best";
const NAME_KEY = "star-catcher-name";

// ---------- Your best score and name: always saved in this browser ----------
export function bestScore() {
  return Number(readJSON(BEST_KEY, 0)) || 0;
}

// Saves the score if it beats your best. Returns true when it's a new best.
export function saveIfBest(score) {
  if (score <= bestScore()) return false;
  writeJSON(BEST_KEY, score);
  return true;
}

export function lastName() {
  return readJSON(NAME_KEY, "");
}

export function rememberName(name) {
  writeJSON(NAME_KEY, name);
}

// ---------- The top 10 ----------
// Highest score first. When two scores are equal, the one saved first goes higher.
export async function topScores() {
  if (LOCAL_MODE) return readJSON(LOCAL_SCORES_KEY, []);
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);
  if (error) {
    console.error("The leaderboard didn't load:", error); // details for you, in the browser Console
    throw new Error("The leaderboard couldn't load. Check your connection and try again.");
  }
  return data;
}

// Saves one score. If it fails, it throws an Error whose message you can show to the player.
export async function saveScore(name, score) {
  if (LOCAL_MODE) {
    const scores = readJSON(LOCAL_SCORES_KEY, []);
    scores.push({ name, score, created_at: new Date().toISOString() });
    scores.sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at));
    if (!writeJSON(LOCAL_SCORES_KEY, scores.slice(0, 10))) {
      throw new Error("Your browser didn't let the game save the score. Try a normal (not private) window.");
    }
    return;
  }
  const { error } = await supabase.from("scores").insert({ name, score });
  if (error) {
    console.error("The score wasn't saved:", error);
    throw new Error(friendlyMessage(error));
  }
}

// Turns a database error into words a player understands.
function friendlyMessage(error) {
  const text = `${error.code || ""} ${error.message || ""}`;
  if (error.code === "23514") return "That name or score isn't allowed. Use 1 to 12 letters, numbers or spaces.";
  if (/row-level security/i.test(text)) return "The leaderboard refused this score.";
  if (/fetch|network/i.test(text)) return "Couldn't reach the leaderboard. Check your connection and try again.";
  return "The leaderboard isn't working right now. Please try again later.";
}
