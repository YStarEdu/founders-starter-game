# Week 3: Run it, change it, deploy it

By the end of this guide the game runs on your computer, it looks and plays like your idea, and it's live on the internet for anyone to play. Follow the steps in order. Each one says why you're doing it.

You need a laptop (Windows or Mac), a GitHub account and about an hour.

## 1. Install the tools (once per computer)

Why: these three programs let you run, edit and save a web project on your own computer.

1. **Node.js** runs JavaScript projects. Go to [nodejs.org](https://nodejs.org), download the **LTS** version, and install it with the default options.
2. **VS Code** is the code editor. Download it from [code.visualstudio.com](https://code.visualstudio.com) and install it.
3. **Git** saves versions of your code. On Windows, install it from [git-scm.com](https://git-scm.com) with the default options. On a Mac it's already there: the first time you use it, your Mac may offer to install "command line developer tools". Say yes.

Now open VS Code and choose **Terminal → New Terminal** in the menu. A panel opens at the bottom. This is the terminal: you type a command, then press Enter.

Check that Node.js works:

```bash
node --version
```

You should see a version number such as `v22.12.0`. Any version that starts with `v22` or higher is fine.

Check npm, the tool that installs packages (it comes with Node.js):

```bash
npm --version
```

You should see a number such as `10.9.2`. If either command says "not found" or "not recognized", see [Troubleshooting](troubleshooting.md#node-or-npm-not-found).

## 2. Make your own copy on GitHub

Why: your copy is where your code lives, and Netlify will build your game from it.

1. Open the game starter link your mentor shared. It's a template repository on GitHub.
2. Click **Use this template**, then **Create a new repository**.
3. Pick yourself as the owner and give it your game's name, for example `star-catcher`. Click **Create repository**.

## 3. Download it to your computer

Why: you change code on your computer, then send the changes back to GitHub.

1. On your new repository's page, click the green **Code** button and copy the HTTPS address. It ends in `.git`.
2. In the VS Code terminal, go to your Documents folder, where your project will live:

```bash
cd Documents
```

You won't see a message. That's normal: no news is good news in the terminal.

3. Download (clone) your repository. Paste your own address instead of this example:

```bash
git clone https://github.com/your-name/star-catcher.git
```

You should see `Cloning into 'star-catcher'...` and then `done`. If Git asks you to sign in to GitHub, sign in in the window that opens.

4. In VS Code, choose **File → Open Folder** and open the new folder. If VS Code asks whether you trust the authors, choose **Yes**.
5. Open a fresh terminal with **Terminal → New Terminal**. It now starts inside your project folder.

## 4. Install and run

Why: `npm install` downloads the two packages the starter uses (Vite, which runs the game, and Supabase's library) into a folder called `node_modules`.

```bash
npm install
```

You should see `added 27 packages` (the number can differ). Yellow `warn` lines are fine; red `ERR!` lines are not, see [Troubleshooting](troubleshooting.md#npm-install-errors).

Why: `npm run dev` starts a small web server on your computer that shows your game and refreshes it every time you save a file.

```bash
npm run dev
```

You should see something like:

```
  VITE v8.3.5  ready in 300 ms

  ➜  Local:   http://localhost:5173/
```

Hold **Ctrl** (**Cmd** on a Mac) and click the address, or type it into your browser. You'll see Star Catcher, with a yellow banner at the top: "Local mode: data is saved in this browser only. Connect Supabase in Week 4." That's expected this week.

Leave this terminal running while you work. To stop the server, click in the terminal and press **Ctrl+C**.

## 5. Play it, then look inside

Why: knowing where each part lives makes it much easier to change, by hand or with AI.

Play a round: **←** and **→** (or **A** and **D**) move the basket, **P** pauses. Catch a few stars, miss three, then type a name and save your score. Reload the page: your best score and the top 10 are still there, saved in your browser.

| File | What it does |
| --- | --- |
| `src/game.js` | The game itself: `RULES` at the top, then the round, scoring and the game loop |
| `src/draw.js` | The art: `THEME` colours at the top, then one function per thing on screen |
| `src/input.js` | Keyboard, mouse and touch |
| `src/sound.js` | The beeps |
| `src/main.js` | Connects the game to the score bar, the screens, the buttons and the leaderboard |
| `src/store.js` | Saves scores: in your browser now, in Supabase from Week 4 |
| `index.html`, `src/style.css` | The score bar and the start, pause and round-over screens |

### How the game loop works

A game is a flip book. About 60 times a second, `frame()` in `src/game.js` does two things:

1. **Update**: move the basket, add a new star now and then, move every star down a little, and check whether a star reached the basket (a catch) or fell off the screen (a miss).
2. **Draw**: paint the sky, the stars, the sparkles and the basket in their new places (`drawScene()` in `src/draw.js`).

Everything the game knows lives in one object, `state`: the score, the misses, the list of falling stars, where the basket is. Update changes `state`; draw only reads it. Keep that rule and your changes stay easy to follow.

## 6. Make it yours

Why: this is where the starter becomes your game.

| To change | Edit |
| --- | --- |
| How many misses you get, how fast stars fall, how often they come | `RULES` at the top of `src/game.js` |
| Colours of the sky, stars and basket | `THEME` at the top of `src/draw.js` |
| The shape of a star or the basket | `drawStar()` and `drawBasket()` in `src/draw.js` |
| The sounds | the numbers in `sounds` in `src/sound.js` (a bigger first number is a higher note) |
| The name, the instructions and the buttons | `index.html` |
| Colours of the score bar, screens and buttons | the `:root` block at the top of `src/style.css` |
| The tab title and the text Google and link previews show | `<title>` and the `<meta>` lines in `index.html` |

Save a file and the browser updates by itself.

Ideas that need only small changes: catch raindrops with an umbrella, snowflakes with a mitten, pizza slices with a plate. Change the theme first, then the rules. Keep the names `state`, `RULES` and `drawScene` so the rest of the code still finds them.

Prompts that work well with an AI helper. Be specific, and name the files:

- "In src/draw.js, change drawStar so it draws a red apple (a circle with a small green leaf) instead of a star. Keep the same function name and parameters."
- "In src/game.js, change RULES so the game starts slower and only speeds up every 15 points. Explain each number you changed."
- "Change THEME in src/draw.js and the :root colours in src/style.css to an underwater theme. Keep the text easy to read."

Change one thing at a time and play after each change. If something breaks, press **Ctrl+Z** (**Cmd+Z**) in the file to undo, or paste the red error from the browser Console into your AI helper and ask what it means.

## 7. Check that it builds

Why: Netlify builds your game with this exact command, so if it fails here it will fail there too.

Open a second terminal with the **+** button in the terminal panel, so the dev server keeps running in the first one:

```bash
npm run build
```

You should see a list of files in `dist/` and `✓ built in` with a time. If you see an error instead, read its first line: it usually names the file and line that's wrong.

## 8. Save your work to GitHub

Why: a commit is a saved version of your project, and pushing sends it to GitHub, where it's backed up and Netlify can see it.

Add all your changes to the next commit:

```bash
git add .
```

You won't see a message. Now save the version with a short description:

```bash
git commit -m "Make the starter my own"
```

You should see a line like `[main 1a2b3c4] Make the starter my own` and how many files changed. If Git asks who you are, run the two `git config` commands it suggests with your name and email, then commit again.

Send it to GitHub:

```bash
git push
```

You should see a line ending in `main -> main`. Refresh your repository on GitHub: your changes are there.

You can also do this without the terminal: open the **Source Control** panel in VS Code (the branch icon on the left), type a message, click **Commit**, then **Sync Changes**.

## 9. Put it online with Netlify

Why: Netlify turns your GitHub repository into a live game anyone can open, and rebuilds it every time you push.

1. Go to [netlify.com](https://www.netlify.com) and sign up with your GitHub account.
2. Click **Add new project** (some accounts say **Add new site**), then **Import an existing project**, then **GitHub**. Allow Netlify to see your repositories and pick this one.
3. Netlify reads the settings from `netlify.toml`: build command `npm run build`, publish directory `dist`. Leave them as they are and click **Deploy**.
4. After a minute or two your game is live at an address like `https://lucky-comet-123abc.netlify.app`. To choose a nicer name, open the project's configuration and look for **Change project name** (on some accounts, **Change site name**).

From now on, every `git push` updates the live game within a couple of minutes. Watch it happen under **Deploys**.

## 10. Play the live game on a phone

Why: most players will be on phones, and touch controls only really get tested on a real one.

- Open your netlify.app address on your phone. Drag and tap to move the basket. Is the text easy to read? Do the buttons work?
- Save a score. It's on that phone's top 10 only for now, which is exactly what local mode means.

## You're done when

- [ ] `npm run dev` shows your version of the game on your computer.
- [ ] The theme, art or rules are yours.
- [ ] Your changes are pushed to GitHub.
- [ ] The game is live on Netlify and plays well on your phone.

Next week: [connect Supabase](week-04-data.md), so every player shares one leaderboard.
