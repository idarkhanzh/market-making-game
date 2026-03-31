/**
 * app.js — Market Making AZ
 * Main application controller.
 */

const app = (() => {

  let _myId     = null;
  let _gameCode = null;
  let _binId    = null;
  let _state    = null;
  let _rounds   = 8;

  // ── Init ──────────────────────────────────────────────────

  async function init() {
    // Show landing FIRST — never block the UI
    UI.showScreen('screen-landing');

    // Try to load config, but cap at 4 seconds no matter what
    const loaded = await _loadConfig();

    if (!loaded) {
      UI.toast('Could not reach server — check Vercel env vars', true);
      return; // landing is already showing, user can still see the page
    }

    // Try to restore an existing session
    await _restoreSession();
  }

  async function _loadConfig() {
    try {
      const res = await Promise.race([
        fetch('/api/config'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('[config] Server error:', body.error);
        return false;
      }

      const cfg = await res.json();
      if (!cfg.JSONBIN_API_KEY || !cfg.JSONBIN_INDEX_BIN) {
        console.error('[config] Missing keys in response');
        return false;
      }

      CONFIG.JSONBIN_API_KEY   = cfg.JSONBIN_API_KEY;
      CONFIG.JSONBIN_INDEX_BIN = cfg.JSONBIN_INDEX_BIN;
      return true;

    } catch (e) {
      console.error('[config] fetch failed:', e.message);
      return false;
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
        // Host cleans up the game bin after a short delay
        if (state.players[_myId]?.isHost) {
          setTimeout(() => _cleanup(), 3000);
        }
        break;
    }
  }

  // ── Cleanup — delete game bin when game ends ──────────────

  async function _cleanup() {
    if (!_binId || !_gameCode) return;
    try {
      // Remove game entry from index
      await JSONBIN.unregisterGame(_gameCode);
      // Delete the game bin itself
      await JSONBIN.deleteGameBin(_binId);
      console.log('[cleanup] Game bin deleted:', _binId);
    } catch (e) {
      console.warn('[cleanup] Failed to delete bin:', e.message);
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

    if (!CONFIG.JSONBIN_API_KEY) {
      UI.toast('Not connected to server — refresh and try again', true); return;
    }

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
      UI.toast('Failed to create game — check Vercel env vars', true);
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

    if (!CONFIG.JSONBIN_API_KEY) {
      UI.toast('Not connected to server — refresh and try again', true); return;
    }

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

  // ── Quoting ───────────────────────────────────────────────

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

  // ── Trading ───────────────────────────────────────────────

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

  // ── Round Advance ─────────────────────────────────────────

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

  function toggleHistory() { UI.toggleHistory(); }

  document.addEventListener('DOMContentLoaded', init);

  return {
    showLanding, showHostSetup, showJoin, selectRounds,
    createGame, startGame, joinGame,
    submitQuote, skipQuote,
    executeTrade, passTrade,
    advanceRound, toggleHistory,
  };
})();
