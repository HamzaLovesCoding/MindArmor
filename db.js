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

  _db: db,
};
