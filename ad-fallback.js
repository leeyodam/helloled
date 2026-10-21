/* AdSense slot fallback. The notice is always a sibling after the ins, never inside it. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.HelloAdFallback = api;
  if (typeof document !== "undefined" && !api._disableAutoMount) {
    var start = function () { api.mount(document); };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var MAX_RETRIES = 3;
  var TIMEOUT_MS = 10000;
  var DELAYS = [1000, 2000, 4000];
  var MESSAGES = {
    ko: "원활한 서비스 이용을 위해 광고 차단 프로그램을 해제해 주세요. 여러분의 지원이 서비스 운영에 있어 큰 도움이 됩니다.",
    en: "Please turn off your ad blocker so the service can run smoothly. Your support is a big help in keeping the service going.",
    ja: "サービスを快適にご利用いただくため、広告ブロックを解除してください。皆さまの支援が運営の大きな力になります。",
    zh: "为了顺畅使用服务，请关闭广告拦截。您的支持对服务运营帮助很大。",
    "zh-Hans": "为了顺畅使用服务，请关闭广告拦截。您的支持对服务运营帮助很大。",
    es: "Para usar el servicio con normalidad, desactiva el bloqueador de anuncios. Tu apoyo es una gran ayuda para mantener el servicio.",
    "es-ES": "Para usar el servicio con normalidad, desactiva el bloqueador de anuncios. Tu apoyo es una gran ayuda para mantener el servicio.",
    "es-419": "Para usar el servicio sin problemas, desactiva el bloqueador de anuncios. Tu apoyo ayuda mucho a mantener el servicio."
  };
  var NOTICE_STYLE = "margin:0.75rem auto;max-width:40rem;padding:0 1.25rem;text-align:center;font-size:0.875rem;line-height:1.5;color:#4e5968;";

  function createTracker() {
    var failures = 0;
    var blocked = false;
    var loaded = false;
    return {
      get showFallback() {
        return !loaded && (blocked || failures > MAX_RETRIES);
      },
      get adVisible() {
        return loaded;
      },
      fail: function (isBlocked) {
        if (loaded) return { action: "ignore", delay: 0 };
        if (blocked || failures > MAX_RETRIES) {
          return { action: "showFallback", delay: 0 };
        }
        if (isBlocked) {
          blocked = true;
          return { action: "showFallback", delay: 0 };
        }
        failures += 1;
        if (failures > MAX_RETRIES) return { action: "showFallback", delay: 0 };
        return { action: "wait", delay: DELAYS[failures - 1] };
      },
      succeed: function () {
        loaded = true;
        blocked = false;
        failures = 0;
      }
    };
  }

  function isAdBlock(scriptLoaded, otherNetworkOk) {
    return scriptLoaded === false && otherNetworkOk === true;
  }

  function messageFor(lang) {
    var key = (lang || "ko").trim();
    if (MESSAGES[key]) return MESSAGES[key];
    var base = key.split("-")[0];
    return MESSAGES[base] || MESSAGES.ko;
  }

  function placeNotice(ins, text) {
    var buried = ins.querySelector ? ins.querySelector(".hello-ad-notice") : null;
    if (buried && buried.parentNode === ins) {
      ins.insertAdjacentElement("afterend", buried);
      buried.textContent = text;
      return buried;
    }
    var next = ins.nextElementSibling;
    if (next && next.classList && next.classList.contains("hello-ad-notice")) {
      next.textContent = text;
      return next;
    }
    var notice = ins.ownerDocument.createElement("p");
    notice.className = "hello-ad-notice";
    notice.hidden = true;
    notice.textContent = text;
    if (notice.setAttribute) notice.setAttribute("style", NOTICE_STYLE);
    ins.insertAdjacentElement("afterend", notice);
    return notice;
  }

  function snapshot(ins) {
    var names = [
      "data-ad-client",
      "data-ad-slot",
      "data-ad-format",
      "data-ad-layout",
      "data-ad-layout-key",
      "data-full-width-responsive"
    ];
    var attrs = { style: ins.getAttribute("style") || "display:block" };
    names.forEach(function (name) {
      var value = ins.getAttribute(name);
      if (value) attrs[name] = value;
    });
    return attrs;
  }

  function createIns(doc, attrs) {
    var fresh = doc.createElement("ins");
    fresh.className = "adsbygoogle";
    Object.keys(attrs).forEach(function (name) {
      fresh.setAttribute(name, attrs[name]);
    });
    return fresh;
  }

  function loadAdScript(doc, client) {
    return new Promise(function (resolve) {
      var existing = doc.querySelector('script[src*="adsbygoogle.js"]');
      if (existing && existing.getAttribute("data-hello-failed") === "1") {
        resolve(false);
        return;
      }
      var view = doc.defaultView || root;
      if (existing && (existing.getAttribute("data-hello-loaded") === "1" || view.adsbygoogle)) {
        resolve(true);
        return;
      }
      var script = existing || doc.createElement("script");
      var src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      if (client) src += "?client=" + encodeURIComponent(client);
      var done = false;
      function finish(ok) {
        if (done) return;
        done = true;
        script.setAttribute(ok ? "data-hello-loaded" : "data-hello-failed", "1");
        resolve(ok);
      }
      script.async = true;
      script.crossOrigin = "anonymous";
      script.addEventListener("load", function () { finish(true); });
      script.addEventListener("error", function () { finish(false); });
      if (!existing) {
        script.src = src;
        (doc.head || doc.documentElement).appendChild(script);
      } else if (!script.getAttribute("src")) {
        script.src = src;
      }
    });
  }

  function probeOther() {
    if (typeof fetch !== "function") return Promise.resolve(false);
    return fetch("/styles.css", { method: "GET", cache: "no-store" }).then(function (res) {
      return !!(res && (res.ok || res.status === 304));
    }).catch(function () {
      return false;
    });
  }

  function detectBlock(doc, client) {
    return Promise.all([
      loadAdScript(doc, client),
      probeOther()
    ]).then(function (pair) {
      return isAdBlock(pair[0], pair[1]);
    });
  }

  function mount(doc, options) {
    options = options || {};
    var list = doc.querySelectorAll("ins.adsbygoogle");
    var slots = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].getAttribute("data-hello-bound") === "1") continue;
      if (list[i].getAttribute("data-hello-clone") === "1") continue;
      slots.push(list[i]);
    }
    if (!slots.length) return;
    var client = slots[0].getAttribute("data-ad-client") || "";
    var detect = options.detectBlock || function () { return detectBlock(doc, client); };
    var blocked = false;
    var controllers = slots.map(function (ins) {
      return bindSlot(ins, function () { return blocked; }, options);
    });
    detect(doc, client).then(function (isBlocked) {
      blocked = !!isBlocked;
      if (!blocked) return;
      controllers.forEach(function (controller) { controller.abort(); });
    });
  }

  function bindSlot(ins, isBlocked, options) {
    var doc = ins.ownerDocument;
    var lang = doc.documentElement && doc.documentElement.lang;
    var notice = placeNotice(ins, messageFor(lang));
    var tracker = createTracker();
    var attrs = snapshot(ins);
    var timers = [];
    var stopped = false;
    var shown = null;
    ins.setAttribute("data-hello-bound", "1");

    function showNotice() {
      if (tracker.adVisible || shown) return;
      notice.hidden = false;
    }

    function hideNotice() {
      notice.hidden = true;
    }

    function clearTimers() {
      timers.forEach(function (timer) { clearTimeout(timer); });
      timers = [];
    }

    function pushAd() {
      try {
        var view = doc.defaultView || root;
        (view.adsbygoogle = view.adsbygoogle || []).push({});
        return true;
      } catch (e) {
        return false;
      }
    }

    function watch(target, onStatus) {
      var Observer = (doc.defaultView && doc.defaultView.MutationObserver) || root.MutationObserver;
      if (typeof Observer !== "function") return { disconnect: function () {} };
      var observer = new Observer(function () {
        var status = target.getAttribute("data-ad-status");
        if (status === "filled" || status === "unfilled") onStatus(status);
      });
      observer.observe(target, { attributes: true, attributeFilter: ["data-ad-status"] });
      return observer;
    }

    function succeed(target) {
      if (shown && shown !== target) {
        target.remove();
        return;
      }
      shown = target;
      stopped = true;
      clearTimers();
      tracker.succeed();
      target.hidden = false;
      target.removeAttribute("data-hello-pending");
      hideNotice();
      var parent = target.parentNode;
      if (!parent) return;
      var others = parent.querySelectorAll("ins.adsbygoogle");
      for (var i = 0; i < others.length; i++) {
        if (others[i] !== target) others[i].remove();
      }
    }

    function decide(fromBlock) {
      if (stopped || tracker.adVisible) return;
      var decision = tracker.fail(fromBlock || isBlocked());
      if (decision.action === "wait") {
        var timer = setTimeout(function () {
          if (stopped || tracker.adVisible) return;
          var fresh = createIns(doc, attrs);
          fresh.setAttribute("data-hello-clone", "1");
          notice.parentNode.insertBefore(fresh, notice);
          runAttempt(fresh);
        }, decision.delay);
        timers.push(timer);
        return;
      }
      if (decision.action === "showFallback") {
        stopped = true;
        clearTimers();
        showNotice();
      }
    }

    function runAttempt(target) {
      var settled = false;
      function onStatus(status) {
        if (status === "filled") {
          settled = true;
          if (observer) observer.disconnect();
          succeed(target);
          return;
        }
        if (status === "unfilled") {
          if (settled) return;
          settled = true;
          if (observer) observer.disconnect();
          target.hidden = true;
          decide(false);
        }
      }
      var observer = watch(target, onStatus);
      var existing = target.getAttribute("data-ad-status");
      if (existing === "filled" || existing === "unfilled") {
        onStatus(existing);
        return;
      }
      var timer = setTimeout(function () {
        if (settled || stopped || tracker.adVisible) return;
        settled = true;
        target.setAttribute("data-hello-pending", "1");
        target.hidden = true;
        decide(false);
      }, TIMEOUT_MS);
      timers.push(timer);
      if (!pushAd()) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        decide(false);
      }
    }

    runAttempt(ins);

    return {
      abort: function () {
        if (tracker.adVisible || shown) return;
        stopped = true;
        clearTimers();
        tracker.fail(true);
        showNotice();
      }
    };
  }

  return {
    createTracker: createTracker,
    isAdBlock: isAdBlock,
    messageFor: messageFor,
    placeNotice: placeNotice,
    mount: mount,
    maxRetries: MAX_RETRIES,
    timeoutMs: TIMEOUT_MS
  };
});
