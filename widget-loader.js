(function () {
  const cfg = window.SITE_CONFIG || {};
  const shareUrl = String(cfg.googleReviewsShareUrl || "").trim();
  const mount = document.getElementById("reviews-widget-mount");
  const statusEl = document.getElementById("reviews-widget-status");
  if (!mount || !statusEl) return;

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function appendAndRunScripts(fragment, target) {
    // Browsers generally do not execute <script> tags inserted via innerHTML.
    // Re-create them so the widget provider's JS actually loads.
    const scripts = Array.from(fragment.querySelectorAll("script"));
    for (const old of scripts) {
      const s = document.createElement("script");
      for (const { name, value } of Array.from(old.attributes)) {
        s.setAttribute(name, value);
      }
      if (old.textContent && old.textContent.trim()) {
        s.textContent = old.textContent;
      }
      old.replaceWith(s);
    }

    // If the snippet includes <script src=...>, appending to <head> is safest.
    // Leave non-script nodes in the mount.
    for (const node of Array.from(fragment.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "SCRIPT") {
        document.head.appendChild(node);
      } else {
        target.appendChild(node);
      }
    }
  }

  async function main() {
    try {
      const res = await fetch("/reviews-embed.html", { cache: "no-store", redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const cleaned = String(html || "").trim();
      if (!cleaned) throw new Error("Empty embed");

      // Render embed snippet (expected to contain provider script tags and/or markup).
      mount.innerHTML = "";
      const tpl = document.createElement("template");
      tpl.innerHTML = cleaned;
      appendAndRunScripts(tpl.content, mount);
      setStatus("");
    } catch (e) {
      const tail = shareUrl ? ` You can still read reviews here: ${shareUrl}` : "";
      setStatus(`Unable to load reviews widget.${tail}`);
    }
  }

  main();
})();
