'use strict';

// Local development server. In production, MindArmor is deployed on Vercel
// as a static site (`public/`) plus a serverless function (`api/reframe.js`)
// — see vercel.json. Stress tracker entries live in the browser's
// localStorage, so this server doesn't need a database.

const path = require('path');
const fs = require('fs');
const express = require('express');
const reframe = require('./reframe');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// i18n bundle. In production this file is pre-built into public/messages.js
// by scripts/build-messages.js; in dev we generate it on the fly so edits
// to messages/*.json are picked up without a restart.
const MESSAGES_DIR = path.join(__dirname, 'messages');
const LOCALES = ['en', 'es'];
app.get('/messages.js', (req, res) => {
  const bundle = {};
  for (const loc of LOCALES) {
    try {
      bundle[loc] = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${loc}.json`), 'utf8'));
    } catch (_) {
      bundle[loc] = {};
    }
  }
  res.type('application/javascript');
  res.send(`window.MA_MESSAGES = ${JSON.stringify(bundle)};`);
});

// Guided Reframe (AI-powered CBT). Server-side proxy so the API key never
// reaches the browser; only the single thought is sent to the model.
app.post('/api/reframe', async (req, res) => {
  const { thought, locale } = req.body || {};
  const text = typeof thought === 'string' ? thought.trim().slice(0, 500) : '';
  if (!text) {
    return res.status(400).json({ error: 'empty', message: 'A thought is required.' });
  }
  const loc = locale === 'es' ? 'es' : 'en';

  if (reframe.isCrisisThought(text)) {
    return res.json({ result: reframe.CRISIS_RESULT });
  }

  try {
    const result = await reframe.generateReframe({ thought: text, locale: loc });
    res.json({ result });
  } catch (err) {
    if (err && err.code === 'unavailable') {
      return res.status(503).json({ error: 'unavailable' });
    }
    console.error('reframe error:', err && err.message ? err.message : err);
    res.status(502).json({ error: 'api_error' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MindArmor running at http://localhost:${PORT}`);
  });
}

module.exports = app;
