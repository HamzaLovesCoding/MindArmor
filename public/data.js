/* ============================================================
   MindArmor — structural content (keys, emojis, icons, links).
   All human-readable text lives in messages/<locale>.json and is
   resolved at render time via t(). Exposed on window.MA_DATA.
   ============================================================ */
window.MA_DATA = {
  // Self-care activities — label comes from `activities.<key>`.
  activities: [
    { key: 'sleep',       emoji: '😴' },
    { key: 'exercise',    emoji: '🏃' },
    { key: 'mindfulness', emoji: '🧘' },
    { key: 'nutrition',   emoji: '🥗' },
    { key: 'social',      emoji: '💬' },
    { key: 'outdoors',    emoji: '🌤️' },
    { key: 'journaling',  emoji: '📓' },
    { key: 'hydration',   emoji: '💧' },
  ],

  // Mood options — label comes from `moods.<key>`.
  moods: [
    { key: 'anxious', emoji: '😰' },
    { key: 'sad',     emoji: '😔' },
    { key: 'angry',   emoji: '😠' },
    { key: 'numb',    emoji: '😶' },
    { key: 'hopeful', emoji: '🙂' },
  ],

  // Reset Kit cards — title/desc come from `reset.cards.<key>`.
  resetKit: [
    { key: 'box',       icon: '🫁' },
    { key: 'grounding', icon: '🖐️' },
    { key: 'pmr',       icon: '💪' },
    { key: 'urge',      icon: '🌊' },
  ],

  // Crisis hotlines — name/desc/labels come from `resources.hotlines.<id>`.
  // The hrefs (US numbers / URLs) are the same in every language.
  hotlines: [
    { id: 'lifeline988', call: 'tel:988', text: 'sms:988' },
    { id: 'crisisText',  text: 'sms:741741?body=HOME' },
    { id: 'samhsa',      call: 'tel:18006624357' },
    { id: 'findhelpline', link: 'https://findahelpline.com' },
  ],

  // Education matrix card order + icon — text comes from `resources.cards.<id>`.
  vault: [
    { id: 'depression', icon: '🌧️' },
    { id: 'addiction',  icon: '⛓️' },
    { id: 'resilience', icon: '🌱' },
  ],
};
