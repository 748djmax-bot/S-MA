/* SØMA — revelado en corte al entrar en pantalla */
(function(){
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('soma-motion-on');
  function init(root){
    var els=[].slice.call((root||document).querySelectorAll('.soma-rev:not(.is-visible)'));
    if(reduce||!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('is-visible')});return;}
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){(e.target._soma||[]).forEach(function(x){x.classList.add('is-visible')});io.unobserve(e.target);}})},{threshold:0.15});
    els.forEach(function(el){var p=el.parentElement;(p._soma=p._soma||[]).push(el);if(p._soma.length===1)io.observe(p);});
  }
  if(document.readyState!=='loading')init();else document.addEventListener('DOMContentLoaded',function(){init()});
  document.addEventListener('shopify:section:load',function(e){init(e.target)});
})();
