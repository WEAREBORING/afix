/* Afix modules/kennis-hero.js: kennispagina: data-a-subnav en data-a-page-hero. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, listen = a.listen, wait = a.wait, withGsap = a.withGsap, withBlur = a.withBlur, undo = a.undo, watch = a.watch;

  /* data-a-subnav (Section - Hero Kennis): de secundaire navigatie (Figma 935:7556). Zodra je scrolt schuift hij van de hero
     naar onderaan het scherm, bovenaan de pagina weer terug; bij de footer schuift hij omlaag uit beeld. Een lege houder
     bewaart zijn plek in de hero. Past de balk niet (telefoon), dan scrolt hij zijwaarts met de huidige link in het midden.
     De donkere vorm van de huidige link is een eigen pil (kennis_tab-pill, zoals de tabs op de Home), als laatste kind: zo kan
     modules/overgang.js hem bij een paginaovergang naar de nieuwe link schuiven. Zonder GSAP doet de class het zelf. */
  each('[data-a-subnav]', function (nav) {
    var current = nav.querySelector('.w--current');
    if (current) nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
    withGsap(function (gsap) {
      var holder = document.createElement('div'), footer = container.querySelector('footer');
      // p: 0 op zijn plek in de hero, 1 onderaan het scherm. drop: 1 bij de footer, omlaag uit beeld.
      var move = { p: 0, drop: 0 }, floating = false, atFooter = false, dropped = false, fixed = false, dx = 0, dy = 0, start;
      var fixedStyle = { position: 'fixed', left: '0', right: '0', bottom: 'max(1rem, env(safe-area-inset-bottom))', zIndex: '50', width: 'fit-content', margin: '0 auto', maxWidth: 'calc(100% - 2 * var(--_layout---space--page-x))' };
      holder.setAttribute('aria-hidden', 'true');
      if (current) {
        var pill = document.createElement('div');
        pill.className = 'kennis_tab-pill';
        pill.setAttribute('aria-hidden', 'true');
        nav.appendChild(pill);
        undo(function () { pill.remove(); });
        [].forEach.call(nav.querySelectorAll('a'), function (link) { link.style.position = 'relative'; link.style.zIndex = '1'; });
        current.style.backgroundColor = 'transparent';
        var placePill = function () { gsap.set(pill, { x: current.offsetLeft, width: current.offsetWidth }); };
        placePill();
        listen(window, 'resize', placePill);
        a.loaded(placePill);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(placePill);
      }
      function time(t) { return reduce.matches ? 0 : t; }
      // Hover op de andere links: de vervaagde tekst wordt helemaal donker. Daarna neemt de class het weer over.
      var mouse = window.matchMedia('(hover: hover)');
      [].forEach.call(nav.querySelectorAll('a:not(.w--current)'), function (link) {
        var rest = getComputedStyle(link).opacity;
        listen(link, 'mouseenter', function () { if (mouse.matches) gsap.to(link, { opacity: 1, duration: time(0.25), ease: 'power2.out', overwrite: true }); });
        listen(link, 'mouseleave', function () { gsap.to(link, { opacity: rest, duration: time(0.25), ease: 'power2.out', overwrite: true, clearProps: 'opacity' }); });
      });
      function setFixed(on) {
        fixed = on;
        if (on) {
          start = nav.getBoundingClientRect();
          holder.style.width = start.width + 'px';
          holder.style.height = start.height + 'px';
          nav.parentNode.insertBefore(holder, nav);
          Object.assign(nav.style, fixedStyle);
        } else {
          Object.keys(fixedStyle).forEach(function (key) { nav.style[key] = ''; });
          gsap.set(nav, { clearProps: 'transform' });
          holder.parentNode.removeChild(holder);
          dx = dy = 0;
        }
      }
      // Omlaag vanaf waar hij stond, anders gaat hij eerst met de hero mee omhoog. Terug naar de echte plek, elk frame
      // opnieuw gemeten: de pagina scrolt dan nog door, dus die plek ligt tijdens de beweging niet vast.
      function render() {
        if (!fixed) return;
        var home = floating ? start : holder.getBoundingClientRect(), now = nav.getBoundingClientRect(), restX = now.left - dx, restY = now.top - dy;
        dx = (home.left - restX) * (1 - move.p);
        dy = (home.top - restY) * (1 - move.p) + nav.offsetHeight * 2 * move.drop;
        gsap.set(nav, { x: dx, y: dy });
      }
      function update() {
        var want = window.scrollY > 8;
        if (want !== floating) {
          floating = want;
          if (want && !fixed) setFixed(true);
          gsap.to(move, { p: want ? 1 : 0, duration: time(0.9), ease: 'power3.inOut', overwrite: 'auto', onUpdate: render, onComplete: function () { if (!want) setFixed(false); } });
        }
        var drop = floating && atFooter;
        if (drop !== dropped) {
          dropped = drop;
          gsap.to(move, { drop: drop ? 1 : 0, duration: time(0.45), ease: 'power3.out', overwrite: 'auto', onUpdate: render });
        }
        if (move.p < 1) render();
      }
      listen(window, 'scroll', update, { passive: true });
      if (footer) watch(new IntersectionObserver(function (entries) { atFooter = entries[0].isIntersecting; update(); })).observe(footer);
      update();
      undo(function () { if (fixed) setFixed(false); });
    });
  });

  /* data-a-page-hero (Section - Hero Kennis): bij het laden komen de eyebrow, de delen van de kop en de navigatie binnen met
     de blur-fade en timing van data-a-hero, en de gele randen van de vormen tekenen zich. Alleen het stuk van de rand dat in
     beeld is telt: de rest loopt ver buiten de hero. De navigatie vervaagt alleen, want data-a-subnav beweegt hem. */
  each('[data-a-page-hero]', function (hero) {
    if (reduce.matches) return;
    // data-a-kept: de balk bleef bij een paginaovergang staan en komt dus niet binnen
    var nav = hero.querySelector('[data-a-subnav]:not([data-a-kept])'), spans = [].slice.call(hero.querySelectorAll('h1 span'));
    var intro = [hero.querySelector('.tag')].concat(spans, [nav]).filter(Boolean);
    var box = hero.querySelector('.hero-kennis_background svg');
    var lines = box ? [].map.call(box.querySelectorAll('path'), function (path) {
      var total = path.getTotalLength(), m = path.getCTM(), size = box.getBoundingClientRect(), first = 1, last = 0;
      for (var i = 0; i <= 240; i++) {
        var p = path.getPointAtLength(total * i / 240), x = m.a * p.x + m.c * p.y + m.e, y = m.b * p.x + m.d * p.y + m.f;
        if (x >= 0 && x <= size.width && y >= 0 && y <= size.height) { first = Math.min(first, i / 240); last = Math.max(last, i / 240); }
      }
      // Twee meetstappen ruimte: de lijn start en eindigt zo buiten beeld, anders springt het laatste stuk erbij
      first = Math.max(0, first - 2 / 240);
      last = Math.min(1, last + 2 / 240);
      path.setAttribute('pathLength', '1');
      path.style.strokeDasharray = '1';
      path.style.strokeDashoffset = 1 - first;
      return { path: path, to: 1 - last };
    }) : [];
    function show() {
      intro.forEach(function (el) { el.style.opacity = ''; });
      lines.forEach(function (l) { l.path.style.strokeDasharray = ''; l.path.style.strokeDashoffset = ''; l.path.removeAttribute('pathLength'); });
    }
    intro.forEach(function (el) { el.style.opacity = '0'; });
    var fallback = wait(show, 3000);
    withGsap(function (gsap) {
      clearTimeout(fallback);
      intro.forEach(function (el) {
        if (spans.indexOf(el) > -1) gsap.set(el, withBlur({ position: 'relative', top: '1.5rem' }, 'blur(0.75rem)'));
        else if (el !== nav) gsap.set(el, withBlur({ y: '1.5rem' }, 'blur(0.75rem)'));
      });
      var started = false;
      function start() {
        if (started) return;
        started = true;
        intro.forEach(function (el, i) {
          var vars = { opacity: 1, duration: 1.1, ease: 'power3.out', delay: 0.1 + i * 0.09 };
          if (spans.indexOf(el) > -1) gsap.to(el, withBlur(Object.assign(vars, { top: 0, clearProps: 'opacity,filter,position,top' }), 'blur(0rem)'));
          else if (el === nav) gsap.to(el, Object.assign(vars, { clearProps: 'opacity' }));
          else gsap.to(el, withBlur(Object.assign(vars, { y: 0, clearProps: 'opacity,transform,filter' }), 'blur(0rem)'));
        });
        lines.forEach(function (l) {
          gsap.to(l.path, { strokeDashoffset: l.to, duration: 1.6, delay: 0.2, ease: 'power2.inOut', onComplete: function () { l.path.style.strokeDasharray = ''; l.path.style.strokeDashoffset = ''; l.path.removeAttribute('pathLength'); } });
        });
      }
      // Wachten op de fonts (hooguit 0,8 s), anders verspringen de regels halverwege
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
      wait(start, 800);
    });
  });

  return a.clean;
}
