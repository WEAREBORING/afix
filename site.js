/* Afix site.js v0.34: attribuutmodules. Bron: site.js in WEAREBORING/afix. Elke module start alleen als zijn data-a-attribuut op de pagina staat. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function num(el, attr, fallback) { var v = parseFloat(el.getAttribute(attr)); return isNaN(v) ? fallback : v; }

  /* Smooth scroll (hele site): Lenis, zoals het prototype (lerp 0.09, wiel 0.9). Afgesproken uitzondering op "alleen GSAP":
     Lenis vlakt alleen het scrollen met muiswiel en trackpad af en laat de gewone scroll van de browser staan, dus sticky
     (data-a-pin) en de scroll-events van de modules blijven werken. Niet bij touch (standaard van Lenis) en niet bij reduced
     motion. Loopt mee op de ticker van GSAP, zodat scrollen en animaties in hetzelfde frame bewegen. Vaste versie van
     jsDelivr; de bijbehorende css staat in site.css. Een element met data-lenis-prevent scrolt zelf (bijvoorbeeld een lijst
     met een eigen scrollbalk). Ankerlinks (#id) scrollen zacht via Lenis. */
  var lenis = null;
  if (!reduce.matches) withGsap(function (gsap) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js';
    s.onload = function () {
      if (!window.Lenis) return;
      lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 0.9, anchors: true, autoRaf: false });
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    };
    document.head.appendChild(s);
  });
  // Naar een scrollpositie springen, ook als Lenis loopt (anders zet Lenis de oude positie terug)
  function jumpTo(y) { if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); }

  /* data-a-year: zet het huidige jaar (bijvoorbeeld het copyright in de footer) */
  each('[data-a-year]', function (el) { el.textContent = new Date().getFullYear(); });

  /* data-a-form: eigen formuliernaam en redirect per instantie. Naam en redirect van een
     formulier in een component zijn niet aan props te koppelen; webflow.js leest data-name bij verzenden en
     data-redirect bij het starten, dus dit moet vóór Webflow.ready draaien (site.js staat in de footer). */
  each('[data-a-form-name], [data-a-form-redirect]', function (wrap) {
    var form = wrap.querySelector('form');
    if (!form) return;
    var name = (wrap.getAttribute('data-a-form-name') || '').trim();
    var redirect = (wrap.getAttribute('data-a-form-redirect') || '').trim();
    if (name) form.setAttribute('data-name', name);
    // Alleen paden op deze site ("/..."), geen externe of protocol-relatieve URL's ("//" of "/\", dat browsers als "//" lezen)
    if (/^\/(?![\/\\])/.test(redirect)) { form.setAttribute('data-redirect', redirect); form.setAttribute('redirect', redirect); }
  });

  /* data-a-nav (Global - Nav): dropdowns en het mobiele menu, zonder Navbar of Dropdown van Webflow.
     data-a-dropdown om elk menu met daarin -toggle (button) en -panel; data-a-nav-toggle (hamburger, onder 992px) opent
     data-a-nav-menu. Klik opent en sluit, op desktop met muis ook hover; Escape en een klik buiten de nav sluiten.
     Panelen en het mobiele menu staan in Webflow op display none: site.js zet display flex inline. */
  each('[data-a-nav]', function (nav) {
    var hover = window.matchMedia('(hover: hover) and (min-width: 992px)');
    var drops = [].slice.call(nav.querySelectorAll('[data-a-dropdown]'));
    var navToggle = nav.querySelector('[data-a-nav-toggle]');
    var menu = nav.querySelector('[data-a-nav-menu]');
    var gsap = null;
    if (drops.length) withGsap(function (g) { gsap = g; });
    function toggleOf(dd) { return dd.querySelector('[data-a-dropdown-toggle]'); }
    function isOpen(dd) { var t = toggleOf(dd); return !!t && t.getAttribute('aria-expanded') === 'true'; }
    function setDrop(dd, open) {
      var toggle = toggleOf(dd), panel = dd.querySelector('[data-a-dropdown-panel]');
      if (!toggle || !panel) return;
      var caret = toggle.querySelector('svg');
      toggle.setAttribute('aria-expanded', open);
      panel.style.display = open ? 'flex' : '';
      // Pijltje draait mee; zolang GSAP nog laadt springt hij
      if (caret && gsap) gsap.to(caret, { rotation: open ? 180 : 0, duration: reduce.matches ? 0 : 0.2, ease: 'power2.out', overwrite: true });
      else if (caret) caret.style.transform = open ? 'rotate(180deg)' : '';
    }
    function closeDrops(except) { drops.forEach(function (dd) { if (dd !== except && isOpen(dd)) setDrop(dd, false); }); }
    function setMenu(open) {
      if (!navToggle || !menu) return;
      navToggle.setAttribute('aria-expanded', open);
      menu.style.display = open ? 'flex' : '';
    }
    drops.forEach(function (dd) {
      var toggle = toggleOf(dd), timer;
      if (!toggle) return;
      toggle.addEventListener('click', function (e) {
        // Een muisklik op desktop opent alleen (de hover had hem al open); toetsenbord en touch wisselen
        var open = (e.detail > 0 && hover.matches) || !isOpen(dd);
        closeDrops(dd);
        setDrop(dd, open);
      });
      dd.addEventListener('mouseenter', function () { if (!hover.matches) return; clearTimeout(timer); closeDrops(dd); setDrop(dd, true); });
      // Vertraging: tussen knop en paneel zit een marge waar de muis even buiten de dropdown is
      dd.addEventListener('mouseleave', function () { if (hover.matches) timer = setTimeout(function () { setDrop(dd, false); }, 200); });
      dd.addEventListener('focusout', function (e) { if (e.relatedTarget && !dd.contains(e.relatedTarget)) setDrop(dd, false); });
    });
    if (navToggle && menu) navToggle.addEventListener('click', function () { setMenu(navToggle.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = drops.filter(isOpen)[0];
      if (open) { setDrop(open, false); toggleOf(open).focus(); }
      else if (navToggle && navToggle.getAttribute('aria-expanded') === 'true') { setMenu(false); navToggle.focus(); }
    });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) { closeDrops(); setMenu(false); } });
  });

  /* data-a-hero (Section - Hero Home): bij het laden komen de eyebrow, de kopregels (de spans in de h1), de awards en de
     balk met uitdagingen na elkaar binnen, uit een waas (blur, fade en iets omhoog). Bij wegscrollen vervaagt
     hero-home_component, traag beginnend, over 70% van de herohoogte, samen met de achtergrondvorm
     (hero-home_background en het vervolg ervan in Expertises, expertises_background). Hover of toetsenbordfocus op
     een uitdaging (data-a-challenge, alleen desktop met muis): de kaart groeit, wordt signaalgeel (surface/accent) met
     tekst in action/contrast, het nummer gaat weg en de titel schuift naar boven, hero-card_detail komt onderin in beeld,
     en de twee foto's van die kaart komen van opzij binnen, kantelen naar hun stand uit de class en lopen licht mee met de
     muis. De andere titels dimmen. Titels en tekst krijgen meteen hun eindbreedte, zodat ze niet herschikken.
     Reduced motion: geen intro en geen vervagen; de hover toont direct, zonder te bewegen. */
  each('[data-a-hero]', function (hero) {
    var comp = hero.querySelector('.hero-home_component') || hero;
    var h1 = hero.querySelector('h1');
    var lines = h1 ? [].slice.call(h1.children).filter(function (el) { return el.tagName === 'SPAN'; }) : [];
    var bar = hero.querySelector('.hero-home_cards');
    var intro = [hero.querySelector('.hero-home_heading .tag')].concat(lines, [].slice.call(hero.querySelectorAll('.award')), [bar]).filter(Boolean);
    // Meteen verbergen, nog zonder GSAP: laadt site.js GSAP zelf (Webflow zet hem niet altijd in de pagina), dan staat de
    // hero anders even zichtbaar voordat de intro hem verbergt. Komt GSAP er na 3 s niet, dan zonder intro tonen.
    var hidden = !reduce.matches;
    if (hidden) intro.forEach(function (el) { el.style.opacity = '0'; });
    var fallback = setTimeout(function () { hidden = false; intro.forEach(function (el) { el.style.opacity = ''; }); }, 3000);
    withGsap(function (gsap) {
      clearTimeout(fallback);
      function rem(n) { return n * parseFloat(getComputedStyle(document.documentElement).fontSize); }
      // De kopregels zijn inline spans: die schuiven met top (relatief), want een transform werkt daar niet en
      // inline-block breekt de regels anders af. De balk zelf vervaagt alleen in: een transform of filter op de balk maakt
      // hem het houvast van de foto's (absoluut), die dan bij een vroege hover op de balk staan. De kaartlinks in de balk
      // bewegen wel mee, kort na elkaar.
      var links = bar ? [].slice.call(bar.querySelectorAll('.hero-card_link')) : [];
      function from(el) {
        if (lines.indexOf(el) > -1) return { opacity: 0, position: 'relative', top: rem(1.5), filter: 'blur(0.75rem)' };
        return el === bar ? { opacity: 0 } : { opacity: 0, y: rem(1.5), filter: 'blur(0.75rem)' };
      }
      function to(el, delay) {
        var v = lines.indexOf(el) > -1 ? { top: 0, filter: 'blur(0rem)', clearProps: 'opacity,filter,position,top' } : el === bar ? { clearProps: 'opacity' } : { y: 0, filter: 'blur(0rem)', clearProps: 'opacity,transform,filter' };
        return Object.assign(v, { opacity: 1, duration: 1.1, ease: 'power3.out', delay: delay });
      }
      if (hidden && intro.length) {
        intro.concat(links).forEach(function (el) { gsap.set(el, from(el)); });
        // Wachten op de fonts (hooguit 0,8 s), anders verspringen de regels halverwege
        var started = false;
        var start = function () {
          if (started) return;
          started = true;
          intro.forEach(function (el, i) { gsap.to(el, to(el, 0.1 + i * 0.09)); });
          links.forEach(function (el, k) { gsap.to(el, to(el, 0.1 + (intro.length - 1) * 0.09 + k * 0.04)); });
        };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
        setTimeout(start, 800);
      }

      // Vervagen bij wegscrollen: de inhoud en de achtergrondvorm, ook het deel dat doorloopt in de volgende sectie
      // (expertises_background), want dat is dezelfde vorm
      var fading = [comp].concat([].slice.call(document.querySelectorAll('.hero-home_background, .expertises_background')));
      var top0 =Math.min(hero.getBoundingClientRect().top + window.scrollY, window.innerHeight), ticking = false;
      function fade() {
        ticking = false;
        if (reduce.matches) return gsap.set(fading, { clearProps: 'opacity' });
        // Klaar na 70% van de herohoogte, en traag beginnend: de eerste meters blijft hij bijna staan
        var p = clamp((top0 - hero.getBoundingClientRect().top) / (0.7 * hero.offsetHeight), 0, 1);
        gsap.set(fading, { opacity: 1 - p * p });
      }
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(fade); } }, { passive: true });
      fade();

      // Uitdagingen
      var strip = hero.querySelector('.hero-home_cards');
      var cards = [].slice.call(hero.querySelectorAll('[data-a-challenge]'));
      if (!strip || !cards.length) return;
      var desktop = window.matchMedia('(hover: hover) and (min-width: 992px)');
      var active = null;
      var contrast = getComputedStyle(strip).getPropertyValue('--_theme---action--contrast').trim();
      var accent = getComputedStyle(strip).getPropertyValue('--_theme---surface--accent').trim();
      var parts = cards.map(function (c) {
        var p = { card: c, link: c.querySelector('.hero-card_link'), num: c.querySelector('.hero-card_number'), title: c.querySelector('.hero-card_title'), detail: c.querySelector('.hero-card_detail'), left: c.querySelector('.hero-card_image-left'), right: c.querySelector('.hero-card_image-right') };
        p.inks = [p.title, p.detail].filter(Boolean);
        p.rest = { bg: getComputedStyle(c).backgroundColor, ink: p.inks.map(function (el) { return getComputedStyle(el).color; }) };
        // Stand van de foto's uit de class (gekanteld), om naartoe te draaien
        p.rot = [p.left, p.right].map(function (img) { return img ? gsap.getProperty(img, 'rotation') : 0; });
        return p;
      });
      function clear(el, props) { return function () { if (el) gsap.set(el, { clearProps: props }); }; }
      // Foto's als een stapel, zoals de kaarten van Reviews: bij wisselen tussen twee uitdagingen komt de nieuwe foto dekkend
      // bovenop de oude, van de kant waar de muis naartoe gaat (dir 1 = naar rechts), schuin, en veert elastisch op zijn
      // stand uit de class. De oude blijft dekkend, schuift iets terug en verdwijnt pas als hij bedekt is. Zo zijn er nooit
      // twee halfdoorzichtige foto's over elkaar. De eerste foto (dir 0) komt van opzij binnen; bij weggaan van de balk
      // vervagen ze naar het midden. Tijdens de hover lopen ze licht mee met de muis (xPercent en yPercent, los van x en y).
      var layer = 0;
      function photoIn(img, side, rot, dir, t) {
        if (!img) return;
        img.style.zIndex = ++layer;
        var delay = side < 0 ? 0.06 * t : 0;
        // overwrite true: ook een uitgestelde verdwijn-tween van een snelle heen-en-weer stopt
        gsap.fromTo(img, { opacity: 0 }, { opacity: 1, duration: (dir ? 0.12 : 0.35) * t, delay: delay, ease: 'power1.out', overwrite: true });
        if (!t) return gsap.set(img, { x: 0, y: 0, scale: 1, rotation: rot });
        gsap.fromTo(img, dir ? { x: dir * rem(5), y: rem(0.75), scale: 0.92, rotation: rot + dir * 10 } : { x: side * rem(3.5), y: rem(1.5), scale: 0.84, rotation: -rot },
          { x: 0, y: 0, scale: 1, rotation: rot, duration: dir ? 0.8 : 0.9, delay: delay, ease: 'elastic.out(1.1, 0.85)' });
      }
      function photoOut(img, side, rot, dir, t) {
        if (!img || gsap.getProperty(img, 'opacity') === 0) return;
        var done = clear(img, 'opacity,transform,zIndex');
        if (!t) return done();
        if (dir) {
          gsap.to(img, { x: -dir * rem(1.25), rotation: rot - dir * 5, scale: 0.94, xPercent: 0, yPercent: 0, duration: 0.35, ease: 'power3.out', overwrite: true });
          // Begint te vervagen zodra de nieuwe foto er dekkend op ligt (0,1 s) en is na 0,35 s weg, zacht in en uit
          gsap.to(img, { opacity: 0, duration: 0.25, delay: 0.1, ease: 'sine.inOut', onComplete: done });
        } else {
          gsap.to(img, { x: side * rem(1.75), y: rem(0.75), xPercent: 0, yPercent: 0, scale: 0.92, rotation: rot * 0.3, duration: 0.35, ease: 'power3.out', overwrite: true, onComplete: done });
          gsap.to(img, { opacity: 0, duration: 0.3, ease: 'sine.out' });
        }
      }
      strip.addEventListener('pointermove', function (e) {
        if (!active || reduce.matches) return;
        var r = strip.getBoundingClientRect(), nx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
        var p = parts.filter(function (q) { return q.card === active; })[0];
        [p.left, p.right].forEach(function (img, k) { if (img) gsap.to(img, { xPercent: nx * 6, yPercent: (k ? 1 : -1) * nx * 3, duration: 0.9, ease: 'power3.out', overwrite: 'auto' }); });
      });
      // De breedte die titel en tekst krijgen als de kaarten klaar zijn met groeien. Die zetten we meteen vast, zodat de
      // tekst niet steeds opnieuw afbreekt terwijl de kaart groeit of krimpt; de link knipt af wat er nog niet in past.
      function finalWidths(card) {
        var now = parts.map(function (p) { return p.card.style.flexGrow; });
        parts.forEach(function (p) { p.card.style.flexGrow = p.card === card ? 1.72 : 1; if (p.title) p.title.style.width = ''; });
        var w = parts.map(function (p) { var cs = getComputedStyle(p.link); return p.link.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); });
        parts.forEach(function (p, k) { p.card.style.flexGrow = now[k]; });
        return w;
      }
      function set(card) {
        if (card === active) return;
        var from = parts.filter(function (p) { return p.card === active; })[0], to = parts.filter(function (p) { return p.card === card; })[0];
        active = card;
        var t = reduce.matches ? 0 : 1;
        var dir = from && to ? (parts.indexOf(to) > parts.indexOf(from) ? 1 : -1) : 0;
        if (from) { photoOut(from.left, 1, from.rot[0], dir, t); photoOut(from.right, -1, from.rot[1], dir, t); }
        if (to) { photoIn(to.left, 1, to.rot[0], dir, t); photoIn(to.right, -1, to.rot[1], dir, t); }
        var widths = finalWidths(card);
        parts.forEach(function (p, k) {
          if (p.link) { p.link.style.position = 'relative'; p.link.style.overflow = 'hidden'; }
          if (p.title) p.title.style.width = widths[k] + 'px';
          if (!card) gsap.delayedCall(0.5 * t, function () { if (active) return; if (p.title) p.title.style.width = ''; if (p.link) { p.link.style.overflow = ''; p.link.style.position = ''; } });
          var on = p.card === card, dim = card && !on;
          gsap.to(p.card, { flexGrow: on ? 1.72 : 1, backgroundColor: on ? accent : p.rest.bg, duration: 0.5 * t, ease: 'power3.out', overwrite: true, onComplete: card ? null : clear(p.card, 'flexGrow,backgroundColor') });
          p.inks.forEach(function (el, k) { gsap.to(el, { color: on ? contrast : p.rest.ink[k], duration: 0.35 * t, ease: 'power2.out', overwrite: 'auto', onComplete: card ? null : clear(el, 'color') }); });
          if (p.num) gsap.to(p.num, { opacity: on ? 0 : dim ? 0.44 : 1, duration: 0.25 * t, ease: 'power2.out', overwrite: true, onComplete: card ? null : clear(p.num, 'opacity') });
          if (p.title && p.num) {
            // De titel schuift naar de plek van het nummer (bovenaan de kaart)
            var dy = on ? p.num.getBoundingClientRect().top - p.title.getBoundingClientRect().top + gsap.getProperty(p.title, 'y') : 0;
            gsap.to(p.title, { y: dy, opacity: dim ? 0.34 : 1, duration: 0.5 * t, ease: 'power3.out', overwrite: 'auto', onComplete: card ? null : clear(p.title, 'transform,opacity') });
          }
          if (p.detail) {
            if (on) {
              gsap.set(p.detail, { display: 'flex', position: 'absolute', left: rem(1.5), width: widths[k], bottom: rem(1.5) });
              gsap.fromTo(p.detail, { opacity: 0, y: rem(0.5) * t }, { opacity: 1, y: 0, duration: 0.4 * t, delay: 0.15 * t, ease: 'power3.out', overwrite: 'auto' });
            } else if (p.detail.style.display) {
              gsap.to(p.detail, { opacity: 0, duration: 0.2 * t, ease: 'power2.out', overwrite: 'auto', onComplete: function () { gsap.set(p.detail, { clearProps: 'all' }); } });
            }
          }
        });
      }
      parts.forEach(function (p) {
        p.card.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && desktop.matches) set(p.card); });
        p.card.addEventListener('focusin', function (e) { if (desktop.matches && e.target.matches(':focus-visible')) set(p.card); });
      });
      strip.addEventListener('pointerleave', function () { set(null); });
      strip.addEventListener('focusout', function (e) { if (!strip.contains(e.relatedTarget)) set(null); });
      desktop.addEventListener('change', function () { set(null); });
    });
  });

  /* data-a-pin (Section - Expertises): op elke breedte (niet bij reduced motion) rijden de kaarten van de
     scrollrij (expertises_list) als één trein met de scroll mee, zoals het prototype: ze komen van rechts buiten beeld
     binnen terwijl de sectie omhoog schuift (een x-verschuiving van de rij; de eerste kaart staat op zijn plek als de
     sectie vast gaat staan), en rijden door op hooguit 0,72 px opzij per px scrollen
     terwijl de inhoud van de sectie (het eerste kind, padding-global) vaststaat (de scroll van de rij), tot de laatste
     kaart in beeld is, plus een korte pauze. Daarna schuift de volgende sectie (Werk) er met ronde bovenhoeken
     (radius/l) en een zachte schaduw overheen, en zakt de inhoud weg (iets omhoog, kleiner, vervagend). site.js zet
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
        stick.style.position = stick.style.top = '';
        row.style.overflowX = row.style.scrollSnapType = '';
        if (next) ['position', 'zIndex', 'marginTop', 'borderTopLeftRadius', 'borderTopRightRadius', 'boxShadow'].forEach(function (p) { next.style[p] = ''; });
        gsap.killTweensOf(train);
        gsap.set(row, { clearProps: 'transform' });
        row.scrollLeft = 0;
        gsap.set(inner, { clearProps: 'transform,opacity' });
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
        m = { top: top, dist: dist, H: H, max: max, offset: offset, travel: offset + max, entry: entry, v1: v1, v2: v2 };
        sec.style.height = (h + dist + H) + 'px';
        stick.style.position = 'sticky';
        stick.style.top = top + 'px';
        // De rij volgt alleen de scroll: geen eigen scroll of snap meer
        row.style.overflowX = 'hidden';
        row.style.scrollSnapType = 'none';
        if (next) {
          // Werk komt onderin binnen precies als de rij klaar is, en bedekt de inhoud als die loskomt
          next.style.position = 'relative';
          next.style.zIndex = '2';
          next.style.marginTop = -(h + top) + 'px';
          next.style.borderTopLeftRadius = next.style.borderTopRightRadius = 'var(--_layout---radius--l)';
          // Negatieve spreiding: de schaduw valt alleen boven Werk, niet onderaan op de sectie erna
          next.style.boxShadow = '0 -1.5rem 4rem -2.5rem rgba(0, 0, 0, 0.28)';
        }
        update(true);
      }
      // Hoe ver de trein gereden is (px opzij): eerst schuift de hele rij van rechts binnen, daarna scrolt de rij zelf
      var train = { d: 0 };
      function place() {
        if (!m) return;
        gsap.set(row, { x: Math.max(0, m.offset - train.d) });
        row.scrollLeft = Math.max(0, train.d - m.offset);
      }
      function update(instant) {
        if (!m) return;
        var secTop = sec.getBoundingClientRect().top, s = m.top - secTop;
        var e0 = m.H - secTop, d = clamp(e0 <= m.entry ? e0 * m.v1 : m.offset + (e0 - m.entry) * m.v2, 0, m.travel);
        if (instant) { gsap.killTweensOf(train); train.d = d; place(); }
        // Licht nalopen maakt het schuiven met een muiswiel zachter; met Lenis is de scroll zelf al zacht
        else gsap.to(train, { d: d, duration: lenis ? 0.15 : 0.5, ease: 'power3.out', overwrite: true, onUpdate: place });
        var o = clamp((s - m.dist) / m.H, 0, 1), e = o < 0.5 ? 2 * o * o : 1 - Math.pow(-2 * o + 2, 2) / 2;
        gsap.set(inner, { y: -0.16 * m.H * e, scale: 1 - 0.05 * e, opacity: 1 - 0.8 * e, transformOrigin: '50% 40%' });
      }
      var ticking = false, timer;
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(false); }); } }, { passive: true });
      window.addEventListener('resize', function () {
        if (touch.matches && window.innerWidth === width) return;
        clearTimeout(timer);
        timer = setTimeout(measure, 150);
      });
      window.addEventListener('load', measure);
      row.addEventListener('focusin', function (e) {
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
      row.addEventListener('pointerdown', function (e) {
        dragged = false;
        if (m || e.pointerType !== 'mouse' || e.button !== 0) return;
        gsap.killTweensOf(row);
        drag = { x: e.clientX, left: row.scrollLeft, id: e.pointerId, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
      });
      row.addEventListener('pointermove', function (e) {
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
      row.addEventListener('pointerup', endDrag);
      row.addEventListener('pointercancel', function () { endDrag(null); });
      // Na slepen geen klik op de kaartlink, en geen sleepbeeld van een link
      row.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
      row.addEventListener('dragstart', function (e) { e.preventDefault(); });
      measure();
    });
  });

  /* data-a-fill (Section - Cultuur): de tekst wordt letter voor letter scherp terwijl je scrolt, zoals op butter.video
     (die doet het per woord). Een letter begint onzichtbaar, wordt dan een wazige gloed (de tekst zelf doorzichtig, met een vage schaduw in de
     tekstkleur) en lost op in scherpe tekst in de kleur uit de class: de tekst wordt dekkend en de gloed verdwijnt. Voortgang = (0,78 x schermhoogte min de bovenkant van de kop) / (hoogte van de kop + 0,3 x
     schermhoogte); elke letter loopt over een paar letters in, terugscrollen draait het om. Woorden blijven heel (nowrap),
     dus de tekst breekt op dezelfde plekken af. Schermlezers lezen de gewone tekst (aria-label op de kop, de woorden zijn
     aria-hidden). Reduced motion en zonder site.js: gewoon de tekst. */
  each('[data-a-fill]', function (el) {
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    if (reduce.matches || !text) return;
    withGsap(function (gsap) {
      // De tekstkleur uit de class, als r, g, b
      var ink = (getComputedStyle(el).color.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).join(', ');
      var words = [], soft = 8, last = [];
      el.setAttribute('aria-label', text);
      el.textContent = '';
      text.split(' ').forEach(function (w, i, all) {
        var word = document.createElement('span');
        word.style.whiteSpace = 'nowrap';
        word.setAttribute('aria-hidden', 'true');
        Array.from(w).forEach(function (ch) {
          var c = document.createElement('span');
          c.textContent = ch;
          word.appendChild(c);
          words.push(c);
        });
        el.appendChild(word);
        if (i < all.length - 1) el.appendChild(document.createTextNode(' '));
      });
      function look(t) {
        return {
          opacity: clamp(t / 0.15, 0, 1),
          color: 'rgba(' + ink + ', ' + Math.pow(clamp((t - 0.1) / 0.9, 0, 1), 1.5) + ')',
          textShadow: 'rgba(' + ink + ', ' + (0.7 * (1 - t)) + ') 0 0 ' + (0.08 + 0.06 * t) + 'em'
        };
      }
      var ticking = false;
      function update() {
        ticking = false;
        var r = el.getBoundingClientRect(), H = window.innerHeight;
        var n = clamp((0.78 * H - r.top) / (r.height + 0.3 * H), 0, 1) * (words.length + soft);
        words.forEach(function (w, i) {
          // In stapjes van 2%, zodat er alleen iets gezet wordt als de letter echt verandert
          var t = Math.round(clamp((n - i) / soft, 0, 1) * 50) / 50;
          if (last[i] === t) return;
          last[i] = t;
          if (t === 1) gsap.set(w, { clearProps: 'opacity,color,textShadow' });
          else gsap.set(w, look(t));
        });
      }
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
      window.addEventListener('resize', update);
      update();
    });
  });

  /* data-a-expertise (Item - Expertise): hover op een expertisekaart, alleen desktop met muis, en bij toetsenbordfocus
     op de kaartlink. expertise-card_link wordt signaalgeel (surface/accent) en de pijl (expertise-card_arrow, op desktop
     onzichtbaar in de class) schuift in beeld. Labels en tekst blijven staan, zoals in Figma. */
  var expertiseCards = document.querySelectorAll('[data-a-expertise]');
  if (expertiseCards.length) withGsap(function (gsap) {
    var desktop = window.matchMedia('(hover: hover) and (min-width: 992px)');
    function rem(n) { return n * parseFloat(getComputedStyle(document.documentElement).fontSize); }
    [].forEach.call(expertiseCards, function (card) {
      var link = card.querySelector('.expertise-card_link'), arrow = card.querySelector('.expertise-card_arrow');
      if (!link) return;
      var on = false, rest;
      function show() {
        if (on) return;
        on = true;
        var t = reduce.matches ? 0 : 1;
        rest = rest || getComputedStyle(link).backgroundColor;
        gsap.to(link, { backgroundColor: getComputedStyle(link).getPropertyValue('--_theme---surface--accent'), duration: 0.35 * t, ease: 'power2.out', overwrite: true });
        if (arrow) gsap.fromTo(arrow, { opacity: 0, x: -rem(0.5) * t }, { opacity: 1, x: 0, duration: 0.4 * t, delay: 0.06 * t, ease: 'power3.out', overwrite: true });
      }
      function hide() {
        if (!on) return;
        on = false;
        var t = reduce.matches ? 0 : 1;
        gsap.to(link, { backgroundColor: rest, duration: 0.35 * t, ease: 'power2.out', overwrite: true, onComplete: function () { gsap.set(link, { clearProps: 'backgroundColor' }); } });
        if (arrow) gsap.to(arrow, { opacity: 0, duration: 0.25 * t, ease: 'power2.out', overwrite: true, onComplete: function () { gsap.set(arrow, { clearProps: 'opacity,transform' }); } });
      }
      card.addEventListener('mouseenter', function () { if (desktop.matches) show(); });
      card.addEventListener('mouseleave', hide);
      card.addEventListener('focusin', function (e) { if (e.target.matches(':focus-visible')) show(); });
      card.addEventListener('focusout', hide);
    });
  });

  /* data-a-tabs (Section - Kennis): tabs zonder Tabs van Webflow. data-a-tab="<naam>" op elke tab (button, role tab),
     data-a-tab-panel="<naam>" op het bijbehorende paneel. Zonder site.js toont de class de eerste tab als actief en
     alleen het eerste paneel (:first-child); site.js neemt dat over en geeft de actieve tab de stijl van die eerste tab
     (achtergrond, kleur, opacity: de donkere pil). Pijltjestoetsen, Home en End gaan naar een andere tab.
     Staat er een data-a-tab-pill in de tabbalk (kennis_tab-pill, als laatste kind), dan is dat de pil: site.js schuift
     hem met GSAP naar de gekozen tab en de tab zelf blijft doorzichtig. Bij wisselen bewegen de kaarten (data-a-card)
     mee met de pil: de oude schuiven weg, de nieuwe komen na elkaar binnen van de kant waar de pil naartoe gaat.
     Past de tabbalk niet (telefoon), dan schuift hij mee zodat de actieve tab in het midden staat. */
  each('[data-a-tabs]', function (wrap) {
    var tabs = [].slice.call(wrap.querySelectorAll('[data-a-tab]'));
    var panels = [].slice.call(wrap.querySelectorAll('[data-a-tab-panel]'));
    if (tabs.length < 2) return;
    var props = ['backgroundColor', 'color', 'opacity'];
    function look(el) { var cs = getComputedStyle(el); return props.map(function (p) { return cs[p]; }); }
    // Lezen voordat site.js iets inline zet: tabs[0] heeft de actieve stijl (:first-child), tabs[1] de gewone
    var on = look(tabs[0]), off = look(tabs[1]);
    var group = wrap.getAttribute('data-a-tabs') || 'tabs';
    var pill = wrap.querySelector('[data-a-tab-pill]'), gsap = null, current;
    // Met een losse pil krijgt de actieve tab geen eigen achtergrond
    if (pill) on[0] = 'transparent';
    function movePill(animate) {
      if (!pill || !current) return;
      var to = { x: current.offsetLeft, width: current.offsetWidth };
      if (gsap && animate && !reduce.matches) gsap.to(pill, { x: to.x, width: to.width, duration: 0.45, ease: 'power3.out', overwrite: true });
      else if (gsap) gsap.set(pill, to);
      else { pill.style.width = to.width + 'px'; pill.style.transform = 'translateX(' + to.x + 'px)'; }
    }
    var bar = tabs[0].parentElement;
    function centerTab(animate) {
      if (!current || bar.scrollWidth <= bar.clientWidth) return;
      var x = Math.max(0, Math.min(bar.scrollWidth - bar.clientWidth, current.offsetLeft + current.offsetWidth / 2 - bar.clientWidth / 2));
      if (gsap && animate && !reduce.matches) gsap.to(bar, { scrollLeft: x, duration: 0.45, ease: 'power3.out', overwrite: true });
      else bar.scrollLeft = x;
    }
    withGsap(function (g) { gsap = g; movePill(false); });
    window.addEventListener('resize', function () { movePill(false); centerTab(false); });
    function panelOf(tab) { return panels.filter(function (p) { return p.getAttribute('data-a-tab-panel') === tab.getAttribute('data-a-tab'); })[0]; }
    function only(panel) { panels.forEach(function (p) { p.style.display = p === panel ? 'block' : 'none'; }); }
    function cardsOf(panel) { var c = panel.querySelectorAll('[data-a-card]'); return c.length ? [].slice.call(c) : [panel]; }
    var swap = null;
    function showPanel(next, dir, animate) {
      if (swap) {
        // Snel doorklikken: de lopende wissel stoppen en alles terug naar de class
        swap.kill();
        swap = null;
        gsap.set(panels.concat([].slice.call(wrap.querySelectorAll('[data-a-card]'))), { clearProps: 'opacity,transform' });
      }
      var prev = panels.filter(function (p) { return p.style.display !== 'none' && getComputedStyle(p).display !== 'none'; })[0];
      if (!animate || !prev || !next || prev === next) return only(next);
      var r = parseFloat(getComputedStyle(document.documentElement).fontSize), out = cardsOf(prev), inn = cardsOf(next);
      swap = gsap.timeline({ onComplete: function () { swap = null; } })
        .to(out, { opacity: 0, x: -dir * 1.5 * r, duration: 0.2, stagger: 0.03, ease: 'power2.in' })
        .add(function () { only(next); gsap.set(out, { clearProps: 'opacity,transform' }); })
        .fromTo(inn, { opacity: 0, x: dir * 2 * r }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out', clearProps: 'opacity,transform' });
    }
    function select(tab, focus) {
      var animate = !!current && tab !== current && gsap && !reduce.matches;
      var dir = current && tabs.indexOf(tab) < tabs.indexOf(current) ? -1 : 1;
      current = tab;
      tabs.forEach(function (t) {
        var active = t === tab, style = active ? on : off;
        t.setAttribute('aria-selected', active);
        t.tabIndex = active ? 0 : -1;
        t.style.backgroundColor = style[0];
        // Tekstkleur en opacity lopen mee met de pil
        if (animate) gsap.to(t, { color: style[1], opacity: style[2], duration: 0.3, ease: 'power2.out', overwrite: true });
        else { t.style.color = style[1]; t.style.opacity = style[2]; }
      });
      showPanel(panelOf(tab), dir, animate);
      movePill(animate);
      centerTab(animate);
      // Zonder eigen scrollsprong van de browser: centerTab schuift de balk al
      if (focus) tab.focus({ preventScroll: true });
    }
    tabs.forEach(function (t, i) {
      var panel = panelOf(t);
      if (panel) {
        t.id = t.id || 'a-tab-' + group + '-' + t.getAttribute('data-a-tab');
        panel.id = panel.id || t.id + '-panel';
        t.setAttribute('aria-controls', panel.id);
        panel.setAttribute('aria-labelledby', t.id);
      }
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        select(tabs[(to + tabs.length) % tabs.length], true);
      });
    });
    select(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0]);
  });

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
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
  });

  /* data-a-case (Section - Werk): hover op een case, alleen desktop met muis, en bij toetsenbordfocus op de kaartlink.
     Logokaart: case-card_logo-view wordt signaalgeel (variabele surface/accent), case-card_tags komen van boven en
     case-card_text van onder in beeld. Uitgelichte case (met case-card_feature-view): de foto zoomt iets in. Staat na
     data-a-carousel, zodat de kopieën van de eindeloze rij ook meedoen. Na het teruggaan neemt de class het weer over. */
  var cases = document.querySelectorAll('[data-a-case]');
  if (cases.length) withGsap(function (gsap) {
    var desktop = window.matchMedia('(hover: hover) and (min-width: 992px)');
    function rem(n) { return n * parseFloat(getComputedStyle(document.documentElement).fontSize); }
    [].forEach.call(cases, function (item) {
      var photo = item.querySelector('.case-card_feature-view .case-card_photo');
      var view = item.querySelector('.case-card_logo-view'), bits = item.querySelectorAll('.case-card_tags, .case-card_text');
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
        if (tags) gsap.fromTo(tags, { opacity: 0, y: -rem(0.375) * t }, { opacity: 1, y: 0, duration: 0.4 * t, delay: 0.06 * t, ease: 'power2.out', overwrite: true });
        if (text) gsap.fromTo(text, { opacity: 0, y: rem(0.5) * t }, { opacity: 1, y: 0, duration: 0.4 * t, delay: 0.06 * t, ease: 'power2.out', overwrite: true });
      }
      function hide() {
        if (!on) return;
        on = false;
        var t = reduce.matches ? 0 : 1;
        if (photo) return gsap.to(photo, { scale: 1, duration: 0.8 * t, ease: 'expo.out', overwrite: true, onComplete: function () { gsap.set(photo, { clearProps: 'transform' }); } });
        if (!view) return;
        gsap.to(view, { backgroundColor: rest, duration: 0.35 * t, ease: 'power2.out', overwrite: true, onComplete: function () { gsap.set(view, { clearProps: 'backgroundColor' }); } });
        gsap.to(bits, { opacity: 0, duration: 0.25 * t, ease: 'power2.out', overwrite: true, onComplete: function () { gsap.set(bits, { clearProps: 'opacity,transform' }); } });
      }
      item.addEventListener('mouseenter', function () { if (desktop.matches) show(); });
      item.addEventListener('mouseleave', hide);
      item.addEventListener('focusin', function (e) { if (e.target.matches(':focus-visible')) show(); });
      item.addEventListener('focusout', hide);
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
    list.addEventListener('pointerdown', function (e) {
      if (!gsap || e.button !== 0) return;
      drag = { x: e.clientX, id: e.pointerId, moved: false, p: 0 };
    });
    list.addEventListener('pointermove', function (e) {
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
    list.addEventListener('pointerup', release);
    list.addEventListener('pointercancel', release);
    list.addEventListener('dragstart', function (e) { e.preventDefault(); });

    return go;
  }



  /* Scrollrij, eindeloos: een pijl schuift naar de volgende of vorige kaart. Schuift elke 4 seconden zelf door als de rij
     in beeld is, niet bij hover, focus of reduced motion. Slepen met muis of vinger: de rij volgt, schiet na loslaten met
     de vaart door en remt af op een kaart. site.js doet het uitlijnen zelf met GSAP; de scroll-snap uit de class (voor
     zonder JS) staat uit, want die snapt hard. */
  function carouselRow(list, items) {
    var gsap = null, tween = null, dest = 0;
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
    function posOf(el) {
      var start = list.getBoundingClientRect().left + (parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0);
      return list.scrollLeft + el.getBoundingClientRect().left - start;
    }
    function normalize() {
      if (tween || drag) return;
      var base = posOf(items[0]), set = after[0].offsetLeft - items[0].offsetLeft;
      if (list.scrollLeft < base - 2) list.scrollLeft += set;
      else if (list.scrollLeft >= base + set - 2) list.scrollLeft -= set;
    }
    list.style.scrollSnapType = 'none';
    // Verticaal scrollen over de rij blijft bij de pagina; horizontaal slepen doet site.js
    list.style.touchAction = 'pan-y';
    function scrollTo(x, duration, ease) {
      stop();
      if (!gsap || reduce.matches) { list.scrollLeft = x; normalize(); return; }
      dest = x;
      tween = gsap.to(list, { scrollLeft: x, duration: duration || 0.6, ease: ease || 'power3.out', onComplete: function () { stop(); normalize(); } });
    }
    function stop() {
      if (tween) tween.kill();
      tween = null;
    }
    function go(d, auto) {
      // Loopt er nog een tween (snel klikken), dan rekenen vanaf waar die eindigt
      var now = tween ? dest : list.scrollLeft;
      var lefts = cards.map(function (c) { return posOf(c) - now; });
      var to = d > 0 ? lefts.filter(function (x) { return x > 2; })[0] : lefts.filter(function (x) { return x < -2; }).pop();
      // Zelf doorschuiven: langer en zacht op gang komen; een pijlklik reageert direct
      if (to !== undefined) scrollTo(clampScroll(now + to), auto ? 1.2 : 0.6, auto ? 'power2.inOut' : 'power3.out');
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
      timer = setTimeout(function () { if (inView && !paused && !drag && !document.hidden && !reduce.matches) go(1, true); schedule(); }, 4000);
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; }, { threshold: 0.3 }).observe(list);
    list.addEventListener('mouseenter', function () { paused = true; });
    list.addEventListener('mouseleave', function () { paused = false; });
    list.addEventListener('focusin', function () { paused = true; });
    list.addEventListener('focusout', function () { paused = false; });
    // Trackpad: de browser scrollt vrij; staat de rij 150 ms stil, dan zacht naar de dichtstbijzijnde kaart
    list.addEventListener('wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) stop(); schedule(); }, { passive: true });
    var settle;
    function later() { clearTimeout(settle); settle = setTimeout(function () { if (!tween && !drag) settleNear(list.scrollLeft); }, 150); }
    list.addEventListener('scroll', function () { if (!tween && !drag) later(); }, { passive: true });
    window.addEventListener('resize', later);

    var drag = null, dragged = false;
    list.addEventListener('pointerdown', function (e) {
      stop();
      schedule();
      dragged = false;
      if (e.button !== 0) return;
      drag = { x: e.clientX, left: list.scrollLeft, id: e.pointerId, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
    });
    list.addEventListener('pointermove', function (e) {
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
    list.addEventListener('pointerup', endDrag);
    list.addEventListener('pointercancel', function () { endDrag(null); });
    // Na slepen geen klik op de kaartlink, en geen sleepbeeld van een link of foto
    list.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
    list.addEventListener('dragstart', function (e) { e.preventDefault(); });

    list.scrollLeft = posOf(items[0]);
    schedule();
    return function (d) { go(d); schedule(); };
  }

  /* data-a-card (Section - Kennis): hover op een kennis-kaart, alleen desktop met muis, en bij toetsenbordfocus op de
     kaartlink (Figma 935:8845). De kaart wordt signaalgeel (surface/accent), het gevulde label (variant Label) iets
     donkerder (de kleur van border/subtle), de foto zoomt iets in vanaf de onderkant, en de datum (kennis-card_date)
     maakt plaats voor de pijlknop (kennis-card_arrow). Na het teruggaan neemt de class het weer over. */
  var kennisCards = document.querySelectorAll('[data-a-card]');
  if (kennisCards.length) withGsap(function (gsap) {
    var desktop = window.matchMedia('(hover: hover) and (min-width: 992px)');
    function rem(n) { return n * parseFloat(getComputedStyle(document.documentElement).fontSize); }
    // Een variabele als rgba-waarde, zodat GSAP ernaartoe kan tweenen
    function colorOf(el, name) {
      var probe = document.createElement('i');
      probe.style.color = getComputedStyle(el).getPropertyValue(name);
      el.appendChild(probe);
      var c = getComputedStyle(probe).color;
      el.removeChild(probe);
      return c;
    }
    [].forEach.call(kennisCards, function (card) {
      var img = card.querySelector('.kennis-card_image'), date = card.querySelector('.kennis-card_date'), arrow = card.querySelector('.kennis-card_arrow');
      var labels = [].filter.call(card.querySelectorAll('.tag'), function (t) { var bg = getComputedStyle(t).backgroundColor; return bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)'; });
      var on = false, rest;
      function show() {
        if (on) return;
        on = true;
        // Reduced motion: wel tonen, maar direct en zonder zoom of verschuiving
        var t = reduce.matches ? 0 : 1;
        if (!rest) rest = { card: getComputedStyle(card).backgroundColor, labels: labels.map(function (l) { return getComputedStyle(l).backgroundColor; }) };
        gsap.to(card, { backgroundColor: colorOf(card, '--_theme---surface--accent'), duration: 0.3 * t, ease: 'power2.out', overwrite: true });
        if (labels.length) gsap.to(labels, { backgroundColor: colorOf(card, '--_theme---border--subtle'), duration: 0.3 * t, ease: 'power2.out', overwrite: true });
        if (img && t) gsap.to(img, { scale: 1.03, transformOrigin: '50% 100%', duration: 0.8, ease: 'expo.out', overwrite: true });
        if (date) gsap.to(date, { opacity: 0, duration: 0.2 * t, ease: 'power2.out', overwrite: true });
        if (arrow) gsap.fromTo(arrow, { opacity: 0, x: -rem(0.5) * t }, { opacity: 1, x: 0, duration: 0.4 * t, delay: 0.06 * t, ease: 'power2.out', overwrite: true });
      }
      function hide() {
        if (!on) return;
        on = false;
        var t = reduce.matches ? 0 : 1;
        function clear(el, props) { return function () { gsap.set(el, { clearProps: props }); }; }
        gsap.to(card, { backgroundColor: rest.card, duration: 0.3 * t, ease: 'power2.out', overwrite: true, onComplete: clear(card, 'backgroundColor') });
        labels.forEach(function (l, i) { gsap.to(l, { backgroundColor: rest.labels[i], duration: 0.3 * t, ease: 'power2.out', overwrite: true, onComplete: clear(l, 'backgroundColor') }); });
        if (img) gsap.to(img, { scale: 1, duration: 0.8 * t, ease: 'expo.out', overwrite: true, onComplete: clear(img, 'transform,transformOrigin') });
        if (arrow) gsap.to(arrow, { opacity: 0, duration: 0.2 * t, ease: 'power2.out', overwrite: true, onComplete: clear(arrow, 'opacity,transform') });
        if (date) gsap.to(date, { opacity: 1, duration: 0.3 * t, delay: 0.1 * t, ease: 'power2.out', overwrite: true, onComplete: clear(date, 'opacity') });
      }
      card.addEventListener('mouseenter', function () { if (desktop.matches) show(); });
      card.addEventListener('mouseleave', hide);
      card.addEventListener('focusin', function (e) { if (e.target.matches(':focus-visible')) show(); });
      card.addEventListener('focusout', hide);
    });
  });

  /* GSAP: gebruikt Webflow zelf al gsap (bijvoorbeeld voor de nav), dan nemen we die. Anders laden we hem van het
     Webflow-CDN; houd de versie gelijk aan die van Webflow. */
  var gsapWaiting;
  function withGsap(fn) {
    if (window.gsap) return fn(window.gsap);
    // Vragen meer modules hem tegelijk, dan maar één keer laden
    if (gsapWaiting) return gsapWaiting.push(fn);
    gsapWaiting = [fn];
    var s = document.createElement('script');
    s.src = 'https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js';
    s.onload = function () { if (window.gsap) gsapWaiting.forEach(function (f) { f(window.gsap); }); };
    document.head.appendChild(s);
  }

  /* data-a-hover: hover-animatie met GSAP, alleen op desktop met muis.
     data-a-hover op het element waar je overheen gaat; kinderen met data-a-hover-x en/of -y (rem, px of %) en/of
     data-a-hover-scale bewegen mee. Duur in seconden: data-a-hover-duration (standaard 0.6) en -duration-out (0.4).
     Na het teruggaan neemt de class de stijl weer over (clearProps). */
  var hovers = document.querySelectorAll('[data-a-hover]');
  if (hovers.length) withGsap(function (gsap) {
    var desktop = window.matchMedia('(hover: hover) and (min-width: 992px)');
    function axis(t, name, vars) {
      var v = t.getAttribute('data-a-hover-' + name);
      if (v === null) return;
      var pct = /%$/.test(v);
      vars[name] = pct ? 0 : v;
      vars[name + 'Percent'] = pct ? parseFloat(v) : 0;
    }
    [].forEach.call(hovers, function (trigger) {
      var targets = [].filter.call(trigger.querySelectorAll('[data-a-hover-x], [data-a-hover-y], [data-a-hover-scale]'), function (t) {
        return t.closest('[data-a-hover]') === trigger;
      });
      if (!targets.length) return;
      trigger.addEventListener('mouseenter', function () {
        if (!desktop.matches || reduce.matches) return;
        targets.forEach(function (t) {
          // Ruststand uit de class (ook een translate in %) onthouden, zodat het terugkeren klopt
          if (!t._hoverRest) t._hoverRest = { x: gsap.getProperty(t, 'x'), y: gsap.getProperty(t, 'y'), xPercent: gsap.getProperty(t, 'xPercent'), yPercent: gsap.getProperty(t, 'yPercent'), scale: gsap.getProperty(t, 'scale') };
          var vars = { duration: num(t, 'data-a-hover-duration', 0.6), ease: 'expo.out', overwrite: true };
          axis(t, 'x', vars);
          axis(t, 'y', vars);
          if (t.hasAttribute('data-a-hover-scale')) vars.scale = num(t, 'data-a-hover-scale', 1);
          gsap.to(t, vars);
        });
      });
      trigger.addEventListener('mouseleave', function () {
        targets.forEach(function (t) {
          var rest = t._hoverRest;
          if (!rest) return;
          gsap.to(t, { x: rest.x, y: rest.y, xPercent: rest.xPercent, yPercent: rest.yPercent, scale: rest.scale, duration: num(t, 'data-a-hover-duration-out', 0.4), ease: 'expo.out', overwrite: true,
            onComplete: function () { gsap.set(t, { clearProps: 'transform' }); t._hoverRest = null; } });
        });
      });
    });
  });
})();
