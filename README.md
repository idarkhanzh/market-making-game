```
███╗   ███╗ █████╗ ██████╗ ██╗  ██╗███████╗████████╗
████╗ ████║██╔══██╗██╔══██╗██║ ██╔╝██╔════╝╚══██╔══╝
██╔████╔██║███████║██████╔╝█████╔╝ █████╗     ██║   
██║╚██╔╝██║██╔══██║██╔══██╗██╔═██╗ ██╔══╝     ██║   
██║ ╚═╝ ██║██║  ██║██║  ██║██║  ██╗███████╗   ██║   
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   
                                                      
███╗   ███╗ █████╗ ██╗  ██╗██╗███╗   ██╗ ██████╗    
████╗ ████║██╔══██╗██║ ██╔╝██║████╗  ██║██╔════╝    
██╔████╔██║███████║█████╔╝ ██║██╔██╗ ██║██║  ███╗   
██║╚██╔╝██║██╔══██║██╔═██╗ ██║██║╚██╗██║██║   ██║   
██║ ╚═╝ ██║██║  ██║██║  ██╗██║██║ ╚████║╚██████╔╝   
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝    

                      — A Z —
```

---

> *You are a market maker. You don't know the fair price.*  
> *Neither does anyone else — not fully.*  
> *Quote. Trade. Survive.*

---

## WHAT IS THIS

**Market Making AZ** is a real-time multiplayer trading simulation played in rounds. One player hosts. Everyone else joins with a code. No accounts. No setup. Just pure market action.

You play as a market maker — someone who posts prices at which they're willing to buy *(bid)* and sell *(ask)*. Other players can trade against your quotes, and you can trade against theirs. The trick: nobody knows the true fair value of the asset. That's the game.

At the end, the host reveals the **fair price**. The closer your average trade price is to it — and the smarter your position — the better your payoff.

---

## HOW TO PLAY

### 🔑 Joining a Game

Someone needs to host. They'll give you a **5-letter code**.

1. Open the game → click **JOIN A GAME**
2. Enter the code and pick a nickname
3. Wait in the lobby until the host starts

That's it. No password. No account.

---

### 🎮 Each Round Has Two Phases

```
┌─────────────────────────────────────────────────────┐
│  PHASE 1 · QUOTING          PHASE 2 · TRADING       │
│                                                      │
│  Players take turns         60-second open window.   │
│  posting a Bid & Ask.       Trade against anyone's   │
│  Or pass entirely.          live quote — or pass.    │
└─────────────────────────────────────────────────────┘
```

---

### 📋 Phase 1 — Quoting

When it's your turn, you have two choices:

**Option A — Post a quote**
Enter a **Bid** (price you'll buy at) and an **Ask** (price you'll sell at).
Your bid must be *lower* than your ask. That gap is your spread — your edge.

**Option B — Pass**
Choose *Do Not Quote*. You won't appear in the market this round,
but you can still trade in Phase 2 against other people's quotes.

> Everyone can see all submitted quotes in real time.  
> The quoting order rotates each round — whoever went first goes last next time.

---

### ⚡ Phase 2 — Trading

A **60-second** trading window opens for everyone simultaneously.

- **BUY** from someone → you pay their **ask** price, go long +1
- **SELL** to someone → you receive their **bid** price, go short −1
- **PASS** → do nothing this round

You get **one trade per round**. Choose carefully.

> You can go into negative cash (debt). No interest is ever charged.  
> Positions carry across all rounds — there's no round-by-round reset.

---

### 🔄 The Rotation

Quoting order rotates every round:

```
Round 1:  Alice → Bob → Carol → Dave
Round 2:  Bob → Carol → Dave → Alice
Round 3:  Carol → Dave → Alice → Bob
          (and so on...)
```

Going *last* means you see everyone else's quotes before posting yours.  
Going *first* means you set the tone — with no information.  
Both have strategic value depending on what you're trying to do.

---

## THE PAYOFF

At the end of the final round, the host reveals the **fair price** — the true value of the asset everyone's been trading.

Your final profit is calculated as:

```
PAYOFF  =  (your position × fair price)  −  what you paid  −  carry cost
```

Where **carry cost** is a small penalty for holding a large position:

```
If you're net LONG  →  0.50 per unit held
If you're net SHORT →  0.25 per unit held
If you're FLAT      →  no carry cost
```

**Net long** means you bought more than you sold. You profit if the fair price is above what you paid.  
**Net short** means you sold more than you bought. You profit if the fair price is below what you received.  
**Flat** (zero position) means you've traded in and out — your profit comes entirely from the spread you captured.

> Payoffs are hidden during the game. You'll only see your position and cost.  
> The full table — and who won — is revealed at the very end.

---

## STRATEGY NOTES

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ◈  Quoting first?  You're setting the market.              │
│     Post confidently — or bluff.                            │
│                                                              │
│  ◈  Quoting last?  You have information.                    │
│     Tighten your spread. Undercut. Or skip entirely.        │
│                                                              │
│  ◈  Nobody knows the fair price for certain.                │
│     But everyone's quotes are signals. Read them.           │
│                                                              │
│  ◈  A wide spread protects you. A tight spread              │
│     attracts trades — but increases your risk.              │
│                                                              │
│  ◈  Going flat (zero position) is valid.                    │
│     Capture spreads without taking directional risk.        │
│                                                              │
│  ◈  Debt is allowed. Sometimes going big is right.          │
│     Sometimes it destroys you. That's the game.             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## THE SCOREBOARD

After the final round:

- **Full payoff table** — ranked by profit
- **Round-by-round profit chart** — see who surged late and who collapsed
- **Trade history** — every trade from every round, fully logged

The fair price is revealed. Everything becomes clear — or more confusing — in hindsight.

---

## QUICK REFERENCE

| Term | Meaning |
|---|---|
| **Bid** | Price you'll buy 1 unit at |
| **Ask** | Price you'll sell 1 unit at |
| **Long** | You own more than you've sold (want price to go up) |
| **Short** | You've sold more than you own (want price to go down) |
| **Flat** | Net zero position |
| **Spread** | Ask − Bid. Your quoted profit margin. |
| **Fair Price** | The true value, set secretly by the host |
| **Payoff** | Your final profit or loss after fair price is revealed |
| **Carry Cost** | Small penalty for holding a position into the end |

---

## GAME SETTINGS

The host configures before the game starts:

- **Players** — up to 10
- **Rounds** — 6, 7, 8, 9, or 10
- **Fair Price** — set secretly, revealed at the end

The fair price is never shown during the game. The host shouldn't reveal it either — that's the whole point.

---

```
No registration. No download. No catch.
Open the link. Enter the code. Play.

        GOOD LUCK, MARKET MAKER.
```
