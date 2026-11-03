/* Afix site.js v0.11: attribuutmodules. Bron: site.js in WEAREBORING/afix. Elke module start alleen als zijn data-a-attribuut op de pagina staat. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function num(el, attr, fallback) { var v = parseFloat(el.getAttribute(attr)); return isNaN(v) ? fallback : v; }

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
     lijst die niet scrolt is een stapel (reviews_list, alle kaarten in één gridcel), die site.js als waaier toont. */
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

  /* Stapel als waaier (Reviews, naar de Flick Cards van Osmo): de actieve kaart staat recht in het midden, de buren schuin
     ernaast en erachter, verder weg nog schuiner en kleiner, daarna onzichtbaar. Pijlen of slepen (muis en vinger) wisselen
     de kaart; de kaarten veren elastisch op hun plek (GSAP). De teller toont "01" en " / 03". Alleen de actieve kaart is
     voor schermlezers zichtbaar (aria-live leest hem voor). Zonder GSAP: alleen de actieve kaart, zonder waaier. */
  function carouselStack(list, items, scope) {
    var i = 0, n = items.length, gsap = null;
    var current = scope.querySelector('[data-a-carousel-current]'), total = scope.querySelector('[data-a-carousel-total]');
    function pad(v) { return (v < 10 ? '0' : '') + v; }
    // Stand per afstand tot de actieve kaart: x en y in % van de kaart, draaiing, schaal, opacity, laag. De buren zijn half
    // doorzichtig: alle kaarten zijn even donker, dus zo blijft de actieve kaart duidelijk vooraan
    function config(k, at) {
      var d = k - at;
      if (d > n / 2) d -= n; else if (d < -n / 2) d += n;
      var a = Math.abs(d), dir = d < 0 ? -1 : 1;
      if (a === 0) return { x: 0, y: 0, rot: 0, s: 1, o: 1, z: 5 };
      if (a === 1) return { x: 25 * dir, y: 1, rot: 10 * dir, s: 0.9, o: 0.6, z: 4 };
      if (a === 2) return { x: 45 * dir, y: 5, rot: 15 * dir, s: 0.8, o: 0.35, z: 3 };
      return { x: 55 * dir, y: 5, rot: 20 * dir, s: 0.6, o: 0, z: 2 };
    }
    function apply(card, c, animate) {
      var vars = { xPercent: c.x, yPercent: c.y, rotation: c.rot, scale: c.s, opacity: c.o };
      if (animate) gsap.to(card, Object.assign(vars, { duration: 0.6, ease: 'elastic.out(1.2, 1)', overwrite: true }));
      else gsap.set(card, vars);
    }
    function render(animate) {
      if (current) current.textContent = pad(i + 1);
      if (total) total.textContent = ' / ' + pad(n);
      items.forEach(function (card, k) {
        var c = config(k, i), active = k === i;
        if (active) card.removeAttribute('aria-hidden'); else card.setAttribute('aria-hidden', 'true');
        if (!gsap) { card.style.opacity = active ? '1' : '0'; card.style.visibility = active ? 'visible' : 'hidden'; return; }
        card.style.visibility = 'visible';
        card.style.zIndex = c.z;
        apply(card, c, animate && !reduce.matches);
      });
    }
    // Eigen laag, zodat de z-index van de kaarten niet boven de teller uitkomt
    list.style.isolation = 'isolate';
    list.setAttribute('aria-live', 'polite');
    render(false);
    withGsap(function (g) { gsap = g; render(false); });

    // Slepen: de kaarten lopen mee van de huidige naar de volgende stand; na 10% van de breedte loslaten = wisselen
    var drag = null;
    list.style.touchAction = 'pan-y';
    list.addEventListener('pointerdown', function (e) {
      if (!gsap || e.button !== 0) return;
      drag = { x: e.clientX, id: e.pointerId, moved: false, p: 0 };
    });
    list.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, w = list.offsetWidth;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; list.setPointerCapture(drag.id); list.style.userSelect = 'none'; }
      if (!drag.moved) return;
      drag.p = Math.max(-0.5, Math.min(0.5, dx / w));
      var next = (i + (drag.p > 0 ? -1 : 1) + n) % n, t = Math.min(1, Math.abs(drag.p) * 2);
      items.forEach(function (card, k) {
        var a = config(k, i), b = config(k, next);
        function mix(key) { return a[key] + (b[key] - a[key]) * t; }
        gsap.set(card, { xPercent: mix('x'), yPercent: mix('y'), rotation: mix('rot'), scale: mix('s'), opacity: mix('o'), overwrite: true });
        // Halverwege komt de binnenkomende kaart bovenop
        card.style.zIndex = t > 0.5 ? b.z : a.z;
      });
    });
    function release() {
      if (!drag) return;
      var d = drag;
      drag = null;
      if (!d.moved) return;
      list.style.userSelect = '';
      if (d.p > 0.1) i = (i - 1 + n) % n; else if (d.p < -0.1) i = (i + 1) % n;
      render(true);
    }
    list.addEventListener('pointerup', release);
    list.addEventListener('pointercancel', release);
    list.addEventListener('dragstart', function (e) { e.preventDefault(); });

    return function (d) { i = (i + d + n) % n; render(true); };
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
