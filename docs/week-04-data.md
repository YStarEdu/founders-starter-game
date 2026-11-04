# Week 4: Connect Supabase

Right now each player's top 10 lives only in their own browser, so nobody can compete with anyone else. This week you give the game a real database: every saved score goes into one table, and everyone sees the same leaderboard.

You need your project from Week 3 and about 45 minutes.

## 1. Create a Supabase project

Why: Supabase gives you a Postgres database on the internet, with an API your game can talk to.

1. Go to [supabase.com](https://supabase.com), click **Start your project** and sign in with GitHub.
2. Click **New project**. Choose your personal organization on the **Free** plan.
3. Give the project your game's name.
4. For the database password, click **Generate a password**, then save it somewhere safe, like a password manager. You won't need it in this course, and Supabase can't show it to you again.
5. For the region, choose the one closest to your players. In Canada that's **Canada (Central)**. Your privacy page will mention it later.
6. Click **Create new project** and wait a minute or two while it gets ready.

## 2. Create the scores table

Why: `supabase/setup.sql` creates the table, its limits and its security rules in one go, so you don't have to click them together by hand.

1. In VS Code, open `supabase/setup.sql`, select everything (**Ctrl+A**, or **Cmd+A** on a Mac) and copy it.
2. In Supabase, open the **SQL Editor** from the left sidebar and start a **New query**.
3. Paste and click **Run**.

You should see `Success. No rows returned`.

Supabase may first warn that the query has a "destructive operation". That's the `drop policy if exists` lines, which only replace the old copies of the policies if you run the file again. Confirm that you want to run it.

4. Open the **Table Editor** from the left sidebar and click **scores**. You'll see an empty table with the columns `id`, `created_at`, `name` and `score`.

## 3. Copy your project's URL and publishable key

Why: these two values tell your game which database to talk to. They're designed to be public, and the rules in `setup.sql` decide what anyone can do with them.

1. In Supabase, click **Connect** at the top of the project page. You can also find the values under **Project Settings**: the Project URL under **Data API**, and the keys under **API Keys**.
2. The **Project URL** looks like `https://abcdefghijklmnopqrst.supabase.co`.
3. The **publishable key** starts with `sb_publishable_`. Older projects show an **anon public** key instead, a long text that starts with `eyJ`. That one works too.

Never use the **secret** key (`sb_secret_…`) or the **service_role** key. They skip every security rule, so anyone who finds them could rewrite or wipe your whole leaderboard. If one ends up in your game by mistake, the build stops with an error that says so.

## 4. Put them in a `.env` file

Why: a `.env` file keeps settings out of your code, and `.gitignore` makes sure Git never uploads it.

1. In VS Code's file list, right-click `.env.example`, choose **Copy**, then right-click an empty spot in the file list and choose **Paste**. Rename the copy to exactly `.env`.
2. Open `.env` and replace the two example values with yours. No quotes, and no spaces around the `=`:

```
VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_AbC123...
```

3. Save the file.

## 5. Restart the dev server

Why: Vite reads `.env` only when it starts, so it hasn't seen your new values yet.

Click in the terminal that's running the game, press **Ctrl+C** to stop it, then start it again:

```bash
npm run dev
```

You should see `Local: http://localhost:5173/` again. Open it: the yellow local-mode banner is gone, and the top 10 says "No scores yet. Be the first!" That means the game is reading from your new, empty table.

## 6. Save a real score

Why: this proves that scores now reach your database and come back as the leaderboard.

1. Play a round, type a name and click **Save**. Your score appears in the top 10.
2. In Supabase, open **Table Editor → scores**. Your score is there, with the time it arrived. If you don't see it, click the refresh button above the table.
3. Open the game in a second browser, or on your phone (step 7 first, for the live site). It shows the same top 10. That's the shared leaderboard.

Your best score is still saved in each browser. That's on purpose: it's your personal best on that device.

## 7. Add the two variables on Netlify

Why: `.env` exists only on your computer, so Netlify needs its own copy of the two values to build the live game.

1. In Netlify, open your project, then its configuration, then **Environment variables**.
2. Click **Add a variable**. Key: `VITE_SUPABASE_URL`. Value: your Project URL. Save it.
3. Add a second variable. Key: `VITE_SUPABASE_PUBLISHABLE_KEY`. Value: your publishable key. Save it.
4. If Netlify offers a **Contains secret values** option, leave it off. These two values end up in your public game's code anyway (that's fine, they're publishable), and marking them secret makes Netlify's secret scanner stop the build.
5. Open **Deploys**, click **Trigger deploy** and choose **Deploy project** (or **Deploy site**). Variables only reach new builds.
6. When the deploy is done, open the live game on your phone: no yellow banner, and the same top 10 as on your computer. Save a score from your phone and watch it appear on your computer after a reload.

## 8. Save your work

Why: this commit records that the game is now connected to Supabase.

First check what's about to be saved:

```bash
git status
```

You should see a list of changed files. `.env` must not be in it. If it is, stop and see [Troubleshooting](troubleshooting.md#env-shows-up-in-git-status).

```bash
git add .
```

You won't see a message.

```bash
git commit -m "Connect Supabase"
```

You should see `[main …] Connect Supabase`. If nothing changed in your files this week, Git says `nothing to commit`, and that's fine too.

```bash
git push
```

You should see a line ending in `main -> main`.

## How it works

You don't need to memorize this, but it helps when something goes wrong.

- `src/config.js` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. If either is missing, the game stays in local mode and shows the banner.
- `src/store.js` has `topScores()` and `saveScore()`. In local mode they use `localStorage`. With Supabase, `topScores()` asks for the 10 highest scores (`.order("score", { ascending: false }).limit(10)`) and `saveScore()` runs `supabase.from("scores").insert({ name, score })`.
- `supabase/setup.sql` creates the `scores` table. Each `constraint … check (...)` is a rule the database enforces on every new score, like `score_is_0_to_100000`.
- `alter table … enable row level security` locks the table: through the API, nobody can do anything unless a **policy** allows it.
- Two policies: anyone can **read** scores (so the game can show the top 10), and anyone can **insert** a score, stamped with the time it arrives (no backdating). There's no policy to update or delete, so nobody can change or remove a score through the API, not even their own.
- The Table Editor works because you're signed in to Supabase as the project's owner. Owners aren't limited by these policies, which is how you'll remove rude names or obvious cheats.

## You're done when

- [ ] The `scores` table exists in Supabase.
- [ ] Locally, there's no yellow banner and a saved score shows up in the Table Editor.
- [ ] On Netlify, there's no yellow banner and your phone and your computer show the same top 10.
- [ ] `.env` is not on GitHub.

Something not working? Check [Troubleshooting](troubleshooting.md): it covers `Invalid API key`, `new row violates row-level security policy`, the banner that won't go away, and more.

Next week: [prove that players can't edit or delete scores](week-05-permissions.md), and learn the honest truth about cheating.
