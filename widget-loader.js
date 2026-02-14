(function () {
  const cfg = window.SITE_CONFIG || {};
  const shareUrl = String(cfg.googleReviewsShareUrl || "").trim();
  const mount = document.getElementById("reviews-widget-mount");
  const statusEl = document.getElementById("reviews-widget-status");
  if (!mount || !statusEl) return;

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  async function main() {
    try {
      const res = await fetch("/reviews-embed.html", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const cleaned = String(html || "").trim();
      if (!cleaned) throw new Error("Empty embed");

      // Render embed snippet (expected to contain provider script tags and/or markup).
      mount.innerHTML = cleaned;
      setStatus("");
    } catch (e) {
      const tail = shareUrl ? ` You can still read reviews here: ${shareUrl}` : "";
      setStatus(`Unable to load reviews widget.${tail}`);
    }
  }

  main();
})();

