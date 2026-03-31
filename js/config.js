/**
 * config.js
 * ─────────────────────────────────────────────────────────
 * Game configuration for Market Making AZ.
 *
 * SECRETS (API key, bin ID) are NOT stored here.
 * They are fetched from /api/config at startup (see app.js → init()).
 * Set them as environment variables in Vercel:
 *
 *   JSONBIN_API_KEY    → your JSONBin Master Key
 *   JSONBIN_INDEX_BIN  → your pre-created index bin ID
 *
 * Everything else is safe to edit here directly.
 */

const CONFIG = {
  // ── JSONBin base URL (never changes) ──────────────────
  JSONBIN_BASE_URL: 'https://api.jsonbin.io/v3',

  // Populated at runtime by app.js → init() from /api/config
  JSONBIN_API_KEY:   null,
  JSONBIN_INDEX_BIN: null,

  // ── Polling ───────────────────────────────────────────
  // How often (ms) clients poll JSONBin for updates.
  // 1500ms = good balance of responsiveness vs API quota.
  POLL_MS: 1500,

  // ── Game Constants ────────────────────────────────────
  TRADING_PHASE_SECONDS: 60,
  MAX_PLAYERS: 10,
  MIN_PLAYERS: 2,
  ROUND_OPTIONS: [6, 7, 8, 9, 10],

  // ── PnL Calculation Constants ─────────────────────────
  // Verified against all 9 rounds of the reference spreadsheet.
  // Long position:  Red/Cre = |pos| × 0.50
  // Short position: Red/Cre = |pos| × 0.25
  RC_LONG_PER_UNIT:  0.5,
  RC_SHORT_PER_UNIT: 0.25,

  // ── Safety timeout ────────────────────────────────────
  HOST_TIMEOUT_MS: 120000,

  // ── Debug ─────────────────────────────────────────────
  DEBUG: false,
};
