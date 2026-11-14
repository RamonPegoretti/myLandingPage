/* Ramon Pegoretti · landing "game" engine. Plain JS, no libraries. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------------- i18n ---------------- */
  const I = window.I18N;
  let lang = store.get('lang') === 'en' ? 'en' : 'it';
  const itText = new Map();
  $$('[data-i18n]').forEach(el => itText.set(el, el.textContent));
  const t = k => (I[lang] && I[lang][k] !== undefined ? I[lang][k] : I.it[k]);

  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      el.textContent = lang === 'it' ? itText.get(el) : (I.en[k] ?? itText.get(el));
    });
    const btn = $('#lang');
    btn.setAttribute('aria-label', t('lang.aria'));
    btn.children[0].classList.toggle('lang__on', lang === 'it');
    btn.children[1].classList.toggle('lang__on', lang === 'en');
  }
  $('#lang').addEventListener('click', () => {
    lang = lang === 'it' ? 'en' : 'it';
    store.set('lang', lang);
    applyLang();
  });

  /* ---------------- boot screen ---------------- */
  (() => {
    const boot = $('#boot');
    if (!boot) return;
    if (reduced) { boot.remove(); return; }
    const bar = $('#bootBar'), pct = $('#bootPct'), line = $('#bootLine');
    const steps = lang === 'en' ? ['LOADING PARTICLES', 'BUILDING LEVELS', 'READY'] : ['CARICAMENTO PARTICELLE', 'COSTRUZIONE LIVELLI', 'PRONTO'];
    line.textContent = steps[0];
    let shown = 0, target = 70, ready = false;
    const t0 = performance.now();
    const finish = () => { ready = true; target = 100; };
    document.addEventListener('fx:ready', finish, { once: true });
    setTimeout(finish, 2200); // never hold the page longer than this
    const tick = now => {
      shown += (target - shown) * 0.12;
      if (target === 100 && 100 - shown < 0.6) shown = 100;
      const v = Math.round(shown);
      bar.style.transform = `scaleX(${v / 100})`;
      pct.textContent = v;
      line.textContent = steps[v >= 100 ? 2 : v > 45 ? 1 : 0];
      if (v >= 100 && ready && now - t0 > 650) { boot.classList.add('done'); setTimeout(() => boot.remove(), 700); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();

  /* ---------------- toast + score ---------------- */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }
  const scoreEl = $('#score');
  const scoreBox = scoreEl.parentElement;
  let score = 0;
  function setScore(n) {
    score = Math.min(15, n);
    scoreEl.textContent = String(score).padStart(2, '0');
    scoreBox.classList.remove('bump'); void scoreBox.offsetWidth; scoreBox.classList.add('bump');
    if (score === 15) setTimeout(() => toast(t('toast.win')), 1900);
  }

  /* ---------------- text decode ("compiling") ---------------- */
  const GLYPHS = '<>/{}[]=+*#01░▒▓';
  function decode(el) {
    if (reduced) return;
    const final = el.textContent, len = final.length, t0 = performance.now(), dur = 520;
    el.setAttribute('aria-label', final);
    const step = now => {
      const k = (now - t0) / dur;
      let out = '';
      for (let i = 0; i < len; i++) {
        const ch = final[i];
        out += (ch === ' ' || k > (i / len) * 0.8 + 0.1) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (k < 1) requestAnimationFrame(step); else { el.textContent = final; el.removeAttribute('aria-label'); }
    };
    requestAnimationFrame(step);
  }

  /* ---------------- levels ---------------- */
  const levels = $$('.level');
  const pips = $$('[data-pip]');
  function unlock(sec, silent) {
    if (sec.classList.contains('unlocked')) return;
    sec.classList.add('unlocked');
    $$('.level__title, .final__title', sec).forEach(decode);
    const n = +sec.dataset.level;
    pips[n - 1].classList.add('on');
    if (!silent) { setScore(score + 3); toast(t('toast.unlock').replace('{n}', '0' + n)); }
    if (n === 3) rollPrice();
  }
  const unlockIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) unlock(e.target);
  }), { threshold: 0, rootMargin: '0px 0px -20% 0px' });
  const hereIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) pips.forEach((p, i) => p.classList.toggle('here', i + 1 === +e.target.dataset.level));
  }), { rootMargin: '-50% 0px -50% 0px' });
  levels.forEach(l => { unlockIO.observe(l); hereIO.observe(l); });

  $('#skip').addEventListener('click', () => {
    document.documentElement.classList.add('quick');
    levels.forEach(l => unlock(l, true));
    score = 14; setScore(15);
    toast(t('toast.skip'));
    $('#prezzi').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ---------------- price counter ---------------- */
  const priceEl = $('#priceNum');
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  function rollPrice() {
    const to = +priceEl.dataset.to;
    if (reduced) { priceEl.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 1400;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      priceEl.textContent = fmt(Math.round(to * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- configurator (level 02) ---------------- */
  const mini = $('#mini'), cfg = $('#config'), builtEl = $('#built'), screenEl = $('#screen');
  const mEmpty = $('#mEmpty');
  function countOn() {
    const n = $$('input[name="sec"]:checked', cfg).length;
    builtEl.textContent = n;
    mEmpty.hidden = n > 0;
  }
  function initMini() {
    const on = new Set($$('input[name="sec"]:checked', cfg).map(i => i.value));
    $$('[data-sec]', mini).forEach(el => el.classList.toggle('off', !on.has(el.dataset.sec)));
    countOn();
  }
  cfg.addEventListener('submit', e => e.preventDefault());
  cfg.addEventListener('change', e => {
    const inp = e.target;
    if (inp.name === 'style') { mini.dataset.style = inp.value; return; }
    const els = $$(`[data-sec="${inp.value}"]`, mini);
    countOn();
    els.forEach(el => {
      el.classList.remove('assemble');
      if (inp.checked) { el.classList.remove('off'); void el.offsetWidth; el.classList.add('assemble'); }
      else el.classList.add('off');
    });
  });
  initMini();

  // load the template fonts only when level 02 gets close
  const tplFonts = $('#tplFonts');
  new IntersectionObserver((es, io) => {
    if (es[0].isIntersecting) { tplFonts.rel = 'stylesheet'; io.disconnect(); }
  }, { rootMargin: '100% 0px' }).observe($('#cosa'));

  // real load time of this page (honest stat)
  addEventListener('load', () => setTimeout(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) $('#ms').textContent = Math.round(nav.domContentLoadedEventEnd);
  }, 0));

  /* ---------------- touché lamp ---------------- */
  const touche = $('#touche');
  touche.addEventListener('pointerdown', e => {
    touche.classList.add('hit');
    window.FX && FX.burst(e.clientX, e.clientY);
  });

  /* ---------------- particles: scenes + start-screen shockwave ---------------- */
  const sceneIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || !window.FX) return;
    const n = e.target.dataset.level;
    FX.scene(n ? '0' + n : 'start');
  }), { rootMargin: '-45% 0px -45% 0px' });
  sceneIO.observe($('#start'));
  levels.forEach(l => sceneIO.observe(l));
  $('#start').addEventListener('pointerdown', e => {
    if (e.target.closest('a,button')) return;
    window.FX && FX.shockwave(e.clientX, e.clientY);
  });

  /* start button: smooth jump into level 01 */
  $('#startBtn').addEventListener('click', e => {
    e.preventDefault();
    $('#chi').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ?gaps in URL highlights every placeholder */
  if (location.search.includes('gaps')) document.documentElement.classList.add('show-gaps');

  applyLang();
})();
