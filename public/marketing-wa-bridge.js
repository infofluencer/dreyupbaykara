/**
 * Reklam landing siteleri (endospineistanbul.com, fitikameliyati.com) için
 * WhatsApp tıklamalarını ana CRM sitesindeki /r rotasına yönlendirir; gclid/utm korunur.
 * Ücretli trafikte sayfa inişini /api/track/landing ile de kaydeder.
 *
 * WordPress: Görünüm → Tema dosyaları → footer.php veya eklenti "Custom HTML":
 *
 * <script
 *   src="https://endoskopikbelameliyati.com/marketing-wa-bridge.js"
 *   data-site="endospineistanbul"
 *   defer
 * ></script>
 *
 * fitikameliyati için: data-site="fitikameliyati"
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
    "msclkid",
    "ttclid",
    "oppref",
    "campaign",
  ];
  var STORAGE = "eyupbaykara_xsite_attr";
  var LANDING_SENT_KEY = "eyupbaykara_xsite_landing_sent";

  var script =
    document.currentScript ||
    document.querySelector('script[src*="marketing-wa-bridge.js"]');
  var site = (script && script.getAttribute("data-site")) || "endospineistanbul";
  var bridgeOrigin =
    (script && script.getAttribute("data-bridge")) ||
    "https://endoskopikbelameliyati.com";

  function readStored() {
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) {
        // Eski sessionStorage kayıtlarını bir kez taşı
        var legacy = sessionStorage.getItem(STORAGE);
        if (legacy) {
          localStorage.setItem(STORAGE, legacy);
          return JSON.parse(legacy);
        }
        return {};
      }
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_e) {
      return {};
    }
  }

  function writeStored(data) {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(data));
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
    if (!stored.landing_url) {
      stored.landing_url = window.location.href;
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

  function reportLanding(stored) {
    if (!hasPaidParams(stored)) return;

    var fingerprint = [
      stored.gclid || "",
      stored.gbraid || "",
      stored.wbraid || "",
      stored.fbclid || "",
      stored.msclkid || "",
      stored.ttclid || "",
      stored.oppref || "",
      stored.utm_source || "",
      stored.utm_campaign || "",
      stored.landing_page || "",
    ].join("|");

    try {
      if (sessionStorage.getItem(LANDING_SENT_KEY) === fingerprint) return;
      sessionStorage.setItem(LANDING_SENT_KEY, fingerprint);
    } catch (_e) {
      /* continue */
    }

    var body = JSON.stringify({
      site: site,
      page: stored.landing_page || window.location.pathname,
      campaign: stored.campaign || null,
      utm_source: stored.utm_source || null,
      utm_medium: stored.utm_medium || null,
      utm_campaign: stored.utm_campaign || null,
      utm_content: stored.utm_content || null,
      utm_term: stored.utm_term || null,
      gclid: stored.gclid || null,
      fbclid: stored.fbclid || null,
      gbraid: stored.gbraid || null,
      wbraid: stored.wbraid || null,
      msclkid: stored.msclkid || null,
      ttclid: stored.ttclid || null,
      oppref: stored.oppref || null,
      landing_url: stored.landing_url || window.location.href,
    });

    var url = bridgeOrigin.replace(/\/$/, "") + "/api/track/landing";

    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body,
      mode: "cors",
      keepalive: true,
    }).catch(function () {
      try {
        sessionStorage.removeItem(LANDING_SENT_KEY);
      } catch (_e2) {
        /* ignore */
      }
    });
  }

  function isWhatsAppLink(href) {
    if (!href) return false;
    return /wa\.me|whatsapp\.com|api\.whatsapp/i.test(href);
  }

  /** Click to Chat (HoliThemes) floating button is a div, not <a href>. */
  function isClickToChat(el) {
    if (!el || !el.closest) return false;
    return Boolean(
      el.closest(
        "#ht-ctc-chat, .ht-ctc-chat, .ht-ctc-sc-chat, .ctc_chat, #ctc_chat",
      ),
    );
  }

  function redirectToBridge(event) {
    var stored = captureAttribution();
    if (!hasPaidParams(stored)) return false;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }
    window.location.href = buildBridgeUrl(stored);
    return true;
  }

  function onClick(event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var anchor = target.closest("a");
    var isWaAnchor = anchor && isWhatsAppLink(anchor.href);
    if (!isWaAnchor && !isClickToChat(target)) return;

    redirectToBridge(event);
  }

  var stored = captureAttribution();
  reportLanding(stored);
  document.addEventListener("click", onClick, true);

  /** CTC opens WhatsApp via window.open — catch that if click missed the widget. */
  var nativeOpen = window.open;
  window.open = function (url) {
    if (isWhatsAppLink(String(url || "")) && hasPaidParams(captureAttribution())) {
      window.location.href = buildBridgeUrl(captureAttribution());
      return null;
    }
    return nativeOpen.apply(this, arguments);
  };
})();
