/* Afix modules/overgang.js: paginaovergangen met Barba en het Osmo-effect Cross Fade Page Transition (keuze van de gebruiker). Geladen door site.js op elke pagina met een page-wrapper.
   De nieuwe pagina komt in 0,6 seconde (power1.inOut) boven op de oude op, en de oude blijft dekkend staan tot hij bedekt is. Zo is
   er geen moment dat de lichte body door twee halfdoorzichtige pagina's schijnt, wat de resource van Osmo wel geeft (28% op een
   donkere hero). Een h1 komt 0,3 seconde later omhoog binnen (25%, expo.out, 1 seconde), behalve als de pagina een eigen intro heeft
   (hero, kennis-hero, detail): dan brengt die de kop binnen, zodat hij niet twee keer komt. Reduced motion wisselt direct.
   Zonder Webflow-wijziging: body is de wrapper en page-wrapper de container, dus elke nieuwe pagina doet vanzelf mee. De nav blijft
   staan (site.js zet hem buiten de container, in body); de footer gaat mee, want die verschilt per pagina.
   Gaat de overgang van een pagina met de kennisnavigatie naar een andere, dan blijft die balk staan en schuift de pil naar de nieuwe
   link, met de beweging van de tabs op de Home (keepSubnav).
   De gele randen in de hero lopen dan uit: de staart rijdt door naar het einde, en daarna tekent de nieuwe pagina zijn randen in
   (keepLines). Bij elke overgang naar een kennispagina blijven de randen verborgen tot de intro ze tekent, anders staan ze er
   tijdens het opkomen al helemaal en verspringen ze.
   Tijdens de overgang staat de nieuwe pagina vast bovenin. Daarom verbergt site.js eerst wat binnenkomt (site.load) en starten de
   modules pas als de oude pagina weg is (run): dan kloppen de maten en de scrollpositie. Laadt Barba
   niet, of gaat er iets mis, dan laadt de link gewoon de pagina. */
var FADE = 0.6;
var BARBA = 'https://cdn.jsdelivr.net/npm/@barba/core@2.10.3/dist/barba.umd.min.js';
var TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

function script(src, present) {
  return new Promise(function (done, fail) {
    if (present()) return done();
    var s = document.createElement('script');
    s.src = src;
    s.onload = done;
    s.onerror = fail;
    document.head.appendChild(s);
  });
}

// Wat buiten de container per pagina verschilt, uit de nieuwe html
function syncDocument(doc) {
  var old = 'meta[name="description"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], script[type="application/ld+json"]';
  [].forEach.call(document.head.querySelectorAll(old), function (el) { el.remove(); });
  [].forEach.call(doc.head.querySelectorAll(old), function (el) { document.head.appendChild(document.adoptNode(el)); });
  document.title = doc.title;
  document.body.className = doc.body.className;
  ['lang', 'data-wf-page', 'data-wf-item-slug', 'data-wf-collection'].forEach(function (name) {
    var value = doc.documentElement.getAttribute(name);
    if (value === null) document.documentElement.removeAttribute(name); else document.documentElement.setAttribute(name, value);
  });
}

// De nav blijft staan: de huidige link komt uit de kopie in de nieuwe pagina, die daarna weg kan
function syncNav(nav, next) {
  var copy = next.querySelector('[data-a-nav]'), links = nav.querySelectorAll('a');
  if (!copy) return;
  [].forEach.call(copy.querySelectorAll('a'), function (link, i) {
    if (!links[i]) return;
    links[i].className = link.className;
    if (link.hasAttribute('aria-current')) links[i].setAttribute('aria-current', link.getAttribute('aria-current')); else links[i].removeAttribute('aria-current');
  });
  copy.remove();
}

/* Formulieren. webflow.js leest de Turnstile-sleutel een keer bij het laden, dus een formulier dat met een overgang binnenkomt
   krijgt van Webflow geen widget (en op een pagina waar al een formulier stond blijft de knop uit). Daarom: Webflow slaat
   Turnstile over (data-wf-no-turnstile) en bouwt alleen het formulier, en wij zetten de widget zelf in het formulier. Hij
   schrijft zijn token in een verborgen veld en webflow.js stuurt dat mee. */
var widgets = [];
function startForms(root) {
  var forms = [].slice.call(root.querySelectorAll('.w-form form'));
  if (!forms.length || !window.Webflow) return;
  var guarded = forms.filter(function (form) { return form.hasAttribute('data-turnstile-sitekey'); });
  guarded.forEach(function (form) { form.setAttribute('data-wf-no-turnstile', 'true'); });
  window.Webflow.require('forms').ready();
  guarded.forEach(function (form) {
    var button = form.querySelector('[type="submit"]'), box = document.createElement('div');
    button.disabled = true;
    form.appendChild(box);
    script(TURNSTILE, function () { return window.turnstile; }).then(function () {
      if (!form.isConnected) return;
      widgets.push(window.turnstile.render(box, {
        sitekey: form.getAttribute('data-turnstile-sitekey'),
        callback: function (token) { window.jQuery.data(form, '.w-form').turnstileToken = token; button.disabled = false; }
      }));
    });
  });
}
function stopForms() {
  widgets.forEach(function (id) { window.turnstile.remove(id); });
  widgets = [];
}

export function init(site) {
  var nav = document.querySelector('[data-a-nav]'), wrapper = document.querySelector('.page-wrapper'), reduce = site.reduce, gsap = null;
  var scrolls = {}, run = null;

  function runPageLeaveAnimation(data) {
    var current = data.current.container;
    var tl = gsap.timeline({ onComplete: function () { current.remove(); land(data); } });
    return tl.set(current, { autoAlpha: 0 }, reduce.matches ? 0 : FADE);
  }
  function runPageEnterAnimation(next) {
    var tl = gsap.timeline();
    if (reduce.matches) tl.set(next, { autoAlpha: 1 });
    else {
      tl.add('startEnter', 0);
      tl.fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'power1.inOut', duration: FADE, clearProps: 'opacity,visibility' }, 'startEnter');
      var title = next.querySelector('h1');
      if (title && !next.querySelector('[data-a-hero], [data-a-page-hero], [data-a-detail]')) {
        tl.fromTo(title, { yPercent: 25, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: 'expo.out', duration: 1, clearProps: 'transform,opacity,visibility' }, '< 0.3');
      }
    }
    tl.add('pageReady');
    return new Promise(function (resolve) { tl.call(resolve, null, 'pageReady'); });
  }

  /* De kennisnavigatie staat op beide pagina's: een kopie van de balk blijft boven de pagina's staan en de echte balken zijn
     onzichtbaar. De pil schuift naar de nieuwe link en de balk naar zijn plek in de nieuwe pagina (zweefde hij onderin, dan
     komt hij mee omhoog); daarna neemt de echte balk het over. */
  function keepSubnav(old, fresh) {
    var from = old.getBoundingClientRect(), to = fresh.getBoundingClientRect(), left = old.scrollLeft;
    var ghost = old.cloneNode(true), links = [].slice.call(ghost.querySelectorAll('a')), pill = ghost.querySelector('.kennis_tab-pill');
    var target = links[[].indexOf.call(fresh.querySelectorAll('a'), fresh.querySelector('.w--current'))];
    if (!pill || !target) return fresh.removeAttribute('data-a-kept');
    // De rustkleur van de andere links: de laagste dekking, want de link waarop je klikt staat nog in hover
    var on = getComputedStyle(old.querySelector('.w--current')), rest = [].map.call(old.querySelectorAll('a:not(.w--current)'), function (link) { return getComputedStyle(link); });
    var ink = { on: { color: on.color, opacity: on.opacity }, off: { color: rest[0].color, opacity: Math.min.apply(null, rest.map(function (cs) { return +cs.opacity; })) } };
    ghost.removeAttribute('data-a-subnav');
    ghost.style.cssText = 'position: fixed; left: ' + from.left + 'px; top: ' + from.top + 'px; width: ' + from.width + 'px; margin: 0; max-width: none; z-index: 50;';
    old.style.visibility = fresh.style.visibility = 'hidden';
    document.body.appendChild(ghost);
    ghost.scrollLeft = left;
    gsap.to(pill, { x: target.offsetLeft, width: target.offsetWidth, duration: 0.45, ease: 'power3.out' });
    links.forEach(function (link) { gsap.to(link, Object.assign({ duration: 0.3, ease: 'power2.out' }, link === target ? ink.on : ink.off)); });
    gsap.to(ghost, { scrollLeft: target.offsetLeft - (to.width - target.offsetWidth) / 2, duration: 0.45, ease: 'power3.out' });
    gsap.to(ghost, {
      x: to.left - from.left, y: to.top - from.top, width: to.width, duration: 0.75, ease: 'power3.inOut',
      onComplete: function () { fresh.style.visibility = ''; fresh.removeAttribute('data-a-kept'); ghost.remove(); }
    });
  }

  /* Een kopie van de randen staat boven de pagina's, zonder vulling, en de staart rijdt naar het einde van het stuk dat
     in beeld is. Was de lijn nog aan het tekenen, dan rijdt zijn kop ook door tot het einde. */
  function keepLines(current) {
    var box = current.querySelector('.hero-kennis_background'), rect = box && box.getBoundingClientRect();
    if (!rect || rect.bottom <= 0) return;
    var ghost = box.cloneNode(true), copies = ghost.querySelectorAll('path');
    ghost.style.cssText = 'position: fixed; left: ' + rect.left + 'px; top: ' + rect.top + 'px; width: ' + rect.width + 'px; height: ' + rect.height + 'px; z-index: 49; pointer-events: none;';
    [].forEach.call(box.querySelectorAll('path'), function (path, i) {
      var copy = copies[i], range = path._range || [0, 1], line = { tail: range[0], head: path.hasAttribute('pathLength') ? 1 - parseFloat(path.style.strokeDashoffset) : range[1] };
      function draw() { copy.style.strokeDasharray = '0 ' + line.tail + ' ' + (line.head - line.tail) + ' 2'; }
      path.style.stroke = 'none';
      copy.style.fill = 'none';
      copy.style.strokeDashoffset = '0';
      copy.setAttribute('pathLength', '1');
      draw();
      gsap.to(line, { tail: range[1], head: range[1], duration: 0.8, ease: 'power2.inOut', onUpdate: draw, onComplete: function () { ghost.remove(); } });
    });
    document.body.appendChild(ghost);
  }
  function setLines(root, stroke) {
    if (!reduce.matches) [].forEach.call(root.querySelectorAll('.hero-kennis_background path'), function (path) { path.style.stroke = stroke; });
  }

  // De oude pagina is weg: de nieuwe in de gewone stroom en op zijn scrollpositie, en nu pas de modules
  function land(data) {
    var next = data.next.container, lenis = site.lenis;
    gsap.set(next, { clearProps: 'position,top,left,width,zIndex,backgroundColor' });
    site.stop();
    stopForms();
    if (lenis) lenis.resize();
    site.jumpTo(0);
    setLines(next, '');
    run();
    startForms(next);
    if (lenis) lenis.resize();
    // Barba haalt de pagina op zonder anker en verliest het; het staat nog op de aangeklikte link
    var hash = data.trigger.hash, anchor = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
    var back = data.trigger === 'back' || data.trigger === 'forward';
    if (hash) history.replaceState(history.state, '', hash);
    if (anchor) site.jumpTo(anchor.getBoundingClientRect().top - (parseFloat(document.documentElement.style.scrollPaddingTop) || 0));
    else if (back && scrolls[data.next.url.href.split('#')[0]]) site.jumpTo(scrolls[data.next.url.href.split('#')[0]]);
    if (lenis) lenis.start();
    // Schermlezers en toetsenbord beginnen op de nieuwe pagina; de focus stond op een link die weg is
    var title = next.querySelector('h1');
    if (title) { title.setAttribute('tabindex', '-1'); title.classList.add('wf-force-outline-none'); title.focus({ preventScroll: true }); }
    // Het load-event komt niet meer: geef de modules een seintje als de foto's in beeld er zijn, dan meten ze opnieuw
    var images = [].filter.call(next.querySelectorAll('img'), function (img) { return !img.complete && img.getBoundingClientRect().top < window.innerHeight; });
    Promise.race([
      Promise.all(images.map(function (img) { return new Promise(function (done) { img.addEventListener('load', done); img.addEventListener('error', done); }); })),
      new Promise(function (done) { setTimeout(done, 2000); })
    ]).then(function () { window.dispatchEvent(new Event('afix:load')); });
  }

  function start() {
    var barba = window.barba;
    document.body.setAttribute('data-barba', 'wrapper');
    barba.dom.getContainer = function (scope) { return (scope || document).querySelector('.page-wrapper'); };
    // Barba telt een overgang pas als lopend als de pagina is opgehaald; een tweede klik op traag netwerk zou er een tweede starten
    var page = barba.page;
    barba.page = function () { barba.transitions.isRunning = true; return page.apply(barba, arguments); };
    // De nav staat buiten de container en boven de pagina's
    document.body.insertBefore(nav, wrapper);
    // Terug en vooruit zetten we zelf de scrollpositie; bij herladen en buiten de site doet de browser het weer
    history.scrollRestoration = 'manual';
    window.addEventListener('pagehide', function () { history.scrollRestoration = 'auto'; });
    window.addEventListener('pageshow', function () { history.scrollRestoration = 'manual'; });

    barba.init({
      timeout: 7000,
      preventRunning: true,
      transitions: [{
        name: 'default',
        sync: true,
        before: function (data) {
          scrolls[data.current.url.href.split('#')[0]] = window.scrollY;
          syncDocument(barba.dom.toDocument(data.next.html));
          syncNav(nav, data.next.container);
          site.resetNav();
          if (site.lenis) site.lenis.stop();
          // Niet bij direct wisselen, en niet als de nieuwe pagina op een eigen scrollpositie begint: dan zweeft de balk daar al
          var back = data.trigger === 'back' || data.trigger === 'forward', fresh = data.next.container.querySelector('[data-a-subnav]');
          if (fresh && data.current.container.querySelector('[data-a-subnav]') && !reduce.matches && !data.trigger.hash && !(back && scrolls[data.next.url.href.split('#')[0]] > 8)) fresh.setAttribute('data-a-kept', 'true');
          setLines(data.next.container, 'none');
          return site.load(data.next.container).then(function (fn) { run = fn; });
        },
        // Bovenin, onder de nav; de oude pagina blijft staan waar hij staat, zodat sticky blijft kloppen
        beforeEnter: function (data) {
          // Even breed als in de gewone stroom: met een zichtbare scrollbalk zou de pagina anders verspringen bij het landen
          // Boven alles van de oude pagina, en met een eigen vlak: page-wrapper is doorzichtig, dan zou de oude pagina erdoor te zien zijn
          // Terug en vooruit landen op de bewaarde scrollpositie: begin daar al, anders springt de pagina aan het eind
          var next = data.next.container, back = data.trigger === 'back' || data.trigger === 'forward', from = back && scrolls[data.next.url.href.split('#')[0]] || 0;
          var vars = { position: 'fixed', top: nav.getBoundingClientRect().height - from, left: 0, width: document.documentElement.clientWidth, zIndex: 40 };
          if (getComputedStyle(next).backgroundColor === 'rgba(0, 0, 0, 0)') vars.backgroundColor = getComputedStyle(document.body).backgroundColor;
          gsap.set(next, vars);
          var fresh = data.next.container.querySelector('[data-a-kept]');
          if (fresh) { keepSubnav(data.current.container.querySelector('[data-a-subnav]'), fresh); keepLines(data.current.container); }
        },
        leave: function (data) { return runPageLeaveAnimation(data); },
        enter: function (data) { return runPageEnterAnimation(data.next.container); }
      }]
    });
    // Barba zet dit op de wrapper; een schermlezer zou dan de hele pagina voorlezen
    document.body.removeAttribute('aria-live');
  }

  site.withGsap(function (g) {
    gsap = g;
    script(BARBA, function () { return window.barba; }).then(start).catch(function (e) {
      console.error('Afix: overgangen niet gestart', e);
    });
  });
}
