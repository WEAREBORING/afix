/* Afix modules/rij.js: data-a-row: scrollrij op de kennispagina. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, clamp = a.clamp, listen = a.listen, withGsap = a.withGsap;

  /* data-a-row (rijen op de kennispagina): een zijwaarts scrollende rij zonder kopieën, zodat filteren werkt. Met muis slepen
     of de pijlknoppen (Element - Pijlknoppen in dezelfde data-a-row), op touch vegen. Aan het begin en eind vervaagt de pijl. */
  each('[data-a-row]', function (row) {
    var list = row.querySelector('.kennis-rij_list');
    if (!list) return;
    var prev = row.querySelector('[data-a-carousel-prev]'), next = row.querySelector('[data-a-carousel-next]'), gsap = null;
    var mouse = window.matchMedia('(hover: hover)'), drag = null, dragged = false;
    withGsap(function (g) { gsap = g; });
    function end() { return list.scrollWidth - list.clientWidth; }
    function setButton(btn, on) {
      if (!btn || btn.disabled === !on) return;
      btn.disabled = !on;
      if (gsap) gsap.to(btn, { opacity: on ? 1 : 0.3, duration: reduce.matches ? 0 : 0.2, ease: 'power2.out', overwrite: true });
      else btn.style.opacity = on ? 1 : 0.3;
    }
    function state() {
      setButton(prev, list.scrollLeft > 1);
      setButton(next, list.scrollLeft < end() - 1);
      if (!drag) list.style.cursor = mouse.matches && end() > 1 ? 'grab' : '';
    }
    function stepSize() {
      var card = [].filter.call(list.children, function (c) { return c.offsetWidth; })[0];
      return card ? card.offsetWidth + parseFloat(getComputedStyle(list).columnGap) : 0;
    }
    function glide(to, duration) {
      if (gsap && !reduce.matches) gsap.to(list, { scrollLeft: to, duration: duration, ease: 'power3.out', overwrite: true });
      else list.scrollLeft = to;
    }
    function go(dir) {
      var step = stepSize();
      if (step) glide(clamp((Math.round(list.scrollLeft / step) + dir) * step, 0, end()), 0.7);
    }
    if (prev) listen(prev, 'click', function () { go(-1); });
    if (next) listen(next, 'click', function () { go(1); });
    // Slepen met de muis, zoals de Werk-rij: de rij volgt de cursor, schiet met zijn vaart door en remt af op een kaart
    listen(list, 'pointerdown', function (e) {
      dragged = false;
      if (e.button !== 0 || e.pointerType === 'touch' || end() <= 1) return;
      if (gsap) gsap.killTweensOf(list);
      drag = { x: e.clientX, left: list.scrollLeft, id: e.pointerId, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
    });
    listen(list, 'pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!dragged && Math.abs(dx) > 6) {
        dragged = true;
        list.style.userSelect = 'none';
        list.setPointerCapture(drag.id);
        list.style.cursor = 'grabbing';
      }
      if (!dragged) return;
      list.scrollLeft = drag.left - dx;
      var dt = e.timeStamp - drag.lastT;
      if (dt > 0) drag.v = 0.8 * ((e.clientX - drag.lastX) / dt) + 0.2 * drag.v;
      drag.lastX = e.clientX;
      drag.lastT = e.timeStamp;
    });
    function endDrag(e) {
      if (!drag) return;
      var d = drag, step = stepSize();
      drag = null;
      if (!dragged) return;
      list.style.userSelect = '';
      list.style.cursor = 'grab';
      // Stond de muis voor het loslaten al stil, dan geen vaart meer
      var v = e && e.timeStamp - d.lastT < 80 ? d.v : 0, x = list.scrollLeft - v * 280;
      if (step) glide(x >= end() - step / 2 ? end() : clamp(Math.round(x / step) * step, 0, end()), Math.min(0.9, 0.5 + Math.abs(v) * 0.15));
    }
    listen(list, 'pointerup', endDrag);
    listen(list, 'pointercancel', function () { endDrag(null); });
    // Na slepen geen klik op de kaartlink, en geen sleepbeeld van een link of foto
    listen(list, 'click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
    listen(list, 'dragstart', function (e) { e.preventDefault(); });
    [].forEach.call(list.querySelectorAll('a'), function (a) { a.style.cursor = 'inherit'; });
    listen(list, 'scroll', state, { passive: true });
    listen(window, 'resize', state);
    state();
  });

  return a.clean;
}
