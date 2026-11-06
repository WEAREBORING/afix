/* Afix modules/teamlijst.js: data-a-team-filter, data-a-lid en data-a-team-blok: filter en hover op /team, lege blokken op een teamlid. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, listen = a.listen, raf = a.raf, withGsap = a.withGsap, undo = a.undo;
  function time(t) { return reduce.matches ? 0 : t; }

  /* data-a-team-filter (Section - Hero Team): de balk filtert de kaarten in data-a-team-list. Hij drijft via data-a-subnav
     (kennis-hero.js), die module moet na deze starten: de pil komt op de link met w--current. Elke link heeft data-a-team-groep
     met de naam van de groep ("alle" voor iedereen), elke kaart de groepen uit de CMS als data-a-team-groep en -groep-2.
     De links hebben hreflang, anders zet webflow.js zelf w--current op een link naar een anker. */
  each('[data-a-team-filter]', function (nav) {
    var list = container.querySelector('[data-a-team-list]');
    if (!list) return;
    var items = [].slice.call(list.children), links = [].slice.call(nav.querySelectorAll('a'));
    var at = 0, gsap = null, mouse = window.matchMedia('(hover: hover)');
    function look(el) { var cs = getComputedStyle(el); return { color: cs.color, opacity: cs.opacity }; }
    // Zoals de tabs (tabs.js): kleur en dekking staan inline, anders springen ze om met de class en lopen ze niet met de pil mee
    var off = look(links[1]);
    links[0].classList.add('w--current');
    var on = look(links[0]);
    links.forEach(function (link, i) { link.style.backgroundColor = 'transparent'; Object.assign(link.style, i ? off : on); });
    undo(function () { links[at].classList.remove('w--current'); links.forEach(function (link) { link.style.backgroundColor = link.style.color = link.style.opacity = ''; }); });
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
    function apply(group) {
      var fresh = [];
      items.forEach(function (item) {
        var show = group === 'alle' || item.getAttribute('data-a-team-groep') === group || item.getAttribute('data-a-team-groep-2') === group;
        if (show && item.style.display === 'none') fresh.push(item);
        item.style.display = show ? '' : 'none';
      });
      if (gsap && fresh.length && !reduce.matches) gsap.fromTo(fresh, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out', clearProps: 'opacity,transform' });
    }
    links.forEach(function (link, i) {
      listen(link, 'click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        select(i);
        apply(link.getAttribute('data-a-team-groep'));
      });
    });
    undo(function () { items.forEach(function (item) { item.style.display = ''; }); });
    withGsap(function (g) { gsap = g; });
    // Na kennis-hero.js, die de hover alleen op de links zonder w--current bij de start zet en geen wissel kent: dit wint
    raf(function () {
      links.forEach(function (link, i) {
        listen(link, 'mouseenter', function () { if (gsap && mouse.matches && i !== at) gsap.to(link, { opacity: 1, duration: time(0.25), ease: 'power2.out', overwrite: true }); });
        listen(link, 'mouseleave', function () { if (gsap) gsap.to(link, Object.assign({ duration: time(0.25), ease: 'power2.out', overwrite: true }, i === at ? on : off)); });
      });
    });
    // Na kennis-hero.js, die de pil bij deze momenten terugzet op de eerste link
    listen(window, 'resize', function () { raf(function () { place(0); }); });
    a.loaded(function () { raf(function () { place(0); }); });
  });

  /* data-a-lid (Item - Teamlid): hover op een teamkaart, alleen desktop met muis, en bij toetsenbordfocus op de kaartlink
     (Figma 1030:5914). Het vak wordt signaalgeel (surface/accent), waardoor de donkere lijn erin zichtbaar wordt, en de pijlknop
     komt in beeld. Foto hover en Titel hover uit de CMS vervangen de foto en de functie; zijn ze leeg, dan blijven die staan
     en zoomt de foto iets in. Na het teruggaan neemt de class het weer over.
     Bij de fotowissel gaat de bovenste foto pas weg als de onderste er staat: faden beide tegelijk, dan schijnt het vak door het portret. */
  var leden = container.querySelectorAll('[data-a-lid]');
  if (leden.length) withGsap(function (gsap) {
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
    // Een leeg CMS-veld laat een element zonder src of tekst achter, met de class w-dyn-bind-empty
    function filled(el) { return !!el && !el.classList.contains('w-dyn-bind-empty') && !!(el.getAttribute('src') || el.textContent.trim()); }
    [].forEach.call(leden, function (card) {
      var vlak = card.querySelector('.team-card_vlak'), foto = card.querySelector('.team-card_foto'), fotoHover = card.querySelector('.team-card_foto-hover');
      var rol = card.querySelector('.team-card_rol'), titel = card.querySelector('.team-card_titel-hover'), pijl = card.querySelector('.team-card_pijl');
      if (!vlak || !foto) return;
      var nieuweFoto = filled(fotoHover), nieuweTitel = filled(titel), on = false, rest;
      function show() {
        if (on) return;
        on = true;
        var t = time(1);
        rest = rest || getComputedStyle(vlak).backgroundColor;
        gsap.to(vlak, { backgroundColor: colorOf(vlak, '--_theme---surface--accent'), duration: 0.3 * t, ease: 'power2.out', overwrite: 'auto' });
        if (nieuweFoto) {
          gsap.to(fotoHover, { opacity: 1, duration: 0.4 * t, ease: 'sine.inOut', overwrite: true });
          gsap.to(foto, { opacity: 0, duration: 0.2 * t, delay: 0.3 * t, ease: 'none', overwrite: true });
        } else if (t) gsap.to(foto, { scale: 1.03, transformOrigin: '50% 0%', duration: 0.8, ease: 'expo.out', overwrite: true }); // Vanaf de bovenkant: .team-card_media knipt af en boven het hoofd is maar een paar pixels lucht
        if (nieuweTitel) {
          gsap.to(rol, { opacity: 0, duration: 0.2 * t, ease: 'power2.out', overwrite: true });
          gsap.hoverIn(titel, { y: rem(0.25) * t }, { opacity: 1, y: 0, duration: 0.35 * t, delay: 0.06 * t, ease: 'power2.out', overwrite: true });
        }
        if (pijl) gsap.hoverIn(pijl, { x: -rem(0.5) * t }, { opacity: 1, x: 0, duration: 0.4 * t, delay: 0.06 * t, ease: 'power2.out', overwrite: true });
      }
      function hide() {
        if (!on) return;
        on = false;
        var t = time(1);
        function clear(el, props) { return function () { gsap.set(el, { clearProps: props }); }; }
        gsap.hoverOut(vlak, { backgroundColor: rest, overwrite: 'auto' }, 'backgroundColor');
        if (nieuweFoto) {
          gsap.to(foto, { opacity: 1, duration: 0.15 * t, ease: 'none', overwrite: true, onComplete: clear(foto, 'opacity') });
          gsap.to(fotoHover, { opacity: 0, duration: 0.35 * t, delay: 0.1 * t, ease: 'sine.inOut', overwrite: true, onComplete: clear(fotoHover, 'opacity') });
        } else gsap.hoverOut(foto, { scale: 1, duration: 0.6 }, 'transform,transformOrigin');
        if (nieuweTitel) {
          // Ze staan op dezelfde plek: eerst de titel weg, dan pas de functie terug
          gsap.hoverOut(titel, { opacity: 0, y: rem(0.25), duration: 0.25 }, 'opacity,transform');
          gsap.hoverOut(rol, { opacity: 1, duration: 0.3, delay: 0.15 }, 'opacity');
        }
        if (pijl) gsap.hoverOut(pijl, { opacity: 0, x: -rem(0.5) }, 'opacity,transform');
      }
      listen(card, 'mouseenter', function () { if (desktop.matches) show(); });
      listen(card, 'mouseleave', hide);
      listen(card, 'focusin', function (e) { if (e.target.matches(':focus-visible')) show(); });
      listen(card, 'focusout', hide);
    });
  });

  /* data-a-team-blok (Team-template): Resources en Partnerships verdwijnen als hun lijst geen items heeft. */
  each('[data-a-team-blok]', function (blok) {
    if (blok.querySelector('.w-dyn-item')) return;
    blok.style.display = 'none';
    undo(function () { blok.style.display = ''; });
  });

  return a.clean;
}
