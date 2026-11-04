/* Afix modules/waarden.js: data-a-value: kernwaarden aan de scroll en de paginakleur. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var reduce = a.reduce, clamp = a.clamp, listen = a.listen, raf = a.raf, withGsap = a.withGsap, withBlur = a.withBlur, undo = a.undo;

  /* data-a-value (Item - Kernwaarde) en de paginakleur: alles hangt aan de scroll, zoals het prototype. q = (schermhoogte
     min het midden van de rij) / (0,45 x schermhoogte). Het woord (kernwaarde_title) schuift om en om van rechts en links
     (Nuchter rechts, Direct links, Eigenwijs rechts) van net buiten het scherm naar het midden, de lijn (kernwaarde_rule)
     groeit vanaf dezelfde kant, 1,4 keer zo snel; de slotlijn na de lijst hoort bij de laatste rij. Boven q 0,72, zodra het
     woord op zijn plek staat, schuift de subtekst (kernwaarde_text) woord voor woord omhoog uit een masker, onder q 0,5 weer
     terug (het prototype wacht tot 0,92, de gebruiker koos voor sneller).
     Paginakleur: anders dan het prototype een timeline en niet aan de scroll (keuze van de gebruiker, zo kun je niet op een
     tussenkleur eindigen). Komt de bovenkant van Kernwaarden boven 55% van de schermhoogte, dan loopt de achtergrond van
     Cultuur en Kernwaarden in 0,8 seconde van licht naar donker; scrol je terug tot onder 65%, dan weer terug. Daarna blijft
     hij donker, ook achter de teamfoto. site.js mengt daarvoor de thema-variabelen: bij Cultuur kleuren tekst, lijnen en
     knop mee, de tekst van Kernwaarden blijft altijd wit. De eyebrow komt binnen als de hero-elementen, kort nadat de
     wissel start (wit op licht is onzichtbaar), en gaat bij het teruggaan weer weg. Werk krijgt alleen de achtergrond, voor hoge schermen. Reduced
     motion en zonder site.js: alles uit de class. */
  var values = [].slice.call(container.querySelectorAll('[data-a-value]'));
  if (values.length && !reduce.matches) withGsap(function (gsap) {
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function rgbOf(el, prop) { return (getComputedStyle(el)[prop].match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number); }
    function mix(a, b, t) { return a.map(function (v, k) { return Math.round(v + (b[k] - v) * t); }).join(', '); }
    var section = values[0].closest('section');
    var cultuur = section.previousElementSibling, werk = cultuur.previousElementSibling;
    var closing = values[0].parentElement.nextElementSibling, eyebrow = values[0].parentElement.previousElementSibling;
    var away = withBlur({ opacity: 0, y: '1.5rem' }, 'blur(0.75rem)');
    var light = rgbOf(cultuur, 'backgroundColor'), dark = rgbOf(section, 'backgroundColor'), ink = rgbOf(cultuur, 'color'), paper = rgbOf(section, 'color');
    var rows = values.map(function (item, i) {
      var dir = i % 2 ? -1 : 1, rules = [item.querySelector('.kernwaarde_rule')];
      var title = item.querySelector('.kernwaarde_title'), text = item.querySelector('.kernwaarde_text');
      if (i === values.length - 1 && closing && closing.matches('.kernwaarde_rule')) rules.push(closing);
      // Gewone tekst met spaties ertussen: de regels breken gelijk af en een schermlezer leest gewoon de zin
      var sentence = text.textContent, inner = [];
      text.textContent = '';
      undo(function () { text.textContent = sentence; });
      sentence.trim().split(/\s+/).forEach(function (w, k) {
        var mask = document.createElement('span'), word = document.createElement('span');
        // kernwaarde_text is getrimd (text-box-trim): het tekstkader is 0,72em, van hoofdletter tot basislijn. Stokken en
        // onderkanten vallen daarbuiten, dus het masker krijgt daar ruimte voor en de woorden starten 190% lager
        mask.style.cssText = 'display: inline-block; overflow: hidden; vertical-align: top; padding: 0.1em 0 0.5em; margin: -0.1em 0 -0.5em;';
        word.style.display = 'inline-block';
        word.textContent = w;
        mask.appendChild(word);
        if (k) text.appendChild(document.createTextNode(' '));
        text.appendChild(mask);
        inner.push(word);
      });
      gsap.set(rules, { transformOrigin: dir > 0 ? 'right center' : 'left center' });
      gsap.set(title, { willChange: 'transform' });
      gsap.set(inner, { yPercent: 190, visibility: 'hidden' });
      // De eerste rij start later dan in het prototype, pas als de achtergrond donker wordt: wit op licht is onzichtbaar
      return { el: item, dir: dir, rules: rules, title: title, inner: inner, shown: false, start: i ? 1 : 0.8 };
    });
    function show(r, on) {
      r.shown = on;
      // Verborgen woorden ook echt onzichtbaar: of een masker sluit hangt anders af van lettertype en scherm
      if (on) gsap.set(r.inner, { visibility: 'visible' });
      gsap.to(r.inner, { yPercent: on ? 0 : 190, duration: 0.5, stagger: 0.02, ease: 'power4.out', overwrite: true, onComplete: function () { if (!on) gsap.set(r.inner, { visibility: 'hidden' }); } });
    }
    var theme = { m: 0 }, isDark = null, ticking = false;
    function paint() {
      var m = theme.m, bg = 'rgb(' + mix(light, dark, m) + ')', fg = mix(ink, paper, m);
      gsap.set(cultuur, {
        '--_theme---surface--page': bg,
        '--_theme---text--primary': 'rgb(' + fg + ')',
        '--_theme---border--strong': 'rgba(' + fg + ', ' + (0.5 - 0.3 * m) + ')'
      });
      gsap.set(section, { '--_theme---surface--dark': bg });
      if (werk) gsap.set(werk, { backgroundColor: bg });
    }
    function update() {
      ticking = false;
      var H = window.innerHeight, W = document.documentElement.clientWidth;
      // Twee grenzen, zodat de kleur niet heen en weer springt als je precies op de grens stilstaat
      var top = section.getBoundingClientRect().top, wanted = top < H * (isDark ? 0.65 : 0.55);
      if (isDark === null) {
        theme.m = wanted ? 1 : 0;
        paint();
        if (eyebrow && !wanted) gsap.set(eyebrow, Object.assign({}, away));
      } else if (wanted !== isDark) {
        gsap.to(theme, { m: wanted ? 1 : 0, duration: 0.8, ease: 'power2.inOut', overwrite: true, onUpdate: paint });
        if (eyebrow && wanted) gsap.to(eyebrow, withBlur({ opacity: 1, y: 0, delay: 0.3, duration: 1.1, ease: 'power3.out', overwrite: true, clearProps: 'opacity,transform,filter' }, 'blur(0rem)'));
        else if (eyebrow) gsap.to(eyebrow, Object.assign({ duration: 0.3, ease: 'power2.out', overwrite: true }, away));
      }
      isDark = wanted;
      rows.forEach(function (r) {
        var box = r.el.getBoundingClientRect(), q = clamp((H * r.start - box.top - box.height / 2) / (H * 0.45), 0, 1);
        // Alleen zetten als de rij echt beweegt: buiten beeld staat q stil op 0 of 1
        if (q !== r.q) {
          r.q = q;
          gsap.set(r.title, { x: (W / 2 + r.title.offsetWidth / 2 + 24) * r.dir * (1 - easeOut(q)), force3D: true });
          gsap.set(r.rules, { scaleX: easeOut(clamp(q * 1.4, 0, 1)) });
        }
        if (!r.shown && q > 0.72) show(r, true);
        else if (r.shown && q < 0.5) show(r, false);
      });
    }
    listen(window, 'scroll', function () { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
    listen(window, 'resize', function () { rows.forEach(function (r) { r.q = null; }); update(); });
    update();
  });

  return a.clean;
}
