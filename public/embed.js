(function () {
  var MAX_ADS_PER_PAGE = 4;
  var PAGE_FLAG = "__lacidawebEmbedBooted";
  var SLOT_ATTR = "data-lw-slot";

  function withVisitor(url, visitor) {
    if (!visitor || !url) return url || "";
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "visitor=" + encodeURIComponent(visitor);
  }

  function esc(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderAd(target, ad, visitor) {
    var fmt = ad.format || "BANNER";

    if (fmt === "TEXT_INLINE") {
      target.innerHTML =
        '<p style="margin:0;font:14px/1.5 system-ui,sans-serif;color:#52525b;">' +
        'Sponsored · <a href="' +
        esc(withVisitor(ad.clickUrl, visitor)) +
        '" target="_blank" rel="noopener sponsored" style="color:#0891b2;font-weight:600;text-decoration:underline;">' +
        esc(ad.headline) +
        "</a></p>" +
        '<p style="margin:4px 0 0;font:9px system-ui,sans-serif;color:#a1a1aa;">Ads by lacidaweb</p>';
      return;
    }

    if (fmt === "TEXT_BOX" || fmt === "TEXT") {
      target.innerHTML =
        '<a href="' +
        esc(withVisitor(ad.clickUrl, visitor)) +
        '" target="_blank" rel="noopener sponsored" style="display:block;max-width:360px;padding:16px;border:1px solid #d4d4d8;border-radius:10px;text-decoration:none;font-family:system-ui,sans-serif;background:#fafafa;">' +
        '<span style="font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#a1a1aa;">Sponsored</span>' +
        '<div style="margin-top:8px;font-weight:700;font-size:15px;color:#18181b;">' +
        esc(ad.headline) +
        "</div>" +
        (ad.primaryText
          ? '<div style="margin-top:6px;font-size:13px;color:#52525b;line-height:1.45;">' +
            esc(ad.primaryText).slice(0, 200) +
            "</div>"
          : "") +
        '<span style="display:inline-block;margin-top:12px;font-size:13px;font-weight:600;color:#059669;">' +
        esc(ad.ctaLabel || "Learn more") +
        " →</span></a>" +
        '<p style="margin:6px 0 0;font:9px system-ui,sans-serif;color:#a1a1aa;">Ads by lacidaweb</p>';
      return;
    }

    var w = ad.width || 300;
    var h = ad.height || 250;

    target.innerHTML =
      '<a href="' +
      esc(withVisitor(ad.clickUrl, visitor)) +
      '" target="_blank" rel="noopener sponsored" style="display:block;max-width:100%;text-decoration:none;color:inherit;font-family:system-ui,sans-serif;">' +
      (ad.imageUrl
        ? '<img src="' +
          esc(ad.imageUrl) +
          '" alt="" style="width:100%;max-width:' +
          w +
          'px;height:auto;border-radius:8px;display:block;" />'
        : '<div style="width:100%;max-width:' +
          w +
          "px;min-height:" +
          Math.max(40, Math.round(h * 0.45)) +
          'px;background:linear-gradient(135deg,#06b6d4,#10b981);border-radius:8px 8px 0 0;"></div>') +
      '<div style="padding:8px 2px;">' +
      '<div style="font-weight:700;font-size:14px;color:#18181b;">' +
      esc(ad.headline) +
      "</div>" +
      '<div style="font-size:12px;color:#52525b;margin-top:4px;">' +
      esc(ad.primaryText || "").slice(0, 120) +
      "</div>" +
      '<span style="display:inline-block;margin-top:8px;padding:6px 12px;background:#06b6d4;color:#fff;font-size:12px;font-weight:600;border-radius:6px;">' +
      esc(ad.ctaLabel || "Learn more") +
      "</span>" +
      "</div></a>" +
      '<div style="font-size:9px;color:#a1a1aa;margin-top:4px;">Ads by lacidaweb</div>';
  }

  function getVisitorId() {
    var key = "lw_visitor";
    try {
      var id = localStorage.getItem(key);
      if (!id) {
        id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(key, id);
      }
      return id;
    } catch (e) {
      return "";
    }
  }

  function countPageAds() {
    return document.querySelectorAll(".lacidaweb-ad").length;
  }

  function mountAd(base, placementKey, target, rotationSeconds, slotIndex) {
    if (!target || target.getAttribute("data-lw-mounted") === "1") return;
    target.setAttribute("data-lw-mounted", "1");

    var visitor = getVisitorId();
    var serveUrl =
      base +
      "/api/ads/serve?placement=" +
      encodeURIComponent(placementKey) +
      (visitor ? "&visitor=" + encodeURIComponent(visitor) : "") +
      (typeof slotIndex === "number" ? "&slotIndex=" + encodeURIComponent(String(slotIndex)) : "");

    fetch(serveUrl, { credentials: "omit" })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        // Always one creative in the DOM at a time (rotation replaces, never stacks).
        var ads = data && data.ads && data.ads.length ? data.ads : data && data.ad ? [data.ad] : [];
        if (!ads.length) {
          target.innerHTML =
            '<a href="' +
            esc(base + "/register/advertiser") +
            '" target="_blank" rel="noopener sponsored" style="display:block;padding:16px;border:1px solid #d4d4d8;border-radius:10px;text-decoration:none;font-family:system-ui,sans-serif;background:#fafafa;">' +
            '<span style="font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#a1a1aa;">Sponsored</span>' +
            '<div style="margin-top:8px;font-weight:700;font-size:15px;color:#18181b;">Advertise with lacidaweb</div>' +
            '<div style="margin-top:6px;font-size:13px;color:#52525b;line-height:1.45;">Reach customers across the network. Launch a campaign in minutes.</div>' +
            '<span style="display:inline-block;margin-top:12px;font-size:13px;font-weight:600;color:#059669;">Get started →</span></a>' +
            '<p style="margin:6px 0 0;font:9px system-ui,sans-serif;color:#a1a1aa;">Ads by lacidaweb</p>';
          return;
        }

        var index = 0;
        renderAd(target, ads[0], visitor);

        var rotate = Number(rotationSeconds || data.rotationSeconds || 0);
        if (ads.length > 1 && rotate > 0) {
          if (target.__lwRotateTimer) clearInterval(target.__lwRotateTimer);
          target.__lwRotateTimer = setInterval(function () {
            index = (index + 1) % ads.length;
            renderAd(target, ads[index], visitor);
          }, rotate * 1000);
        }
      })
      .catch(function () {
        target.innerHTML = "";
      });
  }

  function createSlot(slotKey) {
    var wrap = document.createElement("div");
    wrap.className = "lacidaweb-ad lacidaweb-auto";
    wrap.setAttribute(SLOT_ATTR, slotKey);
    wrap.style.margin = "20px 0";
    wrap.style.clear = "both";
    return wrap;
  }

  function findContentRoot() {
    return (
      document.querySelector("article") ||
      document.querySelector("main") ||
      document.querySelector('[role="main"]') ||
      document.querySelector(".post-content, .entry-content, .content, #content, .post, .article") ||
      document.body
    );
  }

  function findParagraphs(root) {
    return Array.from(root.querySelectorAll("p")).filter(function (p) {
      return (p.textContent || "").trim().length > 60;
    });
  }

  function uniqueSlots(slots) {
    var seen = {};
    var out = [];
    (slots || []).forEach(function (slot) {
      var key = slot.autoSlot || slot.placementKey;
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(slot);
    });
    return out.slice(0, MAX_ADS_PER_PAGE);
  }

  function insertAutoSlots(config, base) {
    var root = findContentRoot();
    if (!root) return;

    var paragraphs = findParagraphs(root);
    var slots = uniqueSlots(config.slots);
    var used = 0;

    slots.forEach(function (slot) {
      if (used >= MAX_ADS_PER_PAGE) return;
      if (countPageAds() >= MAX_ADS_PER_PAGE) return;

      var slotKey = slot.autoSlot || slot.placementKey;
      if (document.querySelector(".lacidaweb-ad[" + SLOT_ATTR + '="' + slotKey + '"]')) return;

      var target = createSlot(slotKey);
      var placed = false;

      if (slot.autoSlot === "top") {
        if (paragraphs.length > 0) {
          paragraphs[0].parentNode.insertBefore(target, paragraphs[0]);
        } else {
          root.insertBefore(target, root.firstChild);
        }
        placed = true;
      } else if (slot.autoSlot === "infeed" && paragraphs.length >= 3) {
        var idx = Math.min(Math.max(1, Math.floor(paragraphs.length / 2)), paragraphs.length - 2);
        paragraphs[idx].parentNode.insertBefore(target, paragraphs[idx].nextSibling);
        placed = true;
      } else if (slot.autoSlot === "anchor") {
        if (paragraphs.length > 0) {
          var last = paragraphs[paragraphs.length - 1];
          last.parentNode.insertBefore(target, last.nextSibling);
        } else {
          root.appendChild(target);
        }
        placed = true;
      } else if (slot.autoSlot === "sidebar" || slot.autoSlot === "mid") {
        if (paragraphs.length >= 2) {
          var mid = Math.min(paragraphs.length - 1, Math.floor(paragraphs.length * 0.7));
          paragraphs[mid].parentNode.insertBefore(target, paragraphs[mid].nextSibling);
          placed = true;
        }
      }

      if (placed) {
        used += 1;
        // slotIndex spreads paid ads across units; leftover indices become house fill.
        mountAd(base, slot.placementKey, target, config.rotationSeconds, used - 1);
      }
    });
  }

  function runAuto(script) {
    if (script.getAttribute("data-lw-auto-loaded") === "1") return;
    script.setAttribute("data-lw-auto-loaded", "1");

    var siteKey = script.getAttribute("data-site");
    if (!siteKey) return;

    var base = script.src ? script.src.replace(/\/embed\.js.*$/, "") : "";
    var configUrl = base + "/api/ads/auto?site=" + encodeURIComponent(siteKey);

    fetch(configUrl, { credentials: "omit" })
      .then(function (res) {
        return res.json();
      })
      .then(function (config) {
        if (!config || !config.enabled || !config.slots || !config.slots.length) return;
        insertAutoSlots(config, base);
      })
      .catch(function () {});
  }

  function runManual(script) {
    if (script.getAttribute("data-lw-loaded") === "1") return;
    script.setAttribute("data-lw-loaded", "1");

    var placementKey = script.getAttribute("data-placement");
    if (!placementKey) return;
    if (countPageAds() >= MAX_ADS_PER_PAGE) return;

    var targetId = script.getAttribute("data-target") || "lacidaweb-ad-" + placementKey;
    var target = document.getElementById(targetId);
    if (!target) {
      target = document.createElement("div");
      target.id = targetId;
      target.className = "lacidaweb-ad lacidaweb-manual";
      target.setAttribute(SLOT_ATTR, "manual-" + placementKey);
      script.parentNode.insertBefore(target, script.nextSibling);
    } else if (target.getAttribute("data-lw-mounted") === "1") {
      return;
    }

    var base = script.src ? script.src.replace(/\/embed\.js.*$/, "") : "";
    mountAd(base, placementKey, target, 0);
  }

  function boot() {
    if (window[PAGE_FLAG]) return;
    window[PAGE_FLAG] = true;

    document.querySelectorAll("script[data-site]").forEach(runAuto);
    document.querySelectorAll("script[data-placement]").forEach(runManual);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
