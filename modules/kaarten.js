/* Afix modules/kaarten.js: hovers: data-a-expertise, data-a-card en data-a-hover. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var reduce = a.reduce, listen = a.listen, withGsap = a.withGsap, num = a.num;

  /* data-a-expertise (Item - Expertise): hover op een expertisekaart, alleen desktop met muis, en bij toetsenbordfocus
     op de kaartlink. expertise-card_link wordt signaalgeel (surface/accent) en de pijl (expertise-card_arrow, op desktop
     onzichtbaar in de class) schuift in beeld. Labels en tekst blijven staan, zoals in Figma. */
  var expertiseCards = container.querySelectorAll('[data-a-expertise]');
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
      listen(card, 'mouseenter', function () { if (desktop.matches) show(); });
      listen(card, 'mouseleave', hide);
      listen(card, 'focusin', function (e) { if (e.target.matches(':focus-visible')) show(); });
      listen(card, 'focusout', hide);
    });
  });

  /* data-a-card (Section - Kennis): hover op een kennis-kaart, alleen desktop met muis, en bij toetsenbordfocus op de
     kaartlink (Figma 935:8845). De kaart wordt signaalgeel (surface/accent), het gevulde label (variant Label) iets
     donkerder (de kleur van border/subtle), de foto zoomt iets in vanaf de onderkant, en de datum (kennis-card_date)
     maakt plaats voor de pijlknop (kennis-card_arrow). Na het teruggaan neemt de class het weer over. */
  var kennisCards = container.querySelectorAll('[data-a-card]');
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
        // 'auto': alleen de kleur overschrijven, anders stopt een hover het binnenkomen van de kaart halverwege
        gsap.to(card, { backgroundColor: colorOf(card, '--_theme---surface--accent'), duration: 0.3 * t, ease: 'power2.out', overwrite: 'auto' });
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
        gsap.to(card, { backgroundColor: rest.card, duration: 0.3 * t, ease: 'power2.out', overwrite: 'auto', onComplete: clear(card, 'backgroundColor') });
        labels.forEach(function (l, i) { gsap.to(l, { backgroundColor: rest.labels[i], duration: 0.3 * t, ease: 'power2.out', overwrite: true, onComplete: clear(l, 'backgroundColor') }); });
        if (img) gsap.to(img, { scale: 1, duration: 0.8 * t, ease: 'expo.out', overwrite: true, onComplete: clear(img, 'transform,transformOrigin') });
        if (arrow) gsap.to(arrow, { opacity: 0, duration: 0.2 * t, ease: 'power2.out', overwrite: true, onComplete: clear(arrow, 'opacity,transform') });
        if (date) gsap.to(date, { opacity: 1, duration: 0.3 * t, delay: 0.1 * t, ease: 'power2.out', overwrite: true, onComplete: clear(date, 'opacity') });
      }
      listen(card, 'mouseenter', function () { if (desktop.matches) show(); });
      listen(card, 'mouseleave', hide);
      listen(card, 'focusin', function (e) { if (e.target.matches(':focus-visible')) show(); });
      listen(card, 'focusout', hide);
    });
  });

  /* data-a-hover: hover-animatie met GSAP, alleen op desktop met muis.
     data-a-hover op het element waar je overheen gaat; kinderen met data-a-hover-x en/of -y (rem, px of %) en/of
     data-a-hover-scale bewegen mee. Duur in seconden: data-a-hover-duration (standaard 0.6) en -duration-out (0.4).
     Na het teruggaan neemt de class de stijl weer over (clearProps). */
  var hovers = container.querySelectorAll('[data-a-hover]');
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
      listen(trigger, 'mouseenter', function () {
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
      listen(trigger, 'mouseleave', function () {
        targets.forEach(function (t) {
          var rest = t._hoverRest;
          if (!rest) return;
          gsap.to(t, { x: rest.x, y: rest.y, xPercent: rest.xPercent, yPercent: rest.yPercent, scale: rest.scale, duration: num(t, 'data-a-hover-duration-out', 0.4), ease: 'expo.out', overwrite: true,
            onComplete: function () { gsap.set(t, { clearProps: 'transform' }); t._hoverRest = null; } });
        });
      });
    });
  });

  return a.clean;
}
