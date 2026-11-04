# Afix site-code

De eigen CSS en JavaScript van de Webflow-site van Afix. Webflow laadt ze via jsDelivr, zodat de code niet in de custom-code-velden van Webflow staat (die hebben een limiet).

| Bestand | Wat | In Webflow |
|---|---|---|
| `site.css` | vloeiende root-fontgrootte, rich text, focus, en verder alleen wat Webflow niet zelf kan | site-head, als `<link>` |
| `site.js` | de kern: GSAP, Lenis, nav, formulieren, verbergen voor de intro, en de lader van de modules | site-footer, als `<script type="module">` |
| `modules/*.js` | één bestand per onderwerp (`data-a-*`), laadt alleen als zijn attribuut of class op de pagina staat | niet: `site.js` laadt ze zelf, van dezelfde tag |
| `modules/overgang.js` | paginaovergangen met Barba (Osmo Cross Fade), laadt op elke pagina met `page-wrapper` | niet: `site.js` laadt hem na de eerste pagina |
| `test/index.html` | lokale testpagina voor alle modules, plus een opruimcontrole | niet |

De repository is publiek: zet er nooit sleutels, tokens of interne documentatie in.

## In Webflow

Site settings > Custom code. Staat er andere code in dezelfde blokken (bijvoorbeeld Google Tag Manager), dan blijft die staan.

```html
<!-- head -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/WEAREBORING/afix@<tag>/site.min.css">
<!-- footer -->
<script type="module" src="https://cdn.jsdelivr.net/gh/WEAREBORING/afix@<tag>/site.min.js"></script>
```

- Altijd een tag, nooit `@main`: jsDelivr bewaart een branch tot 7 dagen in de cache, een tag verandert nooit.
- Het script met `type="module"` en zonder `async`: een module draait net vóór DOMContentLoaded, dus `data-a-form` is klaar voordat webflow.js het formulier start.
- `.min.` maakt jsDelivr zelf, ook voor de modules. `site.min.js` laadt `modules/<naam>.min.js`, `site.js` laadt `modules/<naam>.js`.

## Een wijziging uitbrengen

1. Pas de code aan en hoog het versienummer in de eerste commentaarregel van `site.js` of `site.css` op. Een module heeft geen eigen nummer: hoog dan dat van `site.js` op.
2. Test lokaal met `test/index.html`.
3. Commit, tag en push: `git tag vX.Y.Z && git push && git push --tags`. Eén tag per release, ook als maar één bestand wijzigt.
4. Controleer dat jsDelivr de nieuwe versie geeft: `curl -s https://cdn.jsdelivr.net/gh/WEAREBORING/afix@vX.Y.Z/site.js | head -1`. Vraag daarna `site.min.js`, `site.min.css` en elke `modules/<naam>.min.js` op tot ze 200 geven (lus hieronder): jsDelivr maakt de `.min`-bestanden pas bij het eerste verzoek, en dat eerste verzoek kan in de browser mislukken (dan draait site.js of die module niet).
5. Lees het head- en footerblok in Webflow (`get_site_freeform_code`), vervang alleen de tag in de link en schrijf het blok terug (`set_site_freeform_code`).
6. Publiceer naar webflow.io en controleer de pagina in de browser.

Terugdraaien: zet de vorige tag terug in Webflow en publiceer. Tot en met `v1.82.0` is `site.js` geen module: gaat de tag daarnaartoe, haal dan ook `type="module"` weg.

Opwarmen:

```bash
tag=vX.Y.Z; for f in site.min.js site.min.css $(cd modules && ls *.js | sed 's/\.js$/.min.js/; s/^/modules\//'); do curl -s -o /dev/null -w "%{http_code} $f\n" "https://cdn.jsdelivr.net/gh/WEAREBORING/afix@$tag/$f"; done
```

## Paginaovergangen

`modules/overgang.js` laadt Barba (`@barba/core`, vaste versie) als externe code. Er is geen Webflow-wijziging voor nodig: `body` is de wrapper en `.page-wrapper` de container, dus een nieuwe pagina doet vanzelf mee. Laadt Barba niet, of gaat er iets mis, dan laadt de link gewoon de pagina.

- **De nav staat buiten de container.** `overgang.js` zet hem bij de start in `body`. De footer gaat mee met de pagina, want die verschilt per pagina.
- **Volgorde van een overgang:** de nieuwe html ophalen, head en nav bijwerken, `load(container)` verbergt wat binnenkomt en laadt de modules, de overvloeier, en zodra de oude pagina weg is `stop()` en de teruggegeven `run()`, terwijl de nieuwe nog opkomt. Een module die meet, meet dus altijd in de echte stand.
- **`window.load` komt na een overgang niet.** Gebruik `a.loaded(fn)`: dat vuurt bij het laden, en na een overgang als de foto's in beeld er zijn.
- **Formulieren:** `webflow.js` leest de Turnstile-sleutel maar één keer. `overgang.js` start daarom `Webflow.require('forms').ready()` opnieuw en zet de Turnstile-widget zelf in het formulier.
- **Geen overgang op een link:** Barba slaat `target="_blank"`, `download`, andere domeinen en ctrl-klik al over. Zet `data-barba-prevent` op een link om hem over te slaan.
- **Google Tag Manager** staat nu niet op de site. Komt die erbij, dan heeft elke overgang een eigen paginaweergave nodig (`dataLayer.push` in `land`).

## Een nieuwe module

1. Maak `modules/<naam>.js` met dit patroon:

   ```js
   /* Afix modules/<naam>.js: data-a-<naam>: wat het doet. */
   export function init(container, a) {
     var each = a.each, reduce = a.reduce, listen = a.listen, withGsap = a.withGsap;

     each('[data-a-<naam>]', function (el) {
       withGsap(function (gsap) {
         listen(el, 'mouseenter', function () { gsap.to(el, { x: 8, duration: reduce.matches ? 0 : 0.3 }); });
       });
     });

     return a.clean;
   }
   ```

2. Zet een regel in de tabel `modules` in `site.js`, op de plek waar hij moet starten: `['<naam>', '[data-a-<naam>]']`. De kern laadt eerst alles en start dan in die volgorde.
3. Komt iets binnen met een animatie, zet het dan in `hideFirst` in `site.js`, zodat het niet eerst zichtbaar staat.
4. Zet de naam in de lijst in `cleanupChecks` in `test/index.html`.

Regels voor een module:

- Zoek binnen `container`, niet in `document`. `a.each(sel, fn)` doet dat al.
- Listeners met `a.listen(target, type, fn, options)`, timers met `a.wait`, `requestAnimationFrame` met `a.raf`, observers met `a.watch(new IntersectionObserver(...))`, GSAP met `a.withGsap`. Dan ruimt `a.clean` ze op.
- Wat de module aan de DOM toevoegt of vervangt, en `gsap.ticker.add`, maak je ongedaan met `a.undo(fn)`.
- Na een overgang komt `window.load` niet: gebruik `a.loaded(fn)`.
- Niets importeren uit `site.js` of een andere module: jsDelivr laat paden in `import` staan, dus `site.min.js` plus `import '../site.js'` draait de kern twee keer. Gedeeld gaat via `a` (`reduce`, `touchDevice`, `clamp`, `num`, `withBlur`, `jumpTo`, `onceInView`, `lenis`).
- Wat in de html moet kloppen voordat webflow.js start of de pagina in beeld komt, hoort in `prepare` in `site.js`, niet in een module: een module laadt later.

## Pagina-code

Code die maar op één pagina hoort, komt in `pages/<slug>.js` en gaat als `<script>` in de custom code van die pagina, met dezelfde tag. Gebruik dit alleen als een module in `modules/` niet past.

## Toegang

Afix past deze code zelf aan, met Claude Code in de map `afix-website/` (die zet de repository in `site/`). Wie code uitbrengt, heeft schrijfrechten op deze repository nodig: voeg die persoon toe onder Settings > Collaborators. Lezen kan iedereen, want de repository is publiek.

Gaat de repository later naar een andere eigenaar (bijvoorbeeld een GitHub-organisatie van de klant), zet dan na de verhuizing de nieuwe eigenaar in beide jsDelivr-links in Webflow (`gh/<eigenaar>/<repo>@<tag>`) en in `afix-website/CLAUDE.md`.
