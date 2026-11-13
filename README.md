# Ramon Pegoretti · landing page

A one-page site that plays like a game: particle hero, five "levels" that unlock as you scroll, a fencing-scoreboard HUD that counts to 15, and a mini site builder in level 02.

Plain HTML/CSS/JS, no build step, no libraries.

- `index.html`: all content (Italian is the text in the HTML)
- `i18n.js`: English translations + strings used by the JS
- `style.css`: design tokens at the top (`:root`), then sections
- `game.js`: language switch, levels/score, builder, particle field
- `GAPS.md`: placeholders still to fill

Run locally: open `index.html`, or `python3 -m http.server` in this folder.
Deploy: GitHub Pages (Settings → Pages → Deploy from branch → `main` / root).
Add `?gaps` to the URL to highlight placeholders.
