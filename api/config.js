/**
 * api/config.js — Vercel Serverless Function
 * Returns JSONBin credentials from environment variables.
 */
module.exports = function handler(req, res) {
  const apiKey   = process.env.JSONBIN_API_KEY;
  const indexBin = process.env.JSONBIN_INDEX_BIN;

  if (!apiKey || !indexBin) {
    return res.status(500).json({ error: 'Missing env vars: JSONBIN_API_KEY and/or JSONBIN_INDEX_BIN' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ JSONBIN_API_KEY: apiKey, JSONBIN_INDEX_BIN: indexBin });
};
