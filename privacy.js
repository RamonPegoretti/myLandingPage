/* privacy.html: IT/EN toggle */
(() => {
    const btn = document.getElementById('lang');
    const paint = () => {
      const en = document.documentElement.lang === 'en';
      btn.children[0].classList.toggle('lang__on', !en);
      btn.children[1].classList.toggle('lang__on', en);
      btn.setAttribute('aria-label', en ? "Passa all'italiano" : 'Switch to English');
    };
    btn.addEventListener('click', () => {
      const l = document.documentElement.lang === 'en' ? 'it' : 'en';
      document.documentElement.lang = l;
      try { localStorage.setItem('lang', l); } catch (e) {}
      paint();
    });
    paint();
  })();
