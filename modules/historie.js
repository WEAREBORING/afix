/* Afix modules/historie.js: data-a-historie: de mijlpalen rijden met de scroll op een stapel. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, clamp = a.clamp, listen = a.listen, raf = a.raf, withGsap = a.withGsap, undo = a.undo;

  /* data-a-historie (historie_component in Section - Historie): vanaf 992px en niet bij reduced motion staat het eerste kind
     (historie_stage) vast op het scherm en rijdt elke kaart (data-a-mijlpaal, Item - Mijlpaal) met de scroll mee, zoals de
     projectkaarten op viens-la.com (keuze van de gebruiker): een kaart komt 1 px per px scrollen van onder aanrijden, 5 graden
     gekanteld per kaartafstand, en staat recht zodra hij landt. Een gelande kaart krimpt daarna 10% per kaartafstand vanaf
     zijn bovenrand en schuift iets omhoog, zodat hij boven de volgende uit blijft steken (Figma 1030:5142), en wordt donkerder.
     De laatste kaart blijft op volle grootte staan.
     De module zet daarvoor de hoogte van het component en de plek van de kaarten inline. Smaller, bij reduced motion en
     zonder site.js staan de kaarten gewoon onder elkaar. */
  each('[data-a-historie]', function (sec) {
    var stage = sec.firstElementChild, cards = [].slice.call(sec.querySelectorAll('[data-a-mijlpaal]'));
    var list = cards.length ? cards[0].parentNode : null, wide = window.matchMedia('(min-width: 992px)');
    if (!stage || !list || reduce.matches) return;
    withGsap(function (gsap) {
      var m = null, queued = false, all = [sec, stage, list].concat(cards);
      function release() {
        m = null;
        gsap.set(all, { clearProps: 'all' });
      }
      function draw() {
        queued = false;
        if (!m) return;
        var t = clamp(-sec.getBoundingClientRect().top, 0, m.height - m.vh);
        cards.forEach(function (card, i) {
          // De laatste kaart blijft na het landen staan: er komt niets meer overheen
          var left = m.first + m.gap * i - t;
          if (i === cards.length - 1) left = Math.max(left, 0);
          if (left >= 0) return gsap.set(card, { y: left, rotation: -5 * left / m.gap, scale: 1, filter: 'brightness(1)' });
          var s = Math.max(0.6, 1 + 0.1 * left / m.gap);
          gsap.set(card, { y: -(1 - s) * m.lift, rotation: 0, scale: s, filter: 'brightness(' + Math.max(0.5, 1 - (1 - s) * 3) + ')' });
        });
      }
      function measure() {
        release();
        if (!wide.matches) return;
        var vh = window.innerHeight, rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        m = { vh: vh, gap: vh * 0.8, first: vh * 0.85, lift: 35 * rem };
        m.height = vh + m.first + m.gap * (cards.length - 1) + vh * 0.25;
        gsap.set(sec, { height: m.height, paddingTop: 0, paddingBottom: 0 });
        gsap.set(stage, { position: 'sticky', top: 0, height: vh, justifyContent: 'center' });
        gsap.set(list, { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'block' });
        gsap.set(cards, { position: 'absolute', left: '50%', top: '50%', xPercent: -50, yPercent: -50, transformOrigin: '50% 0%', willChange: 'transform' });
        draw();
      }
      function queue() { if (!queued) { queued = true; raf(draw); } }
      listen(window, 'scroll', queue);
      listen(window, 'resize', measure);
      undo(release);
      measure();
    });
  });

  return a.clean;
}
