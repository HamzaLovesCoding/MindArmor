/* ============================================================
   MindArmor — front-end application logic
   ============================================================ */
(function () {
  'use strict';

  const D = window.MA_DATA;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // ---------------------------------------------------------------------
  // i18n
  // ---------------------------------------------------------------------
  const MESSAGES = window.MA_MESSAGES || { en: {}, es: {} };
  const LOCALES = ['en', 'es'];
  const LOCALE_KEY = 'mindarmor.locale';
  let locale = (localStorage.getItem(LOCALE_KEY) === 'es') ? 'es' : 'en';

  function resolve(obj, key) {
    return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }

  // Translate a dot-path key, with {var} interpolation and en fallback.
  function t(key, vars) {
    let val = resolve(MESSAGES[locale], key);
    if (val == null) val = resolve(MESSAGES.en, key);
    if (val == null) return key;
    if (vars && typeof val === 'string') {
      val = val.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    }
    return val;
  }

  // Resolve a key to its raw value (objects/arrays), with en fallback.
  function tData(key) {
    const val = resolve(MESSAGES[locale], key);
    return val != null ? val : resolve(MESSAGES.en, key);
  }

  // Apply translations to all static [data-i18n*] elements in the DOM. If a
  // key can't be resolved (e.g. the bundle failed to load), the existing
  // HTML text is left untouched so the English fallback shows, never a key.
  function applyStaticI18n() {
    document.documentElement.lang = locale;
    const titleVal = t('meta.title');
    if (titleVal !== 'meta.title') document.title = titleVal;
    const setText = (sel, attr, getKey, apply) => {
      $$(sel).forEach((el) => {
        const key = getKey(el);
        const val = t(key);
        if (val !== key) apply(el, val);
      });
    };
    setText('[data-i18n]', null, (el) => el.dataset.i18n, (el, v) => { el.textContent = v; });
    setText('[data-i18n-ph]', null, (el) => el.dataset.i18nPh, (el, v) => el.setAttribute('placeholder', v));
    setText('[data-i18n-title]', null, (el) => el.dataset.i18nTitle, (el, v) => el.setAttribute('title', v));
    setText('[data-i18n-aria]', null, (el) => el.dataset.i18nAria, (el, v) => el.setAttribute('aria-label', v));
  }

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
    const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
    if (sameDay) return `${t('stress.today')} · ${time}`;
    if (isYest) return `${t('stress.yesterday')} · ${time}`;
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) + ` · ${time}`;
  }

  // Map a 1–10 stress level to a color + severity key (label resolved via i18n).
  function stressMeta(level) {
    if (level <= 3) return { color: '#34d399', key: 'low', bg: 'rgba(52,211,153,0.15)', fg: '#9af0cf' };
    if (level <= 6) return { color: '#fbbf24', key: 'moderate', bg: 'rgba(251,191,36,0.15)', fg: '#fcdf9b' };
    return { color: '#fb7185', key: 'high', bg: 'rgba(251,113,133,0.15)', fg: '#ffb3c0' };
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
        <span>${escapeHtml(t('activities.' + a.key))}</span>
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
        <span>${escapeHtml(t('moods.' + m.key))}</span>
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
    return a ? `${a.emoji} ${t('activities.' + key)}` : key;
  }

  function moodMeta(key) {
    return D.moods.find((m) => m.key === key) || null;
  }

  function renderFeed(entries) {
    const feed = $('#stressFeed');
    const word = entries.length === 1 ? t('stress.entry') : t('stress.entries');
    $('#feedCount').textContent = entries.length ? `${entries.length} ${word}` : '';

    if (!entries.length) {
      feed.innerHTML = `<div class="feed-empty">${escapeHtml(t('stress.emptyLine1'))}<br>${escapeHtml(t('stress.emptyLine2'))}</div>`;
      return;
    }

    feed.innerHTML = entries.map((e) => {
      const meta = stressMeta(e.stressLevel);
      const tags = e.activities.length
        ? `<div class="feed-tags">${e.activities.map((k) => `<span class="feed-tag">${escapeHtml(activityLabel(k))}</span>`).join('')}</div>`
        : `<div class="feed-tags"><span class="feed-tag" style="opacity:.6">${escapeHtml(t('stress.noActivities'))}</span></div>`;
      const note = e.note ? `<div class="feed-note">“${escapeHtml(e.note)}”</div>` : '';
      const mood = moodMeta(e.mood);
      const moodBadge = mood
        ? `<span class="feed-badge feed-mood">${mood.emoji} ${escapeHtml(t('moods.' + mood.key))}</span>`
        : '';
      return `
        <div class="feed-item" data-id="${e.id}">
          ${progressRing(e.stressLevel)}
          <div class="feed-body">
            <div class="feed-top">
              <span class="feed-date">${formatDate(e.createdAt)}</span>
              <span class="feed-badge" style="background:${meta.bg};color:${meta.fg}">${escapeHtml(t('stress.badge.' + meta.key))}</span>
              ${moodBadge}
            </div>
            ${tags}
            ${note}
          </div>
          <button class="feed-del" title="${escapeHtml(t('stress.delete'))}" aria-label="${escapeHtml(t('stress.delete'))}">🗑</button>
        </div>`;
    }).join('');

    $$('.feed-del', feed).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('.feed-item').dataset.id;
        try {
          await api(`/api/stress/${id}`, { method: 'DELETE' });
          notify(t('stress.removed'));
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
      set('count', Number(s.count).toLocaleString(locale));
      set('avg', s.avgStress == null ? '—' : Number(s.avgStress).toLocaleString(locale));
      const streakWord = s.currentStreak === 1 ? t('stress.streakDay') : t('stress.streakDays');
      set('streak', `${s.currentStreak} ${streakWord}`);
      // Top habit is shown as its emoji (language-neutral).
      const top = s.topActivity ? (D.activities.find((a) => a.key === s.topActivity) || {}).emoji : null;
      set('top', top || '—');
    } catch (_) { /* non-critical */ }
  }

  async function loadStress() {
    try {
      const { entries } = await api('/api/stress');
      renderFeed(entries);
      renderStats();
    } catch (err) {
      notify(t('stress.loadError'), true);
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
      notify(t('stress.saved'));
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
  let currentExerciseKey = null;

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
        <h2 class="reset-title">${escapeHtml(t('reset.cards.' + ex.key + '.title'))}</h2>
        <p class="reset-desc">${escapeHtml(t('reset.cards.' + ex.key + '.desc'))}</p>
        <button class="btn btn-primary reset-start" data-ex="${ex.key}">${escapeHtml(t('common.start'))}</button>
      </div>`).join('');

    $$('.reset-start', grid).forEach((btn) => {
      btn.addEventListener('click', () => openExercise(btn.dataset.ex, btn));
    });

    $('#exerciseClose').addEventListener('click', closeExercise);
    document.addEventListener('keydown', (e) => {
      if (modalOpen && e.key === 'Escape') { e.preventDefault(); closeExercise(); }
    });
  }

  const EXERCISES = { box: exBox, grounding: exGrounding, pmr: exPmr, urge: exUrge };

  function openExercise(key, trigger) {
    const builder = EXERCISES[key];
    if (!builder) return;
    if (trigger !== undefined) lastTrigger = trigger || null;
    currentExerciseKey = key;
    const stage = $('#exerciseStage');
    if (typeof activeCleanup === 'function') activeCleanup();
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
    currentExerciseKey = null;
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
      { key: 'reset.box.in',   dur: 4000, from: 0.6, to: 1.0 },
      { key: 'reset.box.hold', dur: 4000, from: 1.0, to: 1.0 },
      { key: 'reset.box.out',  dur: 4000, from: 1.0, to: 0.6 },
      { key: 'reset.box.hold', dur: 4000, from: 0.6, to: 0.6 },
    ];
    let goal = 4;
    let cycle = 1;
    let phaseIdx = 0;
    let elapsed = 0;
    let status = 'idle'; // idle | running | paused | done
    const cycleText = () => t('reset.box.cycle', { n: cycle, goal });

    stage.innerHTML = `
      <div class="ex ex-box">
        <h2 class="ex-title">${escapeHtml(t('reset.cards.box.title'))}</h2>
        <div class="box-wrap">
          <div class="box-square${reduce ? ' static' : ''}" id="boxSquare">
            <span class="box-phase" id="boxPhase">${escapeHtml(t('reset.box.ready'))}</span>
          </div>
        </div>
        <div class="box-bar" id="boxBar"${reduce ? '' : ' hidden'}>
          <div class="box-bar-fill" id="boxBarFill"></div>
        </div>
        <div class="ex-counter">
          <button class="counter-btn" id="boxMinus" aria-label="−">−</button>
          <span id="boxCounter">${escapeHtml(cycleText())}</span>
          <button class="counter-btn" id="boxPlus" aria-label="+">+</button>
        </div>
        <button class="btn btn-primary ex-action" id="boxToggle">${escapeHtml(t('common.start'))}</button>
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
      counterEl.textContent = cycleText();
    }
    minus.addEventListener('click', () => { if (status === 'idle') setGoal(goal - 1); });
    plus.addEventListener('click', () => { if (status === 'idle') setGoal(goal + 1); });

    const ticker = makeTicker((dt) => {
      elapsed += dt;
      const ph = phases[phaseIdx];
      const p = Math.min(elapsed / ph.dur, 1);
      phaseEl.textContent = t(ph.key);
      counterEl.textContent = cycleText();
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
          <h2 class="ex-title">${escapeHtml(t('reset.box.done'))}</h2>
          <button class="btn btn-primary" id="boxDone">${escapeHtml(t('common.backToToolkit'))}</button>
        </div>`;
      $('#boxDone', stage).addEventListener('click', closeExercise);
    }

    toggle.addEventListener('click', () => {
      if (status === 'idle' || status === 'paused') {
        status = 'running';
        toggle.textContent = t('common.pause');
        minus.disabled = true;
        plus.disabled = true;
        ticker.start();
      } else if (status === 'running') {
        status = 'paused';
        toggle.textContent = t('common.resume');
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
      const noun = t(s.n === 1 ? 'reset.grounding.thing' : 'reset.grounding.things');
      const verb = t('reset.grounding.' + s.verb);
      const prompt = t('reset.grounding.prompt', { n: s.n, noun, verb });
      stage.innerHTML = `
        <div class="ex ex-ground">
          ${dots()}
          <div class="gradient-text ground-number">${s.n}</div>
          <p class="ground-prompt">${escapeHtml(prompt)}</p>
          <textarea class="ground-input" id="groundInput" rows="3" placeholder="${escapeHtml(t('reset.grounding.placeholder'))}"></textarea>
          <div class="ex-nav">
            <button class="btn btn-ghost" id="groundBack"${idx === 0 ? ' disabled' : ''}>${escapeHtml(t('common.back'))}</button>
            <button class="btn btn-primary" id="groundNext">${escapeHtml(idx < steps.length - 1 ? t('common.next') : t('common.finish'))}</button>
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
          <h2 class="ex-title">${escapeHtml(t('reset.grounding.done'))}</h2>
          <button class="btn btn-primary" id="groundDone">${escapeHtml(t('common.backToToolkit'))}</button>
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
      phases.push({ region: r, kind: 'tense', dur: 5000 });
      phases.push({ region: r, kind: 'release', dur: 10000 });
    });
    const regionName = (r) => t('reset.pmr.' + r);
    const actionLabel = (ph) => (ph.kind === 'tense'
      ? t('reset.pmr.tense', { region: regionName(ph.region) })
      : t('reset.pmr.release'));

    let idx = 0;
    let elapsed = 0;
    const R = 52;
    const C = 2 * Math.PI * R;

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
        <div class="gradient-text pmr-region" id="pmrRegion">${escapeHtml(regionName('feet'))}</div>
        <div class="pmr-action" id="pmrAction">${escapeHtml(actionLabel(phases[0]))}</div>
        <button class="btn btn-primary ex-action" id="pmrToggle">${escapeHtml(t('common.pause'))}</button>
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
      regionEl.textContent = regionName(ph.region);
      actionEl.textContent = actionLabel(ph);
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
          <h2 class="ex-title">${escapeHtml(t('reset.pmr.done'))}</h2>
          <button class="btn btn-primary" id="pmrDone">${escapeHtml(t('common.backToToolkit'))}</button>
        </div>`;
      $('#pmrDone', stage).addEventListener('click', closeExercise);
    }

    toggle.addEventListener('click', () => {
      if (ticker.running) { ticker.pause(); toggle.textContent = t('common.resume'); }
      else { ticker.start(); toggle.textContent = t('common.pause'); }
    });

    ticker.start(); // auto-advances through all regions
    return () => ticker.stop();
  }

  // ---------- Exercise 4: Urge Surfing ----------
  function exUrge(stage) {
    const reduce = prefersReducedMotion();
    const urges = [
      { key: 'substance', emoji: '🚬' },
      { key: 'phone',     emoji: '📱' },
      { key: 'food',      emoji: '🍪' },
      { key: 'lashout',   emoji: '💢' },
      { key: 'isolate',   emoji: '😢' },
      { key: 'other',     emoji: '✋' },
    ];
    let selectedUrge = '';
    let startStrength = 7;
    let ticker = null;
    let introTimer = null;

    function clearTimers() {
      if (ticker) { ticker.stop(); ticker = null; }
      if (introTimer) { clearTimeout(introTimer); introTimer = null; }
    }

    // Step 1 — Intro (auto-advances after 15s; "Begin" advances early).
    function step1() {
      clearTimers();
      stage.innerHTML = `
        <div class="ex ex-urge">
          <div class="urge-emoji">🌊</div>
          <h2 class="ex-title">${escapeHtml(t('reset.urge.introTitle'))}</h2>
          <p class="urge-body">${escapeHtml(t('reset.urge.introBody'))}</p>
          <button class="btn btn-primary ex-action" id="urgeBegin">${escapeHtml(t('common.begin'))}</button>
        </div>`;
      introTimer = setTimeout(step2, 15000);
      $('#urgeBegin', stage).addEventListener('click', step2);
    }

    // Step 2 — Name the urge (no time limit).
    function step2() {
      clearTimers();
      stage.innerHTML = `
        <div class="ex ex-urge">
          <h2 class="ex-title">${escapeHtml(t('reset.urge.nameTitle'))}</h2>
          <div class="urge-chips" id="urgeChips">
            ${urges.map((u) => `
              <div class="activity-chip urge-chip" data-key="${u.key}" role="radio" aria-checked="false" tabindex="0">
                <span class="chip-emoji">${u.emoji}</span><span>${escapeHtml(t('reset.urge.chips.' + u.key))}</span>
              </div>`).join('')}
          </div>
          <label class="field-label urge-strength-label" for="urgeStart">
            ${escapeHtml(t('reset.urge.strengthLabel'))} <span class="stress-readout" id="urgeStartReadout">7</span>
          </label>
          <input type="range" id="urgeStart" min="1" max="10" value="7" class="slider" />
          <div class="slider-scale"><span>${escapeHtml(t('reset.urge.mild'))}</span><span>${escapeHtml(t('reset.urge.intense'))}</span></div>
          <button class="btn btn-primary ex-action" id="urgeSurf">${escapeHtml(t('reset.urge.surf'))}</button>
        </div>`;

      const chips = $$('.urge-chip', stage);
      chips.forEach((chip) => {
        const select = () => {
          const was = chip.classList.contains('checked');
          chips.forEach((c) => { c.classList.remove('checked'); c.setAttribute('aria-checked', 'false'); });
          if (!was) { chip.classList.add('checked'); chip.setAttribute('aria-checked', 'true'); selectedUrge = chip.dataset.key; }
          else { selectedUrge = ''; }
        };
        chip.addEventListener('click', select);
        chip.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); select(); } });
      });

      const slider = $('#urgeStart', stage);
      const readout = $('#urgeStartReadout', stage);
      slider.addEventListener('input', () => { readout.textContent = slider.value; });
      $('#urgeSurf', stage).addEventListener('click', () => { startStrength = Number(slider.value); step3(); });
    }

    // Step 3 — The wave (180s). Animated sine wave, or a gradient bar under reduced motion.
    function step3() {
      clearTimers();
      const TOTAL = 180000;
      const W = 320;
      const H = 200;
      const SEG = 40;
      let elapsed = 0;

      const phaseText = (ms) => (ms < 60000
        ? t('reset.urge.phaseRise')
        : ms < 90000
          ? t('reset.urge.phasePeak')
          : t('reset.urge.phaseFall'));
      const mmss = (ms) => {
        const s = Math.max(0, Math.ceil((TOTAL - ms) / 1000));
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      };

      const nav = `
        <p class="urge-phase" id="urgePhase">${escapeHtml(t('reset.urge.phaseRise'))}</p>
        <div class="ex-nav-row">
          <button class="btn btn-primary ex-action" id="urgeToggle">${escapeHtml(t('common.pause'))}</button>
          <button type="button" class="btn-skip" id="urgeSkip">${escapeHtml(t('common.skip'))}</button>
        </div>`;

      if (reduce) {
        stage.innerHTML = `
          <div class="ex ex-urge ex-urge-wave">
            <div class="urge-countdown-big" id="urgeTime">3:00</div>
            <div class="urge-bar"><div class="urge-bar-fill" id="urgeBarFill"></div></div>
            ${nav}
          </div>`;
      } else {
        stage.innerHTML = `
          <div class="ex ex-urge ex-urge-wave">
            <div class="urge-wave-wrap">
              <span class="urge-countdown" id="urgeTime">3:00</span>
              <svg class="urge-wave-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="urgeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#7c5cff" /><stop offset="100%" stop-color="#22d3ee" />
                  </linearGradient>
                  <linearGradient id="urgeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(124,92,255,0.5)" /><stop offset="100%" stop-color="rgba(34,211,238,0.04)" />
                  </linearGradient>
                </defs>
                <path id="urgeFillPath" fill="url(#urgeFill)" stroke="none" d="" />
                <path id="urgeLine" fill="none" stroke="url(#urgeGrad)" stroke-width="3" stroke-linecap="round" d="" />
              </svg>
            </div>
            ${nav}
          </div>`;
      }

      const timeEl = $('#urgeTime', stage);
      const phaseEl = $('#urgePhase', stage);
      const toggle = $('#urgeToggle', stage);
      const lineEl = reduce ? null : $('#urgeLine', stage);
      const fillEl = reduce ? null : $('#urgeFillPath', stage);
      const barFill = reduce ? $('#urgeBarFill', stage) : null;

      // 0 → 1 over 0-60s, holds at 1 for 60-90s, 1 → 0 over 90-180s.
      const intensity = (ms) => (ms < 60000
        ? ms / 60000
        : ms < 90000
          ? 1
          : Math.max(0, 1 - (ms - 90000) / 90000));

      function drawWave(ms) {
        const u = intensity(ms);
        const level = H * (0.85 - u * 0.62); // water rises as the urge peaks
        const amp = 7 + u * 10;
        const phase = (ms / 1000) * 1.6;
        let top = '';
        for (let i = 0; i <= SEG; i++) {
          const x = (i / SEG) * W;
          const y = level - amp * Math.sin((i / SEG) * Math.PI * 4 + phase);
          top += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
        }
        lineEl.setAttribute('d', top.trim());
        fillEl.setAttribute('d', `${top}L ${W} ${H} L 0 ${H} Z`);
      }

      ticker = makeTicker((dt) => {
        elapsed += dt;
        timeEl.textContent = mmss(elapsed);
        phaseEl.textContent = phaseText(elapsed);
        if (reduce) barFill.style.width = `${Math.min(elapsed / TOTAL, 1) * 100}%`;
        else drawWave(elapsed);
        if (elapsed >= TOTAL) { clearTimers(); step4(); }
      });

      toggle.addEventListener('click', () => {
        if (ticker && ticker.running) { ticker.pause(); toggle.textContent = t('common.resume'); }
        else if (ticker) { ticker.start(); toggle.textContent = t('common.pause'); }
      });
      $('#urgeSkip', stage).addEventListener('click', () => { clearTimers(); step4(); });

      if (!reduce) drawWave(0);
      ticker.start();
    }

    // Step 4 — Closing.
    function step4() {
      clearTimers();
      stage.innerHTML = `
        <div class="ex ex-urge">
          <h2 class="ex-title">${escapeHtml(t('reset.urge.closeTitle'))}</h2>
          <div class="gradient-text urge-now" id="urgeNow">${startStrength}</div>
          <input type="range" id="urgeEnd" min="1" max="10" value="${startStrength}" class="slider" />
          <div class="slider-scale"><span>${escapeHtml(t('reset.urge.mild'))}</span><span>${escapeHtml(t('reset.urge.intense'))}</span></div>
          <p class="urge-compare" id="urgeCompare">${escapeHtml(t('reset.urge.compare', { start: startStrength, now: startStrength }))}</p>
          <p class="urge-closing">${escapeHtml(t('reset.urge.closing'))}</p>
          <button class="btn btn-primary ex-action" id="urgeDone">${escapeHtml(t('common.done'))}</button>
        </div>`;
      const slider = $('#urgeEnd', stage);
      const now = $('#urgeNow', stage);
      const compare = $('#urgeCompare', stage);
      slider.addEventListener('input', () => {
        now.textContent = slider.value;
        compare.textContent = t('reset.urge.compare', { start: startStrength, now: slider.value });
      });
      $('#urgeDone', stage).addEventListener('click', closeExercise);
    }

    step1();
    return () => clearTimers();
  }

  // =====================================================================
  // THE VAULT
  // =====================================================================
  function renderVault() {
    // Warning signs
    $('#warningSigns').innerHTML = (tData('resources.warnings') || [])
      .map((s) => `<li>${escapeHtml(s)}</li>`).join('');

    // Hotlines (hrefs are structural; text is translated by id)
    $('#hotlineGrid').innerHTML = D.hotlines.map((h) => {
      const m = tData('resources.hotlines.' + h.id) || {};
      const actions = [];
      if (h.call) actions.push(`<a class="hotline-btn call" href="${h.call}">${escapeHtml(m.callLabel || 'Call')}</a>`);
      if (h.text) actions.push(`<a class="hotline-btn text" href="${h.text}">${escapeHtml(m.textLabel || 'Text')}</a>`);
      if (h.link) actions.push(`<a class="hotline-btn text" href="${h.link}" target="_blank" rel="noopener">${escapeHtml(m.linkLabel || 'Open')}</a>`);
      return `
        <div class="hotline">
          <div class="hotline-name">${escapeHtml(m.name || h.id)}</div>
          <div class="hotline-desc">${escapeHtml(m.desc || '')}</div>
          <div class="hotline-actions">${actions.join('')}</div>
        </div>`;
    }).join('');

    // Education matrix
    const matrix = $('#vaultMatrix');
    matrix.innerHTML = D.vault.map((c) => {
      const card = tData('resources.cards.' + c.id) || {};
      return `
      <div class="matrix-card" data-id="${c.id}">
        <div class="matrix-summary" role="button" tabindex="0" aria-expanded="false">
          <div class="matrix-icon">${c.icon}</div>
          <div class="matrix-titles">
            <h3>${escapeHtml(card.title || '')}</h3>
            <p>${escapeHtml(card.subtitle || '')}</p>
          </div>
          <span class="matrix-chevron">▼</span>
        </div>
        <div class="matrix-body">
          <div class="matrix-body-inner">
            ${(card.sections || []).map(renderVaultSection).join('')}
          </div>
        </div>
      </div>`;
    }).join('');

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
  // Language toggle
  // ---------------------------------------------------------------------
  function updateLangToggle() {
    $$('.lang-btn').forEach((b) => b.classList.toggle('active', b.dataset.locale === locale));
  }

  // Re-render every dynamic region in the new language, preserving in-progress
  // form selections, and re-render an open modal exercise in place.
  function rerenderDynamic() {
    const selActivities = $$('#activityGrid input:checked').map((i) => i.value);
    const selMood = selectedMood();

    applyStaticI18n();
    renderActivityGrid();
    renderMoodGrid();
    renderResetKit();
    renderVault();
    loadStress();

    selActivities.forEach((k) => {
      const chip = $(`#activityGrid .activity-chip[data-key="${k}"]`);
      if (chip) { chip.classList.add('checked'); chip.setAttribute('aria-checked', 'true'); $('input', chip).checked = true; }
    });
    if (selMood) {
      const chip = $(`#moodGrid .mood-chip[data-key="${selMood}"]`);
      if (chip) { chip.classList.add('checked'); chip.setAttribute('aria-checked', 'true'); }
    }

    if (modalOpen && currentExerciseKey) openExercise(currentExerciseKey);
    updateLangToggle();
  }

  function setLocale(next) {
    if (!LOCALES.includes(next) || next === locale) return;
    locale = next;
    try { localStorage.setItem(LOCALE_KEY, locale); } catch (_) { /* ignore */ }
    rerenderDynamic();
  }

  function initLangToggle() {
    $$('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => setLocale(btn.dataset.locale));
    });
    updateLangToggle();
  }

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------
  function init() {
    applyStaticI18n();
    initLangToggle();
    initTabs();
    renderActivityGrid();
    renderMoodGrid();
    initStressForm();
    loadStress();
    renderResetKit();
    renderVault();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
