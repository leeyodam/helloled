(function () {
  var localeDirs = {
    ko: "",
    en: "en",
    ja: "ja",
    zh: "zh",
    es: "es",
    es_419: "es-419"
  };

  function hasLocale(lang) {
    return Object.prototype.hasOwnProperty.call(localeDirs, lang);
  }

  function pageLangFromPath() {
    var parts = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    var head = parts[0] || "";
    if (head === "en") return "en";
    if (head === "ja") return "ja";
    if (head === "zh") return "zh";
    if (head === "es") return "es";
    if (head === "es-419") return "es_419";
    return "ko";
  }

  function isPrivacyPath() {
    return /(?:^|\/)privacy\.html$/i.test(location.pathname);
  }

  function homePath(lang) {
    var dir = localeDirs[lang];
    return dir ? "/" + dir + "/" : "/";
  }

  function privacyPath(lang) {
    var dir = localeDirs[lang];
    return dir ? "/" + dir + "/privacy.html" : "/privacy.html";
  }

  function localePath(lang) {
    return isPrivacyPath() ? privacyPath(lang) : homePath(lang);
  }

  function syncLangChrome(lang) {
    var select = document.getElementById("lang");
    if (!select) return;
    select.value = lang;
    var label = select.parentElement && select.parentElement.querySelector(".lang-switch-label");
    var selected = select.options[select.selectedIndex];
    if (label && selected) {
      label.textContent = selected.textContent;
      var probe = document.createElement("span");
      var cs = getComputedStyle(label);
      probe.textContent = selected.textContent;
      probe.style.cssText = "position:fixed;left:-9999px;top:0;white-space:nowrap;visibility:hidden;font:" + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      document.body.appendChild(probe);
      var scs = getComputedStyle(select);
      var width = probe.getBoundingClientRect().width
        + parseFloat(scs.paddingLeft)
        + parseFloat(scs.paddingRight)
        + parseFloat(scs.borderLeftWidth)
        + parseFloat(scs.borderRightWidth);
      probe.remove();
      select.style.width = Math.ceil(width) + "px";
    }
  }

  // Legacy ?lang= bookmarks -> locale paths (static hosting cannot 301).
  var params = new URLSearchParams(location.search);
  var fromQuery = params.get("lang");
  if (fromQuery && hasLocale(fromQuery) && fromQuery !== pageLangFromPath()) {
    location.replace(localePath(fromQuery) + location.hash);
    return;
  }

  var current = document.documentElement.getAttribute("data-page-lang") || pageLangFromPath();
  if (!hasLocale(current)) current = "ko";
  syncLangChrome(current);
  try { localStorage.setItem("helloled-lang", current); } catch (e) {}
  document.querySelectorAll("[data-privacy-link]").forEach(function (link) {
    link.href = privacyPath(current);
  });
  document.querySelectorAll("[data-home-link]").forEach(function (link) {
    link.href = homePath(current);
  });

  var select = document.getElementById("lang");
  if (select) {
    select.addEventListener("change", function () {
      var next = select.value;
      if (!hasLocale(next)) return;
      try { localStorage.setItem("helloled-lang", next); } catch (e) {}
      location.assign(localePath(next) + location.hash);
    });
  }
})();
