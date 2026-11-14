/* Runs in <head> before first paint: marks JS as available and applies the saved language. */
document.documentElement.classList.add('js');
try { if (localStorage.getItem('lang') === 'en') document.documentElement.lang = 'en'; } catch (e) {}
