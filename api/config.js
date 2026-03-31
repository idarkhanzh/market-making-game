/**
 * api/config.js — Vercel Serverless Function
 * Reads env vars server-side, returns them as JSON to the browser.
 *
 * Set in Vercel: Settings → Environment Variables
 *   JSONBIN_API_KEY    → your JSONBin Master Key
 *   JSONBIN_INDEX_BIN  → your index bin ID
 */

module.exports = function handler(req, res) {
  const apiKey   = process.env.JSONBIN_API_KEY;
  const indexBin = process.env.JSONBIN_INDEX_BIN;

  if (!apiKey) {
    return res.status(500).json({
      error: 'JSONBIN_API_KEY is not set in Vercel Environment Variables.'
    });
  }

  if (!indexBin) {
    return res.status(500).json({
      error: 'JSONBIN_INDEX_BIN is not set in Vercel Environment Variables.'
    });
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    JSONBIN_API_KEY:   apiKey,
    JSONBIN_INDEX_BIN: indexBin,
  });
};
