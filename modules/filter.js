/* Afix modules/filter.js: data-a-filter: zoeken en filteren, en het binnenkomen van de kaarten. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, listen = a.listen, withGsap = a.withGsap, withBlur = a.withBlur, num = a.num, onceInView = a.onceInView, undo = a.undo;

  /* data-a-filter (Element - Kennisfilter): zoeken en expertise kiezen, op de kaarten in elke data-a-filter-list naast het filter.
     Waarde van data-a-filter-list: het aantal kaarten zonder filter. data-a-filter-more (knop): zoveel kaarten erbij per klik,
     en dan telt het filter ook met pagina's. data-a-filter-group verdwijnt als er in zijn lijst niets overblijft. De keuzes
     komen uit de labels op de kaarten (het laatste label in kennis-card_tags), dus er staat nooit een lege expertise tussen. */
  each('[data-a-filter]', function (root) {
    var sets = [].map.call(root.parentNode.querySelectorAll('[data-a-filter-list]'), function (list) {
      return { list: list, group: list.closest('[data-a-filter-group]'), limit: num(list, 'data-a-filter-list', 12), items: [].slice.call(list.children) };
    });
    if (!sets.length) return;
    var input = root.querySelector('[data-a-filter-search]'), clear = root.querySelector('[data-a-filter-clear]');
    var toggle = root.querySelector('[data-a-filter-toggle]'), label = root.querySelector('[data-a-filter-label]'), panel = root.querySelector('[data-a-filter-panel]');
    var more = root.parentNode.querySelector('[data-a-filter-more]'), step = more ? num(more, 'data-a-filter-more', 12) : 0;
    var count = step, query = '', expertise = '', all = label.textContent, gsap = null;
    withGsap(function (g) { gsap = g; });
    var empty = document.createElement('div');
    empty.className = 'kennis_empty';
    empty.textContent = 'Geen resultaten. Probeer een ander trefwoord of kies een andere expertise.';
    empty.setAttribute('role', 'status');
    empty.style.display = 'none';
    root.parentNode.insertBefore(empty, root.nextSibling);
    undo(function () { empty.remove(); });
    function tagOf(item) {
      var tags = item.querySelectorAll('.kennis-card_tags .tag');
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
      if (gsap && fresh.length && !reduce.matches) gsap.fromTo(fresh, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out', clearProps: 'opacity,transform,filter' });
    }
    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open);
      panel.style.display = open ? 'flex' : '';
      var caret = toggle.querySelector('svg'), t = reduce.matches ? 0 : 1;
      if (!gsap) return;
      if (caret) gsap.to(caret, { rotation: open ? 180 : 0, duration: 0.2 * t, ease: 'power2.out', overwrite: true });
      if (open) gsap.fromTo(panel, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.25 * t, ease: 'power2.out', clearProps: 'opacity,transform' });
    }
    var names = [];
    sets.forEach(function (set) { set.items.forEach(function (item) { var t = tagOf(item); if (t && names.indexOf(t) < 0) names.push(t); }); });
    names.sort(function (a, b) { return a.localeCompare(b, 'nl'); });
    [all].concat(names).forEach(function (name, i) {
      var option = document.createElement('button');
      option.type = 'button';
      option.className = 'kennis-filter_option';
      option.textContent = name;
      listen(option, 'click', function () {
        expertise = i ? name : '';
        label.textContent = name;
        count = step;
        setOpen(false);
        toggle.focus();
        apply();
      });
      panel.appendChild(option);
      undo(function () { option.remove(); });
    });
    listen(input, 'input', function () { query = input.value.trim().toLowerCase(); count = step; apply(); });
    listen(clear, 'click', function () { input.value = ''; query = ''; count = step; input.focus(); apply(); });
    listen(toggle, 'click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    listen(document, 'click', function (e) { if (!toggle.parentNode.contains(e.target)) setOpen(false); });
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
        gsap.set(card, withBlur({ opacity: 0, y: '1.5rem' }, 'blur(0.75rem)'));
        onceInView(card, 10, function () {
          gsap.to(card, withBlur({ opacity: 1, y: 0, delay: Math.min(before, 3) * 0.08, duration: 1.1, ease: 'power3.out', clearProps: 'opacity,transform,filter' }, 'blur(0rem)'));
        });
      });
    });
  });

  return a.clean;
}
