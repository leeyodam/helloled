(function () {
  var MEASUREMENT_ID = "G-RVCZ3JKFJ3";
  var lang = document.documentElement.getAttribute("data-page-lang") || document.documentElement.lang || "";

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_lang: lang
  });

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(script);

  document.addEventListener("click", function (event) {
    var node = event.target;
    if (!node || !node.closest) return;
    var link = node.closest("a");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    var store = "";
    if (href.indexOf("play.google.com") !== -1) store = "google_play";
    else if (href.indexOf("apps.apple.com") !== -1) store = "app_store";
    if (!store) return;
    gtag("event", "store_click", { store: store, page_lang: lang });
  });

  function watchPreview() {
    var input = document.getElementById("led-input");
    if (!input || input.getAttribute("data-analytics-bound") === "1") return;
    input.setAttribute("data-analytics-bound", "1");
    var sent = false;
    input.addEventListener("input", function () {
      if (sent) return;
      if (!(input.value || "").trim()) return;
      sent = true;
      gtag("event", "preview_text", { page_lang: lang });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchPreview);
  } else {
    watchPreview();
  }
})();
