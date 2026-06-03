# 🛡️ MindArmor

A sleek, dark-mode **mental health & resilience dashboard**. MindArmor helps you
track your daily wellbeing, understand how you handle conflict, and find trusted
support — all in one calm, focused interface.

![tabs: Vibe Tracker · Communication Shield · The Vault](https://img.shields.io/badge/tabs-Vibe%20Tracker%20%C2%B7%20Communication%20Shield%20%C2%B7%20The%20Vault-7c5cff)

---

## ✨ Features

### 📊 Vibe Tracker
- Log a daily **stress level (1–10)** with a live color-coded slider.
- Check off **self-care activities** completed (sleep, exercise, mindfulness, nutrition, connection, time outdoors, journaling, hydration).
- Entries are **saved to a SQLite database** and shown in a beautifully styled
  **history feed with visual progress rings**.
- A stat strip surfaces your entry count, average stress, logging **streak**, and most-frequent habit.

### 🗣️ Communication Shield
- An interactive **5-question scenario quiz** that evaluates your conflict style:
  **Assertive · Passive · Aggressive**.
- Animated progress, back-navigation, and a detailed end-of-quiz **analysis** with
  a style breakdown, strengths, and personalized growth tips.

### 🔐 The Vault
- An expandable **education matrix** covering the signs/symptoms of **clinical
  depression**, the behaviors/dangers of **drug addiction**, and habits for
  **building resilience**.
- A brightly highlighted **Emergency Support Hub** listing **suicide warning
  signs** and active **crisis hotlines** with one-tap call/text buttons.

---

## 🚀 Getting started

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

Set a custom port with `PORT=4000 npm start`.

> Run with auto-reload during development: `npm run dev`

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
│   ├── data.js        # Quiz, vault content & crisis resources
│   └── app.js         # All client-side interactivity
└── data/              # SQLite database (gitignored, auto-created)
```

### API

| Method | Endpoint               | Purpose |
|--------|------------------------|---------|
| `GET`  | `/api/vibes`           | List check-ins |
| `POST` | `/api/vibes`           | Create a check-in |
| `DELETE` | `/api/vibes/:id`     | Delete a check-in |
| `GET`  | `/api/vibes/stats`     | Aggregate stats (avg, streak, top habit) |
| `GET`  | `/api/quiz/results`    | List saved quiz results |
| `POST` | `/api/quiz/results`    | Save a quiz result |

---

## ⚠️ Disclaimer

MindArmor is an **educational tool**, not a substitute for professional medical
advice, diagnosis, or treatment. If you're in crisis, call or text **988** (US
Suicide & Crisis Lifeline) or find a local helpline at
[findahelpline.com](https://findahelpline.com).
