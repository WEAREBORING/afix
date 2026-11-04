/* Afix modules/pin.js: data-a-pin: Expertises staat vast en de rij rijdt met de scroll. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, clamp = a.clamp, listen = a.listen, raf = a.raf, wait = a.wait, withGsap = a.withGsap, jumpTo = a.jumpTo, undo = a.undo;

  /* data-a-pin (Section - Expertises): op elke breedte (niet bij reduced motion) rijden de kaarten van de
     scrollrij (expertises_list) als één trein met de scroll mee, zoals het prototype: ze komen van rechts buiten beeld
     binnen terwijl de sectie omhoog schuift (een x-verschuiving van de rij; de eerste kaart staat op zijn plek als de
     sectie vast gaat staan), en rijden door op hooguit 0,72 px opzij per px scrollen (alles met een transform op de rij,
     niet met scrollLeft: dat hoeft dan niet elke frame opnieuw getekend te worden)
     terwijl de inhoud van de sectie (het eerste kind, padding-global) vaststaat (de scroll van de rij), tot de laatste
     kaart in beeld is, plus een korte pauze. Daarna schuift de volgende sectie (Werk) er met ronde bovenhoeken
     (radius/l) en een zachte schaduw overheen, en zakt de inhoud weg (iets omhoog, kleiner, vervagend); de trein rijdt daarbij
     op dezelfde snelheid door tot hij helemaal bedekt is, dus er is geen stop. site.js zet
     daarvoor de hoogte van de sectie en de negatieve marge van Werk inline. Bij reduced motion en zonder site.js blijft
     het een gewone veegrij (met de muis te slepen). Tab naar een kaart buiten beeld scrolt de pagina naar de plek waar die
     kaart in beeld staat. Op een telefoon wordt alleen opnieuw gemeten als de breedte verandert: de adresbalk die in- en
     uitschuift verandert de hoogte, en dan zou de sectie tijdens het scrollen verspringen. */
  each('[data-a-pin]', function (sec) {
    var stick = sec.firstElementChild, inner = stick && stick.firstElementChild, next = sec.nextElementSibling;
    var row = [].filter.call(sec.querySelectorAll('*'), function (el) { return /auto|scroll/.test(getComputedStyle(el).overflowX); })[0];
    if (!stick || !inner || !row) return;
    var touch = window.matchMedia('(hover: none)');
    var speed = 0.72, m = null, width = 0;
    withGsap(function (gsap) {
      function release() {
        m = null;
        sec.style.height = '';
        stick.style.position = stick.style.top = stick.style.overflowX = '';
        row.style.overflow = row.style.scrollSnapType = '';
        if (next) ['position', 'zIndex', 'marginTop', 'borderTopLeftRadius', 'borderTopRightRadius', 'boxShadow', 'clipPath'].forEach(function (p) { next.style[p] = ''; });
        gsap.killTweensOf(train);
        gsap.set(row, { clearProps: 'transform,willChange' });
        row.scrollLeft = 0;
        gsap.set(inner, { clearProps: 'transform,opacity,willChange' });
      }
      function measure() {
        release();
        // De achtergrondvorm (expertises_background) loopt door uit de hero erboven. Beide svg's schalen als slice met een
        // viewBox van 1440 breed (hero 705 hoog, onderaan verankerd; hier 1410 hoog, bovenaan verankerd). Met dezelfde schaal
        // als de hero en een vak van 1410 keer die schaal sluit de vorm op elk formaat aan en loopt hij tot zijn einde door.
        // De class benadert dit al (twee keer de herohoogte).
        var bg = sec.querySelector('.expertises_background'), prev = sec.previousElementSibling;
        if (bg && prev) bg.style.height = 1410 * Math.max(prev.offsetWidth / 1440, prev.offsetHeight / 705) + 'px';
        var max = row.scrollWidth - row.clientWidth, first = row.firstElementChild;
        // Niet vast: met een muis is de rij te slepen (zie onder)
        row.style.cursor = window.matchMedia('(hover: hover)').matches && max > 0 ? 'grab' : '';
        width = window.innerWidth;
        if (reduce.matches || max <= 0 || !first) return;
        row.style.cursor = '';
        var H = window.innerHeight, h = stick.offsetHeight;
        // Midden in beeld; is de inhoud hoger dan het scherm, dan staat de onderkant (de rij) in beeld
        var top = h < H ? (H - h) / 2 : H - h;
        // Start: de eerste kaart net rechts buiten beeld. De trein rijdt vanaf het moment dat de sectie onderin binnenkomt,
        // en de eerste kaart staat op zijn plek precies als de sectie vast gaat staan (op een smal scherm is dat stuk kort).
        // Vast rijdt hij door op hooguit 0,72 px per px tot de laatste kaart binnen is, plus een pauze van een vijfde scherm
        var offset = document.documentElement.clientWidth - first.getBoundingClientRect().left, entry = Math.max(1, H - top);
        var v1 = offset / entry, v2 = Math.min(v1, speed);
        var dist = Math.max(0.6 * H, max / v2 + 0.2 * H);
        // Doorrijden tot Werk alles bedekt: dist plus een scherm, op dezelfde snelheid
        m = { top: top, dist: dist, H: H, max: max, offset: offset, travel: offset + max + 1.2 * H * v2, entry: entry, v1: v1, v2: v2 };
        sec.style.height = (h + dist + H) + 'px';
        stick.style.position = 'sticky';
        stick.style.top = top + 'px';
        // De rij volgt alleen de scroll: geen eigen scroll of snap meer. De kaarten mogen buiten de rij; stick snijdt ze af
        row.style.overflow = 'visible';
        row.style.scrollSnapType = 'none';
        stick.style.overflowX = 'clip';
        gsap.set(row, { willChange: 'transform' });
        gsap.set(inner, { willChange: 'transform, opacity' });
        if (next) {
          // Werk komt onderin binnen precies als de rij klaar is, en bedekt de inhoud als die loskomt
          next.style.position = 'relative';
          next.style.zIndex = '2';
          next.style.marginTop = -(h + top) + 'px';
          next.style.borderTopLeftRadius = next.style.borderTopRightRadius = 'var(--_layout---radius--l)';
          // Schaduw alleen boven Werk: negatieve spreiding houdt de zijkanten weg, de clip-path de onderkant (anders valt hij op de sectie erna)
          next.style.boxShadow = '0 -1.5rem 4rem -2.5rem rgba(0, 0, 0, 0.28)';
          next.style.clipPath = 'inset(-6rem 0 0 0)';
        }
        update(true);
      }
      // Hoe ver de trein gereden is (px opzij)
      var train = { d: 0 };
      function place() {
        if (!m) return;
        gsap.set(row, { x: m.offset - train.d, force3D: true });
      }
      function update(instant) {
        if (!m) return;
        var box = sec.getBoundingClientRect(), secTop = box.top, s = m.top - secTop;
        // Uit beeld: niets te doen
        if (!instant && (box.top > m.H * 1.2 || box.bottom < -m.H * 0.2)) return;
        var e0 = m.H - secTop, d = clamp(e0 <= m.entry ? e0 * m.v1 : m.offset + (e0 - m.entry) * m.v2, 0, m.travel);
        if (instant) { gsap.killTweensOf(train); train.d = d; place(); }
        // Licht nalopen maakt het schuiven met een muiswiel zachter; met Lenis is de scroll zelf al zacht
        else gsap.to(train, { d: d, duration: a.lenis ? 0.15 : 0.25, ease: 'power3.out', overwrite: true, onUpdate: place });
        var o = clamp((s - m.dist) / m.H, 0, 1), e = o < 0.5 ? 2 * o * o : 1 - Math.pow(-2 * o + 2, 2) / 2;
        if (e === m.e) return;
        m.e = e;
        gsap.set(inner, { y: -0.16 * m.H * e, scale: 1 - 0.05 * e, opacity: 1 - 0.8 * e, transformOrigin: '50% 40%' });
      }
      var ticking = false, timer;
      listen(window, 'scroll', function () { if (!ticking) { ticking = true; raf(function () { ticking = false; update(false); }); } }, { passive: true });
      listen(window, 'resize', function () {
        if (touch.matches && window.innerWidth === width) return;
        clearTimeout(timer);
        timer = wait(measure, 150);
      });
      listen(window, 'load', measure);
      listen(row, 'focusin', function (e) {
        if (!m) return;
        var r = e.target.getBoundingClientRect(), rr = row.getBoundingClientRect();
        var x = clamp(r.left - rr.left + row.scrollLeft - (parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0), 0, m.max);
        jumpTo(window.scrollY + sec.getBoundingClientRect().top - m.H + m.entry + x / m.v2);
        update(true);
      });

      // Niet vast (smal venster): de rij met de muis slepen, zoals Werk; bij loslaten schiet hij met de vaart door en remt
      // af op de dichtstbijzijnde kaart. Vinger en trackpad scrollen de rij zelf, met de snap uit de class.
      var drag = null, dragged = false;
      function snapPoints() {
        var pad = parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0, left = row.getBoundingClientRect().left;
        return [].map.call(row.children, function (c) { return clamp(row.scrollLeft + c.getBoundingClientRect().left - left - pad, 0, row.scrollWidth - row.clientWidth); });
      }
      listen(row, 'pointerdown', function (e) {
        dragged = false;
        if (m || e.pointerType !== 'mouse' || e.button !== 0) return;
        gsap.killTweensOf(row);
        drag = { x: e.clientX, left: row.scrollLeft, id: e.pointerId, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
      });
      listen(row, 'pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var dx = e.clientX - drag.x;
        if (!dragged && Math.abs(dx) > 6) {
          dragged = true;
          row.setPointerCapture(drag.id);
          // Zonder snap tijdens het slepen, anders trekt de browser de rij steeds terug naar een kaart
          row.style.scrollSnapType = 'none';
          row.style.userSelect = 'none';
          row.style.cursor = 'grabbing';
        }
        if (!dragged) return;
        row.scrollLeft = drag.left - dx;
        var dt = e.timeStamp - drag.lastT;
        if (dt > 0) drag.v = 0.8 * ((e.clientX - drag.lastX) / dt) + 0.2 * drag.v;
        drag.lastX = e.clientX;
        drag.lastT = e.timeStamp;
      });
      function endDrag(e) {
        if (!drag) return;
        var d = drag;
        drag = null;
        if (!dragged) return;
        row.style.userSelect = '';
        row.style.cursor = 'grab';
        var aim = row.scrollLeft - (e && e.timeStamp - d.lastT < 80 ? d.v : 0) * 280;
        var best = snapPoints().reduce(function (a, b) { return Math.abs(b - aim) < Math.abs(a - aim) ? b : a; });
        gsap.to(row, { scrollLeft: best, duration: reduce.matches ? 0 : 0.6, ease: 'power3.out', overwrite: true, onComplete: function () { row.style.scrollSnapType = ''; } });
      }
      listen(row, 'pointerup', endDrag);
      listen(row, 'pointercancel', function () { endDrag(null); });
      // Na slepen geen klik op de kaartlink, en geen sleepbeeld van een link
      listen(row, 'click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
      listen(row, 'dragstart', function (e) { e.preventDefault(); });
      measure();
      undo(release);
    });
  });

  return a.clean;
}
