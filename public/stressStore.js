// MindArmor — client-side stress tracker storage.
// Replaces the former /api/stress endpoints: entries live in localStorage so
// the app deploys as a static site (Vercel) without a database.
(function () {
  'use strict';

  const KEY = 'mindarmor.stress.v1';
  const KNOWN_ACTIVITIES = new Set([
    'sleep', 'exercise', 'mindfulness', 'nutrition',
    'social', 'outdoors', 'journaling', 'hydration',
  ]);
  const KNOWN_MOODS = new Set(['anxious', 'sad', 'angry', 'numb', 'hopeful']);

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function write(entries) {
    localStorage.setItem(KEY, JSON.stringify(entries));
  }

  function sortDesc(entries) {
    return entries.slice().sort((a, b) => {
      if (a.createdAt === b.createdAt) return b.id - a.id;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }

  function addEntry({ stressLevel, activities, mood, note }) {
    const level = Number(stressLevel);
    if (!Number.isInteger(level) || level < 1 || level > 10) {
      throw new Error('stressLevel must be an integer between 1 and 10.');
    }
    const cleanActivities = Array.isArray(activities)
      ? [...new Set(activities.filter((a) => KNOWN_ACTIVITIES.has(a)))]
      : [];
    const cleanMood = KNOWN_MOODS.has(mood) ? mood : '';
    const cleanNote = typeof note === 'string' ? note.slice(0, 500) : '';

    const entry = {
      id: Date.now(),
      stressLevel: level,
      activities: cleanActivities,
      mood: cleanMood,
      note: cleanNote,
      createdAt: new Date().toISOString(),
    };

    const entries = read();
    entries.push(entry);
    write(entries);
    return entry;
  }

  function listEntries(limit = 100) {
    const cap = Math.min(Number(limit) || 100, 365);
    return sortDesc(read()).slice(0, cap);
  }

  function removeEntry(id) {
    const target = Number(id);
    const entries = read();
    const next = entries.filter((e) => e.id !== target);
    if (next.length === entries.length) return false;
    write(next);
    return true;
  }

  function getStats() {
    const entries = read();
    if (entries.length === 0) {
      return { count: 0, avgStress: null, currentStreak: 0, topActivity: null };
    }

    const avgStress = entries.reduce((sum, e) => sum + e.stressLevel, 0) / entries.length;

    const freq = {};
    for (const e of entries) {
      for (const a of e.activities) freq[a] = (freq[a] || 0) + 1;
    }
    const topActivity = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0] || null;

    const days = new Set(entries.map((e) => e.createdAt.slice(0, 10)));
    let streak = 0;
    const cursor = new Date();
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

    return {
      count: entries.length,
      avgStress: Math.round(avgStress * 10) / 10,
      currentStreak: streak,
      topActivity,
    };
  }

  window.MindArmorStore = { addEntry, listEntries, removeEntry, getStats };
})();
