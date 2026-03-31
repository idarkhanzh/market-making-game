/**
 * secrets.example.js  ← COMMIT THIS. Do NOT commit secrets.js.
 * ─────────────────────────────────────────────────────────
 * Setup:
 *   1. Copy this file:  cp js/secrets.example.js js/secrets.js
 *   2. Fill in your real values in secrets.js
 *   3. Never commit secrets.js  (it's in .gitignore)
 *
 * Get credentials at https://jsonbin.io:
 *   - Master Key:  Account → API Keys
 *   - Index Bin:   Create a new bin with content {}  → copy its ID
 */

const SECRETS = {
  JSONBIN_API_KEY:   '',   // e.g. '$2a$10$abc...'
  JSONBIN_INDEX_BIN: '',   // e.g. '6630abc123def456'
};
