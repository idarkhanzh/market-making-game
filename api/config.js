/**
 * api/config.js  — Vercel Serverless Function
 * ─────────────────────────────────────────────────────────
 * Reads secret environment variables server-side and returns
 * them as JSON to the frontend. This keeps keys out of source
 * code and out of the browser bundle.
 *
 * Set these in Vercel Dashboard → Project → Settings → Environment Variables:
 *   JSONBIN_API_KEY   →  your JSONBin Master Key  (e.g. $2a$10$abc...)
 *   JSONBIN_INDEX_BIN →  your pre-created index bin ID (e.g. 6630abc123...)
 *
 * The index bin must be created once manually (or via the JSONBin UI).
 * See README for instructions.
 */

export default function handler(req, res) {
  const apiKey  = process.env.JSONBIN_API_KEY;
  const indexBin = process.env.JSONBIN_INDEX_BIN;

  if (!apiKey || apiKey.includes('REPLACE')) {
    return res.status(500).json({
      error: 'JSONBIN_API_KEY environment variable is not set. ' +
             'Add it in Vercel Dashboard → Project → Settings → Environment Variables.'
    });
  }

  if (!indexBin) {
    return res.status(500).json({
      error: 'JSONBIN_INDEX_BIN environment variable is not set. ' +
             'Create a bin manually on jsonbin.io and paste the bin ID here.'
    });
  }

  // Only expose what the frontend needs — never expose more than necessary
  res.status(200).json({
    JSONBIN_API_KEY:  apiKey,
    JSONBIN_INDEX_BIN: indexBin,
  });
}
