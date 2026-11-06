/* Afix modules/footer-cta.js: footer_cta-list: binnenkomen en hover van de footerkaarten. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, listen = a.listen, withGsap = a.withGsap, onceInView = a.onceInView;

  /* Footer-CTA's (footer_cta-list met footer_cta-card en footer_cta-card-dark): de kaarten komen een keer binnen zodra ze
     in beeld komen (fade en 28px omhoog), zoals .rv in het prototype. Hover of toetsenbordfocus, alleen desktop met muis
     (Figma, niet in het prototype): de kaart wordt 1,5 keer zo breed als de andere, en de andere toont zijn foto
     (footer_cta-image) over de hele kaart. De tekst houdt zijn breedte, zodat hij niet herschikt. Reduced motion: geen
     binnenkomen, de hover toont direct. */
  each('.footer_cta-list', function (list) {
    var cards = [].filter.call(list.children, function (c) { return c.matches('.footer_cta-card, .footer_cta-card-dark'); });
    if (cards.length !== 2) return;
    withGsap(function (gsap) {
      if (!reduce.matches) cards.forEach(function (card) {
        gsap.set(card, { opacity: 0, y: 28 });
        onceInView(card, 5, function () {
          gsap.to(card, { opacity: 1, duration: 0.9, ease: 'sine.inOut', clearProps: 'opacity' });
          gsap.to(card, { y: 0, duration: 1, ease: 'power4.out', clearProps: 'transform' });
        });
      });
      var desktop = window.matchMedia('(hover: hover) and (min-width: 992px)'), active = null, cols = { a: 1, b: 1 };
      var parts = cards.map(function (c) { return { card: c, content: c.querySelector('.footer_cta-content'), img: c.querySelector('.footer_cta-image') }; });
      function draw() { list.style.gridTemplateColumns = 'minmax(0px, ' + cols.a + 'fr) minmax(0px, ' + cols.b + 'fr)'; }
      function set(card) {
        if (card === active) return;
        var first = !active, t = reduce.matches ? 0 : 1;
        active = card;
        if (card && first) parts.forEach(function (p) { if (p.content) p.content.style.width = p.content.offsetWidth + 'px'; });
        gsap.to(cols, {
          a: card === cards[0] ? 1.5 : 1, b: card === cards[1] ? 1.5 : 1, duration: (card ? 0.4 : 0.5) * t, ease: card ? 'power4.out' : 'sine.inOut', overwrite: true, onUpdate: draw,
          onComplete: function () {
            draw();
            if (active) return;
            list.style.gridTemplateColumns = '';
            parts.forEach(function (p) { if (p.content) p.content.style.width = ''; });
          }
        });
        parts.forEach(function (p) {
          if (!p.img) return;
          var on = card && p.card !== card;
          gsap.to(p.img, { opacity: on ? 1 : 0, duration: (card ? 0.25 : 0.4) * t, ease: card ? 'power2.out' : 'sine.inOut', overwrite: true, onComplete: card ? null : function () { gsap.set(p.img, { clearProps: 'opacity' }); } });
        });
      }
      cards.forEach(function (card) {
        listen(card, 'pointerenter', function (e) { if (e.pointerType === 'mouse' && desktop.matches) set(card); });
        listen(card, 'focusin', function (e) { if (desktop.matches && e.target.matches(':focus-visible')) set(card); });
      });
      listen(list, 'pointerleave', function () { set(null); });
      listen(list, 'focusout', function (e) { if (!list.contains(e.relatedTarget)) set(null); });
      listen(desktop, 'change', function () { set(null); });
    });
  });

  return a.clean;
}
