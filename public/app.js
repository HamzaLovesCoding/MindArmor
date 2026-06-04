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

  // Inline, contextual status feedback shown beneath the check-in form.
  let statusTimer;
  function notify(msg, isError = false) {
    const el = $('#formStatus');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('error', isError);
    el.classList.add('show');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => el.classList.remove('show'), 3200);
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
  function activateTab(tab) {
    $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function initTabs() {
    $$('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });

    // Desktop keyboard shortcuts: 1 / 2 / 3 jump between tabs.
    const shortcuts = { '1': 'stress', '2': 'reset', '3': 'resources' };
    document.addEventListener('keydown', (e) => {
      if (modalOpen) return; // don't switch tabs behind an open exercise
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const tab = shortcuts[e.key];
      if (tab) { e.preventDefault(); activateTab(tab); }
    });
  }

  // =====================================================================
  // STRESS TRACKER
  // =====================================================================
  function renderActivityGrid() {
    const grid = $('#activityGrid');
    grid.innerHTML = D.activities.map((a) => `
      <div class="activity-chip" data-key="${a.key}" role="checkbox" aria-checked="false" tabindex="0">
        <input type="checkbox" value="${a.key}" tabindex="-1" aria-hidden="true" />
        <span class="chip-emoji">${a.emoji}</span>
        <span>${escapeHtml(a.label)}</span>
        <span class="chip-tick">✓</span>
      </div>
    `).join('');

    // Plain divs (not <label>) so only this handler toggles the checkbox —
    // a <label> would also fire the native toggle, cancelling it out. Each
    // chip is independent, so multiple can be selected.
    $$('.activity-chip', grid).forEach((chip) => {
      const input = $('input', chip);
      const toggle = () => {
        input.checked = !input.checked;
        chip.classList.toggle('checked', input.checked);
        chip.setAttribute('aria-checked', String(input.checked));
      };
      chip.addEventListener('click', toggle);
      chip.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
      });
    });
  }

  // Single-select mood chips. Reuse the self-care chip's active style (.checked).
  function renderMoodGrid() {
    const grid = $('#moodGrid');
    grid.innerHTML = D.moods.map((m) => `
      <div class="activity-chip mood-chip" data-key="${m.key}" role="radio" aria-checked="false" tabindex="0">
        <span class="chip-emoji">${m.emoji}</span>
        <span>${escapeHtml(m.label)}</span>
      </div>
    `).join('');

    const chips = $$('.mood-chip', grid);
    chips.forEach((chip) => {
      const select = () => {
        const wasSelected = chip.classList.contains('checked');
        chips.forEach((c) => { c.classList.remove('checked'); c.setAttribute('aria-checked', 'false'); });
        if (!wasSelected) { chip.classList.add('checked'); chip.setAttribute('aria-checked', 'true'); }
      };
      chip.addEventListener('click', select);
      chip.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); select(); }
      });
    });
  }

  function selectedMood() {
    const chip = $('#moodGrid .mood-chip.checked');
    return chip ? chip.dataset.key : '';
  }

  function clearMood() {
    $$('#moodGrid .mood-chip').forEach((c) => {
      c.classList.remove('checked');
      c.setAttribute('aria-checked', 'false');
    });
  }

  // HALT self-check — moment-in-time tips, nothing persisted.
  function renderHalt() {
    const grid = $('#haltGrid');
    grid.innerHTML = D.halt.map((h) => `
      <div class="activity-chip halt-chip" data-key="${h.key}" role="button" tabindex="0">
        <span class="chip-emoji">${h.emoji}</span>
        <span>${escapeHtml(h.label)}</span>
      </div>
    `).join('');

    const tip = $('#haltTip');
    const chips = $$('.halt-chip', grid);
    chips.forEach((chip) => {
      const item = D.halt.find((h) => h.key === chip.dataset.key);
      const activate = () => {
        const wasActive = chip.classList.contains('checked');
        chips.forEach((c) => c.classList.remove('checked'));
        if (wasActive) {
          tip.hidden = true;
          tip.innerHTML = '';
          return;
        }
        chip.classList.add('checked');
        tip.hidden = false;
        tip.innerHTML = `<span class="halt-tip-text">${escapeHtml(item.tip)}</span>` +
          (item.crisis
            ? `<a class="btn btn-ghost halt-tip-btn" href="sms:741741?body=HOME">Open Crisis Text Line</a>`
            : '');
      };
      chip.addEventListener('click', activate);
      chip.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); activate(); }
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

  function moodMeta(key) {
    return D.moods.find((m) => m.key === key) || null;
  }

  function renderFeed(entries) {
    const feed = $('#stressFeed');
    $('#feedCount').textContent = entries.length ? `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}` : '';

    if (!entries.length) {
      feed.innerHTML = `<div class="feed-empty">No check-ins yet.<br>Log today's check-in to start your history.</div>`;
      return;
    }

    feed.innerHTML = entries.map((e) => {
      const meta = stressMeta(e.stressLevel);
      const tags = e.activities.length
        ? `<div class="feed-tags">${e.activities.map((k) => `<span class="feed-tag">${escapeHtml(activityLabel(k))}</span>`).join('')}</div>`
        : `<div class="feed-tags"><span class="feed-tag" style="opacity:.6">No activities logged</span></div>`;
      const note = e.note ? `<div class="feed-note">“${escapeHtml(e.note)}”</div>` : '';
      const mood = moodMeta(e.mood);
      const moodBadge = mood
        ? `<span class="feed-badge feed-mood">${mood.emoji} ${escapeHtml(mood.label)}</span>`
        : '';
      return `
        <div class="feed-item" data-id="${e.id}">
          ${progressRing(e.stressLevel)}
          <div class="feed-body">
            <div class="feed-top">
              <span class="feed-date">${formatDate(e.createdAt)}</span>
              <span class="feed-badge" style="background:${meta.bg};color:${meta.fg}">${meta.label} stress</span>
              ${moodBadge}
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
          await api(`/api/stress/${id}`, { method: 'DELETE' });
          notify('Entry removed');
          loadStress();
        } catch (err) {
          notify(err.message, true);
        }
      });
    });
  }

  async function renderStats() {
    try {
      const s = await api('/api/stress/stats');
      const set = (k, v) => { const el = $(`[data-stat="${k}"]`); if (el) el.textContent = v; };
      set('count', s.count);
      set('avg', s.avgStress == null ? '—' : s.avgStress);
      set('streak', s.currentStreak + (s.currentStreak === 1 ? ' day' : ' days'));
      set('top', s.topActivity ? activityLabel(s.topActivity).split(' ')[0] : '—');
    } catch (_) { /* non-critical */ }
  }

  async function loadStress() {
    try {
      const { entries } = await api('/api/stress');
      renderFeed(entries);
      renderStats();
    } catch (err) {
      notify('Could not load history', true);
    }
  }

  function initStressForm() {
    const slider = $('#stress');
    const readout = $('#stressReadout');
    const updateReadout = () => {
      readout.textContent = slider.value;
      readout.style.color = stressMeta(Number(slider.value)).color;
    };
    slider.addEventListener('input', updateReadout);
    updateReadout();

    $('#stressForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const stressLevel = Number(slider.value);
      const activities = $$('#activityGrid input:checked').map((i) => i.value);
      const mood = selectedMood();
      const note = $('#note').value.trim();
      try {
        await api('/api/stress', {
          method: 'POST',
          body: JSON.stringify({ stressLevel, activities, mood, note }),
        });
        // Reset form
        $$('#activityGrid .activity-chip').forEach((c) => {
          c.classList.remove('checked');
          c.setAttribute('aria-checked', 'false');
          $('input', c).checked = false;
        });
        clearMood();
        $('#note').value = '';
        slider.value = 5;
        updateReadout();
        loadStress();
        showSuccessState(stressLevel);
      } catch (err) {
        notify(err.message, true);
      }
    });

    // Contextual Reset Kit prompt (shown after a high-stress save).
    $('#resetPromptStart').addEventListener('click', () => {
      hideResetPrompt();
      openExercise('box'); // reuse the Box Breathing modal from Reset Kit
    });
    $('#resetPromptDismiss').addEventListener('click', hideResetPrompt);
    $('#crisisPromptDismiss').addEventListener('click', hideCrisisPrompt);
  }

  // Decide which confirmation to show based on stress severity.
  function showSuccessState(level) {
    hideResetPrompt();
    hideCrisisPrompt();
    const status = $('#formStatus');
    if (status) status.classList.remove('show'); // clear any lingering "saved" text
    if (level >= 9) {
      showCrisisPrompt();
    } else if (level >= 7) {
      showResetPrompt();
    } else {
      notify('Check-in saved ✓');
    }
  }

  function showResetPrompt() {
    $('#resetPrompt').hidden = false;
    $('#resetPromptStart').focus();
  }
  function hideResetPrompt() { $('#resetPrompt').hidden = true; }

  function showCrisisPrompt() {
    $('#crisisPrompt').hidden = false;
    $('#crisisPromptText').focus();
  }
  function hideCrisisPrompt() { $('#crisisPrompt').hidden = true; }

  // =====================================================================
  // RESET KIT (grounding & breathing tools)
  // =====================================================================
  let modalOpen = false;
  let activeCleanup = null;
  let lastTrigger = null;

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // A pausable, delta-time ticker built on requestAnimationFrame.
  function makeTicker(onTick) {
    let raf = null;
    let last = 0;
    let running = false;
    function frame(ts) {
      if (!running) return;
      const dt = ts - last;
      last = ts;
      onTick(dt);
      if (running) raf = requestAnimationFrame(frame);
    }
    return {
      start() {
        if (running) return;
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      },
      pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; },
      stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; },
      get running() { return running; },
    };
  }

  function renderResetKit() {
    const grid = $('#resetGrid');
    grid.innerHTML = D.resetKit.map((ex) => `
      <div class="card reset-card">
        <div class="reset-icon">${ex.icon}</div>
        <h2 class="reset-title">${escapeHtml(ex.title)}</h2>
        <p class="reset-desc">${escapeHtml(ex.desc)}</p>
        <button class="btn btn-primary reset-start" data-ex="${ex.key}">Start</button>
      </div>`).join('');

    $$('.reset-start', grid).forEach((btn) => {
      btn.addEventListener('click', () => openExercise(btn.dataset.ex, btn));
    });

    $('#exerciseClose').addEventListener('click', closeExercise);
    document.addEventListener('keydown', (e) => {
      if (modalOpen && e.key === 'Escape') { e.preventDefault(); closeExercise(); }
    });
  }

  const EXERCISES = { box: exBox, grounding: exGrounding, pmr: exPmr };

  function openExercise(key, trigger) {
    const builder = EXERCISES[key];
    if (!builder) return;
    lastTrigger = trigger || null;
    const stage = $('#exerciseStage');
    stage.innerHTML = '';
    activeCleanup = builder(stage) || null;
    $('#exerciseOverlay').hidden = false;
    document.body.classList.add('modal-open');
    modalOpen = true;
    $('#exerciseClose').focus();
  }

  function closeExercise() {
    if (typeof activeCleanup === 'function') activeCleanup();
    activeCleanup = null;
    $('#exerciseOverlay').hidden = true;
    $('#exerciseStage').innerHTML = '';
    document.body.classList.remove('modal-open');
    modalOpen = false;
    if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
  }

  // ---------- Exercise 1: Box Breathing (4-4-4-4) ----------
  function exBox(stage) {
    const reduce = prefersReducedMotion();
    const phases = [
      { label: 'Breathe in',  dur: 4000, from: 0.6, to: 1.0 },
      { label: 'Hold',        dur: 4000, from: 1.0, to: 1.0 },
      { label: 'Breathe out', dur: 4000, from: 1.0, to: 0.6 },
      { label: 'Hold',        dur: 4000, from: 0.6, to: 0.6 },
    ];
    let goal = 4;
    let cycle = 1;
    let phaseIdx = 0;
    let elapsed = 0;
    let status = 'idle'; // idle | running | paused | done

    stage.innerHTML = `
      <div class="ex ex-box">
        <h2 class="ex-title">Box Breathing</h2>
        <div class="box-wrap">
          <div class="box-square${reduce ? ' static' : ''}" id="boxSquare">
            <span class="box-phase" id="boxPhase">Ready</span>
          </div>
        </div>
        <div class="box-bar" id="boxBar"${reduce ? '' : ' hidden'}>
          <div class="box-bar-fill" id="boxBarFill"></div>
        </div>
        <div class="ex-counter">
          <button class="counter-btn" id="boxMinus" aria-label="Fewer cycles">−</button>
          <span id="boxCounter">Cycle 1 of ${goal}</span>
          <button class="counter-btn" id="boxPlus" aria-label="More cycles">+</button>
        </div>
        <button class="btn btn-primary ex-action" id="boxToggle">Start</button>
      </div>`;

    const square = $('#boxSquare', stage);
    const phaseEl = $('#boxPhase', stage);
    const counterEl = $('#boxCounter', stage);
    const barFill = $('#boxBarFill', stage);
    const toggle = $('#boxToggle', stage);
    const minus = $('#boxMinus', stage);
    const plus = $('#boxPlus', stage);

    if (!reduce) square.style.transform = 'scale(0.6)';

    function setGoal(next) {
      goal = Math.max(1, Math.min(8, next));
      counterEl.textContent = `Cycle ${cycle} of ${goal}`;
    }
    minus.addEventListener('click', () => { if (status === 'idle') setGoal(goal - 1); });
    plus.addEventListener('click', () => { if (status === 'idle') setGoal(goal + 1); });

    const ticker = makeTicker((dt) => {
      elapsed += dt;
      const ph = phases[phaseIdx];
      const p = Math.min(elapsed / ph.dur, 1);
      phaseEl.textContent = ph.label;
      counterEl.textContent = `Cycle ${cycle} of ${goal}`;
      if (reduce) {
        barFill.style.width = `${p * 100}%`;
      } else {
        square.style.transform = `scale(${ph.from + (ph.to - ph.from) * p})`;
      }
      if (elapsed >= ph.dur) {
        phaseIdx += 1;
        if (phaseIdx >= phases.length) {
          if (cycle >= goal) { finish(); return; }
          cycle += 1;
          phaseIdx = 0;
        }
        elapsed = 0;
      }
    });

    function finish() {
      ticker.stop();
      status = 'done';
      stage.innerHTML = `
        <div class="ex ex-done">
          <div class="ex-done-emoji">🌿</div>
          <h2 class="ex-title">Nice work — how do you feel?</h2>
          <button class="btn btn-primary" id="boxDone">Back to toolkit</button>
        </div>`;
      $('#boxDone', stage).addEventListener('click', closeExercise);
    }

    toggle.addEventListener('click', () => {
      if (status === 'idle' || status === 'paused') {
        status = 'running';
        toggle.textContent = 'Pause';
        minus.disabled = true;
        plus.disabled = true;
        ticker.start();
      } else if (status === 'running') {
        status = 'paused';
        toggle.textContent = 'Resume';
        ticker.pause();
      }
    });

    return () => ticker.stop();
  }

  // ---------- Exercise 2: 5-4-3-2-1 Grounding ----------
  function exGrounding(stage) {
    const steps = [
      { n: 5, verb: 'see' },
      { n: 4, verb: 'touch' },
      { n: 3, verb: 'hear' },
      { n: 2, verb: 'smell' },
      { n: 1, verb: 'taste' },
    ];
    const notes = new Array(steps.length).fill(''); // ephemeral, never persisted
    let idx = 0;

    function dots() {
      return `<div class="ground-dots">${steps.map((_, i) =>
        `<span class="dot${i === idx ? ' active' : ''}${i < idx ? ' done' : ''}"></span>`).join('')}</div>`;
    }

    function renderStep() {
      const s = steps[idx];
      const noun = s.n === 1 ? 'thing' : 'things';
      stage.innerHTML = `
        <div class="ex ex-ground">
          ${dots()}
          <div class="gradient-text ground-number">${s.n}</div>
          <p class="ground-prompt">${s.n} ${noun} you can <strong>${s.verb}</strong></p>
          <textarea class="ground-input" id="groundInput" rows="3" placeholder="Optional — name them here…"></textarea>
          <div class="ex-nav">
            <button class="btn btn-ghost" id="groundBack"${idx === 0 ? ' disabled' : ''}>Back</button>
            <button class="btn btn-primary" id="groundNext">${idx < steps.length - 1 ? 'Next' : 'Finish'}</button>
          </div>
        </div>`;
      const input = $('#groundInput', stage);
      input.value = notes[idx];
      input.addEventListener('input', () => { notes[idx] = input.value; });
      $('#groundBack', stage).addEventListener('click', () => { if (idx > 0) { idx -= 1; renderStep(); } });
      $('#groundNext', stage).addEventListener('click', () => {
        if (idx < steps.length - 1) { idx += 1; renderStep(); } else { renderDone(); }
      });
    }

    function renderDone() {
      stage.innerHTML = `
        <div class="ex ex-done">
          <div class="ex-done-emoji">🌎</div>
          <h2 class="ex-title">You're here. You're grounded.</h2>
          <button class="btn btn-primary" id="groundDone">Back to toolkit</button>
        </div>`;
      $('#groundDone', stage).addEventListener('click', closeExercise);
    }

    renderStep();
    return null; // no timers to clean up
  }

  // ---------- Exercise 3: Progressive Muscle Relaxation ----------
  function exPmr(stage) {
    const regions = ['feet', 'calves', 'thighs', 'hands', 'arms', 'shoulders', 'face'];
    const phases = [];
    regions.forEach((r) => {
      phases.push({ region: r, label: `Tense your ${r}`, dur: 5000 });
      phases.push({ region: r, label: 'Release', dur: 10000 });
    });

    let idx = 0;
    let elapsed = 0;
    const R = 52;
    const C = 2 * Math.PI * R;
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    stage.innerHTML = `
      <div class="ex ex-pmr">
        <div class="pmr-ring">
          <svg width="150" height="150" viewBox="0 0 150 150" aria-hidden="true">
            <defs>
              <linearGradient id="pmrGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#7c5cff" />
                <stop offset="100%" stop-color="#22d3ee" />
              </linearGradient>
            </defs>
            <circle cx="75" cy="75" r="${R}" fill="none" stroke="var(--ring-track)" stroke-width="11" />
            <circle cx="75" cy="75" r="${R}" fill="none" stroke="url(#pmrGrad)" stroke-width="11"
              stroke-linecap="round" transform="rotate(-90 75 75)"
              stroke-dasharray="${C}" stroke-dashoffset="0" id="pmrRing" />
          </svg>
          <div class="pmr-center"><span id="pmrSeconds">5</span></div>
        </div>
        <div class="gradient-text pmr-region" id="pmrRegion">Feet</div>
        <div class="pmr-action" id="pmrAction">Tense your feet</div>
        <button class="btn btn-primary ex-action" id="pmrToggle">Pause</button>
      </div>`;

    const ring = $('#pmrRing', stage);
    const secondsEl = $('#pmrSeconds', stage);
    const regionEl = $('#pmrRegion', stage);
    const actionEl = $('#pmrAction', stage);
    const toggle = $('#pmrToggle', stage);

    const ticker = makeTicker((dt) => {
      elapsed += dt;
      const ph = phases[idx];
      const p = Math.min(elapsed / ph.dur, 1);
      ring.style.strokeDashoffset = `${C * p}`;
      secondsEl.textContent = Math.max(0, Math.ceil((ph.dur - elapsed) / 1000));
      regionEl.textContent = cap(ph.region);
      actionEl.textContent = ph.label;
      if (elapsed >= ph.dur) {
        idx += 1;
        if (idx >= phases.length) { finish(); return; }
        elapsed = 0;
      }
    });

    function finish() {
      ticker.stop();
      stage.innerHTML = `
        <div class="ex ex-done">
          <div class="ex-done-emoji">😌</div>
          <h2 class="ex-title">Take a slow breath. You're done.</h2>
          <button class="btn btn-primary" id="pmrDone">Back to toolkit</button>
        </div>`;
      $('#pmrDone', stage).addEventListener('click', closeExercise);
    }

    toggle.addEventListener('click', () => {
      if (ticker.running) { ticker.pause(); toggle.textContent = 'Resume'; }
      else { ticker.start(); toggle.textContent = 'Pause'; }
    });

    ticker.start(); // auto-advances through all regions
    return () => ticker.stop();
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
    renderMoodGrid();
    renderHalt();
    initStressForm();
    loadStress();
    renderResetKit();
    renderVault();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
