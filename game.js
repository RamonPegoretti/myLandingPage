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
    renderAll();
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

  /* ---------------- pricing (levels 02 + 03) ----------------
     Prices come from Ramon's calculator config (/priceCalc/pricing.json, same origin).
     FALLBACK is a copy used when that file can't be loaded (local preview, custom domain). */
  const FALLBACK = {
    tiers: [{ id: 'base', price: 1000, included: 1, unitPrice: 150 }, { id: 'advanced', price: 2500, included: 1, unitPrice: 200 }],
    options: [{ id: 'languages', choices: [{ id: '1' }, { id: '2', percent: 10 }, { id: '3', percent: 20 }, { id: '4', percent: 30 }] }],
    recurring: { plans: [{ id: 'hosting', price: 25 }, { id: 'maintenance', price: 69, default: true }, { id: 'premium', price: 129 }] },
    billing: [{ id: 'monthly', multiplier: 1, months: 1 }, { id: 'yearly', multiplier: 9, listMultiplier: 12, months: 12 }],
    conditionalDiscounts: [
      { when: { plan: 'hosting', billing: 'yearly' }, percent: 5, max: 30 },
      { when: { plan: 'maintenance', billing: 'yearly' }, percent: 10, max: 150 },
      { when: { plan: 'premium', billing: 'yearly' }, percent: 15, max: 300 }]
  };
  let P = FALLBACK;
  // sections that add a page; hours and map live on the home page
  const PAGE_SECS = ['menu', 'gallery', 'book'];
  const PLAN_TAG = { none: '—', hosting: '+HP', maintenance: '+DEF', premium: '+MAX' };
  const sel = { plan: 'maintenance', billing: 'monthly' };

  // whole francs everywhere, except the "per month" equivalent (exact = true)
  const fmt = (n, exact) => {
    const r = exact ? Math.round(n * 100) / 100 : Math.round(n);
    const [i, d] = r.toFixed(Number.isInteger(r) ? 0 : 2).split('.');
    return i.replace(/\B(?=(\d{3})+(?!\d))/g, "'") + (d ? '.' + d : '');
  };
  const byId = (arr, id) => (arr || []).find(x => x.id === id);

  function quote() {
    const custom = $('#custom').checked;
    const on = new Set($$('input[name="sec"]:checked').map(i => i.value));
    const tier = byId(P.tiers, custom ? 'advanced' : 'base') || P.tiers[0];
    const pages = 1 + PAGE_SECS.filter(s => on.has(s)).length;
    const extra = Math.max(0, pages - (tier.included || 1));
    const lines = [{ k: custom ? 'q.custom' : 'q.base', v: tier.price }];
    let sub = tier.price;
    if (extra) { sub += extra * tier.unitPrice; lines.push({ k: extra === 1 ? 'q.page' : 'q.pages', n: extra, v: extra * tier.unitPrice }); }
    const langOpt = byId(P.options, 'languages');
    const pct = on.has('lang') && langOpt ? (byId(langOpt.choices, '2') || {}).percent || 0 : 0;
    if (pct) { const a = sub * pct / 100; lines.push({ k: 'q.lang', n: pct, v: a }); sub += a; }
    const site = sub;
    let disc = 0;
    (P.conditionalDiscounts || []).forEach(cd => {
      const w = cd.when || {};
      if ((w.plan && w.plan !== sel.plan) || (w.billing && w.billing !== sel.billing) || (w.tier && w.tier !== tier.id)) return;
      let d = sub * cd.percent / 100;
      if (cd.max != null) d = Math.min(d, cd.max);
      disc += d; sub -= d;
    });
    const plan = byId(P.recurring && P.recurring.plans, sel.plan);
    const bill = byId(P.billing, sel.billing) || { multiplier: 1, months: 1 };
    const yearly = bill.months === 12;
    const perPeriod = plan ? plan.price * bill.multiplier : 0;
    const year1 = sub + (plan ? (yearly ? perPeriod : plan.price * 12) : 0);
    return { lines, site, disc, oneTime: sub, plan, yearly, perPeriod, year1 };
  }

  // smooth number roll from the value on screen to the new one
  const rolls = new WeakMap();
  function roll(el, to) {
    const from = rolls.has(el) ? rolls.get(el) : to;
    rolls.set(el, to);
    if (reduced || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 600;
    const step = now => {
      if (rolls.get(el) !== to) return;
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
    };
    requestAnimationFrame(step);
  }

  const lineText = l => t(l.k).replace('{n}', l.n);

  function renderPlans() {
    const plans = (P.recurring && P.recurring.plans) || [];
    const list = [{ id: 'none', price: null }, ...plans];
    $('#planList').innerHTML = list.map(p => {
      const feats = (t('plan.' + p.id + '.f') || '').split('|').filter(Boolean);
      const price = p.price == null ? '<em>CHF 0</em>' : `<em>CHF ${fmt(p.price)}<small>${t('mo')}</small></em>`;
      return `<label class="plan"><input type="radio" name="plan" value="${p.id}"${p.id === sel.plan ? ' checked' : ''}>` +
        `<span class="plan__in"><span class="mono plan__tag">${PLAN_TAG[p.id] || '+'}</span>` +
        `<strong>${t('plan.' + p.id) || p.label || p.id}</strong>${price}` +
        `<span class="plan__f">${feats.map(f => `<span>${f}</span>`).join('')}</span></span></label>`;
    }).join('');
  }

  function renderPrice() {
    const q = quote();
    roll($('#siteNum'), q.site);
    $('#siteHow').textContent = q.lines.map(l => `${lineText(l)} ${fmt(l.v)}`).join(' · ');
    const per = q.yearly ? t('yr') : t('mo');
    const rows = [[t('r.site'), 'CHF ' + fmt(q.site)]];
    if (q.disc) rows.push([t('r.disc'), '−CHF ' + fmt(q.disc), 'good']);
    if (q.plan) {
      rows.push([t('plan.' + q.plan.id), 'CHF ' + fmt(q.perPeriod) + per]);
      if (q.yearly) rows.push([t('r.equiv'), 'CHF ' + fmt(q.perPeriod / 12, true) + t('mo'), 'dim']);
    } else rows.push([t('r.noplan'), '—', 'dim']);
    $('#receiptRows').innerHTML = rows.map(r => `<div${r[2] ? ` class="${r[2]}"` : ''}><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');
    $('#totalLabel').textContent = q.plan ? t('l3.year1') : t('l3.oneoff');
    roll($('#yearNum'), q.plan ? q.year1 : q.oneTime);
    // WhatsApp message with the whole selection
    const style = ($('input[name="style"]:checked') || {}).value || '';
    const secs = $$('input[name="sec"]:checked').map(i => t('b.' + i.value) || i.value);
    const msg = [t('wa.hi'), '',
      `${t('wa.design')}: ${$('#custom').checked ? t('b.custom') : style.charAt(0).toUpperCase() + style.slice(1)}`,
      `${t('wa.secs')}: ${secs.join(', ') || '—'}`,
      `${t('r.site')}: CHF ${fmt(q.oneTime)}${q.disc ? ` (${t('r.disc').toLowerCase()} −${fmt(q.disc)})` : ''}`,
      `${t('wa.plan')}: ${q.plan ? `${t('plan.' + q.plan.id)}, CHF ${fmt(q.perPeriod)}${per}` : t('r.noplan')}`
    ].join('\n');
    $('#sendQuote').href = 'https://wa.me/41784228381?text=' + encodeURIComponent(msg);
  }

  function renderAll() { renderPlans(); renderPrice(); }

  $('#care').addEventListener('submit', e => e.preventDefault());
  $('#care').addEventListener('change', e => {
    if (e.target.name === 'plan') sel.plan = e.target.value;
    if (e.target.name === 'billing') sel.billing = e.target.value;
    renderPrice();
  });

  fetch('/priceCalc/pricing.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(cfg => {
      if (!cfg || !Array.isArray(cfg.tiers) || !cfg.tiers.length) return;
      P = cfg;
      const plans = (cfg.recurring && cfg.recurring.plans) || [];
      if (!byId(plans, sel.plan)) { const def = plans.find(p => p.default) || plans[0]; sel.plan = def ? def.id : 'none'; }
      renderAll();
    })
    .catch(() => {});

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
    renderPrice();
    if (inp.name === 'style') { mini.dataset.style = inp.value; return; }
    if (inp.name === 'custom') return;
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
