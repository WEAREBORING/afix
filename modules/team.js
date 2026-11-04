/* Afix modules/team.js: data-a-team: teamfoto groeit naar schermvullend. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, clamp = a.clamp, listen = a.listen, raf = a.raf, withGsap = a.withGsap;

  /* data-a-team (kernwaarden_team): de teamfoto groeit met de scroll, zoals het prototype. kernwaarden_team wordt een
     schermvullend vlak en de foto staat daarin absoluut; hij begint 40% van de schermbreedte (maximaal 620px, minstens 340px
     of de schermbreedte min 32px) met verhouding 0,62 en groeit naar het hele vlak terwijl de bovenkant van dat vlak van de
     onderrand naar de bovenrand van het scherm gaat, dus de bovenhoeken landen in de hoeken van het scherm. Daarna staat de
     foto vast en schuift de volgende sectie (Reviews) er met ronde bovenhoeken (radius/l) en een zachte schaduw overheen,
     zoals Werk over Expertises (keuze van de gebruiker, niet in het prototype); de foto vervaagt daarbij naar de donkere
     achtergrond van de sectie. site.js zet daarvoor kernwaarden_team
     sticky en schaalt het met een transform, maakt de wrapper een schermhoogte hoger en geeft Reviews een negatieve marge. Parallax (niet in het prototype): de foto is 15% hoger dan het zichtbare vlak en
     schuift daarin omhoog, van het moment dat hij binnenkomt tot hij weg is. Reduced motion en zonder site.js: de foto uit de class. */
  each('[data-a-team]', function (team) {
    var img = team.querySelector('img');
    if (!img || reduce.matches) return;
    withGsap(function (gsap) {
      var pad = team.closest('.padding-section'), touch = window.matchMedia('(hover: none)');
      var comp = team.parentElement, next = team.closest('section').nextElementSibling;
      var W, H, sw, sh, ew, eh, fx, k, nat, corner = -1, ticking = false;
      function update() {
        ticking = false;
        // Waar het vlak zou staan zonder vastzetten: de wrapper eindigt twee schermhoogtes onder die plek
        var top = comp.getBoundingClientRect().bottom - 2 * H, g = clamp((H - top) / H, 0, 1);
        if (top > H * 1.2 || top < -H * 1.2) return;
        var w = sw + (W - sw) * g, h = sh + (H - sh) * g, extra = h * 0.15, o = extra * clamp((H - top) / (2 * H), 0, 1);
        // Het vlak schaalt (sx, sy), de foto schaalt binnenin tegengesteld, als object-fit cover plus de parallax-marge.
        // Alleen transforms: breedte, hoogte of clip-path animeren is op een telefoon te zwaar
        var sx = w / W, sy = h / H, s = Math.max(w / ew, (h + extra) / eh), r = Math.round(20 * (1 - g));
        gsap.set(team, { x: (W - sw) / 2 * (1 - g), y: Math.min(H * 0.06, 56) * (1 - g), scaleX: sx, scaleY: sy, force3D: true });
        // Alleen bij een andere waarde: dit is het enige hier dat niet puur GPU-werk is. De schaal is verrekend, zodat de
        // hoek er rond uitziet, en de stappen vallen niet op
        if (r !== corner) { corner = r; team.style.borderRadius = r / sx + 'px / ' + r / sy + 'px'; }
        gsap.set(img, {
          x: -(ew * s - w) * fx / sx,
          y: -((eh * s - h - extra) / 2 + o) / sy,
          scaleX: s * k / sx,
          scaleY: s * k / sy,
          force3D: true,
          opacity: 1 - 0.9 * clamp(-top / H, 0, 1)
        });
      }
      function measure() {
        W = document.documentElement.clientWidth;
        H = window.innerHeight;
        sw = Math.max(Math.min(W * 0.4, 620), Math.min(W - 32, 340));
        sh = sw * 0.62;
        gsap.set(team, { position: 'sticky', top: 0, width: W, height: H, maxWidth: 'none', aspectRatio: 'auto', transformOrigin: '0 0', willChange: 'transform' });
        // De hele foto op de schaal waarop hij het scherm plus de parallax-marge vult; k: de foto staat kleiner in de pagina
        // en wordt opgeschaald, zodat hij niet scherper getekend wordt dan het bronbestand (scheelt veel op een 3x-scherm)
        var ratio = img.naturalWidth / img.naturalHeight || 16 / 9, dpr = window.devicePixelRatio || 1;
        ew = Math.max(W, H * 1.15 * ratio);
        eh = ew / ratio;
        nat = img.naturalWidth;
        k = nat ? Math.max(1, ew * dpr / nat) : 1;
        fx = parseFloat(getComputedStyle(img).objectPosition) / 100;
        if (isNaN(fx)) fx = 0.5;
        // Alleen bij een andere waarde: sizes zetten laadt de foto opnieuw, en dat vuurt weer load
        if (img.sizes !== Math.ceil(ew) + 'px') img.sizes = Math.ceil(ew) + 'px';
        gsap.set(img, { position: 'absolute', left: 0, top: 0, width: ew / k, height: eh / k, maxWidth: 'none', transformOrigin: '0 0', willChange: 'transform, opacity' });
        if (pad) pad.style.paddingBottom = '0';
        comp.style.height = '';
        comp.style.height = comp.offsetHeight + H + 'px';
        if (next) {
          next.style.position = 'relative';
          next.style.zIndex = '2';
          next.style.marginTop = -H + 'px';
          next.style.borderTopLeftRadius = next.style.borderTopRightRadius = 'var(--_layout---radius--l)';
          // Schaduw alleen boven de sectie, zoals bij Werk
          next.style.boxShadow = '0 -1.5rem 4rem -2.5rem rgba(0, 0, 0, 0.28)';
          next.style.clipPath = 'inset(-6rem 0 0 0)';
        }
        update();
      }
      listen(window, 'scroll', function () { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
      // Op de telefoon verandert de hoogte als de adresbalk inklapt: alleen bij een echte breedtewijziging opnieuw meten
      listen(window, 'resize', function () { if (!touch.matches || document.documentElement.clientWidth !== W) measure(); });
      // De maat van de foto is pas bekend als hij geladen is
      listen(img, 'load', function () { if (img.naturalWidth !== nat) measure(); });
      measure();
    });
  });

  return a.clean;
}
