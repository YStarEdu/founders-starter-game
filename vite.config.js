// Vite settings for Star Catcher. Most of the time you won't need to change this file.
// Adding a page? Create the .html file next to index.html and add its name to `pages` below.
import { defineConfig, loadEnv } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Every page. Each one becomes a real HTML file in dist/ when you build.
const pages = ["index", "privacy", "check", "404"];

export default defineConfig(({ mode }) => {
  checkSupabaseSettings(loadEnv(mode, root, "VITE_"));
  return {
    appType: "mpa", // separate HTML pages, and unknown addresses show the 404 page
    build: {
      rolldownOptions: {
        input: Object.fromEntries(pages.map((page) => [page, resolve(root, `${page}.html`)])),
      },
    },
  };
});

// Stops the build if a secret key is about to go into the game, and catches common setup mistakes.
function checkSupabaseSettings(env) {
  const url = (env.VITE_SUPABASE_URL || "").trim();
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
  if (key.startsWith("sb_secret_") || isServiceRoleKey(key)) {
    throw new Error(
      "VITE_SUPABASE_PUBLISHABLE_KEY is a SECRET key. A secret key skips every security rule, so it must never go in a website. " +
        "Use the publishable key (it starts with sb_publishable_) or the legacy anon key. See docs/troubleshooting.md.",
    );
  }
  if (url && !/^https?:\/\/[^/\s]+\/?$/.test(url)) {
    throw new Error(
      "VITE_SUPABASE_URL should look like https://abcdefghijklmnopqrst.supabase.co, with nothing after .co. " +
        "Copy the Project URL from Supabase (Project Settings, Data API).",
    );
  }
  if (Boolean(url) !== Boolean(key)) {
    console.warn("\nOnly one of VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY is set, so the game stays in local mode.\n");
  }
}

// Legacy Supabase keys are JWTs: three parts separated by dots. The middle part says which role the key has.
function isServiceRoleKey(key) {
  const payload = key.split(".")[1];
  if (!payload) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role === "service_role";
  } catch {
    return false;
  }
}
