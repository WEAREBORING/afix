/* Afix modules/prijs.js: data-a-prijs: hover op een prijs of partner in de prijzenkast. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, listen = a.listen, withGsap = a.withGsap, undo = a.undo;

  /* data-a-prijs (prijs-card op /prijzenkast, Figma 1095:3133): in rust zijn de lauwerkrans (prijs-card_krans) en het logo
     (prijs-card_logo-wrap) gedempt wit, bij hover worden ze signaalgeel (surface/accent) en wordt de ondertitel iets lichter.
     Een img is niet te kleuren: het logo wordt daarom een masker op zichzelf met de tekstkleur als vlak, zodat elk logo
     (svg of png, welke kleur ook) meekleurt. Zonder site.js blijft het logo gewoon gedempt staan. Een partner
     (partner-card, zonder krans) heeft hetzelfde attribuut: daar kleurt alleen het logo (partner-card_logo-wrap).
     Een logo met doorzichtigheid in het bestand zelf blijft ook bij hover flets: het masker neemt die dekking over. */
  each('[data-a-prijs]', function (card) {
    var krans = card.querySelector('.prijs-card_krans'), wrap = card.querySelector('.prijs-card_logo-wrap, .partner-card_logo-wrap');
    var logo = wrap && wrap.querySelector('img'), sub = card.querySelector('.prijs-card_sub'), marks = [krans, wrap].filter(Boolean);
    var src = logo && logo.getAttribute('src');
    if (src) {
      var mask = 'url("' + src + '") center / contain no-repeat';
      logo.style.cssText = 'background-color: currentColor; object-position: -999rem 0; -webkit-mask: ' + mask + '; mask: ' + mask + ';';
      undo(function () { logo.style.cssText = ''; });
    }
    withGsap(function (gsap) {
      var t = reduce.matches ? 0 : 1, mouse = window.matchMedia('(hover: hover)');
      listen(card, 'mouseenter', function () {
        if (!mouse.matches) return;
        gsap.to(marks, { opacity: 1, color: getComputedStyle(card).getPropertyValue('--_theme---surface--accent'), duration: 0.3 * t, ease: 'power2.out', overwrite: true });
        if (sub) gsap.to(sub, { opacity: 0.8, duration: 0.3 * t, ease: 'power2.out', overwrite: true });
      });
      listen(card, 'mouseleave', function () {
        gsap.hoverOut(marks, { opacity: 0.2, color: getComputedStyle(card).color }, 'opacity,color');
        if (sub) gsap.hoverOut(sub, { opacity: 0.5 }, 'opacity');
      });
      undo(function () { gsap.set(marks.concat(sub || []), { clearProps: 'opacity,color' }); });
    });
  });

  return a.clean;
}
