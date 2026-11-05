/* Afix modules/werk.js: data-a-werk-filter en data-a-werk-nav: filters en Meer laden op /werk, ankerbalk op een case. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, listen = a.listen, raf = a.raf, wait = a.wait, withGsap = a.withGsap, num = a.num, undo = a.undo;

  /* data-a-werk-filter (Section - Hero Werk): drie keuzes op de kaarten in data-a-werk-list (Section - Werklijst). De keuzes
     komen uit de kaarten: uitdaging en sector uit de attributen op elke kaart, expertise uit de labels, dus er staat nooit een
     lege keuze tussen. Waarde van data-a-werk-list en data-a-werk-more: het aantal kaarten per keer. */
  each('[data-a-werk-filter]', function (root) {
    var list = container.querySelector('[data-a-werk-list]');
    if (!list) return;
    var items = [].slice.call(list.children), more = container.querySelector('[data-a-werk-more]');
    var limit = num(list, 'data-a-werk-list', 10), step = more ? num(more, 'data-a-werk-more', 10) : items.length, count = limit, gsap = null;
    withGsap(function (g) { gsap = g; });
    function valuesOf(item, key) {
      if (key !== 'expertise') return [item.getAttribute('data-a-werk-' + key) || ''];
      return [].map.call(item.querySelectorAll('.case-card_tag-list .tag'), function (tag) { return tag.textContent.trim(); });
    }
    var selects = [].map.call(root.querySelectorAll('[data-a-werk-select]'), function (box) {
      var toggle = box.querySelector('[data-a-werk-toggle]');
      return { box: box, key: box.getAttribute('data-a-werk-select'), toggle: toggle, label: box.querySelector('[data-a-werk-label]'), panel: box.querySelector('[data-a-werk-panel]'), value: '' };
    });
    var empty = document.createElement('div');
    empty.className = 'kennis_empty';
    empty.textContent = 'Geen cases gevonden. Kies een andere uitdaging, expertise of sector.';
    empty.setAttribute('role', 'status');
    empty.style.display = 'none';
    list.parentNode.insertBefore(empty, list.nextSibling);
    undo(function () { empty.remove(); });
    function apply() {
      var hits = items.filter(function (item) {
        return selects.every(function (s) { return !s.value || valuesOf(item, s.key).indexOf(s.value) > -1; });
      }), fresh = [];
      items.forEach(function (item) {
        var i = hits.indexOf(item), on = i > -1 && i < count;
        if (on && item.style.display === 'none') fresh.push(item);
        item.style.display = on ? '' : 'none';
      });
      empty.style.display = hits.length ? 'none' : '';
      if (more) more.style.display = hits.length > count ? 'flex' : '';
      if (gsap && fresh.length && !reduce.matches) gsap.fromTo(fresh, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out', clearProps: 'opacity,transform,filter' });
    }
    function setOpen(s, open) {
      s.toggle.setAttribute('aria-expanded', open);
      s.panel.style.display = open ? 'flex' : '';
      // Op de telefoon staan de keuzes onder elkaar: het open paneel moet over de volgende keuze heen
      s.box.style.zIndex = open ? '4' : '';
      var caret = s.toggle.querySelector('svg'), t = reduce.matches ? 0 : 1;
      if (!gsap) return;
      if (caret) gsap.to(caret, { rotation: open ? 180 : 0, duration: 0.2 * t, ease: 'power2.out', overwrite: true });
      if (open) gsap.fromTo(s.panel, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.25 * t, ease: 'power2.out', clearProps: 'opacity,transform' });
    }
    function isOpen(s) { return s.toggle.getAttribute('aria-expanded') === 'true'; }
    function closeAll(except) { selects.forEach(function (s) { if (s !== except && isOpen(s)) setOpen(s, false); }); }
    selects.forEach(function (s) {
      var all = s.label.textContent, names = [];
      items.forEach(function (item) {
        valuesOf(item, s.key).forEach(function (name) { if (name && names.indexOf(name) < 0) names.push(name); });
      });
      names.sort(function (x, y) { return x.localeCompare(y, 'nl'); });
      [all].concat(names).forEach(function (name, i) {
        var option = document.createElement('button');
        option.type = 'button';
        option.className = 'kennis-filter_option';
        option.textContent = name;
        listen(option, 'click', function () {
          s.value = i ? name : '';
          s.label.textContent = name;
          count = limit;
          setOpen(s, false);
          s.toggle.focus();
          apply();
        });
        s.panel.appendChild(option);
        undo(function () { option.remove(); });
      });
      undo(function () { s.label.textContent = all; });
      listen(s.toggle, 'click', function () { closeAll(s); setOpen(s, !isOpen(s)); });
    });
    listen(document, 'click', function (e) { if (!root.contains(e.target)) closeAll(); });
    listen(document, 'keydown', function (e) {
      var open = selects.filter(isOpen)[0];
      if (e.key !== 'Escape' || !open) return;
      setOpen(open, false);
      open.toggle.focus();
    });
    if (more) listen(more, 'click', function () { count += step; apply(); });
    apply();
    undo(function () { items.forEach(function (item) { item.style.display = ''; }); });
  });

  /* data-a-werk-nav (case): de ankerbalk. Hij drijft via data-a-subnav (kennis-hero.js), die module moet na deze starten: de pil
     komt op de link met w--current. De eerste link is de bovenkant van de pagina. Een leeg blok staat niet in de html, dan
     verdwijnt zijn link; blijft alleen de eerste over, dan verdwijnt de balk. De links hebben hreflang, anders zet webflow.js
     zelf w--current op elk blok in beeld. */
  each('[data-a-werk-nav]', function (nav) {
    var links = [].filter.call(nav.querySelectorAll('a'), function (link, i) {
      if (!i || container.querySelector(link.hash)) return true;
      link.style.display = 'none';
      undo(function () { link.style.display = ''; });
      return false;
    });
    if (links.length < 2) { nav.style.display = 'none'; undo(function () { nav.style.display = ''; }); return; }
    var blocks = links.map(function (link, i) { return i ? container.querySelector(link.hash) : nav; });
    var at = 0, queued = false, locked = null, gsap = null, mouse = window.matchMedia('(hover: hover)');
    function look(el) { var cs = getComputedStyle(el); return { color: cs.color, opacity: cs.opacity }; }
    // Zoals de tabs (tabs.js): kleur en dekking staan inline, anders springen ze om met de class en lopen ze niet met de pil mee
    var off = look(links[1]);
    links[0].classList.add('w--current');
    var on = look(links[0]);
    links.forEach(function (link, i) { link.style.backgroundColor = 'transparent'; Object.assign(link.style, i ? off : on); });
    undo(function () { links[at].classList.remove('w--current'); links.forEach(function (link) { link.style.backgroundColor = link.style.color = link.style.opacity = ''; }); });
    function time(t) { return reduce.matches ? 0 : t; }
    function place(t) {
      var pill = nav.querySelector('.kennis_tab-pill'), link = links[at];
      if (gsap && pill) gsap.to(pill, { x: link.offsetLeft, width: link.offsetWidth, duration: time(t), ease: 'power3.out', overwrite: true });
    }
    function select(i) {
      if (i === at || !gsap) return;
      links[at].classList.remove('w--current');
      links[i].classList.add('w--current');
      at = i;
      links.forEach(function (link, n) { gsap.to(link, Object.assign({ duration: time(0.3), ease: 'power2.out', overwrite: true }, n === i ? on : off)); });
      place(0.45);
      // Past de balk niet (telefoon), dan schuift hij mee zodat de actieve link in het midden staat
      var left = links[i].offsetLeft + links[i].offsetWidth / 2 - nav.clientWidth / 2;
      if (nav.scrollWidth > nav.clientWidth) gsap.to(nav, { scrollLeft: a.clamp(left, 0, nav.scrollWidth - nav.clientWidth), duration: time(0.45), ease: 'power3.out', overwrite: 'auto' });
    }
    function space() { return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0; }
    function update() {
      queued = false;
      if (locked) return;
      var now = 0, line = space() + 96; // Een klik zet een blok 32 onder de nav; 64 speling, want een kort blok laat het volgende al bijna op die plek staan
      blocks.forEach(function (block, i) { if (block.getBoundingClientRect().top <= line) now = i; });
      select(now);
    }
    function queue() { if (!queued) { queued = true; raf(update); } }
    function release() { clearTimeout(locked); locked = null; queue(); }
    links.forEach(function (link, i) {
      listen(link, 'click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        history.replaceState(null, '', link.hash);
        // De pil gaat meteen naar de klik en stopt niet bij de blokken waar de scroll langskomt
        select(i);
        clearTimeout(locked);
        locked = wait(release, 2000);
        // Zelf scrollen naar een getal: Lenis telt bij een element de scroll-padding van de nav erbij op
        var y = i ? blocks[i].getBoundingClientRect().top + window.scrollY - space() - 32 : 0;
        if (a.lenis) a.lenis.scrollTo(y, { onComplete: release }); else { window.scrollTo(0, y); release(); }
      });
    });
    withGsap(function (g) {
      gsap = g;
      if (!reduce.matches) gsap.fromTo(nav, { opacity: 0 }, { opacity: 1, duration: 1.1, delay: 0.3, ease: 'power3.out', clearProps: 'opacity' });
    });
    // Na kennis-hero.js, die de hover alleen op de links zonder w--current bij de start zet en geen wissel kent: dit wint
    raf(function () {
      links.forEach(function (link, i) {
        listen(link, 'mouseenter', function () { if (gsap && mouse.matches && i !== at) gsap.to(link, { opacity: 1, duration: time(0.25), ease: 'power2.out', overwrite: true }); });
        listen(link, 'mouseleave', function () { if (gsap) gsap.to(link, Object.assign({ duration: time(0.25), ease: 'power2.out', overwrite: true }, i === at ? on : off)); });
      });
    });
    listen(window, 'scroll', queue, { passive: true });
    // Na kennis-hero.js, die de pil bij deze momenten terugzet op de eerste link
    listen(window, 'resize', function () { raf(function () { place(0); }); });
    a.loaded(function () { raf(function () { update(); place(0); }); });
    queue();
  });

  return a.clean;
}
