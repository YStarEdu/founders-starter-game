// STAR CATCHER: the game itself. Stars fall from the top, you move the basket,
// each star you catch is a point, and three misses end the round.
// Change RULES to change how it plays. Change src/draw.js to change how it looks.
import { input } from "./input.js";
import { drawScene } from "./draw.js";
import { sounds } from "./sound.js";

// ---------- 1. Rules: change these numbers to change the game ----------
export const RULES = {
  lives: 3, // misses allowed before the round ends
  pointsPerStar: 1, // points for each star you catch
  speedUpEvery: 10, // the game gets faster every 10 points
  speedUpBy: 1.15, // each speed-up makes stars 15% faster and 15% more frequent
  maxSpeedUps: 15, // after this many speed-ups, the speed stays the same
  fallTime: 3.2, // seconds a star takes to fall the whole screen at the start
  spawnEvery: 1.1, // seconds between new stars at the start
  basketSpeed: 1.3, // how fast the arrow keys move the basket, in screen widths per second
};

// ---------- 2. State: everything about the round being played right now ----------
export const state = {
  mode: "ready", // "ready" (start screen), "playing", "paused" or "over"
  score: 0,
  misses: 0,
  speedUps: 0, // how many times the game has sped up this round
  stars: [], // falling stars: { x, y, radius, speed, spin, checked }
  sparkles: [], // little bursts when you catch a star
  message: null, // a short message on screen, like "Faster!"
  basket: { x: 0, y: 0, width: 0, height: 0 }, // x is the middle, y is the top edge
  nextStarIn: 0, // seconds until the next star appears
  width: 0, // size of the play area, in CSS pixels
  height: 0,
};

// Where new stars' positions come from. (The Week 7 daily challenge recipe swaps this.)
let random = Math.random;

// main.js listens for changes, to update the score and show the right screen.
let notify = () => {};
export function whenStateChanges(callback) {
  notify = callback;
}

// ---------- 3. Starting, pausing and ending a round ----------
export function startRound() {
  Object.assign(state, { mode: "playing", score: 0, misses: 0, speedUps: 0, stars: [], sparkles: [], message: null, nextStarIn: 0.6 });
  state.basket.x = state.width / 2;
  notify(state);
}

export function pauseRound() {
  if (state.mode !== "playing") return;
  state.mode = "paused";
  notify(state);
}

export function resumeRound() {
  if (state.mode !== "paused") return;
  state.mode = "playing";
  notify(state);
}

function endRound() {
  state.mode = "over";
  state.message = null;
  sounds.roundOver();
  notify(state);
}

// ---------- 4. Points and misses ----------
export function addPoints(points) {
  if (state.mode !== "playing") return;
  state.score += points;
  const speedUps = Math.min(Math.floor(state.score / RULES.speedUpEvery), RULES.maxSpeedUps);
  if (speedUps > state.speedUps) {
    state.speedUps = speedUps;
    state.message = { text: "Faster!", timeLeft: 1.2 };
    sounds.speedUp();
  }
  notify(state);
}

export function missStar() {
  if (state.mode !== "playing") return;
  state.misses += 1;
  sounds.miss();
  if (state.misses >= RULES.lives) endRound();
  else notify(state);
}

// ---------- 5. The game loop: draws a new picture about 60 times a second ----------
let context;
let lastTime = null;

export function runGame(canvasContext) {
  context = canvasContext;
  requestAnimationFrame(frame);
}

function frame(time) {
  // Seconds since the last picture. Capped, so the game doesn't jump ahead after you switch tabs.
  const seconds = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  if (state.mode === "playing") update(seconds);
  drawScene(context, state, time / 1000);
  requestAnimationFrame(frame);
}

// One step of the game: move the basket, add new stars, move the stars, and check catches and misses.
function update(seconds) {
  moveBasket(seconds);

  state.nextStarIn -= seconds;
  if (state.nextStarIn <= 0) {
    addStar();
    state.nextStarIn = RULES.spawnEvery / speedFactor();
  }

  const fallSpeed = (state.height / RULES.fallTime) * speedFactor(); // pixels per second
  for (const star of state.stars) {
    star.y += fallSpeed * star.speed * seconds;
    star.spin += seconds * 2;

    // When a star reaches the basket's rim, it's either caught or it keeps falling.
    if (!star.checked && star.y + star.radius >= state.basket.y) {
      star.checked = true;
      if (Math.abs(star.x - state.basket.x) <= state.basket.width / 2) {
        star.caught = true;
        burst(star.x, state.basket.y);
        sounds.catch();
        addPoints(RULES.pointsPerStar);
      }
    }
    // A star that falls past the bottom of the screen is a miss.
    if (!star.caught && star.y - star.radius > state.height) {
      star.gone = true;
      missStar();
    }
  }
  state.stars = state.stars.filter((star) => !star.caught && !star.gone);

  updateSparkles(seconds);
  if (state.message) {
    state.message.timeLeft -= seconds;
    if (state.message.timeLeft <= 0) state.message = null;
  }
}

// 1 at the start, then 1.15, 1.32, 1.52… after each speed-up.
function speedFactor() {
  return RULES.speedUpBy ** state.speedUps;
}

function addStar() {
  const radius = starRadius();
  state.stars.push({
    x: radius + random() * (state.width - radius * 2),
    y: -radius,
    radius,
    speed: 0.85 + random() * 0.3, // some stars fall a little faster than others
    spin: random() * Math.PI,
    checked: false,
  });
}

function moveBasket(seconds) {
  const basket = state.basket;
  const step = RULES.basketSpeed * state.width * seconds;
  if (input.left || input.right) {
    basket.x += (input.right ? step : 0) - (input.left ? step : 0);
  } else if (input.pointerX !== null) {
    // Glide toward the finger or mouse, a bit faster than the keys.
    const distance = input.pointerX - basket.x;
    basket.x += Math.sign(distance) * Math.min(Math.abs(distance), step * 2);
  }
  basket.x = clamp(basket.x, basket.width / 2, state.width - basket.width / 2);
}

// A burst of sparkles where a star was caught. They fly out, fall and fade.
function burst(x, y) {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    state.sparkles.push({ x, y, speedX: Math.cos(angle) * speed, speedY: Math.sin(angle) * speed - 80, life: 0.6 });
  }
}

function updateSparkles(seconds) {
  for (const sparkle of state.sparkles) {
    sparkle.x += sparkle.speedX * seconds;
    sparkle.y += sparkle.speedY * seconds;
    sparkle.speedY += 320 * seconds; // gravity
    sparkle.life -= seconds;
  }
  state.sparkles = state.sparkles.filter((sparkle) => sparkle.life > 0);
}

// ---------- 6. Screen size ----------
// Called when the game starts and whenever the screen changes size (for example, turning a phone).
export function resizeGame(width, height) {
  const scaleX = state.width ? width / state.width : 1;
  const scaleY = state.height ? height / state.height : 1;
  for (const star of state.stars) {
    star.x *= scaleX;
    star.y *= scaleY;
  }
  state.basket.x = state.width ? state.basket.x * scaleX : width / 2;
  state.width = width;
  state.height = height;

  // Sizes grow with the screen, within limits, so the game feels about the same on a phone and a laptop.
  state.basket.width = clamp(width * 0.22, 72, 130);
  state.basket.height = state.basket.width * 0.45;
  state.basket.y = height - state.basket.height - 28;
}

function starRadius() {
  return clamp(state.width * 0.04, 12, 22);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
