# {{KLANT}} site-code

De eigen CSS en JavaScript van de Webflow-site van {{KLANT}}. Webflow laadt ze via jsDelivr, zodat de code niet in de custom-code-velden van Webflow staat (die hebben een limiet).

| Bestand | Wat | In Webflow |
|---|---|---|
| `site.css` | rich text, focus, en verder alleen wat Webflow niet zelf kan | site-head, als `<link>` |
| `site.js` | attribuutmodules (`data-{{PREFIX}}-*`) | site-footer, als `<script>` |
| `test/index.html` | lokale testpagina voor alle modules | niet |

De repository is publiek: zet er nooit sleutels, tokens of interne documentatie in.

## In Webflow

Site settings > Custom code. Staat er andere code in dezelfde blokken (bijvoorbeeld Google Tag Manager), dan blijft die staan.

```html
<!-- head -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/{{REPO}}@<tag>/site.min.css">
<!-- footer -->
<script src="https://cdn.jsdelivr.net/gh/{{REPO}}@<tag>/site.min.js"></script>
```

- Altijd een tag, nooit `@main`: jsDelivr bewaart een branch tot 7 dagen in de cache, een tag verandert nooit.
- Het script zonder `defer` of `async`: `data-{{PREFIX}}-form` moet draaien vóór webflow.js het formulier start.
- `.min.` maakt jsDelivr zelf.

## Een wijziging uitbrengen

1. Pas `site.js` of `site.css` aan en hoog het versienummer in de eerste commentaarregel op.
2. Test lokaal met `test/index.html`.
3. Commit, tag en push: `git tag vX.Y.Z && git push && git push --tags`. Eén tag per release, ook als maar één bestand wijzigt.
4. Controleer dat jsDelivr de nieuwe versie geeft: `curl -s https://cdn.jsdelivr.net/gh/{{REPO}}@vX.Y.Z/site.js | head -1`.
5. Lees het head- en footerblok in Webflow (`get_site_freeform_code`), vervang alleen de tag in de link en schrijf het blok terug (`set_site_freeform_code`).
6. Publiceer naar webflow.io en controleer de pagina in de browser.

Terugdraaien: zet de vorige tag terug in Webflow en publiceer.

## Pagina-code

Code die maar op één pagina hoort, komt in `pages/<slug>.js` en gaat als `<script>` in de custom code van die pagina, met dezelfde tag. Gebruik dit alleen als een `data-{{PREFIX}}-*`-module in `site.js` niet past.

## Toegang

{{KLANT}} past deze code zelf aan, met Claude Code in de map `{{SLUG}}-website/` (die zet de repository in `site/`). Wie code uitbrengt, heeft schrijfrechten op deze repository nodig: voeg die persoon toe onder Settings > Collaborators. Lezen kan iedereen, want de repository is publiek.

Gaat de repository later naar een andere eigenaar (bijvoorbeeld een GitHub-organisatie van de klant), zet dan na de verhuizing de nieuwe eigenaar in beide jsDelivr-links in Webflow (`gh/<eigenaar>/<repo>@<tag>`) en in `{{SLUG}}-website/CLAUDE.md`.
