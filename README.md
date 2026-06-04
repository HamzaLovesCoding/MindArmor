# 🛡️ MindArmor

A sleek, dark-mode **mental health & resilience dashboard**. MindArmor helps you
track your daily wellbeing, reset when stress spikes, and find trusted
support — all in one calm, focused interface.

![tabs: Stress Tracker · Reset Kit · Resources](https://img.shields.io/badge/tabs-Stress%20Tracker%20%C2%B7%20Reset%20Kit%20%C2%B7%20Resources-7c5cff)

---

## ✨ Features

### 📊 Stress Tracker
- Log a daily **stress level (1–10)** with a live color-coded slider.
- Check off **self-care activities** completed (sleep, exercise, mindfulness, nutrition, connection, time outdoors, journaling, hydration).
- Entries are **saved to a SQLite database** and shown in a beautifully styled
  **history feed with visual progress rings**.
- A stat strip surfaces your entry count, average stress, logging **streak**, and most-frequent habit.

### 🌬️ Reset Kit
- Three evidence-based grounding/breathing tools, each launched in a focused
  fullscreen overlay (X or Esc to close):
  - **Box Breathing** — animated 4-4-4-4 square with a cycle goal (1–8). Respects `prefers-reduced-motion`.
  - **5-4-3-2-1 Grounding** — step-by-step sensory anchoring with progress dots.
  - **Progressive Muscle Relaxation** — auto-advancing tense/release sequence with a circular countdown.
- Nothing is saved — the Reset Kit is intentionally ephemeral.

### 📚 Resources
- An expandable **education matrix** covering the signs/symptoms of **clinical
  depression**, the behaviors/dangers of **drug addiction**, and habits for
  **building resilience**.
- A brightly highlighted **Emergency Support Hub** listing **suicide warning
  signs** and active **crisis hotlines** with one-tap call/text buttons.

### 🌐 Bilingual (English / Spanish)
- A sidebar **EN / ES** toggle translates the entire UI — every page, modal,
  and message — instantly, with no page reload.
- The choice persists in `localStorage`. Translations live in
  [`messages/en.json`](messages/en.json) and [`messages/es.json`](messages/es.json)
  and are served to the browser via `/messages.js` so there's no flash of
  untranslated content. Spanish is neutral Latin American (tú form).

---

## 🚀 Getting started (desktop)

You'll need [Node.js](https://nodejs.org) v18+ and Git.

```bash
git clone https://github.com/HamzaLovesCoding/MindArmor.git
cd MindArmor
git checkout claude/mindarmor-mental-health-app-N5SEM
npm install
npm start
```

Then open **http://localhost:3000** in your browser. Press **Ctrl + C** to stop.

- Set a custom port with `PORT=4000 npm start`.
- Run with auto-reload during development: `npm run dev`.

### ⌨️ Keyboard shortcuts

The dashboard is built for desktop — press **1**, **2**, or **3** to jump
straight to the Stress Tracker, Reset Kit, or Resources.

<details>
<summary>Prefer a zero-install browser preview? (GitHub Codespaces)</summary>

The repo ships a [`.devcontainer`](.devcontainer/devcontainer.json), so you can
open it from **github.com → Code → Codespaces → Create codespace on this
branch**. It runs `npm install`, starts the server, and forwards port `3000` —
open it from the **Ports** tab. (Logs at `/tmp/mindarmor.log`.)
</details>

---

## 🧱 Tech stack

| Layer     | Choice |
|-----------|--------|
| Backend   | Node.js + Express |
| Database  | SQLite (`better-sqlite3`, WAL mode) |
| Frontend  | Vanilla HTML/CSS/JS (no build step) |

### Project structure

```
MindArmor/
├── server.js          # Express server + REST API
├── db.js              # SQLite schema + data access layer
├── public/
│   ├── index.html     # Dashboard shell (sidebar + 3 tabs)
│   ├── styles.css     # Dark-mode design system
│   ├── data.js        # Reset Kit, resources content & crisis info
│   └── app.js         # All client-side interactivity
└── data/              # SQLite database (gitignored, auto-created)
```

### API

| Method | Endpoint               | Purpose |
|--------|------------------------|---------|
| `GET`  | `/api/stress`          | List check-ins |
| `POST` | `/api/stress`          | Create a check-in |
| `DELETE` | `/api/stress/:id`    | Delete a check-in |
| `GET`  | `/api/stress/stats`    | Aggregate stats (avg, streak, top habit) |

> The Reset Kit is client-only — it has no API and persists nothing.

---

## ⚠️ Disclaimer

MindArmor is an **educational tool**, not a substitute for professional medical
advice, diagnosis, or treatment. If you're in crisis, call or text **988** (US
Suicide & Crisis Lifeline) or find a local helpline at
[findahelpline.com](https://findahelpline.com).
