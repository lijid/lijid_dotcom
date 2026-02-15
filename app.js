(function () {
  const cfg = window.SITE_CONFIG || {};
  const version = String(cfg.siteVersion || "").trim();
  if (!version) return;

  const versionEl = document.getElementById("site-version");
  if (versionEl) versionEl.textContent = version;

  const meta = document.querySelector('meta[name="site-version"]');
  if (meta) meta.setAttribute("content", version);

  const reviewsUrl = String(cfg.googleReviewsUrl || "").trim();
  const reviewsLink = document.getElementById("open-google-reviews");
  if (reviewsLink && reviewsUrl) {
    reviewsLink.setAttribute("href", reviewsUrl);
  }
})();
