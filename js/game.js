/**
 * game.js
 * ─────────────────────────────────────────────────────────
 * Pure game logic for Market Making AZ.
 * No DOM access here — only state manipulation.
 *
 * ── PnL Calculation (from spreadsheet analysis) ──────────
 *
 * After each round, for each player:
 *   Red/Cre Cost = |position| × 0.50  if net long
 *                  |position| × 0.25  if net short
 *                  0                  if flat
 *
 *   Payoff = (position × fairPrice) - cost - Red/Cre Cost
 *
 * Where:
 *   position = net units (buy = +1, sell = -1)
 *   cost     = cumulative cash paid/received
 *              (buying costs +price, selling receives +price as negative cost)
 *
 * ── Quote Order Rotation ──────────────────────────────────
 *   Round 1: [P1, P2, P3, ..., Pn]
 *   Round 2: [P2, P3, ..., Pn, P1]   (P1 moved to end)
 *   Round R: rotate left by (R-1)
 *
 * ── Trade Logic ───────────────────────────────────────────
 *   Each player may trade once per round in the trading phase.
 *   "Buy from X" → pay X's ask price, go long +1, X goes short -1.
 *   "Sell to X"  → receive X's bid price, go short -1, X goes long +1.
 *   Players can trade with any player who has a live quote.
 *   Players cannot trade with themselves.
 *   Each player submits at most 1 trade per round.
 */

const GAME = (() => {

  // ── State Schema ─────────────────────────────────────────
  /**
   * GameState:
   * {
   *   _version: number,
   *   _updatedAt: number,
   *   gameCode: string,         // "ABCD1"
   *   status: 'lobby' | 'quoting' | 'trading' | 'round_end' | 'finished',
   *   fairPrice: number,        // hidden until game end
   *   totalRounds: number,
   *   currentRound: number,     // 1-indexed
   *   players: {
   *     [playerId]: {
   *       id: string,
   *       nickname: string,
   *       isHost: boolean,
   *       position: number,     // current net position
   *       cost: number,         // cumulative cost
   *       joinedAt: number,
   *     }
   *   },
   *   quoteOrder: string[],     // player IDs in quoting order
   *   roundHistory: [           // one entry per completed round
   *     {
   *       round: number,
   *       quotes: { [playerId]: { bid:number|null, ask:number|null, skipped:bool } },
   *       trades: [ { party, counterparty, direction, price } ],
   *       standings: { [playerId]: { position, cost, redCre, payoff } }
   *     }
   *   ],
   *   currentRoundQuotes: {    // quotes so far this round
   *     [playerId]: { bid:number|null, ask:number|null, skipped:bool }
   *   },
   *   currentRoundTrades: [    // trades executed this round
   *     { party:string, counterparty:string, direction:'Long'|'Short', price:number, at:number }
   *   ],
   *   tradingStartedAt: number | null,  // timestamp when trading phase began
   *   tradersActed: string[],           // player IDs who have traded or passed
   *   hostId: string,
   * }
   */

  // ── Utility ──────────────────────────────────────────────

  function generateGameCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  function generatePlayerId() {
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /**
   * Build initial game state for a new game.
   */
  function createInitialState({ gameCode, hostId, hostNickname, fairPrice, totalRounds }) {
    return {
      _version: 0,
      _updatedAt: Date.now(),
      gameCode,
      status: 'lobby',
      fairPrice,          // only used at end
      totalRounds,
      currentRound: 0,
      players: {
        [hostId]: {
          id: hostId,
          nickname: hostNickname,
          isHost: true,
          position: 0,
          cost: 0,
          joinedAt: Date.now(),
        }
      },
      quoteOrder: [hostId],
      roundHistory: [],
      currentRoundQuotes: {},
      currentRoundTrades: [],
      tradingStartedAt: null,
      tradersActed: [],
      hostId,
    };
  }

  /**
   * Add a player to the game state.
   * Returns null if game is full or not in lobby.
   */
  function addPlayer(state, playerId, nickname) {
    const playerCount = Object.keys(state.players).length;
    if (playerCount >= CONFIG.MAX_PLAYERS) return null;
    if (state.status !== 'lobby') return null;

    const newState = deepClone(state);
    newState.players[playerId] = {
      id: playerId,
      nickname,
      isHost: false,
      position: 0,
      cost: 0,
      joinedAt: Date.now(),
    };
    newState.quoteOrder.push(playerId);
    return newState;
  }

  /**
   * Start the game — move to first round quoting phase.
   * Requires at least MIN_PLAYERS.
   */
  function startGame(state) {
    const playerIds = Object.keys(state.players);
    if (playerIds.length < CONFIG.MIN_PLAYERS) return null;

    const newState = deepClone(state);
    newState.status = 'quoting';
    newState.currentRound = 1;
    newState.quoteOrder = playerIds; // initial order = join order
    newState.currentRoundQuotes = {};
    newState.currentRoundTrades = [];
    newState.tradingStartedAt = null;
    newState.tradersActed = [];
    return newState;
  }

  /**
   * Rotate quote order for the next round.
   * The player who quoted first moves to the end.
   */
  function rotateQuoteOrder(order) {
    if (order.length <= 1) return order;
    return [...order.slice(1), order[0]];
  }

  /**
   * Submit a quote for a player this round.
   * Validates: must be their turn, haven't quoted yet, ask > bid if both given.
   */
  function submitQuote(state, playerId, bid, ask) {
    if (state.status !== 'quoting') return null;
    if (state.currentRoundQuotes[playerId] !== undefined) return null;

    // Check it's this player's turn
    const quoteIndex = getCurrentQuoteIndex(state);
    if (state.quoteOrder[quoteIndex] !== playerId) return null;

    // Validate bid < ask
    if (bid !== null && ask !== null && bid >= ask) return null;

    const newState = deepClone(state);
    newState.currentRoundQuotes[playerId] = { bid, ask, skipped: (bid === null && ask === null) };

    // Check if all players have quoted → advance to trading
    if (_allPlayersQuoted(newState)) {
      newState.status = 'trading';
      newState.tradingStartedAt = Date.now();
    }

    return newState;
  }

  /**
   * Skip quoting (player chooses "do not quote").
   */
  function skipQuote(state, playerId) {
    return submitQuote(state, playerId, null, null);
  }

  /**
   * Get the index in quoteOrder of who should quote next.
   */
  function getCurrentQuoteIndex(state) {
    return Object.keys(state.currentRoundQuotes).length;
  }

  function _allPlayersQuoted(state) {
    return state.quoteOrder.every(pid => state.currentRoundQuotes[pid] !== undefined);
  }

  /**
   * Execute a trade.
   * party buys from / sells to counterparty.
   *
   * direction: 'buy' → party buys from counterparty at counterparty's ask
   * direction: 'sell' → party sells to counterparty at counterparty's bid
   *
   * Returns updated state or null if trade invalid.
   */
  function executeTrade(state, partyId, counterpartyId, direction) {
    if (state.status !== 'trading') return null;
    if (partyId === counterpartyId) return null;

    // Each player can only trade once per round
    if (state.tradersActed.includes(partyId)) return null;

    const cpQuote = state.currentRoundQuotes[counterpartyId];
    if (!cpQuote || cpQuote.skipped) return null;

    let price, partyDir;
    if (direction === 'buy') {
      // Party buys from counterparty at counterparty's ask
      if (cpQuote.ask === null) return null;
      price = cpQuote.ask;
      partyDir = 'Long';
    } else {
      // Party sells to counterparty at counterparty's bid
      if (cpQuote.bid === null) return null;
      price = cpQuote.bid;
      partyDir = 'Short';
    }

    const newState = deepClone(state);

    // Update party
    const pParty = newState.players[partyId];
    if (direction === 'buy') {
      pParty.position += 1;
      pParty.cost     += price; // paid price (positive cost)
    } else {
      pParty.position -= 1;
      pParty.cost     -= price; // received price (negative cost)
    }

    // Update counterparty (takes the other side)
    const pCounter = newState.players[counterpartyId];
    if (direction === 'buy') {
      // Counterparty sells 1 unit to party
      pCounter.position -= 1;
      pCounter.cost     -= price;
    } else {
      // Counterparty buys 1 unit from party
      pCounter.position += 1;
      pCounter.cost     += price;
    }

    // Log the trade
    newState.currentRoundTrades.push({
      party: partyId,
      counterparty: counterpartyId,
      direction: partyDir,
      price,
      at: Date.now(),
    });

    newState.tradersActed.push(partyId);

    return newState;
  }

  /**
   * Player passes (does nothing in trading phase).
   */
  function passTrade(state, playerId) {
    if (state.status !== 'trading') return null;
    if (state.tradersActed.includes(playerId)) return null;

    const newState = deepClone(state);
    newState.tradersActed.push(playerId);
    return newState;
  }

  /**
   * Check if trading time is up OR all players have acted.
   */
  function isTradingOver(state) {
    if (state.status !== 'trading') return false;
    const allActed = state.quoteOrder.every(pid => state.tradersActed.includes(pid));
    if (allActed) return true;
    if (!state.tradingStartedAt) return false;
    const elapsed = (Date.now() - state.tradingStartedAt) / 1000;
    return elapsed >= CONFIG.TRADING_PHASE_SECONDS;
  }

  /**
   * Close the trading phase:
   * - calculate standings for this round
   * - push to roundHistory
   * - set status to round_end
   */
  function closeTradingPhase(state) {
    if (state.status !== 'trading') return null;

    const newState = deepClone(state);
    newState.status = 'round_end';

    // Calculate standings
    const standings = calculateStandings(newState);

    // Build trade list with nicknames for the log
    const trades = newState.currentRoundTrades.map(t => ({
      party: newState.players[t.party]?.nickname || t.party,
      counterparty: newState.players[t.counterparty]?.nickname || t.counterparty,
      direction: t.direction,
      price: t.price,
    }));

    newState.roundHistory.push({
      round: newState.currentRound,
      quotes: { ...newState.currentRoundQuotes },
      trades,
      standings,
    });

    return newState;
  }

  /**
   * Advance to the next round (or finish the game).
   */
  function advanceRound(state) {
    if (state.status !== 'round_end') return null;

    const newState = deepClone(state);

    if (newState.currentRound >= newState.totalRounds) {
      newState.status = 'finished';
      return newState;
    }

    newState.currentRound += 1;
    newState.status = 'quoting';
    newState.quoteOrder = rotateQuoteOrder(newState.quoteOrder);
    newState.currentRoundQuotes = {};
    newState.currentRoundTrades = [];
    newState.tradingStartedAt = null;
    newState.tradersActed = [];

    return newState;
  }

  // ── PnL Calculation ──────────────────────────────────────

  /**
   * Calculate per-player standings (payoff) after current positions.
   * Uses the confirmed formula from spreadsheet analysis:
   *
   *   Red/Cre = |pos| × 0.50  (long)
   *           = |pos| × 0.25  (short)
   *           = 0             (flat)
   *
   *   Payoff = pos × fairPrice - cost - Red/Cre
   */
  function calculateStandings(state) {
    const fp = state.fairPrice;
    const standings = {};

    for (const [id, player] of Object.entries(state.players)) {
      const pos  = player.position;
      const cost = player.cost;
      const absPos = Math.abs(pos);

      let redCre = 0;
      if (pos > 0) redCre = absPos * CONFIG.RC_LONG_PER_UNIT;
      else if (pos < 0) redCre = absPos * CONFIG.RC_SHORT_PER_UNIT;

      const payoff = pos * fp - cost - redCre;

      standings[id] = {
        nickname: player.nickname,
        position: pos,
        cost: round2(cost),
        redCre: round2(redCre),
        payoff: round2(payoff),
      };
    }

    return standings;
  }

  /**
   * Get cumulative payoff per round for the profit chart.
   * Returns { [nickname]: [payoff_r1, payoff_r2, ...] }
   */
  function getCumulativePayoffs(state) {
    const result = {};
    for (const rh of state.roundHistory) {
      for (const [id, s] of Object.entries(rh.standings)) {
        const nick = s.nickname;
        if (!result[nick]) result[nick] = [];
        result[nick].push(s.payoff);
      }
    }
    return result;
  }

  // ── Helpers ──────────────────────────────────────────────

  function round2(n) { return Math.round(n * 100) / 100; }

  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  // Expose
  return {
    generateGameCode,
    generatePlayerId,
    createInitialState,
    addPlayer,
    startGame,
    submitQuote,
    skipQuote,
    getCurrentQuoteIndex,
    executeTrade,
    passTrade,
    isTradingOver,
    closeTradingPhase,
    advanceRound,
    calculateStandings,
    getCumulativePayoffs,
    deepClone,
    round2,
  };
})();
