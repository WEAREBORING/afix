/* Afix modules/fill.js: data-a-fill: cultuurtekst komt per woord binnen. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, clamp = a.clamp, withGsap = a.withGsap, withBlur = a.withBlur, touchDevice = a.touchDevice, onceInView = a.onceInView, undo = a.undo;

  /* data-a-fill (Section - Cultuur): de tekst wordt woord voor woord scherp, zoals op butter.video. De animatie speelt
     een keer af zodra de bovenkant van de kop op 78% van de schermhoogte komt en hangt verder niet aan het scrollen. Een
     woord begint onzichtbaar, wordt dan een wazige gloed (de tekst zelf doorzichtig, met een vage schaduw in signaalgeel,
     surface/accent) en lost op in scherpe tekst in de kleur uit de class: de tekst wordt dekkend, de gloed kleurt naar de
     tekstkleur en verdwijnt. Tempo: elke 0,04 seconde start een woord en een woord duurt 0,76 seconde, met een uitlopende
     easing per woord (iets sneller dan butter.video, keuze van de gebruiker). De tag boven de kop (element ervoor) en de knop eronder (element na de wrapper van de kop) komen mee: de tag
     eerst, de knop als het laatste woord start, met dezelfde beweging als de hero. Woorden blijven gewone inline
     spans, dus de tekst breekt op dezelfde plekken af. Schermlezers lezen de gewone tekst (aria-label op de kop, de woorden
     zijn aria-hidden). Reduced motion en zonder site.js: gewoon de tekst. */
  each('[data-a-fill]', function (el) {
    var text = el.textContent.replace(/\s+/g, ' ').trim(), html = el.innerHTML;
    if (reduce.matches || !text) return;
    withGsap(function (gsap) {
      // Een kleur (ook een variabele) als [r, g, b]
      function rgbOf(value) {
        var probe = document.createElement('i');
        probe.style.color = value;
        el.appendChild(probe);
        var c = getComputedStyle(probe).color;
        el.removeChild(probe);
        return (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
      }
      var ink = rgbOf('inherit'), glow = rgbOf('var(--_theme---surface--accent)');
      function mix(a, b, t) { return a.map(function (v, k) { return Math.round(v + (b[k] - v) * t); }).join(', '); }
      var words = [], soft = 19, last = [];
      el.setAttribute('aria-label', text);
      el.textContent = '';
      undo(function () { el.removeAttribute('aria-label'); el.innerHTML = html; });
      text.split(' ').forEach(function (w, i, all) {
        var word = document.createElement('span');
        word.textContent = w;
        word.setAttribute('aria-hidden', 'true');
        el.appendChild(word);
        words.push(word);
        if (i < all.length - 1) el.appendChild(document.createTextNode(' '));
      });
      function look(t) {
        var c = clamp((t - 0.3) / 0.7, 0, 1);
        return {
          opacity: clamp(t / 0.65, 0, 1),
          color: 'rgba(' + ink.join(', ') + ', ' + c + ')',
          textShadow: 'rgba(' + mix(glow, ink, c) + ', ' + (0.9 * (1 - c)) + ') 0 0 ' + (0.08 + 0.06 * c) + 'em'
        };
      }
      var progress = { n: 0 };
      function draw() {
        // De tekstkleur opnieuw lezen: die loopt mee met de paginakleur van data-a-value
        ink = (getComputedStyle(el).color.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
        words.forEach(function (w, i) {
          // In stapjes, zodat er alleen iets gezet wordt als het woord echt verandert; op een telefoon grover
          var steps = touchDevice.matches ? 20 : 50, t = Math.round((1 - Math.pow(1 - clamp((progress.n - i) / soft, 0, 1), 3)) * steps) / steps;
          if (last[i] === t) return;
          last[i] = t;
          if (t === 1) gsap.set(w, { clearProps: 'opacity,color,textShadow' });
          else gsap.set(w, look(t));
        });
      }
      draw();
      var tag = el.previousElementSibling, button = el.parentElement.nextElementSibling;
      gsap.set([tag, button].filter(Boolean), withBlur({ opacity: 0, y: '1.5rem' }, 'blur(0.75rem)'));
      function arrive(item, delay) {
        if (item) gsap.to(item, withBlur({ opacity: 1, y: 0, delay: delay, duration: 1.1, ease: 'power3.out', clearProps: 'opacity,transform,filter' }, 'blur(0rem)'));
      }
      onceInView(el, 22, function () {
        arrive(tag, 0);
        arrive(button, 0.1 + (words.length - 1) * 0.04);
        gsap.to(progress, { n: words.length + soft, delay: 0.1, duration: (words.length + soft) * 0.04, ease: 'none', onUpdate: draw });
      });
    });
  });

  return a.clean;
}
