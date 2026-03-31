/**
 * jsonbin.js
 * ─────────────────────────────────────────────────────────
 * Wrapper around the JSONBin v3 REST API.
 *
 * The API key and index bin ID come from CONFIG, which is
 * populated at startup by fetching /api/config (Vercel env vars).
 *
 * Architecture:
 *   INDEX BIN  → { "ABCD1": { binId, createdAt }, ... }
 *   GAME BIN   → full GameState object (see game.js)
 *
 * Real-time simulation:
 *   All clients poll their game bin every CONFIG.POLL_MS ms.
 *   When a player acts, they write the new state immediately;
 *   other clients see it on their next poll (~1.5s later).
 */

const JSONBIN = (() => {

  // ── Internal state ─────────────────────────────────────
  let _pollTimer = null;
  let _onUpdate  = null;

  // Index bin ID comes from CONFIG.JSONBIN_INDEX_BIN (env var via /api/config)
  function _indexBinId() { return CONFIG.JSONBIN_INDEX_BIN; }

  // ── Helpers ─────────────────────────────────────────────

  function _headers(includeContent = false) {
    const h = {
      'X-Master-Key': CONFIG.JSONBIN_API_KEY,
      'X-Bin-Private': 'false',   // public bins — no auth needed to read
    };
    if (includeContent) h['Content-Type'] = 'application/json';
    return h;
  }

  async function _request(method, path, body = null) {
    const opts = { method, headers: _headers(!!body) };
    if (body) opts.body = JSON.stringify(body);
    const url = CONFIG.JSONBIN_BASE_URL + path;
    if (CONFIG.DEBUG) console.log(`[JSONBin] ${method} ${url}`, body || '');

    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`JSONBin ${method} ${path} → ${res.status}: ${err}`);
    }
    return res.json();
  }

  // ── Public API ──────────────────────────────────────────

  /**
   * Read the full index map { gameCode: { binId, createdAt } }.
   */
  async function readIndex() {
    try {
      const res = await _request('GET', `/b/${_indexBinId()}/latest`);
      return res.record || {};
    } catch (e) {
      return {};
    }
  }

  /**
   * Register a new game code → bin ID mapping in the index bin.
   */
  async function registerGame(gameCode, binId) {
    const index = await readIndex();
    index[gameCode] = { binId, createdAt: Date.now() };
    await _request('PUT', `/b/${_indexBinId()}`, index);
  }

  /**
   * Resolve a game code to a bin ID. Returns null if not found.
   */
  async function resolveGame(gameCode) {
    const index = await readIndex();
    const entry = index[gameCode.toUpperCase()];
    if (!entry) return null;
    return entry.binId;
  }

  /**
   * Create a new bin for a game. Returns the bin ID.
   */
  async function createGameBin(initialState) {
    const res = await _request('POST', '/b', initialState);
    return res.metadata.id;
  }

  /**
   * Read the current game state from a bin.
   */
  async function readGameState(binId) {
    const res = await _request('GET', `/b/${binId}/latest`);
    return res.record;
  }

  /**
   * Write (replace) the full game state.
   */
  async function writeGameState(binId, state) {
    state._version  = (state._version || 0) + 1;
    state._updatedAt = Date.now();
    await _request('PUT', `/b/${binId}`, state);
    return state;
  }

  /**
   * Perform a state update with retry on version conflict.
   * The `updater` fn receives current state and returns new state.
   */
  async function updateGameState(binId, updater, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const current = await readGameState(binId);
        const updated = await updater(current);
        if (updated === null) return current; // no-op
        return await writeGameState(binId, updated);
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise(r => setTimeout(r, 300 * (i + 1)));
      }
    }
  }

  // ── Polling ─────────────────────────────────────────────

  /**
   * Start polling a game bin for changes.
   * Calls onUpdate(newState) whenever the _version changes.
   */
  function startPolling(binId, onUpdate) {
    stopPolling();
    _onUpdate = onUpdate;
    let lastVersion = -1;

    async function poll() {
      try {
        const state = await readGameState(binId);
        if (state && state._version !== lastVersion) {
          lastVersion = state._version || 0;
          _onUpdate(state);
        }
      } catch (e) {
        if (CONFIG.DEBUG) console.warn('[JSONBin] Poll error:', e);
      }
      _pollTimer = setTimeout(poll, CONFIG.POLL_MS);
    }

    poll(); // immediate first poll
  }

  function stopPolling() {
    if (_pollTimer) { clearTimeout(_pollTimer); _pollTimer = null; }
  }

  // Expose
  return {
    readIndex,
    registerGame,
    resolveGame,
    createGameBin,
    readGameState,
    writeGameState,
    updateGameState,
    startPolling,
    stopPolling,
  };
})();
