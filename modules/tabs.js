/* Afix modules/tabs.js: data-a-tabs: tabs met schuivende pil. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, listen = a.listen, withGsap = a.withGsap;

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
    var tabHover = window.matchMedia('(hover: hover)');
    var bar = tabs[0].parentElement;
    function centerTab(animate) {
      if (!current || bar.scrollWidth <= bar.clientWidth) return;
      var x = Math.max(0, Math.min(bar.scrollWidth - bar.clientWidth, current.offsetLeft + current.offsetWidth / 2 - bar.clientWidth / 2));
      if (gsap && animate && !reduce.matches) gsap.to(bar, { scrollLeft: x, duration: 0.45, ease: 'power3.out', overwrite: true });
      else bar.scrollLeft = x;
    }
    withGsap(function (g) { gsap = g; movePill(false); });
    listen(window, 'resize', function () { movePill(false); centerTab(false); });
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
      listen(t, 'click', function () { select(t); });
      // Hover op een niet-actieve tab: de vervaagde tekst wordt helemaal donker, net als in data-a-subnav
      listen(t, 'mouseenter', function () { if (gsap && t !== current && tabHover.matches) gsap.to(t, { opacity: 1, duration: reduce.matches ? 0 : 0.25, ease: 'power2.out', overwrite: true }); });
      listen(t, 'mouseleave', function () { if (gsap && t !== current) gsap.to(t, { opacity: off[2], duration: reduce.matches ? 0 : 0.25, ease: 'power2.out', overwrite: true }); });
      listen(t, 'keydown', function (e) {
        var to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        select(tabs[(to + tabs.length) % tabs.length], true);
      });
    });
    select(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0]);
  });

  return a.clean;
}
