'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const db = require('./db');
const reframe = require('./reframe');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve the i18n bundles as a synchronous script so the UI can translate
// before first paint (no flash of untranslated content). The canonical
// source of truth is messages/<locale>.json at the repo root.
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

// Canonical list of self-care activities the UI knows about. Used to validate
// incoming entries so the database only ever stores known keys.
const KNOWN_ACTIVITIES = new Set([
  'sleep',
  'exercise',
  'mindfulness',
  'nutrition',
  'social',
  'outdoors',
  'journaling',
  'hydration',
]);

// Moods the check-in form offers (single-select). Empty string = no mood.
const KNOWN_MOODS = new Set(['anxious', 'sad', 'angry', 'numb', 'hopeful']);

// ---------------------------------------------------------------------------
// Stress Tracker API
// ---------------------------------------------------------------------------
app.get('/api/stress', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 365);
  res.json({ entries: db.getVibeEntries(limit) });
});

app.post('/api/stress', (req, res) => {
  const { stressLevel, activities, mood, note } = req.body || {};
  const level = Number(stressLevel);

  if (!Number.isInteger(level) || level < 1 || level > 10) {
    return res.status(400).json({ error: 'stressLevel must be an integer between 1 and 10.' });
  }

  const cleanActivities = Array.isArray(activities)
    ? [...new Set(activities.filter((a) => KNOWN_ACTIVITIES.has(a)))]
    : [];

  const cleanMood = KNOWN_MOODS.has(mood) ? mood : '';
  const cleanNote = typeof note === 'string' ? note.slice(0, 500) : '';

  const entry = db.addVibeEntry({ stressLevel: level, activities: cleanActivities, mood: cleanMood, note: cleanNote });
  res.status(201).json({ entry });
});

app.delete('/api/stress/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });
  const removed = db.removeVibeEntry(id);
  if (!removed) return res.status(404).json({ error: 'Entry not found.' });
  res.json({ ok: true });
});

// Lightweight aggregate stats for the dashboard header.
app.get('/api/stress/stats', (req, res) => {
  const entries = db.getVibeEntries(365);
  if (entries.length === 0) {
    return res.json({ count: 0, avgStress: null, currentStreak: 0, topActivity: null });
  }

  const avgStress = entries.reduce((sum, e) => sum + e.stressLevel, 0) / entries.length;

  // Count activity frequency.
  const freq = {};
  for (const e of entries) {
    for (const a of e.activities) freq[a] = (freq[a] || 0) + 1;
  }
  const topActivity = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0] || null;

  // Consecutive-day logging streak.
  const days = new Set(entries.map((e) => e.createdAt.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  // Allow today OR yesterday to seed the streak so a missing "today" log
  // doesn't immediately zero out a real streak.
  const todayKey = cursor.toISOString().slice(0, 10);
  if (!days.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  res.json({
    count: entries.length,
    avgStress: Math.round(avgStress * 10) / 10,
    currentStreak: streak,
    topActivity,
  });
});

// ---------------------------------------------------------------------------
// Guided Reframe (AI-powered CBT). Server-side proxy so the API key never
// reaches the browser; only the single thought is sent to the model.
// ---------------------------------------------------------------------------
app.post('/api/reframe', async (req, res) => {
  const { thought, locale } = req.body || {};
  const text = typeof thought === 'string' ? thought.trim().slice(0, 500) : '';
  if (!text) {
    return res.status(400).json({ error: 'empty', message: 'A thought is required.' });
  }
  const loc = locale === 'es' ? 'es' : 'en';

  // Crisis backstop runs before any model call — guarantees the crisis card
  // even if the model misses it or no API key is configured.
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

// ---------------------------------------------------------------------------
// Health check + SPA fallback
// ---------------------------------------------------------------------------
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
