/**
 * app.js
 * ─────────────────────────────────────────────────────────
 * Main application controller for Market Making AZ.
 *
 * GitHub Pages build: secrets come from js/secrets.js (gitignored).
 * See js/secrets.example.js for setup instructions.
 */

const app = (() => {

  // ── Session state ─────────────────────────────────────────
  let _myId     = null;
  let _gameCode = null;
  let _binId    = null;
  let _state    = null;
  let _rounds   = 8;

  // ── Initialisation ────────────────────────────────────────

  async function init() {
    UI.setLoading(true);

    // Validate secrets are present
    if (!CONFIG.JSONBIN_API_KEY || CONFIG.JSONBIN_API_KEY.includes('PASTE')) {
      UI.setLoading(false);
      UI.showScreen('screen-landing');
      UI.toast('Missing secrets.js — see js/secrets.example.js for setup', true);
      console.error(
        '[init] js/secrets.js is missing or has placeholder values.\n' +
        'Copy js/secrets.example.js → js/secrets.js and fill in your JSONBin credentials.'
      );
      return;
    }

    try {
      await _restoreSession();
    } finally {
      UI.setLoading(false);
    }
  }

  async function _restoreSession() {
    _myId     = sessionStorage.getItem('mmaz_myId');
    _gameCode = sessionStorage.getItem('mmaz_gameCode');
    _binId    = sessionStorage.getItem('mmaz_binId');

    if (_myId && _gameCode && _binId) {
      try {
        const state = await JSONBIN.readGameState(_binId);
        if (state && state.players && state.players[_myId]) {
          _state = state;
          _startPolling();
          _syncToState(state);
          return;
        }
      } catch (e) { /* fall through */ }
    }

    _clearSession();
    UI.showScreen('screen-landing');
  }

  function _saveSession() {
    sessionStorage.setItem('mmaz_myId',     _myId);
    sessionStorage.setItem('mmaz_gameCode', _gameCode);
    sessionStorage.setItem('mmaz_binId',    _binId);
  }

  function _clearSession() {
    sessionStorage.removeItem('mmaz_myId');
    sessionStorage.removeItem('mmaz_gameCode');
    sessionStorage.removeItem('mmaz_binId');
    JSONBIN.stopPolling();
  }

  // ── Polling ───────────────────────────────────────────────

  function _startPolling() {
    JSONBIN.startPolling(_binId, _onStateUpdate);
  }

  function _onStateUpdate(newState) {
    if (!newState) return;
    _state = newState;
    _syncToState(newState);
  }

  function _syncToState(state) {
    switch (state.status) {
      case 'lobby':
        UI.showScreen('screen-lobby');
        UI.renderLobby(state, _myId);
        break;
      case 'quoting':
        UI.showScreen('screen-round');
        UI.renderRoundScreen(state, _myId);
        break;
      case 'trading':
        UI.showScreen('screen-trading');
        UI.renderTradingScreen(state, _myId);
        UI.renderTradeLog(state, _myId);
        if (state.tradingStartedAt) {
          UI.startTradeTimer(state.tradingStartedAt, _onTimerExpire);
        }
        break;
      case 'round_end':
        UI.stopTradeTimer();
        UI.showScreen('screen-round-end');
        UI.renderRoundEnd(state, _myId);
        break;
      case 'finished':
        UI.stopTradeTimer();
        UI.showScreen('screen-results');
        UI.renderResults(state, _myId);
        break;
    }
  }

  // ── Timer expiry ──────────────────────────────────────────

  async function _onTimerExpire() {
    if (_state && GAME.isTradingOver(_state)) {
      try {
        await JSONBIN.updateGameState(_binId, (current) => {
          if (current.status !== 'trading') return null;
          return GAME.closeTradingPhase(current);
        });
      } catch (e) {
        console.warn('Timer close trading failed:', e);
      }
    }
  }

  // ── Screen navigation ─────────────────────────────────────

  function showLanding() {
    _clearSession();
    _state = null;
    UI.stopTradeTimer();
    UI.showScreen('screen-landing');
  }

  function showHostSetup() { UI.showScreen('screen-host-setup'); }
  function showJoin()      { UI.showScreen('screen-join'); }

  function selectRounds(n) {
    _rounds = n;
    document.querySelectorAll('.round-opt').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.rounds) === n);
    });
  }

  // ── Host flow ─────────────────────────────────────────────

  async function createGame() {
    const nickname  = document.getElementById('host-nickname').value.trim();
    const fairPrice = parseFloat(document.getElementById('host-fair-price').value);

    if (!nickname)                          { UI.toast('Enter your nickname', true); return; }
    if (isNaN(fairPrice) || fairPrice <= 0) { UI.toast('Enter a valid fair price', true); return; }

    UI.setLoading(true);
    try {
      _myId     = GAME.generatePlayerId();
      _gameCode = GAME.generateGameCode();

      const initialState = GAME.createInitialState({
        gameCode: _gameCode,
        hostId: _myId,
        hostNickname: nickname,
        fairPrice,
        totalRounds: _rounds,
      });

      _binId = await JSONBIN.createGameBin(initialState);
      _state = initialState;

      await JSONBIN.registerGame(_gameCode, _binId);

      _saveSession();
      _startPolling();

      UI.showScreen('screen-lobby');
      UI.renderLobby(initialState, _myId);
      UI.toast('Game created! Code: ' + _gameCode);
    } catch (e) {
      console.error(e);
      UI.toast('Failed to create game — check secrets.js', true);
    } finally {
      UI.setLoading(false);
    }
  }

  async function startGame() {
    if (!_state) return;
    if (Object.keys(_state.players).length < CONFIG.MIN_PLAYERS) {
      UI.toast('Need at least ' + CONFIG.MIN_PLAYERS + ' players', true);
      return;
    }
    UI.setLoading(true);
    try {
      await JSONBIN.updateGameState(_binId, (current) => {
        if (current.status !== 'lobby') return null;
        return GAME.startGame(current);
      });
    } catch (e) {
      UI.toast('Failed to start game', true);
    } finally {
      UI.setLoading(false);
    }
  }

  // ── Join flow ─────────────────────────────────────────────

  async function joinGame() {
    const code     = document.getElementById('join-code').value.trim().toUpperCase();
    const nickname = document.getElementById('join-nickname').value.trim();

    if (!code || code.length !== 5) { UI.toast('Enter a 5-digit game code', true); return; }
    if (!nickname)                  { UI.toast('Enter your nickname', true); return; }

    UI.setLoading(true);
    try {
      const binId = await JSONBIN.resolveGame(code);
      if (!binId) { UI.toast('Game code not found', true); return; }

      _binId = binId;
      const current = await JSONBIN.readGameState(_binId);

      if (!current)                   { UI.toast('Game not found', true); return; }
      if (current.status !== 'lobby') { UI.toast('Game already in progress', true); return; }
      if (Object.keys(current.players).length >= CONFIG.MAX_PLAYERS) {
        UI.toast('Game is full', true); return;
      }

      const taken = Object.values(current.players)
        .some(p => p.nickname.toLowerCase() === nickname.toLowerCase());
      if (taken) { UI.toast('Nickname already taken', true); return; }

      _myId     = GAME.generatePlayerId();
      _gameCode = code;

      await JSONBIN.updateGameState(_binId, (s) => GAME.addPlayer(s, _myId, nickname));

      _saveSession();
      _startPolling();

      const fresh = await JSONBIN.readGameState(_binId);
      _state = fresh;
      UI.showScreen('screen-lobby');
      UI.renderLobby(fresh, _myId);
      UI.toast('Joined game ' + code + '!');
    } catch (e) {
      console.error(e);
      UI.toast('Failed to join game', true);
    } finally {
      UI.setLoading(false);
    }
  }

  // ── Quoting Phase ─────────────────────────────────────────

  async function submitQuote() {
    if (!_state) return;
    const bid = parseFloat(document.getElementById('my-bid').value);
    const ask = parseFloat(document.getElementById('my-ask').value);

    if (isNaN(bid) || isNaN(ask)) { UI.toast('Enter bid and ask prices', true); return; }
    if (bid >= ask)               { UI.toast('Bid must be lower than ask', true); return; }

    UI.setLoading(true);
    try {
      await JSONBIN.updateGameState(_binId, (current) =>
        GAME.submitQuote(current, _myId, bid, ask)
      );
      document.getElementById('my-bid').value = '';
      document.getElementById('my-ask').value = '';
    } catch (e) {
      UI.toast('Failed to submit quote', true);
    } finally {
      UI.setLoading(false);
    }
  }

  async function skipQuote() {
    if (!_state) return;
    UI.setLoading(true);
    try {
      await JSONBIN.updateGameState(_binId, (current) =>
        GAME.skipQuote(current, _myId)
      );
    } catch (e) {
      UI.toast('Failed to skip', true);
    } finally {
      UI.setLoading(false);
    }
  }

  // ── Trading Phase ─────────────────────────────────────────

  async function executeTrade(counterpartyId, direction) {
    if (!_state) return;
    if (_state.tradersActed.includes(_myId)) {
      UI.toast('You have already traded this round', true); return;
    }
    UI.setLoading(true);
    try {
      await JSONBIN.updateGameState(_binId, (current) => {
        const s = GAME.executeTrade(current, _myId, counterpartyId, direction);
        if (!s) return null;
        return GAME.isTradingOver(s) ? GAME.closeTradingPhase(s) : s;
      });
    } catch (e) {
      UI.toast('Trade failed', true);
    } finally {
      UI.setLoading(false);
    }
  }

  async function passTrade() {
    if (!_state) return;
    if (_state.tradersActed.includes(_myId)) {
      UI.toast('Already passed this round'); return;
    }
    UI.setLoading(true);
    try {
      await JSONBIN.updateGameState(_binId, (current) => {
        const s = GAME.passTrade(current, _myId);
        if (!s) return null;
        return GAME.isTradingOver(s) ? GAME.closeTradingPhase(s) : s;
      });
    } catch (e) {
      UI.toast('Failed to pass', true);
    } finally {
      UI.setLoading(false);
    }
  }

  // ── Round Advance (Host only) ─────────────────────────────

  async function advanceRound() {
    if (!_state || !_state.players[_myId]?.isHost) return;
    UI.setLoading(true);
    try {
      await JSONBIN.updateGameState(_binId, (current) => {
        if (current.status !== 'round_end') return null;
        return GAME.advanceRound(current);
      });
    } catch (e) {
      UI.toast('Failed to advance round', true);
    } finally {
      UI.setLoading(false);
    }
  }

  // ── History ───────────────────────────────────────────────

  function toggleHistory() { UI.toggleHistory(); }

  // ── Boot ─────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', init);

  return {
    showLanding, showHostSetup, showJoin, selectRounds,
    createGame, startGame, joinGame,
    submitQuote, skipQuote,
    executeTrade, passTrade,
    advanceRound, toggleHistory,
  };
})();
