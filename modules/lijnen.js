/* Afix modules/lijnen.js: gele lijnen in hero, Expertises, Reviews, Werk en Kennis. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, clamp = a.clamp, listen = a.listen, raf = a.raf, withGsap = a.withGsap, undo = a.undo;

  /* Gele lijnen in Reviews (section_reviews, zoals het prototype): een horizontale lijn door de kaarten (reviews_stack) en
     een diagonale rechts, die zichzelf tekenen met de scroll. Later dan het prototype (keuze van de gebruiker): ze starten
     als de bovenkant van de sectie op 55% van de schermhoogte staat en zijn klaar op -35%, anders gebeurt het meeste
     onder de foto en buiten beeld. site.js maakt de svg zelf, want
     de lijnen worden toch uit de maat van de sectie berekend. Reduced motion: direct getekend. */
  each('.section_reviews', function (section) {
    var stack = section.querySelector('.reviews_stack');
    if (!stack) return;
    withGsap(function (gsap) {
      function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
      var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), ticking = false, drawn = -1;
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;';
      var lines = [0, 1].map(function () {
        var path = document.createElementNS(ns, 'path');
        path.setAttribute('pathLength', '1');
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        path.style.cssText = 'fill: none; stroke: var(--_theme---surface--accent); stroke-width: 1.6; stroke-dasharray: 1; stroke-dashoffset: 1;';
        return svg.appendChild(path);
      });
      section.insertBefore(svg, section.firstChild);
      undo(function () { svg.remove(); });
      // De inhoud boven de lijnen
      svg.nextElementSibling.style.position = 'relative';
      function size() {
        var w = section.offsetWidth, h = section.offsetHeight, x0 = w * 0.765, x1 = w + 20;
        var y = stack.getBoundingClientRect().top - section.getBoundingClientRect().top + stack.offsetHeight * 0.4;
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        lines[0].setAttribute('d', 'M -20 ' + y + ' L ' + (w + 20) + ' ' + y);
        lines[1].setAttribute('d', 'M ' + x0 + ' -10 L ' + x1 + ' ' + (x1 - x0) / (w * 0.235) * h * 0.89);
      }
      function update() {
        ticking = false;
        var H = window.innerHeight, L = reduce.matches ? 1 : clamp((H * 0.55 - section.getBoundingClientRect().top) / (H * 0.9), 0, 1);
        if (L === drawn) return;
        drawn = L;
        gsap.set(lines[0], { strokeDashoffset: 1 - easeInOut(L) });
        gsap.set(lines[1], { strokeDashoffset: 1 - easeInOut(clamp(L * 1.2 - 0.2, 0, 1)) });
      }
      listen(window, 'scroll', function () { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
      function refresh() { size(); drawn = -1; update(); }
      listen(window, 'resize', refresh);
      listen(window, 'load', refresh);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
      refresh();
    });
  });

  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  // Een verborgen svg met n gele lijnen die zichzelf kunnen tekenen (stroke-dashoffset 1 tot 0)
  function lineLayer(n, css) {
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), paths = [];
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = css;
    while (paths.length < n) {
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('pathLength', '1');
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      path.style.cssText = 'fill: none; stroke: var(--_theme---surface--accent); stroke-width: 1.6; stroke-dasharray: 1; stroke-dashoffset: 1;';
      paths.push(svg.appendChild(path));
    }
    return { svg: svg, paths: paths };
  }

  /* Gele lijn door de hero en Expertises (data-a-hero en data-a-pin). Het vervagen komt uit het prototype (bgLine en size()):
     terwijl de achtergrondvorm vervaagt tekent de lijn zich, en als Werk eroverheen schuift vervaagt hij. Twee afwijkingen,
     keuze van de gebruiker. De lijn tekent in een keer door, zonder pauze op de grens, en is af als Expertises bovenaan komt:
     dan loopt hij in beeld door tot de onderkant van het scherm. En de lijn volgt helemaal de rand van de vorm linksonder
     (hero-home_background en expertises_background, dezelfde coördinaten en schaal als de svg's daar), dus op een breed
     scherm achter het einde van de kop van Expertises langs. De lijn moet over de grens van twee secties met eigen vlak, dus staat hetzelfde pad in twee
     svg's achter de inhoud: een in de hero, die meescrollt, en een sticky in Expertises, die daarna vaststaat (als de
     bgfx-laag van het prototype). In het prototype is de hero een schermhoogte; hier telt de werkelijke afstand tot Expertises,
     want op telefoon is de hero hoger. Op een telefoon wordt alleen opnieuw gemeten als de breedte verandert, zoals bij
     data-a-pin (de adresbalk verandert de hoogte). site.js maakt de svg's zelf; er is geen Webflow-element voor nodig.
     Reduced motion: direct getekend. */
  each('[data-a-hero]', function (hero) {
    var exp = container.querySelector('[data-a-pin]'), next = exp && exp.nextElementSibling;
    if (!next) return;
    var touch = window.matchMedia('(hover: none)');
    withGsap(function (gsap) {
      var inHero = lineLayer(1, 'position: absolute; left: 0; width: 100%; pointer-events: none; z-index: -1;');
      var inExp = lineLayer(1, 'display: block; position: sticky; top: 0; width: 100%; pointer-events: none; z-index: -1;');
      var paths = [inHero.paths[0], inExp.paths[0]], H = 1, stack = 1, width = 0, ticking = false, shown = '';
      hero.appendChild(inHero.svg);
      // Als eerste kind: sticky begint op zijn plek in de pagina, dus onder de inhoud zou hij pas later vast gaan staan
      exp.insertBefore(inExp.svg, exp.firstChild);
      undo(function () { inHero.svg.remove(); inExp.svg.remove(); });
      function size() {
        var W = document.documentElement.clientWidth, top = hero.getBoundingClientRect().top + window.scrollY;
        H = window.innerHeight;
        width = window.innerWidth;
        stack = exp.getBoundingClientRect().top + window.scrollY;
        // De rand van de vorm, in de coördinaten van de svg's (slice, midden verankerd op de grens van hero en Expertises); de
        // lijn start net links buiten beeld
        var scale = Math.max(hero.offsetWidth / 1440, hero.offsetHeight / 705);
        var line = 'M 2510 3489.05 L 2763.25 3486.45 C 2832.09 3485.69 2872.75 3483.63 2941.76 3502.78 C 3076.56 3538.99 3201.37 3630.08 3301.47 3765.26 C 3348.73 3829.54 3389.55 3903.02 3422.73 3983.57 C 3448.34 4046.01 3463.73 4101.35 3483.79 4167.59 L 3757.87 5072.89'.replace(/([\d.]+) ([\d.]+)/g, function (m, x, y) {
          return W / 2 + (x - 3240) * scale + ' ' + (stack + (y - 3746) * scale);
        });
        paths.forEach(function (p) { p.setAttribute('d', line); });
        inHero.svg.style.top = -top + 'px';
        inHero.svg.style.height = stack + 'px';
        inHero.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + stack);
        inExp.svg.style.height = H + 'px';
        inExp.svg.style.marginBottom = -H + 'px';
        inExp.svg.setAttribute('viewBox', '0 ' + stack + ' ' + W + ' ' + H);
      }
      function update() {
        ticking = false;
        var still = reduce.matches, s = Math.max(0, window.scrollY), top = next.getBoundingClientRect().top;
        var drawn = still ? 1 : easeInOut(clamp((s - stack * 0.04) / (stack * 0.96), 0, 1));
        var opacity = still ? 1 : clamp(clamp(s / (stack * 0.55), 0, 1) * 1.6, 0, 1) * (1 - easeInOut(clamp((H - top) / H, 0, 1)));
        var state = drawn.toFixed(4) + opacity.toFixed(3);
        if (state === shown) return;
        shown = state;
        gsap.set(paths, { strokeDashoffset: 1 - drawn, opacity: opacity });
      }
      listen(window, 'scroll', function () { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
      function refresh() { size(); shown = ''; update(); }
      listen(window, 'resize', function () { if (!touch.matches || window.innerWidth !== width) refresh(); });
      listen(window, 'load', refresh);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
      refresh();
    });
  });

  /* Gele lijnen in Werk en Kennis (section_werk en section_kennis, staan alleen in Figma: 935:7806 en 935:8784). Werk: een
     horizontale lijn midden tussen de kop en de kaarten (werk_header en werk_list; in Figma op halve kaarthoogte, maar daar
     is hij bijna niet te zien, keuze van de gebruiker) en een schuine lijn van 76% boven naar
     99,7% onder. Kennis: een boog vanuit de linkerrand van het scherm (keuze van de gebruiker, in Figma uit de bovenrand) achter de eerste kaart door naar 31% onderin. Ze tekenen zich met de scroll en
     dezelfde timing als Reviews (start als de bovenkant van de sectie op 55% van de schermhoogte staat, klaar op -35%), keuze
     van de gebruiker. Boog en schuine lijn schalen mee met de sectie. Reduced motion: direct getekend. */
  each('.section_werk, .section_kennis', function (section) {
    var head = section.querySelector('.werk_header'), list = head && section.querySelector('.werk_list');
    withGsap(function (gsap) {
      var layer = lineLayer(list ? 2 : 1, 'position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;'), lines = layer.paths, ticking = false, drawn = -1;
      section.insertBefore(layer.svg, section.firstChild);
      undo(function () { layer.svg.remove(); });
      // De inhoud boven de lijnen
      layer.svg.nextElementSibling.style.position = 'relative';
      function size() {
        var w = section.offsetWidth, h = section.offsetHeight;
        layer.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        if (list) {
          // Zonder de verschuiving van het binnenkomen van de kop
          var y = (head.getBoundingClientRect().bottom - parseFloat(gsap.getProperty(head, 'y', 'px')) + list.getBoundingClientRect().top) / 2 - section.getBoundingClientRect().top;
          var x0 = w * 0.7646, x1 = w * 0.9972, over = (x1 - x0) / h * 10;
          lines[0].setAttribute('d', 'M -20 ' + y + ' L ' + (w + 20) + ' ' + y);
          lines[1].setAttribute('d', 'M ' + (x0 - over) + ' -10 L ' + (x1 + over) + ' ' + (h + 10));
          return;
        }
        // De boog uit Figma, in px op 1440 x 1095, 140 px lager en vanaf net buiten beeld: zo komt hij uit de linkerrand van
        // het scherm en niet uit de bovenrand van de sectie
        function P(x, y) { return x * w / 1440 + ' ' + (y + 140) * h / 1095; }
        lines[0].setAttribute('d', 'M ' + P(-14.57, -80.07) + ' C ' + P(32.43, -40.91) + ' ' + P(76.43, 6.19) + ' ' + P(116.47, 60.27) + ' C ' + P(163.73, 124.54) + ' ' + P(204.54, 198.02) + ' ' + P(237.73, 278.57) + ' C ' + P(263.33, 341.01) + ' ' + P(278.72, 396.35) + ' ' + P(298.78, 462.59) + ' L ' + P(572.86, 1367.89));
      }
      function update() {
        ticking = false;
        var H = window.innerHeight, L = reduce.matches ? 1 : clamp((H * 0.55 - section.getBoundingClientRect().top) / (H * 0.9), 0, 1);
        if (L === drawn) return;
        drawn = L;
        gsap.set(lines[0], { strokeDashoffset: 1 - easeInOut(L) });
        if (list) gsap.set(lines[1], { strokeDashoffset: 1 - easeInOut(clamp(L * 1.2 - 0.2, 0, 1)) });
      }
      listen(window, 'scroll', function () { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
      function refresh() { size(); drawn = -1; update(); }
      listen(window, 'resize', refresh);
      listen(window, 'load', refresh);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
      refresh();
    });
  });

  return a.clean;
}
