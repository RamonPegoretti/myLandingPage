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
    $('#url').textContent = t('site.url');
    rebuildMini();
  }
  $('#lang').addEventListener('click', () => {
    lang = lang === 'it' ? 'en' : 'it';
    store.set('lang', lang);
    applyLang();
  });

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

  /* ---------------- levels ---------------- */
  const levels = $$('.level');
  const pips = $$('[data-pip]');
  function unlock(sec, silent) {
    if (sec.classList.contains('unlocked')) return;
    sec.classList.add('unlocked');
    const n = +sec.dataset.level;
    pips[n - 1].classList.add('on');
    if (!silent) { setScore(score + 3); toast(t('toast.unlock').replace('{n}', '0' + n)); }
    if (n === 3) rollPrice();
  }
  const unlockIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) unlock(e.target);
  }), { threshold: 0, rootMargin: '0px 0px -45% 0px' });
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

  /* ---------------- builder (level 02) ---------------- */
  const screen = $('#screen'), body = $('#canvasSite'), empty = $('#empty'), done = $('#done');
  const builtEl = $('#built');
  const placed = new Set();
  const order = ['nav', 'hero', 'cards', 'hours', 'map', 'cta'];

  function render(kind) {
    const d = document.createElement('div');
    d.className = 's s-' + kind;
    d.dataset.kind = kind;
    switch (kind) {
      case 'nav': d.innerHTML = `<span>${t('mini.brand')}</span><ul>${t('mini.nav').map(x => `<li>${x}</li>`).join('')}</ul>`; break;
      case 'hero': d.innerHTML = `<h4>${t('mini.hero')}</h4><p>${t('mini.heroSub')}</p>`; break;
      case 'cards': d.innerHTML = t('mini.cards').map(([a, b]) => `<div><b>${a}</b>${b}</div>`).join(''); break;
      case 'hours': d.innerHTML = `<span class="open">${t('mini.open')}</span><span>${t('mini.hours')}</span>`; break;
      case 'map': d.setAttribute('aria-hidden', 'true'); break;
      case 'cta': d.textContent = t('mini.cta'); break;
    }
    return d;
  }
  function addBlock(kind, animate = true) {
    if (placed.has(kind)) return;
    placed.add(kind);
    empty.hidden = true;
    const el = render(kind);
    if (!animate) el.style.animation = 'none';
    body.appendChild(el);
    $(`[data-block="${kind}"]`).classList.add('used');
    builtEl.textContent = placed.size;
    if (placed.size === order.length) {
      done.hidden = false;
      if (animate) toast(t('toast.built'));
    }
  }
  function rebuildMini() {
    const kinds = [...placed];
    $$('.s', body).forEach(n => n.remove());
    placed.clear();
    kinds.forEach(k => addBlock(k, false));
  }
  $('#reset').addEventListener('click', () => {
    $$('.s', body).forEach(n => n.remove());
    placed.clear();
    $$('.block').forEach(b => b.classList.remove('used'));
    builtEl.textContent = 0; empty.hidden = false; done.hidden = true;
  });

  // tap = add; drag = drop on screen
  $$('.block').forEach(btn => {
    let sx, sy, ghost = null, dragging = false;
    btn.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      sx = e.clientX; sy = e.clientY; dragging = false;
      btn.setPointerCapture(e.pointerId);
    });
    btn.addEventListener('pointermove', e => {
      if (sx === undefined) return;
      if (!dragging && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) {
        dragging = true;
        ghost = btn.cloneNode(true);
        ghost.classList.add('ghost');
        ghost.style.width = btn.offsetWidth + 'px';
        document.body.appendChild(ghost);
        btn.classList.add('dragging');
      }
      if (dragging) {
        ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
        const r = screen.getBoundingClientRect();
        screen.classList.toggle('over', e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom);
      }
    });
    const end = e => {
      if (sx === undefined) return;
      if (dragging) {
        const over = screen.classList.contains('over');
        ghost.remove(); ghost = null;
        btn.classList.remove('dragging'); screen.classList.remove('over');
        if (over) addBlock(btn.dataset.block);
      } else if (e.type === 'pointerup') {
        addBlock(btn.dataset.block);
      }
      sx = undefined; dragging = false;
    };
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addBlock(btn.dataset.block); } });
    btn.addEventListener('click', e => e.preventDefault());
  });

  // real load time of this page (honest stat)
  addEventListener('load', () => setTimeout(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) $('#ms').textContent = Math.round(nav.domContentLoadedEventEnd);
  }, 0));

  /* ---------------- touché lamp ---------------- */
  const touche = $('#touche');
  touche.addEventListener('pointerdown', () => touche.classList.add('hit'));

  /* ---------------- particle field (start screen) ---------------- */
  const cvs = $('#field');
  const ctx = cvs.getContext('2d');
  let W, H, DPR, parts = [], running = true, visible = true;
  const mouse = { x: -9999, y: -9999, down: 0 };

  function build() {
    DPR = Math.min(2, devicePixelRatio || 1);
    W = cvs.clientWidth; H = cvs.clientHeight;
    cvs.width = W * DPR; cvs.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // draw the word off-screen and sample it
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d');
    const word = 'RAMON';
    let size = Math.min(W * 0.27, H * 0.42);
    o.font = `900 ${size}px Unbounded, sans-serif`;
    const mw = o.measureText(word).width;
    if (mw > W * 0.9) { size *= (W * 0.9) / mw; o.font = `900 ${size}px Unbounded, sans-serif`; }
    o.textAlign = 'center'; o.textBaseline = 'middle';
    o.fillStyle = '#fff';
    const cy = W < 600 ? H * 0.36 : H * 0.42;
    o.fillText(word, W / 2, cy);

    const data = o.getImageData(0, 0, W, H).data;
    const gap = W < 600 ? 4 : Math.max(5, Math.round(size / 34));
    const old = parts;
    parts = [];
    for (let y = 0; y < H; y += gap) {
      for (let x = 0; x < W; x += gap) {
        if (data[(y * W + x) * 4 + 3] > 128) {
          const r = Math.random();
          parts.push({
            hx: x, hy: y,
            x: Math.random() * W, y: Math.random() * H,
            vx: 0, vy: 0,
            c: r < 0.06 ? '#FF3B3B' : r < 0.2 ? '#36F28B' : '#EDEBE6',
            s: gap * (0.45 + Math.random() * 0.35)
          });
        }
      }
    }
    // keep positions from old field when resizing (no jump)
    for (let i = 0; i < Math.min(old.length, parts.length); i++) { parts[i].x = old[i].x; parts[i].y = old[i].y; }
    // ambient dust
    const dust = Math.round((W * H) / 9000);
    for (let i = 0; i < dust; i++) {
      parts.push({ hx: Math.random() * W, hy: Math.random() * H, x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, c: 'rgba(237,235,230,.18)', s: 1.2, dust: true, ph: Math.random() * 6.28 });
    }
    if (reduced) { parts.forEach(p => { p.x = p.hx; p.y = p.hy; }); draw(0); }
  }

  function draw(time) {
    ctx.clearRect(0, 0, W, H);
    const R = W < 600 ? 70 : 120, R2 = R * R;
    for (const p of parts) {
      if (!reduced) {
        let tx = p.hx, ty = p.hy;
        if (p.dust) { tx += Math.sin(time / 1800 + p.ph) * 14; ty += Math.cos(time / 2200 + p.ph) * 14; }
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const f = (1 - d2 / R2) * (p.dust ? 2 : 6);
          const d = Math.sqrt(d2) || 1;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
        p.vx += (tx - p.x) * 0.045; p.vy += (ty - p.y) * 0.045;
        p.vx *= 0.82; p.vy *= 0.82;
        p.x += p.vx; p.y += p.vy;
      }
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    // cursor reticle (piste guard)
    if (mouse.x > 0 && !reduced) {
      ctx.strokeStyle = 'rgba(54,242,139,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 18 + mouse.down * 30, 0, 6.283); ctx.stroke();
      mouse.down *= 0.9;
    }
  }

  function loop(time) {
    if (running && visible) draw(time);
    requestAnimationFrame(loop);
  }

  function setMouse(e) {
    const r = cvs.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  }
  cvs.addEventListener('pointermove', setMouse, { passive: true });
  cvs.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  cvs.addEventListener('pointerdown', e => {
    setMouse(e);
    mouse.down = 1;
    // burst: kick every particle away from the hit
    for (const p of parts) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy) || 1;
      const f = Math.max(0, 1 - d / 400) * 38;
      p.vx += (dx / d) * f; p.vy += (dy / d) * f;
    }
  });

  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(cvs);
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(build, 150); });

  const fontReady = document.fonts && document.fonts.load ? document.fonts.load('900 100px Unbounded') : Promise.resolve();
  Promise.race([fontReady, new Promise(r => setTimeout(r, 1500))]).then(() => {
    build();
    if (!reduced) requestAnimationFrame(loop);
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
