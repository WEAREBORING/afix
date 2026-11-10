/* Afix site.js v1.10: de kern (GSAP, Lenis, nav, formulieren, verbergen voor de intro) en de lader van modules/*.js. Bron: site.js in WEAREBORING/afix.
   Een module laadt alleen als zijn attribuut of class op de pagina staat; zie de tabel onder "Modules". Elk bestand komt van dezelfde tag. */
'use strict';
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
function each(sel, fn, root) { [].forEach.call((root || document).querySelectorAll(sel), fn); }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
// Telefoon en tablet: blur op grote blokken is daar te zwaar, die animaties krijgen alleen fade en beweging
var touchDevice = window.matchMedia('(hover: none)');
function withBlur(vars, value) { if (!touchDevice.matches) vars.filter = value; return vars; }
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
var resetNav = function () {};
function jumpTo(y) { if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); }
// Zacht naar een scrollpositie na een klik op een anker. Eigen duur en curve (power3.inOut van GSAP): zonder rekent Lenis met lerp en dat begint op volle snelheid
function glideTo(y, done) {
  if (!lenis) { window.scrollTo(0, y); if (done) done(); return; }
  lenis.scrollTo(y, { duration: clamp(0.7 + Math.abs(y - window.scrollY) / 2500, 0.8, 1.4), easing: function (t) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(2 - 2 * t, 4) / 2; }, onComplete: done });
}

/* Wat in de html moet kloppen voordat de pagina of webflow.js het gebruikt, dus niet in een module:
   - data-a-year: het huidige jaar (bijvoorbeeld het copyright in de footer).
   - data-a-form: eigen formuliernaam en redirect per instantie. Naam en redirect van een formulier in een component zijn
     niet aan props te koppelen; webflow.js leest data-name bij verzenden en data-redirect bij het starten, dus dit moet
     vóór Webflow.ready draaien (site.js staat in de footer, als module: die draait net vóór DOMContentLoaded).
   - Datums (kennis-card_date, kennis-session_date en data-a-date, ook op een verborgen formulierveld): Webflow schrijft
     Engelse maanden ("14 Feb 26", "12 December 2026", "January 29, 2026"). site.js maakt er "14 feb ’26" en "12 december 2026"
     van. Op de class en niet op een attribuut in de lijsten: die class staat in elke kaart. */
var monthsEn = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
var monthsShort = 'jan feb mrt apr mei jun jul aug sep okt nov dec'.split(' ');
var monthsLong = 'januari februari maart april mei juni juli augustus september oktober november december'.split(' ');
function prepare(root) {
  each('[data-a-year]', function (el) { el.textContent = new Date().getFullYear(); }, root);
  each('[data-a-form-name], [data-a-form-redirect]', function (wrap) {
    var form = wrap.querySelector('form');
    if (!form) return;
    var name = (wrap.getAttribute('data-a-form-name') || '').trim();
    var redirect = (wrap.getAttribute('data-a-form-redirect') || '').trim();
    if (name) form.setAttribute('data-name', name);
    // Alleen paden op deze site ("/..."), geen externe of protocol-relatieve URL's ("//" of "/\", dat browsers als "//" lezen)
    if (/^\/(?![\/\\])/.test(redirect)) { form.setAttribute('data-redirect', redirect); form.setAttribute('redirect', redirect); }
  }, root);
  each('.kennis-card_date, .kennis-session_date, [data-a-date]', function (el) {
    var prop = el.tagName === 'INPUT' ? 'value' : 'textContent';
    var text = el[prop].trim().replace(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/, '$2 $1 $3');
    var m = /^(\d{1,2}) ([A-Za-z]+) (\d{2}|\d{4})$/.exec(text);
    var i = m ? monthsEn.indexOf(m[2].slice(0, 3).toLowerCase()) : -1;
    if (i < 0) return;
    el[prop] = +m[1] + ' ' + (m[2].length > 3 ? monthsLong[i] : monthsShort[i]) + ' ' + (m[3].length === 2 ? '’' + m[3] : m[3]);
  }, root);
}

/* data-a-nav (Global - Nav): menu's en het mobiele menu, zonder Navbar of Dropdown van Webflow.
   data-a-dropdown om elk menu met daarin -toggle (button) en -panel; data-a-nav-toggle (hamburger, onder 992px) opent
   data-a-nav-menu. Klik opent en sluit, op desktop met muis ook hover; Escape en een klik buiten de nav sluiten.
   Desktop: het paneel staat over de volle breedte onder de balk, met een rij nav_card's. Daarachter ligt
   data-a-nav-backdrop (nav_backdrop, krijt): die groeit naar beneden, het paneel wordt mee onthuld en de kaarten komen
   kort na elkaar binnen met de blur-fade van de site. De andere menuknoppen in dezelfde groep worden grijs. Wissel je
   van menu terwijl er een open staat, dan blijft de achtergrond staan en past alleen de hoogte zich aan; de nieuwe
   kaarten komen van de kant waar je naartoe gaat. Met de muis wisselt een ander menu pas na een korte rust, zodat je
   schuin naar een kaart kunt bewegen zonder onderweg te wisselen. Hover op een kaart (muis of toetsenbord): geel vlak,
   donkere tekst, een rond pijlknopje rechtsboven schuift in en de andere kaarten dimmen, zoals de uitdagingen in de hero
   maar zonder dat de kaart groeit en met de omschrijving altijd zichtbaar (keuze van de gebruiker). Onder 992px klapt het
   paneel open in het mobiele menu.
   Panelen, achtergrond en het mobiele menu staan in Webflow op display none: site.js zet ze inline aan. */
each('[data-a-nav]', function (nav) {
  var hover = window.matchMedia('(hover: hover) and (min-width: 992px)');
  var wide = window.matchMedia('(min-width: 992px)');
  var drops = [].slice.call(nav.querySelectorAll('[data-a-dropdown]')).filter(function (dd) { return toggleOf(dd) && panelOf(dd); });
  var navToggle = nav.querySelector('[data-a-nav-toggle]');
  var menu = nav.querySelector('[data-a-nav-menu]');
  var backdrop = nav.querySelector('[data-a-nav-backdrop]');
  var gsap = null, tuckNav = null, current = null, timer = 0, unhover = [];
  if (drops.length) withGsap(function (g) { gsap = g; });
  function toggleOf(dd) { return dd.querySelector('[data-a-dropdown-toggle]'); }
  function panelOf(dd) { return dd.querySelector('[data-a-dropdown-panel]'); }
  function cardsOf(dd) { return [].slice.call(panelOf(dd).querySelectorAll('.nav_card')); }
  function css(name) { return getComputedStyle(nav).getPropertyValue(name).trim(); }
  function rem(n) { return n * parseFloat(getComputedStyle(document.documentElement).fontSize); }
  // Grijs als er een ander menu uit dezelfde groep (nav_links) open staat
  function dimmed(d, dd) { return !!dd && d !== dd && d.parentNode === dd.parentNode && wide.matches; }
  // Paneel en kaarten terug naar de stand uit de classes
  function reset(dd) {
    var p = panelOf(dd), parts = [].slice.call(p.querySelectorAll('.nav_card, .nav_card *'));
    if (gsap) gsap.killTweensOf([p].concat(parts));
    p.removeAttribute('style');
    parts.forEach(function (el) { el.removeAttribute('style'); });
    unhover[drops.indexOf(dd)]();
  }
  // Zonder animatie: GSAP nog niet geladen, reduced motion, paginaovergang of ander breakpoint
  function snap(dd) {
    drops.forEach(function (d) {
      reset(d);
      if (gsap) gsap.killTweensOf(toggleOf(d));
      toggleOf(d).style.color = dimmed(d, dd) ? css('--_theme---text--muted') : '';
    });
    if (dd) panelOf(dd).style.display = 'flex';
    if (!backdrop) return;
    if (gsap) gsap.killTweensOf(backdrop);
    backdrop.removeAttribute('style');
    if (dd && wide.matches) backdrop.style.cssText = 'display: block; height: ' + panelOf(dd).offsetHeight + 'px';
  }
  // Wat buiten de achtergrond valt, blijft onzichtbaar: het paneel wordt mee onthuld terwijl de achtergrond groeit of krimpt
  function clip() {
    var h = backdrop.offsetHeight;
    drops.forEach(function (d) { var p = panelOf(d); if (p.style.display) p.style.clipPath = 'inset(0 0 ' + Math.max(0, p.offsetHeight - h) + 'px 0)'; });
  }
  function desktop(from, to) {
    var dir = from && to ? (drops.indexOf(to) > drops.indexOf(from) ? 1 : -1) : 0, h = 0;
    if (from) gsap.to(cardsOf(from), { opacity: 0, x: -dir * rem(0.75), duration: to ? 0.15 : 0.2, ease: 'sine.inOut', overwrite: true, onComplete: function () { if (current !== from) reset(from); } });
    if (to) {
      reset(to);
      panelOf(to).style.display = 'flex';
      h = panelOf(to).offsetHeight;
      gsap.fromTo(cardsOf(to), withBlur({ opacity: 0, x: dir * rem(1.5), y: dir ? 0 : rem(0.75) }, 'blur(0.5rem)'),
        withBlur({ opacity: 1, x: 0, y: 0, duration: 0.5, delay: dir ? 0.08 : 0.12, stagger: 0.04, ease: 'power3.out', overwrite: true, clearProps: 'opacity,transform,filter' }, 'blur(0rem)'));
    }
    if (!backdrop) return;
    backdrop.style.display = 'block';
    // Meteen afknippen, anders staat de rand van de kaartenrij een frame lang onder een lege achtergrond
    clip();
    // Openen 0,5 s, wisselen 0,45 s, sluiten sneller en zacht in en uit
    gsap.to(backdrop, { height: h, duration: !from ? 0.5 : to ? 0.45 : 0.35, delay: to ? 0 : 0.05, ease: !from ? 'power4.out' : to ? 'power3.out' : 'power3.inOut', overwrite: true, onUpdate: clip, onComplete: to ? null : function () { backdrop.removeAttribute('style'); } });
    var muted = css('--_theme---text--muted'), primary = css('--_theme---text--primary');
    drops.forEach(function (d) {
      var t = toggleOf(d), off = dimmed(d, to);
      gsap.to(t, { color: off ? muted : primary, duration: 0.25, ease: 'power2.out', overwrite: true, onComplete: off ? null : function () { gsap.set(t, { clearProps: 'color' }); } });
    });
  }
  function mobile(from, to) {
    if (from) {
      var fp = panelOf(from);
      fp.style.overflow = 'hidden';
      gsap.to(fp, { height: 0, marginTop: 0, duration: 0.3, ease: 'power3.inOut', overwrite: true, onComplete: function () { if (current !== from) reset(from); } });
    }
    if (!to) return;
    var tp = panelOf(to);
    reset(to);
    tp.style.cssText = 'display: flex; overflow: hidden';
    gsap.fromTo(tp, { height: 0, marginTop: 0 }, { height: 'auto', marginTop: getComputedStyle(tp).marginTop, duration: 0.45, ease: 'power3.out', overwrite: true, onComplete: function () { tp.style.cssText = 'display: flex'; } });
    gsap.fromTo(cardsOf(to), { opacity: 0, y: rem(0.5) }, { opacity: 1, y: 0, duration: 0.4, delay: 0.08, stagger: 0.04, ease: 'power3.out', overwrite: true, clearProps: 'opacity,transform' });
  }
  // dd openen, of null: alles dicht
  function show(dd, instant) {
    var from = current;
    if (dd === from) return;
    current = dd;
    drops.forEach(function (d) {
      var t = toggleOf(d), caret = t.querySelector('svg'), on = d === dd;
      if (t.getAttribute('aria-expanded') === String(on)) return;
      t.setAttribute('aria-expanded', on);
      // Pijltje draait mee; zolang GSAP nog laadt springt hij
      if (caret && gsap) gsap.to(caret, { rotation: on ? 180 : 0, duration: reduce.matches || instant ? 0 : 0.2, ease: 'power2.out', overwrite: true });
      else if (caret) caret.style.transform = on ? 'rotate(180deg)' : '';
    });
    if (!gsap || instant || reduce.matches) snap(dd);
    else if (wide.matches) desktop(from, dd);
    else mobile(from, dd);
  }
  // Hover op de kaarten (desktop met muis, of toetsenbordfocus)
  drops.forEach(function (dd) {
    var list = panelOf(dd).querySelector('.nav_dropdown-list'), cards = cardsOf(dd), active = null;
    unhover.push(function () { active = null; });
    if (!list || !cards.length) return;
    function set(card) {
      if (card === active || !gsap) return;
      active = card;
      var t = reduce.matches ? 0 : 1, accent = css('--_theme---surface--accent'), contrast = css('--_theme---action--contrast');
      // Het gele vlak vervaagt vanuit doorzichtig geel, niet vanuit doorzichtig zwart (dat geeft een vale tussenkleur)
      var clear = 'rgba(' + gsap.utils.splitColor(accent).slice(0, 3).join(',') + ',0)';
      var pace = card ? { duration: 0.35 * t, ease: 'power2.out' } : { duration: 0.4 * t, ease: 'sine.inOut' };
      cards.forEach(function (c) {
        var on = c === card, dim = !!card && !on, head = c.querySelector('.nav_card-header'), text = c.querySelector('.nav_card-text'), arrow = c.querySelector('.nav_card-arrow');
        function done(el, props) { return card ? null : function () { gsap.set(el, { clearProps: props }); }; }
        // overwrite 'auto': de kaart komt ook binnen met een tween, en die mag de hover niet stoppen
        if (!c.style.backgroundColor) gsap.set(c, { backgroundColor: clear });
        gsap.to(c, Object.assign({ backgroundColor: on ? accent : clear, color: on ? contrast : css('--_theme---text--primary'), overwrite: 'auto', onComplete: done(c, 'backgroundColor,color') }, pace));
        if (text) gsap.to(text, Object.assign({ color: on ? contrast : css('--_theme---text--muted'), overwrite: 'auto', onComplete: done(text, 'color') }, pace));
        gsap.to([head, text].filter(Boolean), Object.assign({ opacity: dim ? 0.4 : 1, overwrite: 'auto', onComplete: done([head, text].filter(Boolean), 'opacity') }, pace));
        if (!arrow) return;
        if (on) {
          if (!+gsap.getProperty(arrow, 'opacity')) gsap.set(arrow, { x: -rem(0.5) });
          gsap.to(arrow, { opacity: 1, x: 0, duration: 0.35 * t, ease: 'power3.out', overwrite: true });
        } else if (arrow.style.opacity) {
          gsap.to(arrow, { opacity: 0, x: rem(0.25), duration: 0.25 * t, ease: 'sine.inOut', overwrite: true, onComplete: function () { gsap.set(arrow, { clearProps: 'opacity,transform' }); } });
        }
      });
    }
    cards.forEach(function (c) {
      c.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && hover.matches) set(c); });
      c.addEventListener('focusin', function (e) { if (hover.matches && e.target.matches(':focus-visible')) set(c); });
    });
    list.addEventListener('pointerleave', function () { set(null); });
    list.addEventListener('focusout', function (e) { if (!list.contains(e.relatedTarget)) set(null); });
  });
  function setMenu(open) {
    if (!navToggle || !menu) return;
    navToggle.setAttribute('aria-expanded', open);
    menu.style.display = open ? 'flex' : '';
  }
  drops.forEach(function (dd) {
    toggleOf(dd).addEventListener('click', function (e) {
      clearTimeout(timer);
      // Een muisklik op desktop opent alleen (de hover had hem al open); toetsenbord en touch wisselen
      show((e.detail > 0 && hover.matches) || current !== dd ? dd : null);
    });
    // Staat er niets open, dan meteen; staat er al een menu open, dan pas na 0,09 s rust op deze knop
    dd.addEventListener('mouseenter', function () {
      if (!hover.matches) return;
      clearTimeout(timer);
      if (!current) show(dd);
      else if (current !== dd) timer = setTimeout(function () { show(dd); }, 90);
    });
    // Vertraging: tussen knop en paneel zit een marge waar de muis even buiten het menu is
    dd.addEventListener('mouseleave', function () { if (hover.matches) { clearTimeout(timer); timer = setTimeout(function () { show(null); }, 200); } });
    dd.addEventListener('focusout', function (e) { if (e.relatedTarget && !dd.contains(e.relatedTarget) && current === dd) show(null); });
  });
  // Ander breakpoint: alles dicht, zonder animatie (de panelen staan dan anders)
  wide.addEventListener('change', function () { show(null, true); });
  if (navToggle && menu) navToggle.addEventListener('click', function () { setMenu(navToggle.getAttribute('aria-expanded') !== 'true'); });
  // Sticky (position in de class): de topbalk schuift weg bij omlaag scrollen en komt terug bij omhoog, zoals het prototype
  var bar = nav.querySelector('.nav_topbar');
  document.documentElement.style.scrollPaddingTop = nav.offsetHeight - (bar ? bar.offsetHeight : 0) + 'px';
  if (bar) withGsap(function (g) {
    var last = window.scrollY, tucked = false;
    function tuck(on) {
      if (on === tucked) return;
      tucked = on;
      g.to(nav, { y: on ? -bar.offsetHeight : 0, duration: reduce.matches ? 0 : 0.45, ease: 'power4.out', overwrite: true, onComplete: on ? null : function () { g.set(nav, { clearProps: 'transform' }); } });
    }
    tuckNav = tuck;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y < 40) tuck(false);
      else if (y > last + 3 && !(navToggle && navToggle.getAttribute('aria-expanded') === 'true')) tuck(true);
      else if (y < last - 3) tuck(false);
      last = y;
    }, { passive: true });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (current) { var t = toggleOf(current); show(null); t.focus(); }
    else if (navToggle && navToggle.getAttribute('aria-expanded') === 'true') { setMenu(false); navToggle.focus(); }
  });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) { show(null); setMenu(false); } });
  // Bij een paginaovergang: menu's dicht en de topbalk terug
  resetNav = function () { show(null, true); setMenu(false); if (tuckNav) tuckNav(false); };
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

/* Binnenkomen: de kop van Werk, de kop en het vertrouwd-blok van Reviews, de kop en kaarten van Kennis en Gerelateerd, de tekst, het formulier en de foto op contact, en de filters op /werk, de blokken op een case en de teamlijst en de blokken op een teamlid komen een keer
   binnen zodra ze in beeld komen, met dezelfde blur-fade als de hero (keuze van de gebruiker; het prototype doet alleen
   fade en omhoog; op een telefoon zonder blur). Reduced motion en zonder site.js: gewoon zichtbaar. */
var arrivals = '.werk_header, .reviews_header, .reviews_trust, .kennis_header, .kennis_panels, .kennis-filter, .kennis-rij_header, .kennis-gerelateerd_header, .kennis-gerelateerd_list-wrapper, .contact_text, .contact-form, .contact_media, .werk-filter, .werk-detail_block, .werk-detail_quote-group, .team-lijst_list, .team-detail_person, .team-detail_intro, .team-detail_blok';
function initArrivals(root, a) {
  if (!reduce.matches) a.withGsap(function (gsap) {
    a.each(arrivals, function (el) {
      var line = a.startLine(el);
      gsap.set(el, withBlur({ opacity: 0, y: '1.5rem' }, 'blur(0.75rem)'));
      a.onceInView(el, line, function () {
        gsap.to(el, withBlur({ opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', clearProps: 'opacity,transform,filter' }, 'blur(0rem)'));
      });
    });
  });
  return a.clean;
}

/* Modules: elk bestand staat in modules/ en exporteert init(container, a). De tabel staat in de volgorde waarin ze starten;
   die telt: de gele lijn na data-a-pin, de hover op de cases na de kopieën van de rij, data-a-filter na data-a-row, data-a-werk-nav en data-a-team-filter voor data-a-subnav.
   Een nieuwe module: een regel erbij met de naam en het attribuut (zie de README). */
var modules = [
  ['wacht', 'button[data-wait]'],
  ['hero', '[data-a-hero]'],
  ['pin', '[data-a-pin]'],
  ['fill', '[data-a-fill]'],
  ['waarden', '[data-a-value]'],
  ['team', '[data-a-team]'],
  ['footer-cta', '.footer_cta-list'],
  [initArrivals, arrivals],
  ['lijnen', '[data-a-hero], .section_reviews, .section_werk, .section_kennis'],
  ['tabs', '[data-a-tabs]'],
  ['carousel', '[data-a-carousel], [data-a-case]'],
  ['kaarten', '[data-a-expertise], [data-a-card], [data-a-hover]'],
  ['detail', '[data-a-detail], [data-a-toc], [data-a-share]'],
  ['werk', '[data-a-werk-filter], [data-a-werk-nav]'],
  ['teamlijst', '[data-a-team-filter], [data-a-lid], [data-a-team-blok]'],
  ['kennis-hero', '[data-a-subnav], [data-a-page-hero]'],
  ['rij', '[data-a-row]'],
  ['filter', '[data-a-filter], [data-a-filter-list]']
];
// Wat binnenkomt staat meteen verborgen, nog voor de modules en GSAP er zijn; start() haalt dit weg vlak voordat de modules het overnemen
var hideFirst = arrivals + ', [data-a-hero] .hero-home_heading .tag, [data-a-hero] h1 > span, [data-a-hero] .award, [data-a-hero] .hero-home_cards, ' +
  '[data-a-page-hero] .tag, [data-a-page-hero] h1 span, [data-a-page-hero] [data-a-subnav]:not([data-a-kept]), [data-a-detail] .kennis-detail_header > *, ' +
  '[data-a-detail] .kennis-detail_intro, [data-a-detail] .kennis-detail_image, [data-a-filter-list] > *, [data-a-werk-nav]';
// Lokaal de gewone bestanden, op jsDelivr de .min-bestanden (die maakt jsDelivr pas bij het eerste verzoek: warm ze op)
var dir = new URL('modules/', import.meta.url).href, ext = /\.min\.js/.test(import.meta.url) ? '.min.js' : '.js';

/* Wat een module krijgt: de gedeelde hulpjes plus een eigen opruimlijst. Listeners, tweens, timers en observers die via
   a lopen ruimt a.clean op; wat de module verder aan de DOM toevoegt, geeft hij door met a.undo(fn). */
var shared = { reduce: reduce, touchDevice: touchDevice, clamp: clamp, num: num, withBlur: withBlur, jumpTo: jumpTo, glideTo: glideTo, get lenis() { return lenis; } };
function scope(root) {
  var a = Object.create(shared), ac = new AbortController(), undos = [], timers = new Set(), live = [], dead = false;
  function track(t) {
    // Afgelopen tweens hebben geen parent meer; laat de lijst niet groeien bij elke hover
    if (live.length > 50) live = live.filter(function (x) { return x.parent; });
    live.push(t);
    if (dead) t.kill();
    return t;
  }
  a.each = function (sel, fn) { each(sel, fn, root); };
  a.listen = function (target, type, fn, options) { target.addEventListener(type, fn, Object.assign({ signal: ac.signal }, options)); };
  a.wait = function (fn, ms) {
    var id = setTimeout(function () { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  };
  a.raf = function (fn) { return requestAnimationFrame(function (t) { if (!dead) fn(t); }); };
  a.undo = function (fn) { undos.push(fn); };
  // Bij het laden van de pagina, en na een paginaovergang als de foto's in beeld er zijn (dan komt er geen load-event)
  a.loaded = function (fn) { a.listen(window, 'load', fn); a.listen(window, 'afix:load', fn); };
  a.watch = function (observer) { undos.push(function () { observer.disconnect(); }); return observer; };
  a.withGsap = function (fn) {
    withGsap(function (gsap) {
      if (dead) return;
      // Zelfde gsap, maar elke tween komt op de opruimlijst
      var g = Object.create(gsap);
      ['to', 'from', 'fromTo', 'timeline', 'delayedCall'].forEach(function (name) {
        g[name] = function () { return track(gsap[name].apply(gsap, arguments)); };
      });
      // Hover in voor alle kaarten: de beginstand alleen vanuit rust, anders loopt hij door vanaf waar hij is (snel heen en weer)
      g.hoverIn = function (el, from, to) { if (!+gsap.getProperty(el, 'opacity')) gsap.set(el, from); return g.to(el, to); };
      // Hover uit voor alle kaarten: trager en zonder ease-out, die verliest de helft al in de eerste 50 ms. props gaat na afloop uit de inline stijl
      g.hoverOut = function (el, to, props) {
        var t = reduce.matches ? 0 : 1, vars = Object.assign({ duration: 0.4, delay: 0, ease: 'sine.inOut', overwrite: true }, to);
        vars.duration *= t;
        vars.delay *= t;
        vars.onComplete = function () { gsap.set(el, { clearProps: props }); };
        return g.to(el, vars);
      };
      fn(g);
    });
  };
  // fn een keer aanroepen zodra de bovenkant van el bottom procent boven de onderrand van het scherm komt, of als el daar
  // al voorbij is (bijvoorbeeld bij herladen lager op de pagina)
  a.onceInView = function (el, bottom, fn) {
    var seen = a.watch(new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting && entries[0].boundingClientRect.top >= 0) return;
      seen.disconnect();
      fn();
    }, { rootMargin: '0px 0px -' + bottom + '% 0px' }));
    seen.observe(el);
  };
  // Waar binnenkomen start, in procent boven de onderrand: 10, behalve als el bij het starten al in beeld staat. Dan meteen,
  // anders blijft de onderkant van het eerste scherm leeg (zoals de filterbalk onder de hero op de kennispagina's)
  a.startLine = function (el) { return el.getBoundingClientRect().top < window.innerHeight ? 0 : 10; };
  a.clean = function () {
    if (dead) return;
    dead = true;
    ac.abort();
    timers.forEach(clearTimeout);
    live.forEach(function (t) { t.kill(); });
    undos.reverse().forEach(function (fn) { fn(); });
  };
  return a;
}

var cleaners = [];
/* De pagina klaarzetten: root is document, of de nieuwe pagina bij een overgang. Verbergt wat binnenkomt en laadt de modules;
   de teruggegeven functie start ze, in volgorde en in één keer. */
function load(root) {
  prepare(root);
  var hidden = reduce.matches ? [] : [].slice.call(root.querySelectorAll(hideFirst));
  hidden.forEach(function (el) { el.style.opacity = '0'; });
  function show() { hidden.forEach(function (el) { el.style.opacity = ''; }); hidden = []; }
  // Laadt iets niet, dan na 3 s gewoon tonen
  var fallback = setTimeout(show, 3000);
  var gsapReady = new Promise(function (done) { var cap = setTimeout(done, 3000); withGsap(function () { clearTimeout(cap); done(); }); });
  var wanted = modules.filter(function (m) { return root.querySelector(m[1]); });
  return Promise.all(wanted.map(function (m) {
    if (typeof m[0] === 'function') return { init: m[0] };
    return import(dir + m[0] + ext).catch(function (e) { console.error('Afix: module ' + m[0] + ' niet geladen', e); });
  }).concat(gsapReady)).then(function (loaded) {
    return function () {
      clearTimeout(fallback);
      show();
      wanted.forEach(function (m, i) {
        if (!loaded[i]) return;
        // Een fout in één module mag de andere niet stoppen
        try { cleaners.push(loaded[i].init(root, scope(root))); } catch (e) { console.error('Afix: module ' + m[0] + ' fout', e); }
      });
    };
  });
}
export function start(root) { return load(root || document).then(function (run) { run(); }); }
/* Alles van de huidige pagina opruimen */
export function stop() {
  cleaners.forEach(function (clean) { clean(); });
  cleaners = [];
}
export var ready = start();

// Paginaovergangen: pas na de eerste pagina, en alleen op de echte site. Lukt het niet, dan werken de links gewoon
if (document.querySelector('.page-wrapper')) ready.then(function () { return import(dir + 'overgang' + ext); }).then(function (m) {
  m.init({ load: load, stop: stop, jumpTo: jumpTo, resetNav: function () { resetNav(); }, reduce: reduce, withGsap: withGsap, get lenis() { return lenis; } });
}).catch(function (e) { console.error('Afix: overgangen niet geladen', e); });
