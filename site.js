/* Afix site.js v0.1: attribuutmodules. Bron: site.js in WEAREBORING/afix. Elke module start alleen als zijn data-a-attribuut op de pagina staat. */
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
