'use strict';

const reframe = require('../reframe');

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  return await new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 65536) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (_) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = await readJsonBody(req);
  const text = typeof body.thought === 'string' ? body.thought.trim().slice(0, 500) : '';
  if (!text) {
    res.status(400).json({ error: 'empty', message: 'A thought is required.' });
    return;
  }
  const locale = body.locale === 'es' ? 'es' : 'en';

  if (reframe.isCrisisThought(text)) {
    res.json({ result: reframe.CRISIS_RESULT });
    return;
  }

  try {
    const result = await reframe.generateReframe({ thought: text, locale });
    res.json({ result });
  } catch (err) {
    if (err && err.code === 'unavailable') {
      res.status(503).json({ error: 'unavailable' });
      return;
    }
    console.error('reframe error:', err && err.message ? err.message : err);
    res.status(502).json({ error: 'api_error' });
  }
};
