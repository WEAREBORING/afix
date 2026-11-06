/* Afix modules/carousel.js: data-a-carousel en data-a-case: scrollrij, stapel en hover op de cases. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, listen = a.listen, wait = a.wait, withGsap = a.withGsap, touchDevice = a.touchDevice, undo = a.undo, watch = a.watch;

  /* data-a-carousel (Section - Werk en Section - Reviews): op de lijst; de kaarten zijn de kinderen. De knoppen
     data-a-carousel-prev en -next (Element - Pijlknoppen) en de teller (data-a-carousel-current en -total) zoekt site.js
     in dezelfde section. Een lijst die zijwaarts scrolt (overflow in de class, zoals werk_list) is een scrollrij; een
     lijst die niet scrolt is een stapel (reviews_list, alle kaarten in één gridcel), met de volgende kaarten schuin erachter. */
  each('[data-a-carousel]', function (list) {
    var scope = list.closest('section') || list.parentNode;
    var items = [].slice.call(list.children);
    if (items.length < 2) return;
    var go = getComputedStyle(list).overflowX === 'visible' ? carouselStack(list, items, scope) : carouselRow(list, items);
    var prev = scope.querySelector('[data-a-carousel-prev]'), next = scope.querySelector('[data-a-carousel-next]');
    if (prev) listen(prev, 'click', function () { go(-1); });
    if (next) listen(next, 'click', function () { go(1); });
  });

  /* data-a-case (Section - Werk): hover op een case, alleen desktop met muis, en bij toetsenbordfocus op de kaartlink.
     Logokaart: case-card_logo-view wordt signaalgeel (variabele surface/accent), case-card_tags komen van boven en
     case-card_text van onder in beeld. Uitgelichte case (met case-card_feature-view): de foto zoomt iets in. Staat na
     data-a-carousel, zodat de kopieën van de eindeloze rij ook meedoen. Na het teruggaan neemt de class het weer over. */
  var cases = container.querySelectorAll('[data-a-case]');
  if (cases.length) withGsap(function (gsap) {
    var desktop = window.matchMedia('(hover: hover) and (min-width: 992px)');
    function rem(n) { return n * parseFloat(getComputedStyle(document.documentElement).fontSize); }
    [].forEach.call(cases, function (item) {
      var photo = item.querySelector('.case-card_feature-view .case-card_photo');
      var view = item.querySelector('.case-card_logo-view');
      var tags = item.querySelector('.case-card_tags'), text = item.querySelector('.case-card_text');
      var on = false, rest;
      function show() {
        if (on) return;
        on = true;
        // Reduced motion: wel tonen (de tekst hoort erbij), maar direct en zonder te bewegen of te zoomen
        var t = reduce.matches ? 0 : 1;
        if (photo) return t && gsap.to(photo, { scale: 1.03, duration: 0.8, ease: 'expo.out', overwrite: true });
        if (!view) return;
        // Ruststand uit de class onthouden, zodat het terugkeren klopt
        rest = rest || getComputedStyle(view).backgroundColor;
        gsap.to(view, { backgroundColor: getComputedStyle(view).getPropertyValue('--_theme---surface--accent'), duration: 0.35 * t, ease: 'power2.out', overwrite: true });
        if (tags) gsap.hoverIn(tags, { y: -rem(0.375) * t }, { opacity: 1, y: 0, duration: 0.4 * t, delay: 0.06 * t, ease: 'power2.out', overwrite: true });
        if (text) gsap.hoverIn(text, { y: rem(0.5) * t }, { opacity: 1, y: 0, duration: 0.4 * t, delay: 0.06 * t, ease: 'power2.out', overwrite: true });
      }
      function hide() {
        if (!on) return;
        on = false;
        if (photo) return gsap.hoverOut(photo, { scale: 1, duration: 0.6 }, 'transform');
        if (!view) return;
        gsap.hoverOut(view, { backgroundColor: rest }, 'backgroundColor');
        if (tags) gsap.hoverOut(tags, { opacity: 0, y: -rem(0.375) }, 'opacity,transform');
        if (text) gsap.hoverOut(text, { opacity: 0, y: rem(0.5) }, 'opacity,transform');
      }
      listen(item, 'mouseenter', function () { if (desktop.matches) show(); });
      listen(item, 'mouseleave', hide);
      listen(item, 'focusin', function (e) { if (e.target.matches(':focus-visible')) show(); });
      listen(item, 'focusout', hide);
    });
  });

  /* Stapel (Reviews), als de Flick Cards van Osmo maar krapper: de actieve kaart recht vooraan, de volgende rechts en de
     vorige links er schuin achter (9% opzij, 4°), daarna nog een paar verder (16%, 7°), zonder tekst zoals de
     achterkaarten in Figma en in een effen, lichtere tint (de kaartkleur voor 66% en 33% gemengd met de sectie); meer kaarten liggen onzichtbaar achteraan. Pijlen of slepen (muis en vinger): tijdens het
     slepen schuiven alle kaarten samen tot halverwege hun volgende plek (de voorste blijft dekkend en gaat mee opzij),
     bij loslaten na 10% wisselen de lagen en veert alles elastisch op zijn plek (GSAP).
     Naar links = volgende, naar rechts = vorige. De teller (data-a-carousel-count) zit in de actieve kaart en beweegt
     mee. Alleen de actieve kaart is voor schermlezers zichtbaar (aria-live). Zonder GSAP: alleen de actieve kaart. */
  function carouselStack(list, items, scope) {
    var i = 0, n = items.length, gsap = null;
    var count = scope.querySelector('[data-a-carousel-count]');
    // De teller reist mee met de actieve kaart: bij het opruimen terug naar zijn plek
    if (count) { var countHome = count.parentNode, countNext = count.nextSibling; undo(function () { countHome.insertBefore(count, countNext); }); }
    var current = scope.querySelector('[data-a-carousel-current]'), total = scope.querySelector('[data-a-carousel-total]');
    function pad(v) { return (v < 10 ? '0' : '') + v; }
    // Effen tint voor de achterkaarten: de kaartkleur (uit de class) gemengd met de achtergrond van de sectie
    function rgb(c) { return (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number); }
    var dark = rgb(getComputedStyle(items[0]).backgroundColor), page = rgb(getComputedStyle(scope).backgroundColor);
    function shade(o) { return 'rgb(' + dark.map(function (v, j) { return Math.round(page[j] + (v - page[j]) * o); }).join(', ') + ')'; }
    function vis(c) { return c.o > 0 ? 1 : 0; }
    // Stand per afstand tot de actieve kaart (rechts = volgende): x en y in % van de kaart, draaiing, schaal, tint (1 = de
    // kaartkleur, 0 = onzichtbaar), dekking van de inhoud, laag
    function config(k, at) {
      var d = k - at;
      if (d > n / 2) d -= n; else if (d < -n / 2) d += n;
      var a = Math.abs(d), s = d < 0 ? -1 : 1;
      if (a === 0) return { x: 0, y: 0, rot: 0, sc: 1, o: 1, c: 1, z: 5 };
      if (a === 1) return { x: 9 * s, y: 1.5, rot: 4 * s, sc: 0.94, o: 0.66, c: 0, z: 4 };
      if (a === 2) return { x: 16 * s, y: 3, rot: 7 * s, sc: 0.88, o: 0.33, c: 0, z: 3 };
      return { x: 20 * s, y: 3, rot: 9 * s, sc: 0.82, o: 0, c: 0, z: 2 };
    }
    function content(card, c, d) { if (card.children.length) gsap.to(card.children, { opacity: c, duration: d, ease: 'power2.out', overwrite: true }); }
    function settle(card, c, animate) {
      card.style.zIndex = c.z;
      var vars = { x: 0, xPercent: c.x, yPercent: c.y, rotation: c.rot, scale: c.sc, opacity: vis(c) };
      if (animate) gsap.to(card, Object.assign(vars, { duration: 0.6, ease: 'elastic.out(1.2, 1)', overwrite: true }));
      else gsap.set(card, vars);
      // De kleur apart en zonder veer, anders schiet hij voorbij de tint
      if (c.o > 0) gsap.to(card, { backgroundColor: shade(c.o), duration: animate ? 0.35 : 0, ease: 'power2.out' });
      content(card, c.c, animate ? 0.3 : 0);
    }
    function label() {
      if (current) current.textContent = pad(i + 1);
      if (total) total.textContent = ' / ' + pad(n);
      // De teller hoort bij de actieve kaart, zodat hij meebeweegt
      if (count && gsap) items[i].appendChild(count);
      items.forEach(function (card, k) { if (k === i) card.removeAttribute('aria-hidden'); else card.setAttribute('aria-hidden', 'true'); });
    }
    function render() {
      label();
      items.forEach(function (card, k) {
        if (!gsap) { card.style.opacity = k === i ? '1' : '0'; card.style.visibility = k === i ? 'visible' : 'hidden'; return; }
        card.style.visibility = 'visible';
        settle(card, config(k, i), false);
      });
    }
    list.setAttribute('aria-live', 'polite');
    render();
    withGsap(function (g) {
      gsap = g;
      list.style.isolation = 'isolate';
      list.style.cursor = 'grab';
      list.style.userSelect = 'none';
      list.style.touchAction = 'pan-y';
      items.forEach(function (card) { card.style.position = 'relative'; });
      [].forEach.call(list.querySelectorAll('*'), function (el) { el.style.cursor = 'inherit'; });
      if (count) count.style.cursor = 'inherit';
      render();
    });

    // Wisselen: dir 1 = volgende, -1 = vorige. De lagen wisselen meteen en alles veert elastisch naar de nieuwe stand: de
    // oude voorkaart schuift naar zijn plek opzij achter de nieuwe.
    // Een kaart die van de ene naar de andere kant moet (achteraan de stapel), schuift niet achter de stapel langs maar
    // fadet uit en aan de andere kant weer in.
    function wraps(a, b) { return a.x * b.x < 0; }
    function go(dir) {
      var prev = i;
      i = (i + dir + n) % n;
      if (!gsap) return render();
      label();
      items.forEach(function (card, k) {
        var c = config(k, i);
        if (reduce.matches || !wraps(config(k, prev), c)) return settle(card, c, !reduce.matches);
        card.style.zIndex = c.z;
        gsap.timeline()
          .to(card, { opacity: 0, duration: 0.15, ease: 'power1.in', overwrite: true })
          .set(card, { x: 0, xPercent: c.x, yPercent: c.y, rotation: c.rot, scale: c.sc, backgroundColor: shade(c.o || 0.33) })
          .to(card, { opacity: vis(c), duration: 0.35, ease: 'power2.out' });
        content(card, 0, 0);
      });
    }

    // Slepen: de kaarten mengen van hun huidige naar hun volgende stand, tot halverwege bij een halve breedte (zoals Osmo).
    // De voorste kaart blijft dekkend en gaat iets verder mee met de hand; de kaart die erna komt ligt direct onder hem.
    var drag = null;
    listen(list, 'pointerdown', function (e) {
      if (!gsap || e.button !== 0) return;
      drag = { x: e.clientX, id: e.pointerId, moved: false, p: 0 };
    });
    listen(list, 'pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, w = list.offsetWidth;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; list.setPointerCapture(drag.id); list.style.cursor = 'grabbing'; }
      if (!drag.moved) return;
      drag.p = Math.max(-0.5, Math.min(0.5, dx / w));
      var t = Math.abs(drag.p), next = (i + (drag.p < 0 ? 1 : -1) + n) % n;
      items.forEach(function (card, k) {
        var a = config(k, i), b = config(k, next);
        function mix(key) { return a[key] + (b[key] - a[key]) * t; }
        var front = k === i, coming = k === next;
        // Kaart die naar de andere kant moet: blijft staan en fadet uit
        if (wraps(a, b)) return gsap.set(card, { opacity: vis(a) * (1 - 2 * t), overwrite: true });
        gsap.set(card, { x: front ? drag.p * 0.3 * card.offsetWidth : 0, xPercent: mix('x'), yPercent: mix('y'), rotation: mix('rot'), scale: mix('sc'), opacity: front ? 1 : vis(a) + (vis(b) - vis(a)) * t, backgroundColor: shade(front ? 1 : Math.max(mix('o'), 0.33)), overwrite: true });
        card.style.zIndex = front ? 5 : coming ? 4.5 : a.z;
        if (!front && card.children.length) gsap.set(card.children, { opacity: coming ? t : 0, overwrite: true });
      });
    });
    function release() {
      if (!drag) return;
      var d = drag;
      drag = null;
      list.style.cursor = 'grab';
      if (!d.moved) return;
      if (Math.abs(d.p) > 0.1) return go(d.p < 0 ? 1 : -1);
      // Te kort: terugveren
      items.forEach(function (card, k) { settle(card, config(k, i), true); });
    }
    listen(list, 'pointerup', release);
    listen(list, 'pointercancel', release);
    listen(list, 'dragstart', function (e) { e.preventDefault(); });

    return go;
  }

  /* Scrollrij, eindeloos: de actieve kaart staat in het midden van de rij, en de rij begint op de breedste kaart. Een pijl schuift naar de volgende of vorige
     kaart, met dezelfde beweging als het zelf doorschuiven: elke 4 seconden als de rij in beeld is, niet bij hover, focus of
     reduced motion. Slepen met de muis: de rij volgt, schiet na loslaten met de vaart door en remt af op een kaart; site.js
     doet het uitlijnen dan zelf met GSAP en de scroll-snap uit de class staat uit, want die snapt hard. Op touch swipet de
     browser zelf met scroll-snap (per kaart, in het midden): dat volgt de vinger het best en houdt zijn eigen natrillen. */
  function carouselRow(list, items) {
    var gsap = null, tween = null, dest = 0, touch = touchDevice.matches, touching = false;
    withGsap(function (g) { gsap = g; });
    // Eindeloos: een kopie van alle kaarten ervoor en erna. Staat de rij na het schuiven in een kopie, dan springt hij
    // ongemerkt een set terug. Kopieën zijn verborgen voor schermlezers en niet met Tab te bereiken, wel klikbaar.
    // shortcut: één kopie per kant, genoeg zolang de kaarten samen breder zijn dan het scherm; anders meer kopieën maken
    function copy() {
      return items.map(function (it) {
        var c = it.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.removeAttribute('id');
        [].forEach.call(c.querySelectorAll('[id]'), function (el) { el.removeAttribute('id'); });
        [].forEach.call(c.querySelectorAll('a, button, input, [tabindex]'), function (el) { el.tabIndex = -1; });
        return c;
      });
    }
    var before = copy(), after = copy(), cards = before.concat(items, after);
    before.forEach(function (c) { list.insertBefore(c, items[0]); });
    after.forEach(function (c) { list.appendChild(c); });
    undo(function () { before.concat(after).forEach(function (c) { c.remove(); }); });
    // De scrollpositie waarop deze kaart in het midden van de rij staat
    function posOf(el) {
      var row = list.getBoundingClientRect(), card = el.getBoundingClientRect();
      return list.scrollLeft + card.left + card.width / 2 - row.left - row.width / 2;
    }
    function normalize() {
      if (tween || drag) return;
      var base = posOf(items[0]), set = after[0].offsetLeft - items[0].offsetLeft;
      var jump = list.scrollLeft < base - 2 ? set : list.scrollLeft >= base + set - 2 ? -set : 0;
      if (!jump) return;
      // Scroll-snap even uit, anders trekt de browser de sprong terug
      list.style.scrollSnapType = 'none';
      list.scrollLeft += jump;
      list.style.scrollSnapType = touch ? 'x mandatory' : 'none';
    }
    list.style.scrollSnapType = touch ? 'x mandatory' : 'none';
    if (touch) {
      // scroll-padding uit de class is voor links uitlijnen zonder JS; hier staat de kaart in het midden
      list.style.scrollPadding = '0';
      cards.forEach(function (c) { c.style.scrollSnapAlign = 'center'; c.style.scrollSnapStop = 'always'; });
    }
    // Muis: horizontaal slepen doet site.js en verticaal scrollen blijft bij de pagina
    else list.style.touchAction = 'pan-y';
    function scrollTo(x, duration, ease) {
      stop();
      if (!gsap || reduce.matches) { list.scrollLeft = x; normalize(); return; }
      dest = x;
      list.style.scrollSnapType = 'none';
      tween = gsap.to(list, { scrollLeft: x, duration: duration || 0.6, ease: ease || 'power3.out', onComplete: function () { stop(); normalize(); } });
    }
    function stop() {
      if (tween) tween.kill();
      tween = null;
      if (touch) list.style.scrollSnapType = 'x mandatory';
    }
    function go(d) {
      // Loopt er nog een tween (snel klikken), dan rekenen vanaf waar die eindigt
      var now = tween ? dest : list.scrollLeft;
      var lefts = cards.map(function (c) { return posOf(c) - now; });
      var to = d > 0 ? lefts.filter(function (x) { return x > 2; })[0] : lefts.filter(function (x) { return x < -2; }).pop();
      if (to !== undefined) scrollTo(clampScroll(now + to), 1.2, 'power2.inOut');
    }
    function clampScroll(x) { return Math.min(list.scrollWidth - list.clientWidth, Math.max(0, x)); }
    // Naar de kaart die het dichtst bij x ligt; dir 1 of -1 dwingt minstens één kaart verder dan from
    function settleNear(x, dir, from, duration) {
      var pos = cards.map(posOf), best = pos.reduce(function (a, b) { return Math.abs(b - x) < Math.abs(a - x) ? b : a; });
      if (dir > 0 && best <= from + 2) best = pos.filter(function (p) { return p > from + 2; })[0];
      if (dir < 0 && best >= from - 2) best = pos.filter(function (p) { return p < from - 2; }).pop();
      if (best !== undefined) scrollTo(clampScroll(best), duration);
    }
    var inView = false, paused = false, timer;
    function schedule() {
      clearTimeout(timer);
      timer = wait(function () { if (inView && !paused && !drag && !touching && !document.hidden && !reduce.matches) go(1); schedule(); }, 4000);
    }
    if ('IntersectionObserver' in window) watch(new IntersectionObserver(function (es) { inView = es[0].isIntersecting; }, { threshold: 0.3 })).observe(list);
    listen(list, 'mouseenter', function () { paused = true; });
    listen(list, 'mouseleave', function () { paused = false; });
    listen(list, 'focusin', function () { paused = true; });
    listen(list, 'focusout', function () { paused = false; });
    // Trackpad: de browser scrollt vrij; staat de rij 150 ms stil, dan zacht naar de dichtstbijzijnde kaart
    listen(list, 'wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) stop(); schedule(); }, { passive: true });
    var settle;
    function later() {
      clearTimeout(settle);
      settle = wait(function () {
        if (tween || drag || touching) return;
        // Op touch heeft de browser al uitgelijnd
        if (touch) normalize(); else settleNear(list.scrollLeft);
      }, 150);
    }
    listen(list, 'scroll', function () { if (!tween && !drag) later(); }, { passive: true });
    listen(window, 'resize', later);
    listen(list, 'touchstart', function () { touching = true; }, { passive: true });
    ['touchend', 'touchcancel'].forEach(function (name) { listen(list, name, function () { touching = false; later(); }, { passive: true }); });

    var drag = null, dragged = false;
    listen(list, 'pointerdown', function (e) {
      stop();
      schedule();
      dragged = false;
      if (e.button !== 0 || e.pointerType === 'touch') return;
      drag = { x: e.clientX, left: list.scrollLeft, id: e.pointerId, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
    });
    listen(list, 'pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!dragged && Math.abs(dx) > 6) {
        dragged = true;
        list.style.userSelect = 'none';
        list.setPointerCapture(drag.id);
      }
      if (!dragged) return;
      list.scrollLeft = drag.left - dx;
      // Snelheid in px per ms, licht afgevlakt over de laatste bewegingen
      var dt = e.timeStamp - drag.lastT;
      if (dt > 0) drag.v = 0.8 * ((e.clientX - drag.lastX) / dt) + 0.2 * drag.v;
      drag.lastX = e.clientX;
      drag.lastT = e.timeStamp;
    });
    function endDrag(e) {
      if (!drag) return;
      var d = drag;
      drag = null;
      // Alleen getikt: een gestopte tween mag niet tussen twee kaarten blijven staan
      if (!dragged) return later();
      list.style.userSelect = '';
      // Stond de vinger of muis voor het loslaten al stil, dan geen vaart meer
      var v = e && e.timeStamp - d.lastT < 80 ? d.v : 0, moved = d.x - d.lastX;
      // Doorschieten: ongeveer waar de rij met deze vaart tot stilstand komt, daarna afremmen op een kaart
      settleNear(list.scrollLeft - v * 280, Math.abs(moved) > 40 ? (moved > 0 ? 1 : -1) : 0, d.left, Math.min(0.9, 0.5 + Math.abs(v) * 0.15));
    }
    listen(list, 'pointerup', endDrag);
    listen(list, 'pointercancel', function () { endDrag(null); });
    // Na slepen geen klik op de kaartlink, en geen sleepbeeld van een link of foto
    listen(list, 'click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
    listen(list, 'dragstart', function (e) { e.preventDefault(); });

    list.scrollLeft = posOf(items.reduce(function (a, b) { return b.offsetWidth > a.offsetWidth ? b : a; }));
    schedule();
    return function (d) { go(d); schedule(); };
  }

  return a.clean;
}
