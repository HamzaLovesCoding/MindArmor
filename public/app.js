/* ============================================================
   MindArmor — front-end application logic
   ============================================================ */
(function () {
  'use strict';

  const D = window.MA_DATA;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  async function api(path, opts) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  let toastTimer;
  function toast(msg, isError = false) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('error', isError);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function formatDate(iso) {
    // SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC; normalize to a Date.
    const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
    if (Number.isNaN(d.getTime())) return iso;
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    const isYest = d.toDateString() === yest.toDateString();
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (sameDay) return `Today · ${time}`;
    if (isYest) return `Yesterday · ${time}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` · ${time}`;
  }

  // Map a 1–10 stress level to a color + label.
  function stressMeta(level) {
    if (level <= 3) return { color: '#34d399', label: 'Low', bg: 'rgba(52,211,153,0.15)', fg: '#9af0cf' };
    if (level <= 6) return { color: '#fbbf24', label: 'Moderate', bg: 'rgba(251,191,36,0.15)', fg: '#fcdf9b' };
    return { color: '#fb7185', label: 'High', bg: 'rgba(251,113,133,0.15)', fg: '#ffb3c0' };
  }

  // ---------------------------------------------------------------------
  // Tab navigation
  // ---------------------------------------------------------------------
  function initTabs() {
    $$('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        $$('.nav-item').forEach((b) => b.classList.toggle('active', b === btn));
        $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // =====================================================================
  // VIBE TRACKER
  // =====================================================================
  function renderActivityGrid() {
    const grid = $('#activityGrid');
    grid.innerHTML = D.activities.map((a) => `
      <label class="activity-chip" data-key="${a.key}">
        <input type="checkbox" value="${a.key}" />
        <span class="chip-emoji">${a.emoji}</span>
        <span>${escapeHtml(a.label)}</span>
        <span class="chip-tick">✓</span>
      </label>
    `).join('');

    $$('.activity-chip', grid).forEach((chip) => {
      const input = $('input', chip);
      chip.addEventListener('click', (e) => {
        if (e.target !== input) input.checked = !input.checked;
        chip.classList.toggle('checked', input.checked);
      });
    });
  }

  function progressRing(level) {
    const meta = stressMeta(level);
    const pct = level / 10;
    const r = 24;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct);
    return `
      <div class="ring">
        <svg width="56" height="56">
          <circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--ring-track)" stroke-width="6" />
          <circle cx="28" cy="28" r="${r}" fill="none" stroke="${meta.color}" stroke-width="6"
            stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" />
        </svg>
        <span class="ring-text" style="color:${meta.color}">${level}</span>
      </div>`;
  }

  function activityLabel(key) {
    const a = D.activities.find((x) => x.key === key);
    return a ? `${a.emoji} ${a.label}` : key;
  }

  function renderFeed(entries) {
    const feed = $('#vibeFeed');
    $('#feedCount').textContent = entries.length ? `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}` : '';

    if (!entries.length) {
      feed.innerHTML = `<div class="feed-empty">No check-ins yet.<br>Log today's vibe to start your history.</div>`;
      return;
    }

    feed.innerHTML = entries.map((e) => {
      const meta = stressMeta(e.stressLevel);
      const tags = e.activities.length
        ? `<div class="feed-tags">${e.activities.map((k) => `<span class="feed-tag">${escapeHtml(activityLabel(k))}</span>`).join('')}</div>`
        : `<div class="feed-tags"><span class="feed-tag" style="opacity:.6">No activities logged</span></div>`;
      const note = e.note ? `<div class="feed-note">“${escapeHtml(e.note)}”</div>` : '';
      return `
        <div class="feed-item" data-id="${e.id}">
          ${progressRing(e.stressLevel)}
          <div class="feed-body">
            <div class="feed-top">
              <span class="feed-date">${formatDate(e.createdAt)}</span>
              <span class="feed-badge" style="background:${meta.bg};color:${meta.fg}">${meta.label} stress</span>
            </div>
            ${tags}
            ${note}
          </div>
          <button class="feed-del" title="Delete entry" aria-label="Delete entry">🗑</button>
        </div>`;
    }).join('');

    $$('.feed-del', feed).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('.feed-item').dataset.id;
        try {
          await api(`/api/vibes/${id}`, { method: 'DELETE' });
          toast('Entry removed');
          loadVibes();
        } catch (err) {
          toast(err.message, true);
        }
      });
    });
  }

  async function renderStats() {
    try {
      const s = await api('/api/vibes/stats');
      const set = (k, v) => { const el = $(`[data-stat="${k}"]`); if (el) el.textContent = v; };
      set('count', s.count);
      set('avg', s.avgStress == null ? '—' : s.avgStress);
      set('streak', s.currentStreak + (s.currentStreak === 1 ? ' day' : ' days'));
      set('top', s.topActivity ? activityLabel(s.topActivity).split(' ')[0] : '—');
    } catch (_) { /* non-critical */ }
  }

  async function loadVibes() {
    try {
      const { entries } = await api('/api/vibes');
      renderFeed(entries);
      renderStats();
    } catch (err) {
      toast('Could not load history', true);
    }
  }

  function initVibeForm() {
    const slider = $('#stress');
    const readout = $('#stressReadout');
    const updateReadout = () => {
      readout.textContent = slider.value;
      readout.style.color = stressMeta(Number(slider.value)).color;
    };
    slider.addEventListener('input', updateReadout);
    updateReadout();

    $('#vibeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const stressLevel = Number(slider.value);
      const activities = $$('#activityGrid input:checked').map((i) => i.value);
      const note = $('#note').value.trim();
      try {
        await api('/api/vibes', {
          method: 'POST',
          body: JSON.stringify({ stressLevel, activities, note }),
        });
        toast('Check-in saved 🎉');
        // Reset form
        $$('#activityGrid .activity-chip').forEach((c) => {
          c.classList.remove('checked');
          $('input', c).checked = false;
        });
        $('#note').value = '';
        slider.value = 5;
        updateReadout();
        loadVibes();
      } catch (err) {
        toast(err.message, true);
      }
    });
  }

  // =====================================================================
  // COMMUNICATION SHIELD (quiz)
  // =====================================================================
  const quizState = { index: 0, answers: [] };

  function renderQuizIntro() {
    const card = $('#quizCard');
    card.innerHTML = `
      <div class="quiz-intro">
        <div class="quiz-emoji">🗣️</div>
        <h2>What's your communication style?</h2>
        <p>Answer 5 quick scenarios honestly — there are no wrong answers.
           We'll map your responses to one of three styles and share a personalized breakdown.</p>
        <button class="btn btn-primary" id="quizStart">Start the quiz</button>
      </div>`;
    $('#quizStart').addEventListener('click', () => {
      quizState.index = 0;
      quizState.answers = [];
      renderQuizQuestion();
    });
  }

  function renderQuizQuestion() {
    const card = $('#quizCard');
    const q = D.quiz[quizState.index];
    const total = D.quiz.length;
    const pct = (quizState.index / total) * 100;

    card.innerHTML = `
      <div class="quiz-progress">
        <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
        <div class="quiz-progress-text">Question ${quizState.index + 1} of ${total}</div>
      </div>
      <div class="quiz-scenario">${escapeHtml(q.scenario)}</div>
      <div class="quiz-question">${escapeHtml(q.question)}</div>
      <div class="quiz-options">
        ${q.options.map((o, i) => `<button class="quiz-option" data-i="${i}">${escapeHtml(o.text)}</button>`).join('')}
      </div>
      <div class="quiz-nav">
        ${quizState.index > 0 ? '<button class="btn btn-ghost" id="quizBack">← Back</button>' : '<span></span>'}
      </div>`;

    $$('.quiz-option', card).forEach((btn) => {
      btn.addEventListener('click', () => {
        const choice = Number(btn.dataset.i);
        quizState.answers[quizState.index] = q.options[choice].style;
        if (quizState.index < total - 1) {
          quizState.index += 1;
          renderQuizQuestion();
        } else {
          finishQuiz();
        }
      });
    });

    const back = $('#quizBack');
    if (back) back.addEventListener('click', () => {
      quizState.index -= 1;
      renderQuizQuestion();
    });
  }

  function tallyStyle(answers) {
    const scores = { Assertive: 0, Passive: 0, Aggressive: 0 };
    answers.forEach((s) => { scores[s] = (scores[s] || 0) + 1; });
    // Determine dominant style; tie-break favors the healthier style order.
    const order = ['Assertive', 'Passive', 'Aggressive'];
    let dominant = order[0];
    let best = -1;
    order.forEach((s) => { if (scores[s] > best) { best = scores[s]; dominant = s; } });
    return { scores, dominant };
  }

  async function finishQuiz() {
    const { scores, dominant } = tallyStyle(quizState.answers);
    const info = D.styles[dominant];
    const total = D.quiz.length;

    const card = $('#quizCard');
    card.innerHTML = `
      <div class="result-head">
        <div class="quiz-scenario">Your dominant style</div>
        <div class="result-style ${dominant}">${dominant}</div>
        <div class="result-tagline">${escapeHtml(info.tagline)}</div>
      </div>

      <div class="result-bars">
        ${['Assertive', 'Passive', 'Aggressive'].map((s) => {
          const val = scores[s] || 0;
          const pct = Math.round((val / total) * 100);
          return `
            <div class="result-bar-row">
              <span>${s}</span>
              <div class="result-bar-track"><div class="result-bar-fill ${s}" style="width:0%" data-w="${pct}"></div></div>
              <span class="result-bar-val">${pct}%</span>
            </div>`;
        }).join('')}
      </div>

      <div class="result-analysis">
        <h3>What this means</h3>
        <p>${escapeHtml(info.summary)}</p>
        <h3>Your strengths</h3>
        <ul>${info.strengths.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
        <h3>Where to grow</h3>
        <ul>${info.growth.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      </div>

      <div class="quiz-nav">
        <button class="btn btn-ghost" id="quizRetake">↺ Retake quiz</button>
      </div>`;

    // Animate bars in.
    requestAnimationFrame(() => {
      $$('.result-bar-fill', card).forEach((b) => { b.style.width = b.dataset.w + '%'; });
    });

    $('#quizRetake').addEventListener('click', renderQuizIntro);

    // Persist result (best-effort).
    try {
      await api('/api/quiz/results', {
        method: 'POST',
        body: JSON.stringify({ style: dominant, scores }),
      });
    } catch (_) { /* non-critical */ }
  }

  // =====================================================================
  // THE VAULT
  // =====================================================================
  function renderVault() {
    // Warning signs
    $('#warningSigns').innerHTML = D.warningSigns
      .map((s) => `<li>${escapeHtml(s)}</li>`).join('');

    // Hotlines
    $('#hotlineGrid').innerHTML = D.hotlines.map((h) => {
      const actions = [];
      if (h.call) actions.push(`<a class="hotline-btn call" href="${h.call}">${escapeHtml(h.callLabel || 'Call')}</a>`);
      if (h.text) actions.push(`<a class="hotline-btn text" href="${h.text}">${escapeHtml(h.textLabel || 'Text')}</a>`);
      if (h.link) actions.push(`<a class="hotline-btn text" href="${h.link}" target="_blank" rel="noopener">${escapeHtml(h.linkLabel || 'Open')}</a>`);
      return `
        <div class="hotline">
          <div class="hotline-name">${escapeHtml(h.name)}</div>
          <div class="hotline-desc">${escapeHtml(h.desc)}</div>
          <div class="hotline-actions">${actions.join('')}</div>
        </div>`;
    }).join('');

    // Education matrix
    const matrix = $('#vaultMatrix');
    matrix.innerHTML = D.vault.map((c) => `
      <div class="matrix-card" data-id="${c.id}">
        <div class="matrix-summary" role="button" tabindex="0" aria-expanded="false">
          <div class="matrix-icon">${c.icon}</div>
          <div class="matrix-titles">
            <h3>${escapeHtml(c.title)}</h3>
            <p>${escapeHtml(c.subtitle)}</p>
          </div>
          <span class="matrix-chevron">▼</span>
        </div>
        <div class="matrix-body">
          <div class="matrix-body-inner">
            ${c.sections.map(renderVaultSection).join('')}
          </div>
        </div>
      </div>`).join('');

    $$('.matrix-card', matrix).forEach((card) => {
      const summary = $('.matrix-summary', card);
      const toggle = () => {
        const open = card.classList.toggle('open');
        summary.setAttribute('aria-expanded', String(open));
      };
      summary.addEventListener('click', toggle);
      summary.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  function renderVaultSection(s) {
    if (s.tip) return `<div class="matrix-tip">💡 ${escapeHtml(s.tip)}</div>`;
    let body = '';
    if (s.list) body = `<ul>${s.list.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
    else if (s.text) body = `<p>${escapeHtml(s.text)}</p>`;
    return `<div class="matrix-section">${s.heading ? `<h4>${escapeHtml(s.heading)}</h4>` : ''}${body}</div>`;
  }

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------
  function init() {
    initTabs();
    renderActivityGrid();
    initVibeForm();
    loadVibes();
    renderQuizIntro();
    renderVault();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
