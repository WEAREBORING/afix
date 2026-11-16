/* Afix modules/filter.js: data-a-filter: zoeken en filteren, en het binnenkomen van de kaarten. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, listen = a.listen, withGsap = a.withGsap, withBlur = a.withBlur, num = a.num, onceInView = a.onceInView, undo = a.undo;

  /* data-a-filter (Element - Kennisfilter): zoeken en expertise kiezen, op de kaarten in elke data-a-filter-list naast het filter.
     Waarde van data-a-filter-list: het aantal kaarten zonder filter. data-a-filter-more (knop): zoveel kaarten erbij per klik,
     en dan telt het filter ook met pagina's. data-a-filter-group verdwijnt als er in zijn lijst niets overblijft. De keuzes
     zijn de vaste chips in data-a-filter-panel (de eerste is "alle"); een chip past op het laatste label van een kaart
     (kennis-card_tags) of rij (kennis-regel_label). data-a-filter-count toont op een lijstpagina het aantal resultaten. */
  each('[data-a-filter]', function (root) {
    var sets = [].map.call(root.parentNode.querySelectorAll('[data-a-filter-list]'), function (list) {
      return { list: list, group: list.closest('[data-a-filter-group]'), limit: num(list, 'data-a-filter-list', 12), items: [].slice.call(list.children) };
    });
    if (!sets.length) return;
    var input = root.querySelector('[data-a-filter-search]'), clear = root.querySelector('[data-a-filter-clear]');
    var toggle = root.querySelector('[data-a-filter-toggle]'), label = root.querySelector('[data-a-filter-label]'), panel = root.querySelector('[data-a-filter-panel]');
    var more = root.parentNode.querySelector('[data-a-filter-more]'), step = more ? num(more, 'data-a-filter-more', 12) : 0;
    var counter = root.querySelector('[data-a-filter-count]'), options = [].slice.call(panel.querySelectorAll('button'));
    var count = step, query = '', expertise = '', gsap = null;
    withGsap(function (g) { gsap = g; });
    var empty = document.createElement('div');
    empty.className = 'kennis_empty';
    empty.textContent = 'Geen resultaten. Probeer een ander trefwoord of kies een andere expertise.';
    empty.setAttribute('role', 'status');
    empty.style.display = 'none';
    root.parentNode.insertBefore(empty, root.nextSibling);
    undo(function () { empty.remove(); });
    function tagOf(item) {
      var tags = item.querySelectorAll('.kennis-card_tags .tag, .kennis-regel_label .tag');
      return tags.length ? tags[tags.length - 1].textContent.trim() : '';
    }
    function apply() {
      var active = query || expertise, total = 0, left = false, fresh = [];
      sets.forEach(function (set) {
        var hits = set.items.filter(function (item) {
          return (!query || item.textContent.toLowerCase().indexOf(query) > -1) && (!expertise || tagOf(item) === expertise);
        });
        var cap = more ? count : active ? hits.length : set.limit;
        set.items.forEach(function (item) {
          var i = hits.indexOf(item), on = i > -1 && i < cap;
          if (on && item.style.display === 'none') fresh.push(item);
          item.style.display = on ? '' : 'none';
        });
        if (hits.length > cap) left = true;
        total += hits.length;
        if (set.group) set.group.style.display = hits.length ? '' : 'none';
        set.list.scrollLeft = 0;
        set.list.dispatchEvent(new Event('scroll'));
      });
      empty.style.display = total ? 'none' : '';
      if (more) more.style.display = left ? 'flex' : '';
      // shortcut: Webflow geeft hoogstens 100 items per lijst, dus vanaf 100 staat er "100+"; echt tellen kan pas met paginering
      if (counter && more) counter.textContent = '(' + (total >= 100 ? '100+' : total) + ')';
      if (gsap && fresh.length && !reduce.matches) gsap.fromTo(fresh, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out', clearProps: 'opacity,transform,filter' });
    }
    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open);
      panel.style.display = open ? 'flex' : '';
      if (gsap && open) gsap.fromTo(panel, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: reduce.matches ? 0 : 0.25, ease: 'power2.out', clearProps: 'opacity,transform' });
    }
    options.forEach(function (option, i) {
      listen(option, 'click', function () {
        expertise = i ? option.textContent.trim() : '';
        label.textContent = option.textContent;
        options.forEach(function (o) { o.setAttribute('aria-pressed', o === option); });
        count = step;
        apply();
      });
    });
    listen(input, 'input', function () { query = input.value.trim().toLowerCase(); count = step; apply(); });
    listen(clear, 'click', function () { input.value = ''; query = ''; count = step; input.focus(); apply(); });
    listen(toggle, 'click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    listen(document, 'keydown', function (e) {
      if (e.key !== 'Escape' || toggle.getAttribute('aria-expanded') !== 'true') return;
      setOpen(false);
      toggle.focus();
    });
    if (more) listen(more, 'click', function () { count += step; apply(); });
    apply();
  });

  /* Kaarten in een data-a-filter-list komen een keer binnen zodra ze in beeld komen, met de blur-fade van de Home; naast
     elkaar kort na elkaar. Kaarten die het filter nog verbergt doen niet mee: die komen binnen via het filter. */
  if (!reduce.matches && container.querySelector('[data-a-filter-list]')) withGsap(function (gsap) {
    each('[data-a-filter-list]', function (list) {
      [].forEach.call(list.children, function (card) {
        if (card.style.display === 'none') return;
        var before = 0, el = card;
        while ((el = el.previousElementSibling)) if (el.offsetTop === card.offsetTop) before++;
        var line = a.startLine(card);
        gsap.set(card, withBlur({ opacity: 0, y: '1.5rem' }, 'blur(0.75rem)'));
        onceInView(card, line, function () {
          gsap.to(card, withBlur({ opacity: 1, y: 0, delay: Math.min(before, 3) * 0.08, duration: 1.1, ease: 'power3.out', clearProps: 'opacity,transform,filter' }, 'blur(0rem)'));
        });
      });
    });
  });

  return a.clean;
}
