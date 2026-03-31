/**
 * config.js
 * ─────────────────────────────────────────────────────────
 * Game configuration for Market Making AZ (GitHub Pages build).
 *
 * Secrets come from js/secrets.js (gitignored — never committed).
 * See js/secrets.example.js for setup instructions.
 */

const CONFIG = {
  // ── JSONBin ───────────────────────────────────────────
  JSONBIN_BASE_URL:  'https://api.jsonbin.io/v3',

  // Loaded from js/secrets.js at runtime
  get JSONBIN_API_KEY()   { return (typeof SECRETS !== 'undefined') ? SECRETS.JSONBIN_API_KEY   : null; },
  get JSONBIN_INDEX_BIN() { return (typeof SECRETS !== 'undefined') ? SECRETS.JSONBIN_INDEX_BIN : null; },

  // ── Polling ───────────────────────────────────────────
  POLL_MS: 1500,

  // ── Game constants ────────────────────────────────────
  TRADING_PHASE_SECONDS: 60,
  MAX_PLAYERS: 10,
  MIN_PLAYERS: 2,
  ROUND_OPTIONS: [6, 7, 8, 9, 10],

  // ── PnL constants (verified against reference spreadsheet) ──
  RC_LONG_PER_UNIT:  0.5,   // Red/Cre per unit when net long
  RC_SHORT_PER_UNIT: 0.25,  // Red/Cre per unit when net short

  // ── Misc ─────────────────────────────────────────────
  HOST_TIMEOUT_MS: 120000,
  DEBUG: false,
};
