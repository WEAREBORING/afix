/* Afix modules/overgang.js: paginaovergangen met Barba en het Osmo-effect Cross Fade Page Transition (keuze van de gebruiker). Geladen door site.js op elke pagina met een page-wrapper.
   De oude pagina vervaagt in 0,5 seconde (power1.in), de nieuwe komt tegelijk op in 0,75 seconde (power1.inOut), zoals de resource
   van Osmo. Een h1 komt 0,3 seconde later omhoog binnen (25%, expo.out, 1 seconde), behalve als de pagina een eigen intro heeft
   (hero, kennis-hero, detail): dan brengt die de kop binnen, zodat hij niet twee keer komt. Reduced motion wisselt direct.
   Zonder Webflow-wijziging: body is de wrapper en page-wrapper de container, dus elke nieuwe pagina doet vanzelf mee. De nav blijft
   staan (site.js zet hem buiten de container, in body); de footer gaat mee, want die verschilt per pagina.
   Tijdens de overgang staat de nieuwe pagina vast bovenin. Daarom verbergt site.js eerst wat binnenkomt (site.load) en starten de
   modules pas als de oude pagina weg is (run), terwijl de nieuwe nog opkomt: dan kloppen de maten en de scrollpositie. Laadt Barba
   niet, of gaat er iets mis, dan laadt de link gewoon de pagina. */
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
    if (reduce.matches) return tl.set(current, { autoAlpha: 0 });
    tl.to(current, { autoAlpha: 0, ease: 'power1.in', duration: 0.5 }, 0);
    return tl;
  }
  function runPageEnterAnimation(next) {
    var tl = gsap.timeline();
    if (reduce.matches) tl.set(next, { autoAlpha: 1 });
    else {
      tl.add('startEnter', 0);
      tl.fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'power1.inOut', duration: 0.75, clearProps: 'opacity,visibility' }, 'startEnter');
      var title = next.querySelector('h1');
      if (title && !next.querySelector('[data-a-hero], [data-a-page-hero], [data-a-detail]')) {
        tl.fromTo(title, { yPercent: 25, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: 'expo.out', duration: 1, clearProps: 'transform,opacity,visibility' }, '< 0.3');
      }
    }
    tl.add('pageReady');
    return new Promise(function (resolve) { tl.call(resolve, null, 'pageReady'); });
  }

  // De oude pagina is weg: de nieuwe in de gewone stroom en op zijn scrollpositie, en nu pas de modules
  function land(data) {
    var next = data.next.container, lenis = site.lenis;
    gsap.set(next, { clearProps: 'position,top,left,right' });
    site.stop();
    stopForms();
    if (lenis) lenis.resize();
    site.jumpTo(0);
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
          return site.load(data.next.container).then(function (fn) { run = fn; });
        },
        // Bovenin, onder de nav; de oude pagina blijft staan waar hij staat, zodat sticky blijft kloppen
        beforeEnter: function (data) { gsap.set(data.next.container, { position: 'fixed', top: nav.offsetHeight, left: 0, right: 0 }); },
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
