// Wires everything together: the canvas, the screens, the buttons and the leaderboard.
// The game itself is in src/game.js, the art in src/draw.js and the controls in src/input.js.
import { LOCAL_MODE } from "./config.js";
import { RULES, addPoints, missStar, pauseRound, resizeGame, resumeRound, runGame, startRound, state, whenStateChanges } from "./game.js";
import { listenForInput } from "./input.js";
import { isSoundOn, setSoundOn } from "./sound.js";
import { showLeaderboard } from "./leaderboard.js";
import { bestScore, lastName, rememberName, saveIfBest, saveScore } from "./store.js";
import { MAX_SCORE, cleanName, nameProblem } from "./names.js";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#canvas");
const nameInput = $("#player-name");
const screens = { ready: $("#start-screen"), paused: $("#pause-screen"), over: $("#over-screen") };

if (LOCAL_MODE) {
  const banner = document.createElement("aside");
  banner.className = "local-banner";
  banner.setAttribute("aria-label", "Local mode");
  banner.textContent = "Local mode: data is saved in this browser only. Connect Supabase in Week 4.";
  document.body.prepend(banner);
}

// ---------- The canvas, sharp on every screen ----------
// High-DPI phones have 2 or 3 real pixels for every CSS pixel. The canvas gets all of them,
// and we draw in CSS pixels, so shapes and text stay crisp instead of blurry.
const context = canvas.getContext("2d");
function fitCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  resizeGame(width, height);
}
new ResizeObserver(fitCanvas).observe(canvas);
fitCanvas();

listenForInput(canvas, { onPauseKey: togglePause });
runGame(context);

// ---------- The score display and the screens ----------
let shownMode = null;
whenStateChanges(render);
render(state);
showLeaderboard();

function render(current) {
  $("#score").textContent = current.score;
  $("#best").textContent = Math.max(bestScore(), current.score);
  const livesLeft = Math.max(RULES.lives - current.misses, 0);
  $("#lives").textContent = "★".repeat(livesLeft) + "☆".repeat(RULES.lives - livesLeft);
  $("#lives").setAttribute("aria-label", `${livesLeft} ${livesLeft === 1 ? "life" : "lives"} left`);
  $("#pause-button").disabled = current.mode !== "playing" && current.mode !== "paused";

  if (current.mode === shownMode) return;
  shownMode = current.mode;
  for (const [mode, screen] of Object.entries(screens)) screen.hidden = mode !== current.mode;
  if (current.mode === "paused") $("#resume-button").focus();
  if (current.mode === "playing") document.activeElement?.blur(); // so the keys go to the game
  if (current.mode === "over") finishRound();
}

function togglePause() {
  if (state.mode === "playing") pauseRound();
  else if (state.mode === "paused") resumeRound();
}

// Pause by itself when the player switches tabs or windows.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseRound();
});
window.addEventListener("blur", pauseRound);

// ---------- Buttons ----------
$("#play-button").addEventListener("click", startRound);
$("#again-button").addEventListener("click", startRound);
$("#resume-button").addEventListener("click", resumeRound);
$("#pause-button").addEventListener("click", togglePause);

$("#sound-button").addEventListener("click", () => {
  setSoundOn(!isSoundOn());
  $("#sound-button").setAttribute("aria-pressed", String(isSoundOn()));
});

// ---------- The end of a round: best score, name and leaderboard ----------
function finishRound() {
  const score = state.score;
  const isNewBest = saveIfBest(score);
  $("#final-score").textContent = score;
  $("#final-unit").textContent = score === 1 ? "star" : "stars";
  $("#new-best").hidden = !isNewBest;
  $("#score-form").hidden = score === 0; // nothing to save for 0 stars
  $("#no-score").hidden = score > 0;
  $("#save-message").textContent = "";
  $("#announcer").textContent = `Round over. You caught ${score} ${score === 1 ? "star" : "stars"}.`;
  nameInput.value = lastName();
  showNameError("");
  showLeaderboard();
  (score > 0 ? nameInput : $("#again-button")).focus();
}

$("#score-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = cleanName(nameInput.value);
  const problem = nameProblem(name);
  showNameError(problem || "");
  if (problem) {
    nameInput.focus();
    return;
  }
  if (state.score > MAX_SCORE) {
    $("#save-message").textContent = `Wow! Scores above ${MAX_SCORE} can't go on the leaderboard.`;
    return;
  }

  const saveButton = $("#save-button");
  saveButton.disabled = true;
  $("#save-message").textContent = "Saving…";
  try {
    await saveScore(name, state.score);
    rememberName(name);
    $("#score-form").hidden = true;
    const onTopTen = await showLeaderboard({ name, score: state.score });
    $("#save-message").textContent = onTopTen ? "Saved! You're in the top 10." : "Saved! Not in the top 10 this time. Keep trying!";
    $("#again-button").focus();
  } catch (error) {
    $("#save-message").textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
});

function showNameError(text) {
  $("#name-error").textContent = text;
  $("#name-error").hidden = !text;
  if (text) nameInput.setAttribute("aria-invalid", "true");
  else nameInput.removeAttribute("aria-invalid");
}

// ---------- For automated tests only ----------
// tests/smoke.cjs uses window.__game to play a round without a person at the keyboard.
// It can't do anything a player couldn't already do with the browser's developer tools.
window.__game = {
  start: startRound,
  forceMiss: missStar,
  addPoints,
  state: () => ({ mode: state.mode, score: state.score, misses: state.misses, speedUps: state.speedUps, basketX: state.basket.x }),
};
