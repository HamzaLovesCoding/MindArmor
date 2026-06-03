'use strict';

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.MINDARMOR_DB || path.join(__dirname, 'data', 'mindarmor.db');

// Ensure the data directory exists before opening the database file.
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS vibe_entries (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    stress_level  INTEGER NOT NULL CHECK (stress_level BETWEEN 1 AND 10),
    activities    TEXT    NOT NULL DEFAULT '[]',
    note          TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quiz_results (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    style         TEXT    NOT NULL,
    scores        TEXT    NOT NULL DEFAULT '{}',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---------------------------------------------------------------------------
// Prepared statements — Vibe Tracker
// ---------------------------------------------------------------------------
const insertVibe = db.prepare(`
  INSERT INTO vibe_entries (stress_level, activities, note)
  VALUES (@stress_level, @activities, @note)
`);

const listVibes = db.prepare(`
  SELECT id, stress_level, activities, note, created_at
  FROM vibe_entries
  ORDER BY datetime(created_at) DESC, id DESC
  LIMIT @limit
`);

const getVibe = db.prepare(`
  SELECT id, stress_level, activities, note, created_at
  FROM vibe_entries WHERE id = ?
`);

const deleteVibe = db.prepare(`DELETE FROM vibe_entries WHERE id = ?`);

// ---------------------------------------------------------------------------
// Prepared statements — Quiz
// ---------------------------------------------------------------------------
const insertQuiz = db.prepare(`
  INSERT INTO quiz_results (style, scores)
  VALUES (@style, @scores)
`);

const listQuiz = db.prepare(`
  SELECT id, style, scores, created_at
  FROM quiz_results
  ORDER BY datetime(created_at) DESC, id DESC
  LIMIT @limit
`);

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------
function mapVibe(row) {
  if (!row) return null;
  let activities = [];
  try { activities = JSON.parse(row.activities); } catch (_) { activities = []; }
  return {
    id: row.id,
    stressLevel: row.stress_level,
    activities,
    note: row.note,
    createdAt: row.created_at,
  };
}

function mapQuiz(row) {
  if (!row) return null;
  let scores = {};
  try { scores = JSON.parse(row.scores); } catch (_) { scores = {}; }
  return {
    id: row.id,
    style: row.style,
    scores,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
module.exports = {
  addVibeEntry({ stressLevel, activities, note }) {
    const info = insertVibe.run({
      stress_level: stressLevel,
      activities: JSON.stringify(Array.isArray(activities) ? activities : []),
      note: String(note || ''),
    });
    return mapVibe(getVibe.get(info.lastInsertRowid));
  },

  getVibeEntries(limit = 100) {
    return listVibes.all({ limit }).map(mapVibe);
  },

  removeVibeEntry(id) {
    return deleteVibe.run(id).changes > 0;
  },

  addQuizResult({ style, scores }) {
    const info = insertQuiz.run({
      style,
      scores: JSON.stringify(scores || {}),
    });
    return mapQuiz({ id: info.lastInsertRowid, style, scores: JSON.stringify(scores || {}), created_at: new Date().toISOString() });
  },

  getQuizResults(limit = 50) {
    return listQuiz.all({ limit }).map(mapQuiz);
  },

  _db: db,
};
