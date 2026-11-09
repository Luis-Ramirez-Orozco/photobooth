// Inquiry calendar: a popup date picker opened from any "#book-now-link" on the page.
// Flow: pick a date (each day shows its price) -> optional add-ons popup -> "Inquire" -> two large
// buttons, Send Email / Send Text (no contact form) -> the visitor's own mail or messages app opens
// -> thank-you card. Email pre-fills only the subject; Text opens a blank message.
// Self-contained: builds its own modal markup, so pages only need to link calendar.css + calendar.js.
// Configure it with window.INQUIRY_CONFIG before this script loads (see inquiry-calendar/SKILL.md),
// or edit the defaults below.
(function () {
  var CFG = window.INQUIRY_CONFIG || {};
  var MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  var WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Day prices shown on each date. Fri/Sat/Sun use WEEKEND_PRICE.
  var WEEKDAY_PRICE = CFG.weekdayPrice != null ? CFG.weekdayPrice : 100;
  var WEEKEND_PRICE = CFG.weekendPrice != null ? CFG.weekendPrice : 150;

  // Where "Email" sends the inquiry, and where "Text" (phones) sends it. Ask the owner; never guess.
  var OWNER_EMAIL = CFG.email || "";
  var CONTACT_PHONE = CFG.phone || "";

  // Add-ons offered before inquiring; maxQty caps each quantity counter; img is optional.
  // Use [] for none (the Add-ons button is then hidden).
  var ADDONS = CFG.addons || [
    { id: "addon-1", label: "Example add-on", price: 25, maxQty: 10, img: "" }
  ];

  function priceFor(date) {
    var day = date.getDay();
    // Fri, Sat, and Sun are weekend pricing.
    return (day === 0 || day === 5 || day === 6) ? WEEKEND_PRICE : WEEKDAY_PRICE;
  }

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function isSameDay(a, b) {
    return !!a && !!b && a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function isSameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }
  function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

  function buildMonthGrid(month) {
    var firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    var gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());
    var days = [];
    // Only as many weeks as the month needs (4-6 rows)
    var rows = Math.ceil((firstOfMonth.getDay() + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7);
    for (var i = 0; i < rows * 7; i++) {
      var d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }

  function buildCalendarModal() {
    var overlay = document.createElement("div");
    overlay.id = "calendar-overlay";
    overlay.className = "calendar-overlay booking-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="booking-layout" id="booking-layout">' +
      '<div class="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-title">' +
      '  <div class="calendar-modal-header">' +
      '    <h2 id="calendar-title">Book a Date</h2>' +
      '    <button type="button" class="calendar-close" id="calendar-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <div class="calendar-nav">' +
      '    <button type="button" class="calendar-nav-btn" id="calendar-prev" aria-label="Previous month">' +
      '      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>' +
      "    </button>" +
      '    <span class="calendar-month-label" id="calendar-month-label" aria-live="polite"></span>' +
      '    <button type="button" class="calendar-nav-btn" id="calendar-next" aria-label="Next month">' +
      '      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>' +
      "    </button>" +
      "  </div>" +
      '  <div class="calendar-weekdays" id="calendar-weekdays"></div>' +
      '  <div class="calendar-grid" id="calendar-grid" role="grid"></div>' +
      '  <div class="calendar-footer">' +
      '    <button type="button" class="calendar-addons-btn" id="calendar-addons-btn">Add-ons</button>' +
      '    <button type="button" class="calendar-confirm-btn" id="calendar-inquire-btn" disabled>Inquire</button>' +
      "  </div>" +
      "</div>" +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  function buildAddonsModal() {
    var overlay = document.createElement("div");
    overlay.id = "addons-overlay";
    overlay.className = "calendar-overlay";
    overlay.setAttribute("aria-hidden", "true");

    var rows = ADDONS.map(function (addon) {
      return (
        '<label class="addon-card">' +
        '  <input type="checkbox" class="addons-checkbox" data-id="' + addon.id + '" />' +
        (addon.img ? '  <img class="addon-card-img" src="' + addon.img + '" alt="" loading="lazy" />' : "") +
        '  <span class="addon-card-body">' +
        '    <span class="addon-card-label">' + addon.label + "</span>" +
        '    <span class="addon-card-price">$' + addon.price + " each" + "</span>" +
        "  </span>" +
        '  <span class="addon-qty" data-id="' + addon.id + '">' +
        '    <span class="addon-qty-label"><span class="qty-long">Quantity</span><span class="qty-short">QTY</span></span>' +
        '    <button type="button" class="addon-qty-btn" data-step="-1" aria-label="Fewer">&minus;</button>' +
        '    <span class="addon-qty-value" aria-live="polite">0</span>' +
        '    <button type="button" class="addon-qty-btn" data-step="1" aria-label="More">+</button>' +
        "  </span>" +
        "</label>"
      );
    }).join("");

    overlay.innerHTML =
      '<div class="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="addons-title">' +
      '  <div class="calendar-modal-header">' +
      '    <h2 id="addons-title">Add-ons</h2>' +
      '    <button type="button" class="calendar-close" id="addons-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <div class="addons-list" id="addons-list">' + rows + "</div>" +
      '  <div class="calendar-footer">' +
      '    <span id="addons-total-label">No add-ons selected</span>' +
      '    <button type="button" class="calendar-confirm-btn" id="addons-done">Done</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  function buildPhoneModal() {
    var overlay = document.createElement("div");
    overlay.id = "phone-overlay";
    overlay.className = "calendar-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="phone-title">' +
      '  <div class="calendar-modal-header">' +
      '    <h2 id="phone-title">Send Your Inquiry</h2>' +
      '    <button type="button" class="calendar-close" id="phone-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <p class="phone-helper" id="send-summary">How would you like to reach us?</p>' +
      '  <div class="send-choice">' +
      '    <button type="button" class="send-choice-btn" id="phone-email">' +
      '      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>' +
      '      <span>Send Email</span>' +
      "    </button>" +
      '    <button type="button" class="send-choice-btn" id="phone-text">' +
      '      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12Z"/></svg>' +
      '      <span>Send Text</span>' +
      "    </button>" +
      "  </div>" +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  function buildThankYouModal() {
    var overlay = document.createElement("div");
    overlay.id = "thankyou-overlay";
    overlay.className = "calendar-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="thankyou-title">' +
      '  <div class="calendar-modal-header">' +
      '    <h2 id="thankyou-title">Thank You!</h2>' +
      '    <button type="button" class="calendar-close" id="thankyou-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <p class="thankyou-message">Thank you for your inquiry. Please wait up to 24 hours for a response.</p>' +
      '  <p class="thankyou-message" id="mail-fallback" style="font-size:.85em;opacity:.75"></p>' +
      '  <div class="calendar-footer thankyou-footer">' +
      '    <button type="button" class="calendar-confirm-btn" id="thankyou-ok">Close</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  function init() {

    var overlay = buildCalendarModal();
    var bookingLayout = overlay.querySelector("#booking-layout");
    var monthLabel = overlay.querySelector("#calendar-month-label");
    var weekdaysEl = overlay.querySelector("#calendar-weekdays");
    var gridEl = overlay.querySelector("#calendar-grid");
    var prevBtn = overlay.querySelector("#calendar-prev");
    var nextBtn = overlay.querySelector("#calendar-next");
    var closeBtn = overlay.querySelector("#calendar-close");
    var inquireBtn = overlay.querySelector("#calendar-inquire-btn");
    var addonsBtn = overlay.querySelector("#calendar-addons-btn");
    if (!ADDONS.length) addonsBtn.style.display = "none";

    var addonsOverlay = buildAddonsModal();
    var addonsList = addonsOverlay.querySelector("#addons-list");
    var addonsClose = addonsOverlay.querySelector("#addons-close");
    var addonsDone = addonsOverlay.querySelector("#addons-done");
    var addonsTotalLabel = addonsOverlay.querySelector("#addons-total-label");
    var addonsCheckboxes = Array.prototype.slice.call(addonsList.querySelectorAll(".addons-checkbox"));

    var phoneOverlay = buildPhoneModal();
    var phoneClose = phoneOverlay.querySelector("#phone-close");
    var sendSummary = phoneOverlay.querySelector("#send-summary");
    var phoneEmail = phoneOverlay.querySelector("#phone-email");
    var phoneText = phoneOverlay.querySelector("#phone-text");
    if (!CONTACT_PHONE) {   // no number configured: email only
      phoneText.parentNode.removeChild(phoneText);
      phoneEmail.parentNode.className += " send-choice-single";
    }

    var thankYouOverlay = buildThankYouModal();
    var thankYouClose = thankYouOverlay.querySelector("#thankyou-close");
    var thankYouOk = thankYouOverlay.querySelector("#thankyou-ok");

    var today = startOfDay(new Date());
    var displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var selectedDate = null;
    var selectedAddons = {};
    var lastFocused = null;
    var addonsLastFocused = null;
    var phoneLastFocused = null;
    var thankYouLastFocused = null;

    WEEKDAYS.forEach(function (label) {
      var span = document.createElement("span");
      span.textContent = label;
      weekdaysEl.appendChild(span);
    });

    function render() {
      monthLabel.textContent = MONTH_NAMES[displayedMonth.getMonth()] + " " + displayedMonth.getFullYear();
      gridEl.innerHTML = "";
      buildMonthGrid(displayedMonth).forEach(function (date) {
        // Days from the previous/next month are left blank, so only this month's dates show
        if (!isSameMonth(date, displayedMonth)) {
          var blank = document.createElement("span");
          blank.className = "calendar-day-blank";
          blank.setAttribute("aria-hidden", "true");
          gridEl.appendChild(blank);
          return;
        }
        var price = priceFor(date);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "calendar-day";
        btn.innerHTML =
          '<span class="calendar-day-number">' + date.getDate() + "</span>" +
          '<span class="calendar-day-price">$' + price + "</span>";
        btn.setAttribute("aria-label", date.toDateString() + ", $" + price);

        if (!isSameMonth(date, displayedMonth)) btn.classList.add("is-outside");
        if (isSameDay(date, today)) btn.classList.add("is-today");
        if (isSameDay(date, selectedDate)) {
          btn.classList.add("is-selected");
          btn.setAttribute("aria-selected", "true");
        }
        if (date.getTime() < today.getTime()) {
          btn.disabled = true;
        } else {
          btn.addEventListener("click", function () {
            selectedDate = date;
            render();
          });
        }
        gridEl.appendChild(btn);
      });

      inquireBtn.disabled = !selectedDate;
    }

    function addonsTotal() {
      return ADDONS.reduce(function (sum, addon) {
        return sum + addon.price * (selectedAddons[addon.id] || 0);
      }, 0);
    }

    function renderAddonsButton() {
      var count = Object.keys(selectedAddons).filter(function (id) { return selectedAddons[id]; }).length;
      addonsBtn.textContent = count ? "Add-ons · $" + addonsTotal() : "Add-ons";
    }

    function renderQuantities() {
      Array.prototype.forEach.call(addonsList.querySelectorAll(".addon-qty"), function (el) {
        el.querySelector(".addon-qty-value").textContent = selectedAddons[el.dataset.id] || 0;
      });
    }

    function renderAddonsTotal() {
      var total = addonsTotal();
      addonsTotalLabel.textContent = total ? ("$" + total + " in add-ons selected") : "No add-ons selected";
    }

    function resetBooking() {
      selectedDate = null;
      selectedAddons = {};
      addonsCheckboxes.forEach(function (checkbox) { checkbox.checked = false; });
      renderQuantities();
      renderAddonsButton();
      renderAddonsTotal();
    }

    function topOpenOverlay() {
      if (thankYouOverlay.classList.contains("is-open")) return thankYouOverlay;
      if (phoneOverlay.classList.contains("is-open")) return phoneOverlay;
      if (addonsOverlay.classList.contains("is-open")) return addonsOverlay;
      if (overlay.classList.contains("is-open")) return overlay;
      return null;
    }

    function onGlobalKeydown(e) {
      if (e.key !== "Escape") return;
      var top = topOpenOverlay();
      if (top === thankYouOverlay) closeThankYou();
      else if (top === phoneOverlay) closePhone();
      else if (top === addonsOverlay) closeAddons();
      else if (top === overlay) closeCalendar();
    }

    function openCalendar() {
      lastFocused = document.activeElement;
      displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      render();
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    }

    function closeCalendar() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function openAddons() {
      addonsLastFocused = document.activeElement;
      renderAddonsTotal();
      addonsOverlay.classList.add("is-open");
      addonsOverlay.setAttribute("aria-hidden", "false");
      addonsClose.focus();
    }

    function closeAddons() {
      addonsOverlay.classList.remove("is-open");
      addonsOverlay.setAttribute("aria-hidden", "true");
      renderAddonsButton();
      if (addonsLastFocused && addonsLastFocused.focus) addonsLastFocused.focus();
    }

    function openPhone() {
      phoneLastFocused = document.activeElement;
      sendSummary.textContent = selectedDate
        ? "Inquiry for " + selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) + ". How would you like to reach us?"
        : "How would you like to reach us?";
      phoneOverlay.classList.add("is-open");
      phoneOverlay.setAttribute("aria-hidden", "false");
    }

    function closePhone() {
      phoneOverlay.classList.remove("is-open");
      phoneOverlay.setAttribute("aria-hidden", "true");
      if (phoneLastFocused && phoneLastFocused.focus) phoneLastFocused.focus();
    }

    function openThankYou() {
      thankYouLastFocused = document.activeElement;
      thankYouOverlay.classList.add("is-open");
      thankYouOverlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      thankYouOk.focus();
    }

    function closeThankYou() {
      thankYouOverlay.classList.remove("is-open");
      thankYouOverlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (thankYouLastFocused && thankYouLastFocused.focus) thankYouLastFocused.focus();
    }

    var lastMail = null;
    function ordinal(n) {
      var v = n % 100;
      if (v >= 11 && v <= 13) return n + "th";
      return n + (["th", "st", "nd", "rd"][n % 10] || "th");
    }
    // Optional "unit" in the subject (e.g. "1 Robot"): CFG.unitLabel / CFG.unitLabelPlural, plus
    // CFG.extraUnitAddon = the id of an add-on that adds more units (counted, not listed separately).
    function unitCount() { return 1 + (CFG.extraUnitAddon ? (selectedAddons[CFG.extraUnitAddon] || 0) : 0); }
    // Email: only the subject is pre-filled (unit count, chosen add-ons, date); the body is left empty.
    function buildMessage() {
      var parts = [];
      if (CFG.unitLabel) {
        var n = unitCount();
        parts.push(n + " " + (n === 1 ? CFG.unitLabel : (CFG.unitLabelPlural || CFG.unitLabel + "s")));
      }
      ADDONS.forEach(function (a) {
        var qty = selectedAddons[a.id] || 0;
        if (!qty || a.id === CFG.extraUnitAddon) return;
        parts.push(a.label + (qty > 1 ? " x" + qty : ""));
      });
      if (selectedDate) parts.push(MONTH_NAMES[selectedDate.getMonth()] + " " + ordinal(selectedDate.getDate()));
      return { subject: (CFG.subject || "Inquiry") + (parts.length ? ": " + parts.join(", ") : ""), body: "" };
    }
    function buildMailto() {
      lastMail = buildMessage();
      return "mailto:" + OWNER_EMAIL + "?subject=" + encodeURIComponent(lastMail.subject);
    }
    // Text: opens a blank message to the owner's number (no body); the visitor types whatever they want.
    function buildSms() {
      return "sms:" + CONTACT_PHONE.replace(/[^\d+]/g, "");
    }

    document.addEventListener("keydown", onGlobalKeydown);

    // Tell the page whenever the booking flow opens or fully closes, so
    // heavy background animation (the homepage hero) can pause meanwhile.
    var bookingWasOpen = false;
    var openObserver = new MutationObserver(function () {
      var open = !!topOpenOverlay();
      if (open === bookingWasOpen) return;
      bookingWasOpen = open;
      document.dispatchEvent(new CustomEvent("bookingchange", { detail: { open: open } }));
    });
    [overlay, addonsOverlay, phoneOverlay, thankYouOverlay].forEach(function (el) {
      openObserver.observe(el, { attributes: true, attributeFilter: ["class"] });
    });

    // Delegated, so triggers created later (e.g. a button the carousel adds to its bar) work too.
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("#book-now-link, [data-book-now]");
      if (!t) return;
      e.preventDefault();
      openCalendar();
    });

    prevBtn.addEventListener("click", function () {
      displayedMonth = addMonths(displayedMonth, -1);
      render();
    });
    nextBtn.addEventListener("click", function () {
      displayedMonth = addMonths(displayedMonth, 1);
      render();
    });
    closeBtn.addEventListener("click", closeCalendar);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target === bookingLayout) closeCalendar();
    });
    inquireBtn.addEventListener("click", openPhone);

    addonsBtn.addEventListener("click", openAddons);
    addonsClose.addEventListener("click", closeAddons);
    addonsDone.addEventListener("click", closeAddons);
    addonsOverlay.addEventListener("click", function (e) {
      if (e.target === addonsOverlay) closeAddons();
    });
    addonsCheckboxes.forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
        var id = checkbox.dataset.id;
        selectedAddons[id] = checkbox.checked ? Math.max(selectedAddons[id] || 0, 1) : 0;
        renderQuantities();
        renderAddonsTotal();
      });
    });
    Array.prototype.forEach.call(addonsList.querySelectorAll(".addon-qty-btn"), function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var id = btn.parentNode.dataset.id;
        var addon = ADDONS.filter(function (a) { return a.id === id; })[0];
        var qty = Math.max(0, Math.min(addon.maxQty, (selectedAddons[id] || 0) + Number(btn.dataset.step)));
        selectedAddons[id] = qty;
        addonsList.querySelector('.addons-checkbox[data-id="' + id + '"]').checked = qty > 0;
        renderQuantities();
        renderAddonsTotal();
      });
    });

    phoneClose.addEventListener("click", closePhone);
    phoneOverlay.addEventListener("click", function (e) {
      if (e.target === phoneOverlay) closePhone();
    });
    function finishInquiry(fallbackHtml) {
      var fb = thankYouOverlay.querySelector("#mail-fallback");
      if (fb) fb.innerHTML = fallbackHtml;
      closePhone();
      closeCalendar();
      openThankYou();
      resetBooking();
    }
    // Text: opens the visitor's messaging app, blank, addressed to the owner's number.
    if (phoneText.parentNode) phoneText.addEventListener("click", function () {
      window.location.href = buildSms();
      finishInquiry("Text didn't open? Message us at " + CONTACT_PHONE + ".");
    });
    // Email: opens the visitor's mail app with only the subject filled in.
    phoneEmail.addEventListener("click", function () {
      window.location.href = buildMailto();
      finishInquiry("Email didn't open? <a target=\"_blank\" rel=\"noopener\" href=\"https://mail.google.com/mail/?view=cm&to=" + encodeURIComponent(OWNER_EMAIL) + "&su=" + encodeURIComponent(lastMail.subject) + "\">Open in Gmail</a> or write to " + OWNER_EMAIL + ".");
    });

    thankYouClose.addEventListener("click", closeThankYou);
    thankYouOk.addEventListener("click", closeThankYou);
    thankYouOverlay.addEventListener("click", function (e) {
      if (e.target === thankYouOverlay) closeThankYou();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
