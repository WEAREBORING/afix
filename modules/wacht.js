/* Afix modules/wacht.js: button[data-wait]: laadstatus op de formulierknop. Geladen door site.js; init(container, a) start de module, de teruggegeven functie ruimt hem op. */
export function init(container, a) {
  var each = a.each, reduce = a.reduce, listen = a.listen, watch = a.watch, withGsap = a.withGsap;

  /* button[data-wait]: laadstatus bij verzenden. webflow.js zet data-wait alleen in de value, en die zie je op een <button> niet.
     De knop toont de wachttekst met een draaiende loader. Lukt het, dan verdwijnt het formulier; mislukt het, dan komt .w-form-fail
     in beeld en staat de knop weer zoals hij was. */
  each('button[data-wait]', function (btn) {
    var form = btn.closest('form'), label = btn.querySelector('span'), icon = btn.querySelector('.button_icon');
    if (!form || !label) return;
    var fail = form.parentNode.querySelector('.w-form-fail'), text = '', arrow = '', spin = null;
    function busy(on) {
      if (on === btn.hasAttribute('aria-busy')) return;
      if (on) { text = label.textContent; btn.setAttribute('aria-busy', 'true'); } else btn.removeAttribute('aria-busy');
      label.textContent = on ? btn.getAttribute('data-wait') : text;
      if (!icon) return;
      if (on) arrow = icon.innerHTML;
      icon.innerHTML = on ? '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"/></svg>' : arrow;
      withGsap(function (gsap) {
        if (spin) { spin.kill(); spin = null; gsap.set(icon, { clearProps: 'transform' }); }
        if (on && btn.hasAttribute('aria-busy') && !reduce.matches) spin = gsap.to(icon, { rotation: 360, duration: 0.8, ease: 'none', repeat: -1 });
      });
    }
    listen(form, 'submit', function () { busy(true); });
    if (fail) watch(new MutationObserver(function () { if (getComputedStyle(fail).display !== 'none') busy(false); })).observe(fail, { attributes: true, attributeFilter: ['style'] });
  });

  return a.clean;
}
