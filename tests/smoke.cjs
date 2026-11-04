// Smoke test: builds the game in local mode, opens it in a real browser (Playwright) at phone size,
// plays a round with the keyboard and a finger, saves a name to the leaderboard,
// and fails if anything breaks or the Console shows an error.
// Run it with: npm test   (or on its own: node tests/smoke.cjs)
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.log("SKIPPED the browser smoke test: Playwright isn't installed on this computer.");
  console.log("To run it too: npm install --no-save playwright, then npx playwright install chromium");
  process.exit(0);
}

const root = path.join(__dirname, "..");
const vite = path.join(root, "node_modules", "vite", "bin", "vite.js");
const BANNER = "Local mode: data is saved in this browser only. Connect Supabase in Week 4.";

let failures = 0;

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  // Build a separate copy in local mode, so the test never sends anything to your real Supabase project.
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "star-catcher-smoke-"));
  const env = { ...process.env, VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "" };
  const build = spawnSync(process.execPath, [vite, "build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error"], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (build.status !== 0) throw new Error("vite build failed, so the smoke test can't run");

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [vite, "preview", "--outDir", outDir, "--port", String(port), "--strictPort", "--host", "127.0.0.1"], {
    cwd: root,
    env,
    stdio: "ignore",
  });

  try {
    await waitForServer(base);
    await runChecks(base);
  } finally {
    server.kill();
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  console.log(failures ? `\nSmoke test: ${failures} failed` : "\nSmoke test: all passed");
  process.exit(failures ? 1 : 0);
}

async function runChecks(base) {
  const browser = await chromium.launch();
  // A small, high-DPI phone with a touch screen.
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${page.url()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => consoleErrors.push(`${page.url()}: ${error.message}`));

  const game = () => page.evaluate(() => window.__game.state());
  const visible = (selector) => page.locator(selector).isVisible();
  const hold = async (key, ms) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
  };

  console.log("Start screen (at 360px, a small phone)");
  await step("the game loads with the start screen and the local-mode banner", async () => {
    const response = await page.goto(base + "/");
    expect(response.status() === 200, `the server answered ${response.status()}`);
    expect((await page.locator(".local-banner").innerText()) === BANNER, "the local-mode banner is missing");
    expect(await visible("#start-screen"), "the start screen isn't showing");
    expect((await game()).mode === "ready", "the game should wait on the start screen");
    expect((await page.locator("#start-screen .leaderboard").innerText()).includes("No scores yet"), "the empty leaderboard message is missing");
  });

  await step("the canvas fills the screen and is sharp on a high-DPI screen", async () => {
    const size = await page.evaluate(() => {
      const canvas = document.querySelector("#canvas");
      return { width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight };
    });
    expect(size.cssWidth === 360, `the canvas is ${size.cssWidth}px wide, not the full 360px`);
    expect(size.width === size.cssWidth * 2 && size.height === size.cssHeight * 2, "the canvas should have 2 real pixels per CSS pixel here");
    const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(extra <= 0, `the page is ${extra}px wider than the screen`);
  });

  await step("sound starts off, and the button turns it on", async () => {
    expect((await page.getAttribute("#sound-button", "aria-pressed")) === "false", "sound should start off");
    await page.click("#sound-button");
    expect((await page.getAttribute("#sound-button", "aria-pressed")) === "true", "the button didn't turn sound on");
    await page.click("#sound-button"); // and off again, for the rest of the test
  });

  console.log("\nPlaying");
  await step("Play starts a round", async () => {
    await page.click("#play-button");
    expect((await game()).mode === "playing", "the round didn't start");
    expect(!(await visible("#start-screen")), "the start screen should disappear");
  });

  await step("the arrow keys and A/D move the basket", async () => {
    const middle = (await game()).basketX;
    await hold("ArrowLeft", 400);
    const afterLeft = (await game()).basketX;
    expect(afterLeft < middle, "ArrowLeft didn't move the basket left");
    await hold("d", 700);
    const afterD = (await game()).basketX;
    expect(afterD > afterLeft, "D didn't move the basket right");
    await hold("ArrowRight", 400);
    await hold("a", 400);
    expect((await game()).basketX < 360, "the basket left the screen");
  });

  await step("tapping the screen moves the basket toward the finger", async () => {
    await hold("ArrowRight", 600); // start from the right
    const before = (await game()).basketX;
    await page.touchscreen.tap(40, 500);
    await page.waitForTimeout(500);
    expect((await game()).basketX < before, "the basket didn't move toward the tap");
  });

  await step("P pauses and resumes, and so does the pause button", async () => {
    await page.keyboard.press("p");
    expect((await game()).mode === "paused" && (await visible("#pause-screen")), "P didn't pause");
    await page.keyboard.press("Escape");
    expect((await game()).mode === "playing", "Escape didn't resume");
    await page.click("#pause-button");
    expect((await game()).mode === "paused", "the pause button didn't pause");
    await page.click("#resume-button");
    expect((await game()).mode === "playing", "Resume didn't resume");
  });

  await step("points add up and the game speeds up every 10 points", async () => {
    const before = await game();
    await page.evaluate(() => window.__game.addPoints(15));
    const after = await game();
    expect(after.score === before.score + 15, "the points weren't added");
    expect(after.speedUps >= 1, "the game didn't speed up");
    expect((await page.innerText("#score")) === String(after.score), "the score display is out of date");
  });

  await step("three misses end the round", async () => {
    for (let i = 0; i < 3 && (await game()).mode === "playing"; i++) {
      await page.evaluate(() => window.__game.forceMiss());
    }
    expect((await game()).mode === "over", "the round didn't end");
    expect(await visible("#over-screen"), "the round-over screen isn't showing");
    expect((await page.innerText("#final-score")) === String((await game()).score), "the final score is wrong");
    expect((await page.innerText("#lives")) === "☆☆☆", "all three lives should be gone");
  });

  console.log("\nLeaderboard");
  const finalScore = (await game()).score;
  await step("a name with symbols is refused with a message", async () => {
    await page.fill("#player-name", "<b>me</b>");
    await page.click("#save-button");
    expect(await visible("#name-error"), "no error message under the name");
    expect((await page.getAttribute("#player-name", "aria-invalid")) === "true", "the name field isn't marked invalid");
  });

  await step("a valid name is saved and shows up on the leaderboard", async () => {
    await page.fill("#player-name", "Test Pilot");
    await page.click("#save-button");
    await page.waitForSelector("#over-screen .leaderboard .is-you", { timeout: 5000 });
    const row = await page.locator("#over-screen .leaderboard .is-you").innerText();
    expect(row.includes("Test Pilot") && row.includes(String(finalScore)), `the highlighted row says "${row}"`);
    expect(!(await visible("#score-form")), "the form should disappear after saving");
  });

  await step("the best score and leaderboard are still there after a reload", async () => {
    await page.reload();
    expect((await page.innerText("#best")) === String(finalScore), "the best score wasn't kept");
    await page.waitForFunction(() => document.querySelector("#start-screen .leaderboard").innerText.includes("Test Pilot"));
    expect((await page.evaluate(() => JSON.parse(localStorage.getItem("star-catcher-scores")).length)) === 1, "expected 1 saved score");
  });

  await step("Play again starts a new round from zero", async () => {
    await page.evaluate(() => window.__game.start());
    await page.evaluate(() => {
      while (window.__game.state().mode === "playing") window.__game.forceMiss();
    });
    expect(await visible("#no-score"), "a round with 0 stars should say so");
    expect(!(await visible("#score-form")), "there's nothing to save for 0 stars");
    await page.click("#again-button");
    const state = await game();
    expect(state.mode === "playing" && state.score === 0 && state.misses === 0, "the new round didn't start fresh");
  });

  console.log("\nOther pages");
  await step("the start screen links to the privacy page, which loads", async () => {
    await page.goto(`${base}/`);
    await page.click('#start-screen a[href="/privacy.html"]');
    await page.waitForURL(/privacy/);
    expect((await page.locator("h1").innerText()) === "Privacy", "the privacy page didn't load");
    const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(extra <= 0, `the privacy page is ${extra}px wider than the screen`);
  });

  await step("the Permission check page explains that local mode has nothing to check", async () => {
    await page.goto(`${base}/check.html`);
    expect(await visible("#check-local"), "the local-mode message isn't showing");
  });

  await step("the 404 page loads, and a missing address answers 404", async () => {
    const response = await page.goto(`${base}/404.html`);
    expect(response.status() === 200 && (await page.locator("h1").count()) === 1, "404.html didn't load");
    const missing = await fetch(`${base}/no-such-page`); // asked from Node, so the browser Console stays clean
    expect(missing.status === 404, `a missing page answered ${missing.status}`);
  });

  console.log("\nConsole");
  await step("no errors in the browser Console", async () => {
    expect(consoleErrors.length === 0, `\n        ${consoleErrors.join("\n        ")}`);
  });

  await browser.close();
}

// ---------- helpers ----------

async function step(name, fn) {
  try {
    await fn();
    console.log(`  ok    ${name}`);
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${name} - ${error.message.split("\n=====")[0]}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs = 20000) {
  const giveUpAt = Date.now() + timeoutMs;
  while (Date.now() < giveUpAt) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`vite preview didn't start at ${url}`);
}
