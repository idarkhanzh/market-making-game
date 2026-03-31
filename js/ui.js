/**
 * ui.js
 * ─────────────────────────────────────────────────────────
 * All DOM manipulation and rendering for Market Making AZ.
 * Called by app.js with the current game state.
 */

const UI = (() => {

  // ── Screen Navigation ────────────────────────────────────

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  // ── Toast Notifications ──────────────────────────────────

  let _toastTimer;
  function toast(msg, isError = false) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  // ── Loading ──────────────────────────────────────────────

  function setLoading(on) {
    document.getElementById('loading').style.display = on ? 'flex' : 'none';
  }

  // ── Lobby ────────────────────────────────────────────────

  function renderLobby(state, myId) {
    const code = state.gameCode;
    document.getElementById('lobby-code').textContent = code;
    document.getElementById('lobby-big-code').textContent = code;

    const players = Object.values(state.players).sort((a, b) => a.joinedAt - b.joinedAt);
    const listEl = document.getElementById('player-list');
    listEl.innerHTML = '';
    players.forEach(p => {
      const div = document.createElement('div');
      div.className = 'player-item' + (p.isHost ? ' host-player' : '');
      div.innerHTML = `
        <div class="player-dot"></div>
        <span>${_esc(p.nickname)}</span>
        ${p.isHost ? '<span style="color:var(--amber);font-size:9px;margin-left:auto">HOST</span>' : ''}
        ${p.id === myId && !p.isHost ? '<span style="color:var(--green);font-size:9px;margin-left:auto">YOU</span>' : ''}
      `;
      listEl.appendChild(div);
    });

    document.getElementById('player-count').textContent = players.length;
    document.getElementById('lobby-rounds').textContent = state.totalRounds;
    document.getElementById('lobby-player-count').textContent = players.length;

    const isHost = state.players[myId]?.isHost;
    document.getElementById('host-controls').style.display = isHost ? 'flex' : 'none';
    document.getElementById('player-waiting-msg').style.display = isHost ? 'none' : 'flex';
    document.getElementById('game-info-card')?.remove?.();
    document.querySelector('.game-info-card').style.display = 'block';
  }

  // ── Quote Phase ──────────────────────────────────────────

  function renderRoundScreen(state, myId) {
    document.getElementById('round-num').textContent = state.currentRound;
    document.getElementById('round-total').textContent = state.totalRounds;

    _renderQuoteOrder(state, myId);
    _renderLiveQuotes(state, myId);
    _renderMyAction(state, myId);
    _renderPositionBar(state, myId);
  }

  function _renderQuoteOrder(state, myId) {
    const listEl = document.getElementById('quote-order-list');
    listEl.innerHTML = '';
    const currentIdx = GAME.getCurrentQuoteIndex(state);

    state.quoteOrder.forEach((pid, idx) => {
      const p = state.players[pid];
      const isDone = state.currentRoundQuotes[pid] !== undefined;
      const isCurrent = idx === currentIdx && !isDone;
      const isMe = pid === myId;

      const div = document.createElement('div');
      div.className = 'quote-order-item'
        + (isCurrent ? ' current' : '')
        + (isDone ? ' done' : '')
        + (isMe ? ' me' : '');

      div.innerHTML = `
        <span class="order-num">${idx + 1}</span>
        <span>${_esc(p?.nickname || pid)}</span>
        ${isMe ? '<span style="color:var(--amber);font-size:9px;margin-left:auto">YOU</span>' : ''}
        ${isDone ? '<span style="margin-left:auto;color:var(--green)">✓</span>' : ''}
        ${isCurrent ? '<span style="margin-left:auto;color:var(--amber);font-family:var(--font-pixel);font-size:7px">▶</span>' : ''}
      `;
      listEl.appendChild(div);
    });
  }

  function _renderLiveQuotes(state, myId) {
    const listEl = document.getElementById('live-quotes-list');
    listEl.innerHTML = '';

    state.quoteOrder.forEach(pid => {
      const p = state.players[pid];
      const q = state.currentRoundQuotes[pid];
      const isMe = pid === myId;
      const hasQuoted = q !== undefined;
      const currentIdx = GAME.getCurrentQuoteIndex(state);
      const myTurnIdx = state.quoteOrder.indexOf(pid);
      const isWaiting = !hasQuoted && myTurnIdx > currentIdx;
      const isCurrent = !hasQuoted && myTurnIdx === currentIdx;

      const div = document.createElement('div');
      div.className = 'quote-row' + (isMe ? ' my-row' : '');

      let bidStr = '—', askStr = '—', statusStr = '';
      if (hasQuoted) {
        if (q.skipped) {
          bidStr = '—'; askStr = '—';
          statusStr = '<span class="quote-status skipped">PASS</span>';
        } else {
          bidStr = `<span class="bid-val">${q.bid ?? '—'}</span>`;
          askStr = `<span class="ask-val">${q.ask ?? '—'}</span>`;
          statusStr = '<span class="quote-status done">✓</span>';
        }
      } else if (isCurrent) {
        statusStr = '<span class="quote-status waiting">▶ NOW</span>';
      } else if (isWaiting) {
        statusStr = '<span class="quote-status">WAIT</span>';
      }

      div.innerHTML = `
        <span>${_esc(p?.nickname || pid)}${isMe ? ' <span style="font-size:9px;color:var(--amber)">(you)</span>' : ''}</span>
        <span>${bidStr}</span>
        <span>${askStr}</span>
        <span>${statusStr}</span>
      `;
      listEl.appendChild(div);
    });
  }

  function _renderMyAction(state, myId) {
    const currentIdx = GAME.getCurrentQuoteIndex(state);
    const myIdx = state.quoteOrder.indexOf(myId);
    const hasQuoted = state.currentRoundQuotes[myId] !== undefined;
    const isMyTurn = currentIdx === myIdx && !hasQuoted;

    document.getElementById('waiting-turn-msg').style.display = (!isMyTurn && !hasQuoted) ? 'flex' : 'none';
    document.getElementById('quote-form').style.display = isMyTurn ? 'flex' : 'none';
    document.getElementById('already-quoted-msg').style.display = hasQuoted ? 'flex' : 'none';
  }

  function _renderPositionBar(state, myId) {
    const p = state.players[myId];
    if (!p) return;
    const posEl = document.getElementById('my-position-r');
    const costEl = document.getElementById('my-cost-r');
    posEl.textContent = p.position;
    posEl.className = 'pos-value' + (p.position > 0 ? ' positive' : p.position < 0 ? ' negative' : '');
    costEl.textContent = GAME.round2(p.cost).toFixed(2);
    document.getElementById('my-payoff-r').textContent = '—';
  }

  // ── Trading Phase ────────────────────────────────────────

  function renderTradingScreen(state, myId) {
    document.getElementById('trade-round-num').textContent = state.currentRound;
    document.getElementById('trade-round-total').textContent = state.totalRounds;

    _renderTradingMarket(state, myId);
    _renderTradingMyStats(state, myId);
  }

  function _renderTradingMarket(state, myId) {
    const listEl = document.getElementById('trading-market-list');
    listEl.innerHTML = '';
    const hasActed = state.tradersActed.includes(myId);

    state.quoteOrder.forEach(pid => {
      const p = state.players[pid];
      const q = state.currentRoundQuotes[pid];
      if (!q || q.skipped) return; // no quote, skip
      const isMe = pid === myId;

      const div = document.createElement('div');
      div.className = 'market-row' + (isMe ? ' my-row' : '');

      let actionsHtml = '';
      if (!isMe && !hasActed) {
        const canBuy  = q.ask !== null;
        const canSell = q.bid !== null;
        if (canBuy)  actionsHtml += `<button class="pixel-btn btn-buy pixel-btn-sm" onclick="app.executeTrade('${pid}','buy')">BUY @${q.ask}</button>`;
        if (canSell) actionsHtml += `<button class="pixel-btn btn-sell pixel-btn-sm" onclick="app.executeTrade('${pid}','sell')">SELL @${q.bid}</button>`;
      } else if (isMe) {
        actionsHtml = '<span style="font-size:10px;color:var(--amber)">YOUR QUOTE</span>';
      } else if (hasActed) {
        actionsHtml = '<span style="font-size:10px;color:var(--text-dim)">TRADED</span>';
      }

      div.innerHTML = `
        <span>${_esc(p?.nickname || pid)}</span>
        <span class="bid-val">${q.bid ?? '—'}</span>
        <span class="ask-val">${q.ask ?? '—'}</span>
        <span class="market-row-actions">${actionsHtml}</span>
      `;
      listEl.appendChild(div);
    });

    if (listEl.children.length === 0) {
      listEl.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:1rem">No active quotes this round</div>';
    }
  }

  function _renderTradingMyStats(state, myId) {
    const p = state.players[myId];
    if (!p) return;
    const posEl = document.getElementById('trade-my-pos');
    posEl.textContent = p.position;
    posEl.className = 'stat-value' + (p.position > 0 ? ' positive' : p.position < 0 ? ' negative' : '');
    document.getElementById('trade-my-cost').textContent = GAME.round2(p.cost).toFixed(2);
  }

  function appendTradeLog(trade, state, myId) {
    const logEl = document.getElementById('trade-log');
    const isMe = trade.party === myId || trade.counterparty === myId;
    const div = document.createElement('div');
    const partyNick = state.players[trade.party]?.nickname || trade.party;
    const cpNick = state.players[trade.counterparty]?.nickname || trade.counterparty;
    div.className = `trade-entry ${trade.direction === 'Long' ? 'buy-entry' : 'sell-entry'}`;
    div.innerHTML = `
      <span class="trade-party">${_esc(partyNick)}</span>
      ${trade.direction === 'Long' ? 'bought from' : 'sold to'}
      <span class="trade-party">${_esc(cpNick)}</span>
      @ <span class="trade-price">${trade.price}</span>
    `;
    logEl.prepend(div);
  }

  function renderTradeLog(state, myId) {
    const logEl = document.getElementById('trade-log');
    logEl.innerHTML = '';
    state.currentRoundTrades.forEach(t => {
      const div = document.createElement('div');
      const partyNick = state.players[t.party]?.nickname || t.party;
      const cpNick = state.players[t.counterparty]?.nickname || t.counterparty;
      div.className = `trade-entry ${t.direction === 'Long' ? 'buy-entry' : 'sell-entry'}`;
      div.innerHTML = `
        <span class="trade-party">${_esc(partyNick)}</span>
        ${t.direction === 'Long' ? 'bought from' : 'sold to'}
        <span class="trade-party">${_esc(cpNick)}</span>
        @ <span class="trade-price">${t.price}</span>
      `;
      logEl.prepend(div);
    });
  }

  // ── Timer ────────────────────────────────────────────────

  let _timerInterval = null;

  function startTradeTimer(startedAt, onExpire) {
    clearInterval(_timerInterval);
    const el = document.getElementById('trade-timer');

    function tick() {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, CONFIG.TRADING_PHASE_SECONDS - elapsed);
      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);
      el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      if (remaining <= 10) el.classList.add('urgent');
      else el.classList.remove('urgent');

      if (remaining <= 0) {
        clearInterval(_timerInterval);
        onExpire();
      }
    }

    tick();
    _timerInterval = setInterval(tick, 250);
  }

  function stopTradeTimer() {
    clearInterval(_timerInterval);
  }

  // ── Round End ────────────────────────────────────────────

  function renderRoundEnd(state, myId) {
    const roundNum = state.currentRound;
    document.getElementById('end-round-num').textContent = roundNum;
    document.getElementById('end-round-num2').textContent = roundNum;

    // Payoff is only revealed on the final round
    const isFinalRound = state.currentRound >= state.totalRounds;

    // Get latest standings from roundHistory
    const lastRound = state.roundHistory[state.roundHistory.length - 1];
    const standings = lastRound?.standings || {};

    const wrap = document.getElementById('round-end-standings');
    wrap.innerHTML = '';

    // Header — hide payoff column during mid-game
    const header = document.createElement('div');
    header.className = 'standing-row header';
    header.innerHTML = isFinalRound
      ? `<span>PLAYER</span><span>POS</span><span>COST</span><span>R/C</span><span>PAYOFF</span>`
      : `<span>PLAYER</span><span>POS</span><span>COST</span><span>R/C</span><span style="color:var(--text-dim)">PAYOFF</span>`;
    wrap.appendChild(header);

    // Sort by cost (proxy ranking mid-game) or by payoff on final round
    const rows = isFinalRound
      ? Object.entries(standings).sort((a, b) => b[1].payoff - a[1].payoff)
      : Object.entries(standings).sort((a, b) => a[0].localeCompare(b[0]));

    rows.forEach(([id, s]) => {
      const isMe = id === myId;
      const div = document.createElement('div');
      div.className = 'standing-row' + (isMe ? ' me-row' : '');
      const payClass = s.payoff >= 0 ? 'payoff-pos' : 'payoff-neg';

      // Payoff cell: show value on final round, show locked icon otherwise
      const payoffCell = isFinalRound
        ? `<span class="${payClass}">${s.payoff >= 0 ? '+' : ''}${s.payoff.toFixed(2)}</span>`
        : `<span style="color:var(--text-dim);letter-spacing:0.1em">?</span>`;

      div.innerHTML = `
        <span>${_esc(s.nickname)}${isMe ? ' <span style="color:var(--amber);font-size:9px">(you)</span>' : ''}</span>
        <span>${s.position > 0 ? '+' : ''}${s.position}</span>
        <span>${s.cost.toFixed(2)}</span>
        <span>${s.redCre.toFixed(2)}</span>
        ${payoffCell}
      `;
      wrap.appendChild(div);
    });

    const isHost = state.players[myId]?.isHost;
    document.getElementById('next-round-btn').style.display = isHost ? 'inline-flex' : 'none';
    document.getElementById('next-round-waiting').style.display = isHost ? 'none' : 'flex';

    // Update button text based on whether last round
    const nextBtn = document.getElementById('next-round-btn');
    if (state.currentRound >= state.totalRounds) {
      nextBtn.textContent = '▶ SEE FINAL RESULTS';
    } else {
      nextBtn.textContent = '▶ NEXT ROUND';
    }
  }

  // ── Final Results ─────────────────────────────────────────

  function renderResults(state, myId) {
    const lastRound = state.roundHistory[state.roundHistory.length - 1];
    const standings = lastRound?.standings || GAME.calculateStandings(state);

    // Sort by payoff
    const sorted = Object.entries(standings).sort((a, b) => b[1].payoff - a[1].payoff);

    // Podium (top 3)
    _renderPodium(sorted);

    // Full table
    const tbody = document.getElementById('results-tbody');
    tbody.innerHTML = '';
    sorted.forEach(([id, s], idx) => {
      const isMe = id === myId;
      const tr = document.createElement('tr');
      tr.className = idx === 0 ? 'rank-1' : '';
      const payClass = s.payoff >= 0 ? 'payoff-pos' : 'payoff-neg';
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${_esc(s.nickname)}${isMe ? ' ★' : ''}</td>
        <td>${s.position > 0 ? '+' : ''}${s.position}</td>
        <td>${s.cost.toFixed(2)}</td>
        <td>${s.redCre.toFixed(2)}</td>
        <td class="${payClass}"><strong>${s.payoff >= 0 ? '+' : ''}${s.payoff.toFixed(2)}</strong></td>
      `;
      tbody.appendChild(tr);
    });

    // Chart
    _renderProfitChart(state);

    // History
    _renderHistory(state);
  }

  function _renderPodium(sorted) {
    const podium = document.getElementById('podium');
    podium.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    const classes = ['second', 'first', 'third'];
    // Display order: 2nd, 1st, 3rd
    const displayOrder = [1, 0, 2];

    displayOrder.forEach(pos => {
      const entry = sorted[pos];
      if (!entry) return;
      const [, s] = entry;
      const div = document.createElement('div');
      div.className = `podium-place ${classes[pos]}`;
      const payClass = s.payoff >= 0 ? 'payoff-pos' : 'payoff-neg';
      div.innerHTML = `
        <div class="podium-rank">${medals[pos]}</div>
        <div class="podium-name">${_esc(s.nickname)}</div>
        <div class="podium-pnl ${payClass}">${s.payoff >= 0 ? '+' : ''}${s.payoff.toFixed(1)}</div>
      `;
      podium.appendChild(div);
    });
  }

  function _renderProfitChart(state) {
    const canvas = document.getElementById('profit-chart');
    const ctx = canvas.getContext('2d');
    const cumulative = GAME.getCumulativePayoffs(state);
    const rounds = state.roundHistory.length;

    const COLORS = [
      '#3ddc3d', '#ffb700', '#ff4545', '#44aaff', '#ff44ff',
      '#44ffaa', '#ff8844', '#aa44ff', '#ffff44', '#44ffff',
    ];

    const W = canvas.width, H = canvas.height;
    const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0d1a0d';
    ctx.fillRect(0, 0, W, H);

    const nicknames = Object.keys(cumulative);
    if (nicknames.length === 0 || rounds === 0) return;

    // Find range
    let minVal = 0, maxVal = 0;
    nicknames.forEach(n => {
      cumulative[n].forEach(v => {
        minVal = Math.min(minVal, v);
        maxVal = Math.max(maxVal, v);
      });
    });
    const range = maxVal - minVal || 1;
    const padRange = range * 0.15;

    function xOf(roundIdx) { return PAD.left + (roundIdx / (rounds - 1 || 1)) * plotW; }
    function yOf(val) { return PAD.top + (1 - (val - minVal + padRange) / (range + 2 * padRange)) * plotH; }

    // Grid lines
    ctx.strokeStyle = '#1a2a1a';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = PAD.top + (i / gridLines) * plotH;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
    }

    // Zero line
    const y0 = yOf(0);
    ctx.strokeStyle = '#3ddc3d';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(PAD.left, y0); ctx.lineTo(W - PAD.right, y0); ctx.stroke();
    ctx.setLineDash([]);

    // Axes labels
    ctx.fillStyle = '#4a6a4a';
    ctx.font = '10px Share Tech Mono';
    for (let i = 0; i < rounds; i++) {
      const x = xOf(i);
      ctx.fillText(`R${i + 1}`, x - 8, H - 8);
    }

    // Plot lines
    nicknames.forEach((nick, colorIdx) => {
      const vals = cumulative[nick];
      const color = COLORS[colorIdx % COLORS.length];

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      vals.forEach((v, i) => {
        const x = xOf(i);
        const y = yOf(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dots
      vals.forEach((v, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(xOf(i), yOf(v), 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Label at end
      if (vals.length > 0) {
        const lastY = yOf(vals[vals.length - 1]);
        ctx.fillStyle = color;
        ctx.font = 'bold 11px Share Tech Mono';
        ctx.fillText(nick, W - PAD.right + 4, lastY + 4);
      }
    });

    // Legend (top)
    ctx.font = '10px Share Tech Mono';
    let legendX = PAD.left;
    nicknames.forEach((nick, i) => {
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fillRect(legendX, PAD.top - 14, 14, 3);
      ctx.fillText(nick, legendX + 18, PAD.top - 8);
      legendX += ctx.measureText(nick).width + 38;
    });
  }

  function _renderHistory(state) {
    const wrap = document.getElementById('history-rounds');
    wrap.innerHTML = '';

    state.roundHistory.forEach(rh => {
      const div = document.createElement('div');
      div.className = 'history-round';

      // Trades header
      let html = `<div class="history-round-title">ROUND ${rh.round} — TRADES</div>`;
      if (rh.trades.length === 0) {
        html += '<div style="color:var(--text-dim);font-size:12px">No trades this round</div>';
      } else {
        html += '<div class="history-trade-row" style="font-family:var(--font-pixel);font-size:6px;color:var(--text-dim)"><span>PARTY</span><span>COUNTERPARTY</span><span>DIR</span><span>PRICE</span></div>';
        rh.trades.forEach(t => {
          html += `<div class="history-trade-row">
            <span>${_esc(t.party)}</span>
            <span>${_esc(t.counterparty)}</span>
            <span style="color:${t.direction === 'Long' ? 'var(--green)' : 'var(--red)'}">${t.direction}</span>
            <span style="color:var(--amber)">${t.price}</span>
          </div>`;
        });
      }
      div.innerHTML = html;
      wrap.appendChild(div);
    });
  }

  function toggleHistory() {
    const el = document.getElementById('history-content');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  // ── Shared helpers ───────────────────────────────────────

  function _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Expose
  return {
    showScreen,
    toast,
    setLoading,
    renderLobby,
    renderRoundScreen,
    renderTradingScreen,
    renderTradeLog,
    appendTradeLog,
    startTradeTimer,
    stopTradeTimer,
    renderRoundEnd,
    renderResults,
    toggleHistory,
  };
})();
