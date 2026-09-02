/**
 * Reklam landing siteleri (endospineistanbul.com, fitikameliyati.com) için
 * WhatsApp tıklamalarını ana CRM sitesindeki /r rotasına yönlendirir; gclid/utm korunur.
 *
 * WordPress: Görünüm → Tema dosyaları → footer.php veya eklenti "Custom HTML":
 *
 * <script
 *   src="https://endoskopikbelameliyati.com/marketing-wa-bridge.js"
 *   data-site="endospineistanbul"
 *   defer
 * ></script>
 */
(function () {
  "use strict";

  var TRACK_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "fbclid",
    "gbraid",
    "wbraid",
  ];
  var STORAGE = "eyupbaykara_xsite_attr";

  var script = document.currentScript;
  var site = (script && script.getAttribute("data-site")) || "endospineistanbul";
  var bridgeOrigin =
    (script && script.getAttribute("data-bridge")) ||
    "https://endoskopikbelameliyati.com";

  function readStored() {
    try {
      var raw = sessionStorage.getItem(STORAGE);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_e) {
      return {};
    }
  }

  function writeStored(data) {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(data));
    } catch (_e) {
      /* ignore */
    }
  }

  function captureAttribution() {
    var params = new URLSearchParams(window.location.search);
    var stored = readStored();
    var changed = false;

    for (var i = 0; i < TRACK_KEYS.length; i++) {
      var key = TRACK_KEYS[i];
      var value = params.get(key);
      if (value && !stored[key]) {
        stored[key] = value;
        changed = true;
      }
    }

    if (!stored.landing_page) {
      stored.landing_page = window.location.pathname;
      changed = true;
    }

    if (changed) writeStored(stored);
    return stored;
  }

  function hasPaidParams(stored) {
    for (var i = 0; i < TRACK_KEYS.length; i++) {
      if (stored[TRACK_KEYS[i]]) return true;
    }
    return false;
  }

  function buildBridgeUrl(stored) {
    var p = new URLSearchParams();
    p.set("site", site);
    p.set("page", stored.landing_page || window.location.pathname);
    p.set("channel", "ad_landing");

    for (var i = 0; i < TRACK_KEYS.length; i++) {
      var key = TRACK_KEYS[i];
      if (stored[key]) p.set(key, stored[key]);
    }

    return bridgeOrigin.replace(/\/$/, "") + "/r?" + p.toString();
  }

  function isWhatsAppLink(href) {
    if (!href) return false;
    return /wa\.me|whatsapp\.com|api\.whatsapp/i.test(href);
  }

  function onClick(event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var anchor = target.closest("a");
    if (!anchor || !isWhatsAppLink(anchor.href)) return;

    var stored = captureAttribution();
    if (!hasPaidParams(stored)) return;

    event.preventDefault();
    window.location.href = buildBridgeUrl(stored);
  }

  captureAttribution();
  document.addEventListener("click", onClick, true);
})();
