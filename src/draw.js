// THE ART: how Star Catcher looks. Change THEME for new colours, or change the draw functions
// below for new shapes. Everything is drawn in CSS pixels: (0, 0) is the top-left corner.

export const THEME = {
  skyTop: "#081633",
  skyBottom: "#1c3d7a",
  backgroundStar: "#ffffff",
  star: "#ffd54a",
  starGlow: "rgba(255, 213, 74, 0.7)",
  basket: "#d9823b",
  basketDark: "#9c5420",
  sparkle: "#fff3b0",
  message: "#ffffff",
  font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

// Draws one whole picture of the game. game.js calls this about 60 times a second.
export function drawScene(ctx, state, time) {
  drawSky(ctx, state.width, state.height, time);
  for (const star of state.stars) drawStar(ctx, star.x, star.y, star.radius, star.spin);
  drawSparkles(ctx, state.sparkles);
  drawBasket(ctx, state.basket);
  if (state.message) drawMessage(ctx, state.message.text, state.width, state.height);
}

// ---------- The night sky, with tiny twinkling stars in the background ----------
let sky = { width: 0, height: 0, dots: [] };

function drawSky(ctx, width, height, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, THEME.skyTop);
  gradient.addColorStop(1, THEME.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (sky.width !== width || sky.height !== height) sky = makeSky(width, height);
  ctx.fillStyle = THEME.backgroundStar;
  for (const dot of sky.dots) {
    ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(time * dot.twinkle + dot.phase));
    ctx.fillRect(dot.x, dot.y, dot.size, dot.size);
  }
  ctx.globalAlpha = 1;
}

function makeSky(width, height) {
  const dots = [];
  const count = Math.round((width * height) / 4000);
  for (let i = 0; i < count; i++) {
    dots.push({ x: Math.random() * width, y: Math.random() * height, size: Math.random() < 0.8 ? 1 : 2, phase: Math.random() * 6, twinkle: 0.5 + Math.random() });
  }
  return { width, height, dots };
}

// ---------- A falling star: five points, with a soft glow ----------
function drawStar(ctx, x, y, radius, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let point = 0; point < 10; point++) {
    const distance = point % 2 === 0 ? radius : radius * 0.45; // outer tip, then inner corner
    const angle = (Math.PI / 5) * point - Math.PI / 2;
    ctx.lineTo(Math.cos(angle) * distance, Math.sin(angle) * distance);
  }
  ctx.closePath();
  ctx.shadowColor = THEME.starGlow;
  ctx.shadowBlur = radius;
  ctx.fillStyle = THEME.star;
  ctx.fill();
  ctx.restore();
}

// ---------- The basket: a bowl with woven stripes and a rim ----------
function drawBasket(ctx, basket) {
  const { x, y, width, height } = basket;
  const left = x - width / 2;

  ctx.fillStyle = THEME.basket;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(left + width, y);
  ctx.lineTo(left + width * 0.85, y + height);
  ctx.lineTo(left + width * 0.15, y + height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = THEME.basketDark;
  ctx.lineWidth = 2;
  for (let stripe = 1; stripe <= 2; stripe++) {
    const stripeY = y + (height * stripe) / 3;
    const inset = (width * 0.15 * stripe) / 3;
    ctx.beginPath();
    ctx.moveTo(left + inset, stripeY);
    ctx.lineTo(left + width - inset, stripeY);
    ctx.stroke();
  }

  ctx.fillStyle = THEME.basketDark;
  ctx.fillRect(left - 4, y - 5, width + 8, 8);
}

// ---------- Sparkles when you catch a star ----------
function drawSparkles(ctx, sparkles) {
  ctx.fillStyle = THEME.sparkle;
  for (const sparkle of sparkles) {
    ctx.globalAlpha = Math.max(sparkle.life / 0.6, 0);
    ctx.beginPath();
    ctx.arc(sparkle.x, sparkle.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- A big message in the middle, like "Faster!" ----------
function drawMessage(ctx, text, width, height) {
  ctx.font = `700 32px ${THEME.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
  ctx.strokeText(text, width / 2, height * 0.4);
  ctx.fillStyle = THEME.message;
  ctx.fillText(text, width / 2, height * 0.4);
}
