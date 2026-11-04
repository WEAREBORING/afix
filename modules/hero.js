/* Afix modules/hero.js: data-a-hero: intro, vervagen en uitdagingen van de hero, en het woord "scherpe". Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, clamp = a.clamp, listen = a.listen, raf = a.raf, wait = a.wait, withGsap = a.withGsap, withBlur = a.withBlur, touchDevice = a.touchDevice, undo = a.undo;

  /* Het woord "scherpe" in de kop van de hero, zoals het prototype: het staat licht wazig en wordt letter voor letter scherp
     als de cursor dichterbij komt, en helemaal scherp zodra een uitdaging open staat. Alleen desktop met muis: zonder
     cursor zou het woord wazig blijven. Staat het woord er niet (meer) in, dan gebeurt er niets. */
  function sharpWord(gsap, h1, desktop, open) {
    var word = 'scherpe', node = null;
    if (!h1 || touchDevice.matches) return;
    var walk = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
    while (!node && walk.nextNode()) if (walk.currentNode.data.indexOf(word) > -1) node = walk.currentNode;
    if (!node) return;
    var rest = node.splitText(node.data.indexOf(word));
    rest.splitText(word.length);
    var el = document.createElement('span');
    el.setAttribute('aria-label', word);
    el.style.cssText = 'display: inline-block; white-space: nowrap;';
    var letters = word.split('').map(function (c) {
      var s = document.createElement('span');
      s.textContent = c;
      s.setAttribute('aria-hidden', 'true');
      s.style.cssText = 'display: inline-block; will-change: filter;';
      el.appendChild(s);
      return { el: s, cur: 1 };
    });
    rest.parentNode.replaceChild(el, rest);
    undo(function () { el.parentNode.replaceChild(rest, el); h1.normalize(); });
    var radius = 260, maxBlur = 6.5, ease = reduce.matches ? 1 : 0.14, ptr = { x: 0, y: 0, active: false }, busy = true, held = false;
    function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    function move(e) { ptr.x = e.clientX; ptr.y = e.clientY; ptr.active = true; busy = true; }
    listen(window, 'pointermove', move, { passive: true });
    listen(window, 'pointerdown', move, { passive: true });
    listen(document.documentElement, 'pointerleave', function () { ptr.active = false; busy = true; });
    function tick() {
      var focus = open() || !desktop.matches;
      if (focus !== held) { held = focus; busy = true; }
      if (!busy) return;
      var max = maxBlur * parseFloat(getComputedStyle(el).fontSize) / 80, moving = false;
      letters.forEach(function (L) {
        var t = 1;
        if (focus) t = 0;
        else if (ptr.active) {
          var r = L.el.getBoundingClientRect();
          t = smooth(radius * 0.22, radius, Math.hypot(ptr.x - (r.left + r.width / 2), ptr.y - (r.top + r.height / 2)));
        }
        L.cur += (t - L.cur) * ease;
        if (Math.abs(L.cur - t) < 0.002) L.cur = t; else moving = true;
        gsap.set(L.el, { filter: L.cur < 0.01 ? 'none' : 'blur(' + (L.cur * max).toFixed(2) + 'px)', opacity: 1 - L.cur * 0.15 });
      });
      // Stil: niets te doen tot de muis weer beweegt
      busy = moving;
    }
    gsap.ticker.add(tick);
    undo(function () { gsap.ticker.remove(tick); });
  }

  /* data-a-hero (Section - Hero Home): bij het laden komen de eyebrow, de kopregels (de spans in de h1), de awards en de
     balk met uitdagingen na elkaar binnen, uit een waas (blur, fade en iets omhoog). Bij wegscrollen vervaagt
     hero-home_component, traag beginnend en zacht uitlopend, en is weg als de kop van de volgende sectie op de helft van
     het scherm staat, samen met de achtergrondvorm
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
    var fallback = wait(function () { hidden = false; intro.forEach(function (el) { el.style.opacity = ''; }); }, 3000);
    withGsap(function (gsap) {
      clearTimeout(fallback);
      function rem(n) { return n * parseFloat(getComputedStyle(document.documentElement).fontSize); }
      // De kopregels zijn inline spans: die schuiven met top (relatief), want een transform werkt daar niet en
      // inline-block breekt de regels anders af. De balk zelf vervaagt alleen in: een transform of filter op de balk maakt
      // hem het houvast van de foto's (absoluut), die dan bij een vroege hover op de balk staan. De kaartlinks in de balk
      // bewegen wel mee, kort na elkaar.
      var links = bar ? [].slice.call(bar.querySelectorAll('.hero-card_link')) : [];
      function from(el) {
        if (lines.indexOf(el) > -1) return withBlur({ opacity: 0, position: 'relative', top: rem(1.5) }, 'blur(0.75rem)');
        return el === bar ? { opacity: 0 } : withBlur({ opacity: 0, y: rem(1.5) }, 'blur(0.75rem)');
      }
      function to(el, delay) {
        var v = lines.indexOf(el) > -1 ? withBlur({ top: 0, clearProps: 'opacity,filter,position,top' }, 'blur(0rem)') : el === bar ? { clearProps: 'opacity' } : withBlur({ y: 0, clearProps: 'opacity,transform,filter' }, 'blur(0rem)');
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
        wait(start, 800);
      }

      // Vervagen bij wegscrollen: de inhoud en de achtergrondvorm, ook het deel dat doorloopt in de volgende sectie
      // (expertises_background), want dat is dezelfde vorm
      var fading = [comp].concat([].slice.call(container.querySelectorAll('.hero-home_background, .expertises_background')));
      var top0 =Math.min(hero.getBoundingClientRect().top + window.scrollY, window.innerHeight), ticking = false, faded = -1;
      if (!reduce.matches) gsap.set(fading, { willChange: 'opacity' });
      var head = hero.nextElementSibling && hero.nextElementSibling.querySelector('h1, h2, h3');
      function fade() {
        ticking = false;
        if (reduce.matches) return gsap.set(fading, { clearProps: 'opacity' });
        // Klaar na 70% van de herohoogte, en traag beginnend: de eerste meters blijft hij bijna staan
        // Afgelegd / (afgelegd + wat de kop nog moet tot de helft van het scherm)
        var done = top0 - hero.getBoundingClientRect().top, r = head && head.getBoundingClientRect();
        var left = r ? r.top + r.height / 2 - window.innerHeight / 2 : 0.7 * hero.offsetHeight - done;
        var p = left > 0 ? clamp(done / (done + left), 0, 1) : 1, o = +(1 - p * p * (3 - 2 * p)).toFixed(3);
        if (o === faded) return;
        faded = o;
        gsap.set(fading, { opacity: o });
      }
      listen(window, 'scroll', function () { if (!ticking) { ticking = true; raf(fade); } }, { passive: true });
      fade();

      // Uitdagingen
      var strip = hero.querySelector('.hero-home_cards');
      var cards = [].slice.call(hero.querySelectorAll('[data-a-challenge]'));
      if (!strip || !cards.length) return;
      var desktop = window.matchMedia('(hover: hover) and (min-width: 992px)');
      var active = null;
      sharpWord(gsap, h1, desktop, function () { return active; });
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
        if (!img) return;
        var done = clear(img, 'opacity,transform,zIndex');
        // Nog onzichtbaar: dan kan zijn start (rechts 0,06 s later) nog klaarstaan, en die mag niet alsnog afspelen
        if (gsap.getProperty(img, 'opacity') === 0) { gsap.killTweensOf(img); return done(); }
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
      listen(strip, 'pointermove', function (e) {
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
          if (p.num) gsap.to(p.num, { opacity: on ? 0 : dim ? 0.44 : 1, duration: 0.25 * t, ease: 'power2.out', overwrite: true, onComplete: card ? null : clear(p.num, 'opacity') });
          if (p.title && p.num) {
            // De titel schuift naar de plek van het nummer (bovenaan de kaart)
            var dy = on ? p.num.getBoundingClientRect().top - p.title.getBoundingClientRect().top + gsap.getProperty(p.title, 'y') : 0;
            gsap.to(p.title, { y: dy, opacity: dim ? 0.34 : 1, duration: 0.5 * t, ease: 'power3.out', overwrite: 'auto', onComplete: card ? null : clear(p.title, 'transform,opacity') });
          }
          if (p.detail) {
            if (on) {
              gsap.set(p.detail, { display: 'flex', position: 'absolute', left: rem(1.5), width: widths[k], bottom: rem(1.5) });
              // overwrite true, ook bij weggaan: 'auto' laat een uitgestelde tween staan, en dan blijft de tekst hangen na een snelle hover
              gsap.fromTo(p.detail, { opacity: 0, y: rem(0.5) * t }, { opacity: 1, y: 0, duration: 0.4 * t, delay: 0.15 * t, ease: 'power3.out', overwrite: true });
            } else if (p.detail.style.display) {
              gsap.to(p.detail, { opacity: 0, duration: 0.2 * t, ease: 'power2.out', overwrite: true, onComplete: function () { gsap.set(p.detail, { clearProps: 'all' }); } });
            }
          }
          // Na de tekst-tween: die stopt met overwrite true alles wat er dan al op de tekst loopt, dus ook de kleur
          p.inks.forEach(function (el, k) { gsap.to(el, { color: on ? contrast : p.rest.ink[k], duration: 0.35 * t, ease: 'power2.out', overwrite: 'auto', onComplete: card ? null : clear(el, 'color') }); });
        });
      }
      parts.forEach(function (p) {
        listen(p.card, 'pointerenter', function (e) { if (e.pointerType === 'mouse' && desktop.matches) set(p.card); });
        listen(p.card, 'focusin', function (e) { if (desktop.matches && e.target.matches(':focus-visible')) set(p.card); });
      });
      listen(strip, 'pointerleave', function () { set(null); });
      listen(strip, 'focusout', function (e) { if (!strip.contains(e.relatedTarget)) set(null); });
      listen(desktop, 'change', function () { set(null); });
    });
  });

  return a.clean;
}
