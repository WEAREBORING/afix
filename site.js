/* Afix site.js v0.2: attribuutmodules. Bron: site.js in WEAREBORING/afix. Elke module start alleen als zijn data-a-attribuut op de pagina staat. */
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
    function toggleOf(dd) { return dd.querySelector('[data-a-dropdown-toggle]'); }
    function isOpen(dd) { var t = toggleOf(dd); return !!t && t.getAttribute('aria-expanded') === 'true'; }
    function setDrop(dd, open) {
      var toggle = toggleOf(dd), panel = dd.querySelector('[data-a-dropdown-panel]');
      if (!toggle || !panel) return;
      var caret = toggle.querySelector('svg');
      toggle.setAttribute('aria-expanded', open);
      panel.style.display = open ? 'flex' : '';
      if (caret) { caret.style.transition = reduce.matches ? '' : 'transform 0.2s'; caret.style.transform = open ? 'rotate(180deg)' : ''; }
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
     (achtergrond, kleur, opacity: de donkere pil). Pijltjestoetsen, Home en End gaan naar een andere tab. */
  each('[data-a-tabs]', function (wrap) {
    var tabs = [].slice.call(wrap.querySelectorAll('[data-a-tab]'));
    var panels = [].slice.call(wrap.querySelectorAll('[data-a-tab-panel]'));
    if (tabs.length < 2) return;
    var props = ['backgroundColor', 'color', 'opacity'];
    function look(el) { var cs = getComputedStyle(el); return props.map(function (p) { return cs[p]; }); }
    // Lezen voordat site.js iets inline zet: tabs[0] heeft de actieve stijl (:first-child), tabs[1] de gewone
    var on = look(tabs[0]), off = look(tabs[1]);
    var group = wrap.getAttribute('data-a-tabs') || 'tabs';
    function panelOf(tab) { return panels.filter(function (p) { return p.getAttribute('data-a-tab-panel') === tab.getAttribute('data-a-tab'); })[0]; }
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var active = t === tab, style = active ? on : off;
        t.setAttribute('aria-selected', active);
        t.tabIndex = active ? 0 : -1;
        props.forEach(function (p, i) { t.style[p] = style[i]; });
      });
      panels.forEach(function (p) { p.style.display = p === panelOf(tab) ? 'block' : 'none'; });
      if (focus) tab.focus();
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
     lijst die niet scrolt is een stapel (reviews_list, alle kaarten in één gridcel). */
  each('[data-a-carousel]', function (list) {
    var scope = list.closest('section') || list.parentNode;
    var items = [].slice.call(list.children);
    if (items.length < 2) return;
    var go = getComputedStyle(list).overflowX === 'visible' ? carouselStack(list, items, scope) : carouselRow(list, items);
    var prev = scope.querySelector('[data-a-carousel-prev]'), next = scope.querySelector('[data-a-carousel-next]');
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
  });

  /* Stapel: alleen de voorste kaart is zichtbaar (in de class alleen :first-child); de pijlen wisselen hem en de teller
     toont "01" en " / 03". aria-live laat een schermlezer de nieuwe kaart voorlezen. */
  function carouselStack(list, items, scope) {
    var i = 0, current = scope.querySelector('[data-a-carousel-current]'), total = scope.querySelector('[data-a-carousel-total]');
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function show() {
      items.forEach(function (it, k) { it.style.opacity = k === i ? '1' : '0'; it.style.visibility = k === i ? 'visible' : 'hidden'; });
      if (current) current.textContent = pad(i + 1);
      if (total) total.textContent = ' / ' + pad(items.length);
    }
    show();
    list.setAttribute('aria-live', 'polite');
    return function (d) { i = (i + d + items.length) % items.length; show(); };
  }

  /* Scrollrij: een pijl schuift naar de volgende of vorige kaart (scroll-snap doet de uitlijning), aan het eind terug
     naar het begin. Schuift elke 4 seconden zelf door als de rij in beeld is, niet bij hover, focus of reduced motion.
     Met de muis te slepen; op touch scrolt de rij zelf. */
  function carouselRow(list, items) {
    function behavior() { return reduce.matches ? 'auto' : 'smooth'; }
    function go(d) {
      var start = list.getBoundingClientRect().left + (parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0);
      var lefts = items.map(function (it) { return it.getBoundingClientRect().left - start; });
      var max = list.scrollWidth - list.clientWidth;
      var to = d > 0 ? lefts.filter(function (x) { return x > 2; })[0]
        : d < 0 ? lefts.filter(function (x) { return x < -2; }).pop()
        : lefts.reduce(function (a, b) { return Math.abs(b) < Math.abs(a) ? b : a; });
      if (d > 0 && (to === undefined || list.scrollLeft >= max - 2)) list.scrollTo({ left: 0, behavior: behavior() });
      else if (to === undefined) list.scrollTo({ left: max, behavior: behavior() });
      else list.scrollBy({ left: to, behavior: behavior() });
    }
    var inView = false, paused = false, timer;
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(function () { if (inView && !paused && !drag && !document.hidden && !reduce.matches) go(1); schedule(); }, 4000);
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; }, { threshold: 0.3 }).observe(list);
    list.addEventListener('mouseenter', function () { paused = true; });
    list.addEventListener('mouseleave', function () { paused = false; });
    list.addEventListener('focusin', function () { paused = true; });
    list.addEventListener('focusout', function () { paused = false; });
    list.addEventListener('wheel', schedule, { passive: true });

    var drag = null, dragged = false;
    list.addEventListener('pointerdown', function (e) {
      schedule();
      dragged = false;
      if (e.pointerType === 'mouse' && e.button === 0) drag = { x: e.clientX, left: list.scrollLeft, id: e.pointerId };
    });
    list.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!dragged && Math.abs(dx) > 6) {
        dragged = true;
        // Zonder snap tijdens het slepen, anders springt de rij steeds terug naar een kaart
        list.style.scrollSnapType = 'none';
        list.style.userSelect = 'none';
        list.setPointerCapture(drag.id);
      }
      if (dragged) list.scrollLeft = drag.left - dx;
    });
    function endDrag() {
      if (!drag) return;
      drag = null;
      if (!dragged) return;
      list.style.scrollSnapType = '';
      list.style.userSelect = '';
      go(0);
    }
    list.addEventListener('pointerup', endDrag);
    list.addEventListener('pointercancel', endDrag);
    // Na slepen geen klik op de kaartlink, en geen sleepbeeld van een link of foto
    list.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
    list.addEventListener('dragstart', function (e) { e.preventDefault(); });

    schedule();
    return function (d) { go(d); schedule(); };
  }

  /* GSAP: gebruikt Webflow zelf al gsap (bijvoorbeeld voor de nav), dan nemen we die. Anders laden we hem van het
     Webflow-CDN; houd de versie gelijk aan die van Webflow. */
  function withGsap(fn) {
    if (window.gsap) return fn(window.gsap);
    var s = document.createElement('script');
    s.src = 'https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js';
    s.onload = function () { if (window.gsap) fn(window.gsap); };
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
