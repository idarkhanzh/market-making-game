# Market Making · AZ

Real-time multiplayer market-making simulation. Pixel-art style, no signup required, up to 10 players.

---

## 🚀 Deploy to GitHub Pages

### Step 1 — Get your JSONBin credentials

1. Create a free account at https://jsonbin.io
2. Go to **Account → API Keys** → copy your **Master Key**
3. Go to **Bins → Create Bin**, paste `{}` as content, save it
4. Copy the **Bin ID** from the URL (e.g. `6630abc123def456`)

### Step 2 — Create your local secrets file

```bash
cp js/secrets.example.js js/secrets.js
```

Open `js/secrets.js` and fill in:

```js
const SECRETS = {
  JSONBIN_API_KEY:   '$2a$10$your-real-key-here',
  JSONBIN_INDEX_BIN: 'your-bin-id-here',
};
```

`secrets.js` is listed in `.gitignore` — it will never be committed.

### Step 3 — Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOU/market-making-az.git
git push -u origin main
```

### Step 4 — Enable GitHub Pages

GitHub repo → **Settings → Pages → Source: Deploy from branch → main → / (root)**

Your game is live at `https://YOU.github.io/market-making-az/`

---

## 🗂️ Project Structure

```
market-making-az/
├── index.html
├── .gitignore
├── css/
│   └── style.css
└── js/
    ├── secrets.js          ← YOU CREATE THIS (gitignored, never committed)
    ├── secrets.example.js  ← safe template, committed to repo
    ├── config.js           ← game constants, reads from SECRETS
    ├── jsonbin.js          ← API wrapper + polling
    ├── game.js             ← pure game logic & PnL calculations
    ├── ui.js               ← DOM rendering
    └── app.js              ← orchestrator
```

---

## 🏃 Running Locally

Just open `index.html` in a browser — no build step needed.

```bash
# Or use any static server:
python3 -m http.server 8080
# → http://localhost:8080
```

---

## 📊 PnL Formula

```
Red/Cre = |pos| × 0.50  (long)  |  |pos| × 0.25  (short)  |  0  (flat)
Payoff  = (position × fairPrice) − totalCost − Red/Cre
```

---

## ⚙️ Config (`js/config.js`)

| Key | Default | Description |
|---|---|---|
| `POLL_MS` | 1500 | Polling interval in ms |
| `TRADING_PHASE_SECONDS` | 60 | Trading window |
| `MAX_PLAYERS` | 10 | Max per game |

Secrets are in `js/secrets.js` only — never in this file.

---

## ⚠️ Security note

`secrets.js` holds your JSONBin Master Key. Anyone who can read the page source will be able to see it. For a private classroom game this is fine. For a public production deployment, use the Vercel version instead (which keeps the key server-side).
