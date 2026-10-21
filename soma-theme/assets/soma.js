/* SØMA — comportamiento del tema. Sin dependencias. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var focusables = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  /* ── Menú índice (pantalla completa) ── */
  function initMenu() {
    var menu = document.getElementById('menu-indice');
    if (!menu) return;
    var openers = document.querySelectorAll('[data-abrir-menu]');
    var closer = menu.querySelector('[data-cerrar-menu]');
    var lastOpener = null;

    function open(opener) {
      lastOpener = opener;
      menu.hidden = false;
      document.body.style.overflow = 'hidden';
      openers.forEach(function (o) { o.setAttribute('aria-expanded', 'true'); });
      var first = menu.querySelector(focusables);
      if (first) first.focus();
    }
    function close() {
      menu.hidden = true;
      document.body.style.overflow = '';
      openers.forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
      if (lastOpener) lastOpener.focus();
    }

    openers.forEach(function (o) {
      o.addEventListener('click', function () { open(o); });
    });
    if (closer) closer.addEventListener('click', close);
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var items = menu.querySelectorAll(focusables);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ── Búsqueda como fila completa ── */
  function initBusqueda() {
    var toggle = document.querySelector('[data-abrir-busqueda]');
    var panel = document.getElementById('header-busqueda');
    if (!toggle || !panel) return;
    toggle.addEventListener('click', function () {
      var abierto = !panel.hidden;
      panel.hidden = abierto;
      toggle.setAttribute('aria-expanded', String(!abierto));
      if (!abierto) {
        var input = panel.querySelector('input');
        if (input) input.focus();
      }
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
    });
  }

  /* ── Revelado en barrido diagonal ── */
  function initRevelado() {
    var items = document.querySelectorAll('.revelado');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ── Contador de la bolsa ── */
  function actualizarBolsa(count) {
    document.querySelectorAll('[data-bolsa-cuenta]').forEach(function (el) {
      el.textContent = '[' + count + ']';
    });
  }

  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    var value = '';
    var placeholder = /\{\{\s*(\w+)\s*\}\}/;
    format = format || '${{amount}}';
    function withDelimiters(number, precision, thousands, decimal) {
      precision = precision == null ? 2 : precision;
      thousands = thousands || ',';
      decimal = decimal || '.';
      if (isNaN(number) || number == null) return 0;
      number = (number / 100.0).toFixed(precision);
      var parts = number.split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      var centsPart = parts[1] ? decimal + parts[1] : '';
      return dollars + centsPart;
    }
    var match = format.match(placeholder);
    switch (match ? match[1] : 'amount') {
      case 'amount': value = withDelimiters(cents, 2); break;
      case 'amount_no_decimals': value = withDelimiters(cents, 0); break;
      case 'amount_with_comma_separator': value = withDelimiters(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': value = withDelimiters(cents, 0, '.', ','); break;
      case 'amount_with_apostrophe_separator': value = withDelimiters(cents, 2, "'", '.'); break;
      case 'amount_with_space_separator': value = withDelimiters(cents, 2, ' ', ','); break;
      default: value = withDelimiters(cents, 2);
    }
    return format.replace(placeholder, value);
  }

  /* ── Producto: variantes y añadir a la bolsa ── */
  function initProducto(root) {
    var dataEl = root.querySelector('[data-variantes]');
    if (!dataEl) return;
    var variantes = JSON.parse(dataEl.textContent);
    var moneyFormat = root.getAttribute('data-money-format');
    var form = root.querySelector('form[data-form-producto]');
    var idInput = form.querySelector('input[name="id"]');
    var boton = form.querySelector('[data-boton-compra]');
    var botonTexto = boton.querySelector('span') || boton;
    var precioEl = root.querySelector('[data-precio]');
    var comparaEl = root.querySelector('[data-precio-compara]');
    var skuEl = root.querySelector('[data-sku]');
    var estadoEl = root.querySelector('[data-estado]');
    var avisameEl = root.querySelector('[data-avisame]');
    var textos = {
      anadir: root.getAttribute('data-txt-anadir'),
      agotado: root.getAttribute('data-txt-agotado'),
      noDisponible: root.getAttribute('data-txt-no-disponible'),
      anadido: root.getAttribute('data-txt-anadido'),
      error: root.getAttribute('data-txt-error')
    };

    function seleccion() {
      var vals = [];
      root.querySelectorAll('fieldset[data-opcion]').forEach(function (fs) {
        var checked = fs.querySelector('input:checked');
        vals.push(checked ? checked.value : null);
      });
      return vals;
    }

    function marcarDisponibilidad(vals) {
      root.querySelectorAll('fieldset[data-opcion]').forEach(function (fs, i) {
        fs.querySelectorAll('input').forEach(function (input) {
          var test = vals.slice();
          test[i] = input.value;
          var disponible = variantes.some(function (v) {
            return v.available && v.options.every(function (o, j) { return o === test[j]; });
          });
          input.closest('.opcion').classList.toggle('opcion--agotada', !disponible);
        });
        var legendValor = fs.querySelector('[data-opcion-valor]');
        var checked = fs.querySelector('input:checked');
        if (legendValor && checked) legendValor.textContent = checked.value;
      });
    }

    function actualizar() {
      var vals = seleccion();
      var variante = variantes.find(function (v) {
        return v.options.every(function (o, i) { return o === vals[i]; });
      });
      marcarDisponibilidad(vals);
      if (!variante) {
        boton.disabled = true;
        botonTexto.textContent = textos.noDisponible;
        return;
      }
      idInput.value = variante.id;
      boton.disabled = !variante.available;
      botonTexto.textContent = variante.available ? textos.anadir : textos.agotado;
      if (precioEl) precioEl.textContent = formatMoney(variante.price, moneyFormat);
      if (comparaEl) {
        if (variante.compare_at_price && variante.compare_at_price > variante.price) {
          comparaEl.textContent = formatMoney(variante.compare_at_price, moneyFormat);
          comparaEl.hidden = false;
        } else {
          comparaEl.hidden = true;
        }
      }
      if (skuEl) skuEl.textContent = variante.sku || '—';
      if (avisameEl) {
        avisameEl.hidden = variante.available;
        var cuerpo = avisameEl.querySelector('[data-avisame-cuerpo]');
        if (cuerpo && variante.title) {
          cuerpo.value = cuerpo.value.replace(/ — [^—]*$/, ' — ' + variante.title);
        }
      }
      if (window.history && window.history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variante.id);
        window.history.replaceState({}, '', url.toString());
      }
      if (variante.featured_media) {
        var media = root.querySelector('[data-media-id="' + variante.featured_media.id + '"]');
        var galeria = root.querySelector('.producto__galeria');
        if (media && galeria && galeria.firstElementChild !== media) {
          galeria.insertBefore(media, galeria.firstElementChild);
        }
      }
    }

    root.querySelectorAll('fieldset[data-opcion] input').forEach(function (input) {
      input.addEventListener('change', actualizar);
    });
    marcarDisponibilidad(seleccion());

    form.addEventListener('submit', function (e) {
      if (!window.fetch || !window.Shopify || !window.Shopify.routes) return;
      e.preventDefault();
      boton.setAttribute('aria-busy', 'true');
      boton.disabled = true;
      fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, json: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.json.description || textos.error);
          return fetch(window.Shopify.routes.root + 'cart.js', { headers: { 'Accept': 'application/json' } })
            .then(function (r) { return r.json(); })
            .then(function (cart) {
              actualizarBolsa(cart.item_count);
              if (Bolsa.disponible()) {
                if (estadoEl) estadoEl.textContent = '';
                return Bolsa.refrescar().then(function () { Bolsa.abrir(boton); });
              }
              if (estadoEl) {
                estadoEl.classList.remove('mensaje-error');
                estadoEl.innerHTML = '';
                var txt = document.createTextNode(textos.anadido + ' ');
                var link = document.createElement('a');
                link.href = window.Shopify.routes.root + 'cart';
                link.textContent = root.getAttribute('data-txt-ver-bolsa');
                estadoEl.appendChild(txt);
                estadoEl.appendChild(link);
              }
            });
        })
        .catch(function (err) {
          if (estadoEl) {
            estadoEl.classList.add('mensaje-error');
            estadoEl.textContent = 'Error — ' + err.message;
          }
        })
        .finally(function () {
          boton.removeAttribute('aria-busy');
          actualizar();
        });
    });
  }

  /* ── Bolsa lateral ── */
  var Bolsa = (function () {
    var lastOpener = null;
    function el() { return document.querySelector('[data-bolsa-lateral]'); }
    function disponible() { return !!el() && !!window.fetch; }
    function abrir(opener) {
      var b = el();
      if (!b) return;
      lastOpener = opener || document.activeElement;
      b.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { b.classList.add('is-abierta'); });
      var foco = b.querySelector('[data-cerrar-bolsa].header__accion') || b.querySelector(focusables);
      if (foco) foco.focus();
    }
    function cerrar() {
      var b = el();
      if (!b || b.hidden) return;
      b.classList.remove('is-abierta');
      document.body.style.overflow = '';
      setTimeout(function () { b.hidden = true; }, 240);
      if (lastOpener && lastOpener.focus) lastOpener.focus();
    }
    function refrescar() {
      var url = window.location.pathname + '?sections=bolsa-lateral';
      return fetch(url, { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var html = data && data['bolsa-lateral'];
          if (!html) return;
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var nuevo = doc.querySelector('[data-bolsa-contenido]');
          var actual = el() && el().querySelector('[data-bolsa-contenido]');
          if (nuevo && actual) actual.replaceWith(nuevo);
          var cuenta = doc.querySelector('[data-bolsa-cuenta]');
          if (cuenta) actualizarBolsa(cuenta.textContent.replace(/[\[\]]/g, ''));
        });
    }
    function cambiarLinea(linea, cantidad) {
      var b = el();
      var error = b && b.querySelector('[data-bolsa-error]');
      if (b) b.setAttribute('aria-busy', 'true');
      return fetch(window.Shopify.routes.root + 'cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ line: linea, quantity: cantidad })
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, json: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.json.description || res.json.message || 'Error');
          return refrescar();
        })
        .catch(function (err) {
          error = el() && el().querySelector('[data-bolsa-error]');
          if (error) { error.hidden = false; error.textContent = 'Error — ' + err.message; }
        })
        .finally(function () {
          if (el()) el().removeAttribute('aria-busy');
          var cerrarBtn = el() && el().querySelector('.header__accion[data-cerrar-bolsa]');
          if (cerrarBtn) cerrarBtn.focus();
        });
    }
    function init() {
      if (!disponible()) return;
      document.addEventListener('click', function (e) {
        var abridor = e.target.closest('[data-abrir-bolsa]');
        if (abridor && document.body.classList.contains('plantilla-cart') === false) {
          e.preventDefault();
          abrir(abridor);
          return;
        }
        if (e.target.closest('[data-cerrar-bolsa]')) { cerrar(); return; }
        var cambio = e.target.closest('[data-cambiar-linea]');
        if (cambio && el() && el().contains(cambio)) {
          cambiarLinea(parseInt(cambio.getAttribute('data-cambiar-linea'), 10), parseInt(cambio.getAttribute('data-cantidad'), 10));
        }
      });
      document.addEventListener('keydown', function (e) {
        var b = el();
        if (!b || b.hidden) return;
        if (e.key === 'Escape') { cerrar(); return; }
        if (e.key !== 'Tab') return;
        var items = b.querySelectorAll(focusables);
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    }
    return { disponible: disponible, abrir: abrir, cerrar: cerrar, refrescar: refrescar, init: init };
  })();

  /* ── Paneles laterales (guía de tallas) con <dialog> ── */
  function initPaneles() {
    document.querySelectorAll('[data-abrir-tallas]').forEach(function (btn) {
      var dlg = document.getElementById(btn.getAttribute('aria-controls'));
      if (!dlg || typeof dlg.showModal !== 'function') return;
      btn.addEventListener('click', function () { dlg.showModal(); });
      dlg.addEventListener('click', function (e) {
        if (e.target === dlg || e.target.closest('[data-cerrar-panel]')) dlg.close();
      });
    });
  }

  /* ── Filtros de colección: enviar al cambiar ── */
  function initFiltros() {
    document.querySelectorAll('form[data-filtros]').forEach(function (form) {
      form.addEventListener('change', function (e) {
        if (e.target.matches('input[type="number"]')) return;
        form.requestSubmit ? form.requestSubmit() : form.submit();
      });
      form.addEventListener('submit', function () {
        form.querySelectorAll('input[type="number"]').forEach(function (i) {
          if (i.value === '') i.disabled = true;
        });
      });
    });
  }

  /* ── Cantidad (+/−) ── */
  function initCantidad() {
    document.querySelectorAll('.cantidad').forEach(function (c) {
      var input = c.querySelector('input');
      c.querySelectorAll('button[data-paso]').forEach(function (b) {
        b.addEventListener('click', function () {
          var min = parseInt(input.min || '0', 10);
          var val = parseInt(input.value || '0', 10) + parseInt(b.getAttribute('data-paso'), 10);
          input.value = Math.max(min, val);
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });
  }

  /* ── Orden de colección ── */
  function initOrden() {
    document.querySelectorAll('select[data-orden]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var url = new URL(window.location.href);
        url.searchParams.set('sort_by', sel.value);
        url.searchParams.delete('page');
        window.location.href = url.toString();
      });
    });
  }

  /* ── Bolsa: enviar al cambiar cantidad ── */
  function initBolsa() {
    var form = document.querySelector('form[data-form-bolsa]');
    if (!form) return;
    form.querySelectorAll('.cantidad input').forEach(function (input) {
      input.addEventListener('change', function () { form.submit(); });
    });
  }

  /* ── Piezas relacionadas (recomendaciones de Shopify) ── */
  function initRecomendaciones() {
    document.querySelectorAll('[data-recomendaciones]').forEach(function (el) {
      if (!window.fetch) return;
      fetch(el.getAttribute('data-url'))
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var grid = doc.querySelector('.grid-producto');
          if (grid) {
            el.replaceWith(grid);
          } else {
            var seccion = el.closest('.shopify-section');
            if (seccion) seccion.hidden = true;
          }
        })
        .catch(function () {});
    });
  }

  function init() {
    initMenu();
    initBusqueda();
    initRevelado();
    initCantidad();
    initOrden();
    initBolsa();
    initRecomendaciones();
    initPaneles();
    initFiltros();
    Bolsa.init();
    document.querySelectorAll('[data-producto]').forEach(initProducto);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
