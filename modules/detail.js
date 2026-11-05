/* Afix modules/detail.js: detailpagina: data-a-toc, data-a-share en data-a-detail. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, listen = a.listen, raf = a.raf, wait = a.wait, withGsap = a.withGsap, withBlur = a.withBlur, undo = a.undo;

  /* data-a-toc (zijkolom blog, kennis-detail_aside): inhoudsopgave uit de Kop 2's in data-a-toc-content. De eerste link in
     data-a-toc-list is het voorbeeld voor de andere. Geen koppen: het blok verdwijnt. Zolang de zijkolom meeloopt (sticky,
     desktop) is de kop waar je bent donker; op telefoon staat de lijst boven de tekst en is alles even donker. */
  each('[data-a-toc]', function (aside) {
    var list = aside.querySelector('[data-a-toc-list]'), content = aside.parentNode.querySelector('[data-a-toc-content]');
    var sample = list && list.querySelector('a'), block = list && list.parentNode;
    if (!sample || !content) return;
    var heads = [].slice.call(content.querySelectorAll('h2')), used = {};
    if (!heads.length) { block.style.display = 'none'; undo(function () { block.style.display = ''; }); return; }
    var links = heads.map(function (head) {
      var slug = head.textContent.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kop';
      used[slug] = (used[slug] || 0) + 1;
      if (!head.id) { head.id = used[slug] > 1 ? slug + '-' + used[slug] : slug; undo(function () { head.removeAttribute('id'); }); }
      var link = sample.cloneNode(true);
      link.textContent = link.title = head.textContent.trim();
      link.href = '#' + head.id;
      // Zelf scrollen naar een getal: Lenis telt bij een element de scroll-padding van de nav erbij op
      listen(link, 'click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        history.replaceState(null, '', link.hash);
        var y = head.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(block).top) || 0);
        a.glideTo(y);
      });
      list.appendChild(link);
      return link;
    });
    list.removeChild(sample);
    undo(function () { links.forEach(function (link) { link.remove(); }); list.appendChild(sample); });
    withGsap(function (gsap) {
      var current = -1, queued = false;
      function update() {
        queued = false;
        var sticky = getComputedStyle(block).position === 'sticky', at = 0;
        if (!sticky) { if (current !== -1) gsap.set(links, { clearProps: 'opacity' }); current = -1; return; }
        heads.forEach(function (head, i) { if (head.getBoundingClientRect().top <= innerHeight * 0.4) at = i; });
        // Een korte laatste alinea haalt de lijn nooit: aan het eind van de tekst is de laatste kop actief
        if (content.getBoundingClientRect().bottom <= innerHeight * 0.6) at = heads.length - 1;
        if (at === current) return;
        var first = current === -1;
        current = at;
        links.forEach(function (link, i) {
          link.setAttribute('aria-current', i === at ? 'true' : 'false');
          gsap.to(link, { opacity: i === at ? 1 : 0.2, duration: first || reduce.matches ? 0 : 0.3, ease: 'power2.out', overwrite: true });
        });
      }
      function queue() { if (!queued) { queued = true; raf(update); } }
      listen(window, 'scroll', queue, { passive: true });
      listen(window, 'resize', queue);
      update();
    });
  });

  /* data-a-share (Deel deze post): de links krijgen hier het adres en de titel van de pagina. */
  each('[data-a-share]', function (link) {
    var url = encodeURIComponent(location.origin + location.pathname), h1 = container.querySelector('h1');
    var title = encodeURIComponent((h1 ? h1.textContent : document.title).trim());
    var to = {
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + url,
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + url,
      whatsapp: 'https://wa.me/?text=' + title + '%20' + url
    }[link.getAttribute('data-a-share')];
    if (to) link.href = to;
  });

  /* data-a-detail (kennisdetailpagina's): bij het laden komen het kruimelpad, de titel, de labels, de intro en de foto binnen
     met de blur-fade en timing van data-a-page-hero. Reduced motion of geen GSAP: gewoon zichtbaar. */
  each('[data-a-detail]', function (comp) {
    if (reduce.matches) return;
    var intro = [].slice.call(comp.querySelectorAll('.kennis-detail_header > *, .kennis-detail_intro, .kennis-detail_image'));
    function show() { intro.forEach(function (el) { el.style.opacity = ''; }); }
    intro.forEach(function (el) { el.style.opacity = '0'; });
    var fallback = wait(show, 3000);
    withGsap(function (gsap) {
      clearTimeout(fallback);
      intro.forEach(function (el, i) {
        gsap.fromTo(el, withBlur({ opacity: 0, y: '1.5rem' }, 'blur(0.75rem)'), withBlur({ opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.1 + i * 0.09, clearProps: 'opacity,transform,filter' }, 'blur(0rem)'));
      });
    });
  });

  return a.clean;
}
