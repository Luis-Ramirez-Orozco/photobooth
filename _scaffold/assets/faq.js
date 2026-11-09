// FAQ popup built from the page's FAQPage JSON-LD, so the visible questions always match the structured data.
// Any element with [data-faq-open] opens it. Self-contained: link faq.css + faq.js, add the JSON-LD, done.
(function () {
  function faqFromJsonLd() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll('script[type="application/ld+json"]'), function (s) {
      var data; try { data = JSON.parse(s.textContent); } catch (e) { return; }
      (function walk(n) {
        if (!n || typeof n !== "object") return;
        if (Array.isArray(n)) return n.forEach(walk);
        if (n["@type"] === "FAQPage" && Array.isArray(n.mainEntity)) {
          n.mainEntity.forEach(function (q) {
            if (q && q.name && q.acceptedAnswer && q.acceptedAnswer.text) out.push({ q: q.name, a: q.acceptedAnswer.text });
          });
        }
        Object.keys(n).forEach(function (k) { walk(n[k]); });
      })(data);
    });
    return out;
  }
  function esc(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }

  function init() {
    var faqs = faqFromJsonLd(), triggers = document.querySelectorAll("[data-faq-open]");
    if (!faqs.length || !triggers.length) return;

    var ov = document.createElement("div");
    ov.className = "faq-overlay"; ov.setAttribute("aria-hidden", "true");
    ov.innerHTML =
      '<div class="faq-modal" role="dialog" aria-modal="true" aria-labelledby="faq-title">' +
      '  <div class="faq-head"><h2 id="faq-title">' + esc(window.FAQ_TITLE || "Frequently Asked Questions") + '</h2>' +
      '    <button type="button" class="faq-close" aria-label="Close">&times;</button></div>' +
      '  <div class="faq-list">' + faqs.map(function (f) {
        return "<details><summary>" + esc(f.q) + "</summary><p>" + esc(f.a) + "</p></details>";
      }).join("") + "</div></div>";
    document.body.appendChild(ov);

    var closeBtn = ov.querySelector(".faq-close"), items = Array.prototype.slice.call(ov.querySelectorAll("details")), last = null;
    function setOpen(on) {
      ov.classList.toggle("is-open", on); ov.setAttribute("aria-hidden", String(!on));
      document.body.classList.toggle("modal-open", on);   // lets the page ignore its own wheel/keys meanwhile
      if (on) closeBtn.focus(); else if (last && last.focus) last.focus();
    }
    // Accordion: opening one answer closes the others
    items.forEach(function (d) {
      d.addEventListener("toggle", function () { if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; }); });
    });
    Array.prototype.forEach.call(triggers, function (t) {
      t.addEventListener("click", function (e) { e.preventDefault(); last = t; items.forEach(function (d) { d.open = false; }); setOpen(true); });
    });
    closeBtn.addEventListener("click", function () { setOpen(false); });
    ov.addEventListener("click", function (e) { if (e.target === ov) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov.classList.contains("is-open")) setOpen(false); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
