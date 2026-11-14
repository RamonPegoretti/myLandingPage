/* 404.html: CONTINUE? countdown */
(() => {
    // arcade-style countdown that ends in GAME OVER (no forced redirect)
    const box = document.getElementById('continue'), n = document.getElementById('count');
    const label = box.querySelector('.cnt-label');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { box.hidden = true; return; }
    let c = 9;
    const id = setInterval(() => {
      c -= 1;
      if (c >= 0) { n.textContent = c; return; }
      clearInterval(id);
      box.classList.add('over');
      label.textContent = 'GAME OVER';
      window.FX && FX.burst(innerWidth / 2, innerHeight * 0.4, 90);
    }, 1000);
  })();
