# Ramon Pegoretti · landing page

A one-page site that plays like a game: particle hero, five "levels" that unlock as you scroll, a fencing-scoreboard HUD that counts to 15, and a mini site builder in level 02.

Plain HTML/CSS/JS, no build step, no libraries.

- `index.html`: all content (Italian is the text in the HTML)
- `i18n.js`: English translations + strings used by the JS
- `style.css`: design tokens at the top (`:root`), then sections
- `game.js`: language switch, levels/score, builder, particle field
- `fonts/`, `fonts.css`, `fonts-templates.css`: self-hosted fonts (latin subset, SIL Open Font License); no requests to Google
- `GAPS.md`: placeholders still to fill

## Prices

Level 02 shows a live website price and level 03 ("Mi prendo cura del tuo sito") adds the care plan and a WhatsApp quote.
Prices are read at runtime from the priceCalc repo: `/priceCalc/pricing.json` (same origin on GitHub Pages). Change prices there, not here.
If that file can't be loaded (local preview, or a custom domain later), `game.js` uses the `FALLBACK` copy at the top of the pricing block. Keep it in sync, or point the fetch at the new URL.

Mapping from the configurator: home page included; menu, gallery and booking each add one page; hours and map sit on the home page; "Seconda lingua" is the 2-language option; "Design su misura" switches to the Advanced tier. Plan texts (IT/EN) are in `i18n.js` under `plan.*`.

Run locally: open `index.html`, or `python3 -m http.server` in this folder.
Deploy: GitHub Pages (Settings → Pages → Deploy from branch → `main` / root).
Add `?gaps` to the URL to highlight placeholders.

## Updating CSS/JS
GitHub Pages lets browsers cache files for 10 minutes. After changing `style.css` or a `.js` file, bump the `?v=` number on its tag in `index.html` so visitors get the new file straight away.
