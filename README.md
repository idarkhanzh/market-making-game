# Market Making · AZ

Real-time multiplayer market-making simulation. Pixel-art style, no signup required, up to 10 players.

---

## 🚀 Deploy to Vercel (5 minutes)

### Step 1 — Get your JSONBin credentials

1. Create a free account at https://jsonbin.io
2. Go to **Account → API Keys** and copy your **Master Key**
3. Go to **Bins → Create Bin**, paste `{}` as the content, save it
4. Copy the **Bin ID** from the URL bar (e.g. `6630abc123def456789`)

### Step 2 — Set environment variables in Vercel

In your Vercel project: **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `JSONBIN_API_KEY` | Your JSONBin Master Key (`$2a$10$abc...`) |
| `JSONBIN_INDEX_BIN` | The bin ID you just created (`6630abc123...`) |

### Step 3 — Deploy

```bash
npx vercel
```

Done. The `/api/config` serverless function reads those env vars and returns them to the browser at runtime — secrets never live in source code.

---

## 🗂️ Project Structure

```
market-making-az/
├── index.html          # All screens in one HTML file
├── vercel.json         # Vercel routing config
├── .env.example        # Template — copy to .env.local for local dev
├── api/
│   └── config.js       # Serverless function: reads env vars, returns JSON
├── css/
│   └── style.css
└── js/
    ├── config.js       # Game constants (no secrets)
    ├── jsonbin.js      # JSONBin API wrapper + polling
    ├── game.js         # Pure game logic & PnL calculations
    ├── ui.js           # DOM rendering
    └── app.js          # Orchestrator — fetches /api/config on load
```

---

## 🏃 Running Locally

```bash
npm i -g vercel          # install CLI once
cp .env.example .env.local
# fill in the two values in .env.local
vercel dev               # serves static + /api/config at localhost:3000
```

`vercel dev` is important — it runs the serverless function locally and injects `.env.local`, matching production exactly.

---

## 🎮 How to Play

**Host:** Host a Game → enter nickname + fair price (secret) → share 5-digit code → Start Game

**Players:** Join a Game → enter code + nickname → wait for host

**Each round has two phases:**
1. **Quoting** — take turns submitting Bid/Ask (or pass). Order rotates each round.
2. **Trading** — 60-second window to buy at someone's ask or sell at someone's bid (1 trade per player).

---

## 📊 PnL Formula

```
Red/Cre = |pos| × 0.50  (long)  |  |pos| × 0.25  (short)  |  0  (flat)
Payoff  = (position × fairPrice) − totalCost − Red/Cre
```

Verified against all 9 rounds of the reference spreadsheet.

---

## ⚙️ Config (`js/config.js`)

| Key | Default | Description |
|---|---|---|
| `POLL_MS` | 1500 | Polling interval in ms |
| `TRADING_PHASE_SECONDS` | 60 | Trading window |
| `MAX_PLAYERS` | 10 | Max per game |

Secrets (`JSONBIN_API_KEY`, `JSONBIN_INDEX_BIN`) are env vars only — never in this file.

---

## 🐛 Troubleshooting

**"Config error" on load** → Check env vars are set in Vercel and project is redeployed.

**"Game code not found"** → Verify `JSONBIN_INDEX_BIN` points to a real bin on jsonbin.io.

**Slow updates** → Increase `POLL_MS` to `2000` if hitting JSONBin rate limits.
