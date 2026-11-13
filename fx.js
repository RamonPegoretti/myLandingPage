/* fx.js · particle engine for the whole page.
   - #field (fixed, behind content): one swarm that forms a shape per scene
     ("RAMON" on the start screen, the level number in each level) and drifts
     with the scroll in between.
   - #fx (fixed, above content): short-lived sparks for streams and bursts.
   API: FX.scene(key), FX.burst(x, y), FX.stream(fromEl, toEl, onArrive)        */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const field = document.getElementById('field');
  const fxc = document.getElementById('fx');
  const ctx = field.getContext('2d');
  const fctx = fxc.getContext('2d');
  const INK = '#EDEBE6', GREEN = '#36F28B', RED = '#FF3B3B';

  let W = 0, H = 0, DPR = 1, mobile = false;
  let parts = [];
  let sparks = [];
  let scene = 'start';
  let alphaNow = 1, alphaTo = 1;
  const mouse = { x: -9999, y: -9999, ring: 0 };
  let lastScroll = scrollY, scrollV = 0;
  const shapeCache = new Map();

  /* ---- shapes: sample text into target points ---- */
  function shapeFor(key) {
    if (shapeCache.has(key)) return shapeCache.get(key);
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d');
    o.fillStyle = '#fff'; o.textBaseline = 'middle';
    let cx, cy, size, text;
    if (key === 'start') {
      text = 'RAMON';
      size = Math.min(W * 0.27, H * 0.42);
      cx = W / 2; cy = mobile ? H * 0.36 : H * 0.42;
    } else {
      text = key;
      size = mobile ? Math.min(W * 0.62, H * 0.42) : Math.min(H * 0.62, W * 0.34);
      cx = mobile ? W * 0.5 : W * 0.74; cy = mobile ? H * 0.58 : H * 0.55;
    }
    o.font = `900 ${size}px Unbounded, sans-serif`;
    const mw = o.measureText(text).width, maxW = key === 'start' ? W * 0.9 : (mobile ? W * 0.9 : W * 0.46);
    if (mw > maxW) { size *= maxW / mw; o.font = `900 ${size}px Unbounded, sans-serif`; }
    o.textAlign = 'center';
    o.fillText(text, cx, cy);
    const data = o.getImageData(0, 0, W, H).data;
    // pick a gap so the point count lands near the particle budget
    const budget = parts.length || 1;
    let pts = [];
    for (let gap = 3; gap < 16; gap++) {
      pts = [];
      for (let y = 0; y < H; y += gap) for (let x = 0; x < W; x += gap) if (data[(y * W + x) * 4 + 3] > 128) pts.push([x, y, gap]);
      if (pts.length <= budget) break;
    }
    // shuffle so particles cross the screen when re-assigned
    for (let i = pts.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
    shapeCache.set(key, pts);
    return pts;
  }

  function assign(key, kick) {
    const pts = shapeFor(key);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (i < pts.length) { p.hx = pts[i][0]; p.hy = pts[i][1]; p.free = false; p.s = pts[i][2] * (0.45 + p.r * 0.35); }
      else { p.free = true; p.s = 1.4; }
      if (kick) { const a = Math.random() * 6.283; p.vx += Math.cos(a) * kick; p.vy += Math.sin(a) * kick; }
    }
  }

  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    mobile = W < 700;
    for (const c of [field, fxc]) { c.width = W * DPR; c.height = H * DPR; }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const N = mobile ? 1100 : 2600;
    if (parts.length !== N) {
      parts = [];
      for (let i = 0; i < N; i++) {
        const r = Math.random();
        parts.push({
          x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, hx: 0, hy: 0,
          fx: Math.random() * W, fy: Math.random() * H, ph: Math.random() * 6.283, r: Math.random(),
          c: r < 0.06 ? RED : r < 0.2 ? GREEN : INK, s: 2, free: false
        });
      }
    }
    shapeCache.clear();
    assign(scene, 0);
    if (reduced) { parts.forEach(p => { if (!p.free) { p.x = p.hx; p.y = p.hy; } }); drawField(0); }
  }

  /* ---- field ---- */
  function drawField(time) {
    ctx.clearRect(0, 0, W, H);
    alphaNow += (alphaTo - alphaNow) * 0.06;
    const R = mobile ? 70 : 130, R2 = R * R;
    const sv = scrollV;
    for (const p of parts) {
      if (!reduced) {
        let tx, ty;
        if (p.free) {
          // dust drifts on a slow flow field and gets dragged by scrolling
          p.fy -= sv * (0.3 + p.r * 0.6);
          if (p.fy < -20) p.fy += H + 40; else if (p.fy > H + 20) p.fy -= H + 40;
          tx = p.fx + Math.sin(time / 2400 + p.ph) * 30;
          ty = p.fy + Math.cos(time / 2000 + p.ph * 1.3) * 24;
        } else {
          tx = p.hx + Math.sin(time / 900 + p.ph) * 1.2;
          ty = p.hy + Math.cos(time / 1100 + p.ph) * 1.2;
          p.vy -= sv * 0.08 * p.r; // shape wobbles when you scroll
        }
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1, f = (1 - d2 / R2) * (p.free ? 2 : 6);
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
        const k = p.free ? 0.02 : 0.045;
        p.vx += (tx - p.x) * k; p.vy += (ty - p.y) * k;
        p.vx *= 0.84; p.vy *= 0.84;
        p.x += p.vx; p.y += p.vy;
      }
      ctx.globalAlpha = p.free ? 0.22 * Math.max(alphaNow, 0.6) : alphaNow;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    if (mouse.x > 0 && !reduced && scene === 'start') {
      ctx.strokeStyle = 'rgba(54,242,139,.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 18 + mouse.ring * 30, 0, 6.283); ctx.stroke();
      mouse.ring *= 0.9;
    }
  }

  /* ---- sparks (overlay) ---- */
  function drawSparks(dt) {
    fctx.clearRect(0, 0, W, H);
    if (!sparks.length) return;
    const keep = [];
    for (const s of sparks) {
      s.t += dt;
      if (s.kind === 'stream') {
        const k = Math.min(1, Math.max(0, (s.t - s.delay) / s.dur));
        if (k <= 0) { keep.push(s); continue; }
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        const ox = s.ax, oy = s.ay, tx = s.bx, ty = s.by;
        // quadratic curve through a control point that bows out
        const cx = (ox + tx) / 2 + s.bow, cy = Math.min(oy, ty) - 80 - Math.abs(s.bow);
        const u = 1 - e;
        s.x = u * u * ox + 2 * u * e * cx + e * e * tx;
        s.y = u * u * oy + 2 * u * e * cy + e * e * ty;
        fctx.globalAlpha = 1 - Math.max(0, (k - 0.85) / 0.15);
        fctx.fillStyle = s.c;
        fctx.fillRect(s.x, s.y, s.s, s.s);
        // short trail
        fctx.globalAlpha *= 0.35;
        fctx.fillRect(s.px ?? s.x, s.py ?? s.y, s.s, s.s);
        s.px = s.x; s.py = s.y;
        if (k < 1) keep.push(s); else if (s.done) s.done();
      } else {
        s.vy += 0.18; s.vx *= 0.985; s.vy *= 0.985;
        s.x += s.vx; s.y += s.vy;
        const life = 1 - s.t / s.dur;
        if (life <= 0) continue;
        fctx.globalAlpha = life;
        fctx.fillStyle = s.c;
        fctx.fillRect(s.x, s.y, s.s, s.s);
        keep.push(s);
      }
    }
    fctx.globalAlpha = 1;
    sparks = keep;
  }

  /* ---- loop ---- */
  let prev = performance.now();
  function loop(time) {
    const dt = Math.min(50, time - prev); prev = time;
    const y = scrollY; scrollV += ((y - lastScroll) - scrollV) * 0.3; lastScroll = y;
    drawField(time);
    drawSparks(dt);
    requestAnimationFrame(loop);
  }

  /* ---- input ---- */
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(resize, 150); });

  /* ---- public API ---- */
  window.FX = {
    scene(key) {
      if (key === scene) return;
      scene = key;
      alphaTo = key === 'start' ? 1 : (mobile ? 0.18 : 0.3);
      assign(key, reduced ? 0 : 26);
      if (reduced) { parts.forEach(p => { if (!p.free) { p.x = p.hx; p.y = p.hy; } }); drawField(0); }
    },
    shockwave(x, y) {
      mouse.ring = 1;
      for (const p of parts) {
        const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
        const f = Math.max(0, 1 - d / 420) * 40;
        p.vx += (dx / d) * f; p.vy += (dy / d) * f;
      }
    },
    burst(x, y, n = 140) {
      if (reduced) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, v = 3 + Math.random() * 9, r = Math.random();
        sparks.push({ kind: 'burst', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, t: 0, dur: 900 + Math.random() * 700,
          c: r < 0.45 ? GREEN : r < 0.7 ? RED : INK, s: 2 + Math.random() * 3 });
      }
    },
    stream(fromEl, toEl, onArrive) {
      const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
      if (reduced) { onArrive && onArrive(); return; }
      const n = mobile ? 60 : 110;
      const bow = (Math.random() - 0.5) * 160;
      for (let i = 0; i < n; i++) {
        const r = Math.random();
        sparks.push({
          kind: 'stream', t: 0, delay: i * 4, dur: 520 + Math.random() * 260,
          ax: a.left + 12 + Math.random() * 14, ay: a.top + a.height / 2 + (Math.random() - 0.5) * 10,
          bx: b.left + Math.random() * b.width, by: b.top + Math.random() * Math.min(b.height || 60, 120),
          bow: bow + (Math.random() - 0.5) * 60, c: r < 0.7 ? GREEN : INK, s: 2 + Math.random() * 1.5,
          done: i === n - 1 ? onArrive : null
        });
      }
    }
  };

  const fontReady = document.fonts && document.fonts.load ? document.fonts.load('900 100px Unbounded') : Promise.resolve();
  Promise.race([fontReady, new Promise(r => setTimeout(r, 1500))]).then(() => {
    resize();
    if (!reduced) requestAnimationFrame(loop);
  });
})();
