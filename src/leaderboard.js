// Shows the top 10 in every list on the page with the class "leaderboard".
import { topScores } from "./store.js";

// Loads the scores and shows them. `you` ({ name, score }) highlights the player's new entry.
// Returns true if that entry made the top 10.
export async function showLeaderboard(you = null) {
  const lists = document.querySelectorAll(".leaderboard");
  for (const list of lists) setMessage(list, "Loading…");
  let scores;
  try {
    scores = await topScores();
  } catch (error) {
    for (const list of lists) setMessage(list, error.message);
    return false;
  }
  let onTopTen = false;
  for (const list of lists) onTopTen = fill(list, scores, you);
  return onTopTen;
}

function fill(list, scores, you) {
  list.replaceChildren();
  if (scores.length === 0) {
    setMessage(list, "No scores yet. Be the first!");
    return false;
  }
  let highlighted = false;
  for (const entry of scores) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = entry.name; // textContent, never innerHTML: a name is shown as plain text
    const score = document.createElement("span");
    score.className = "leaderboard-score";
    score.textContent = entry.score;
    item.append(name, score);
    if (you && !highlighted && entry.name === you.name && entry.score === you.score) {
      item.classList.add("is-you");
      highlighted = true;
    }
    list.append(item);
  }
  return highlighted;
}

function setMessage(list, text) {
  const item = document.createElement("li");
  item.className = "leaderboard-message";
  item.textContent = text;
  list.replaceChildren(item);
}
