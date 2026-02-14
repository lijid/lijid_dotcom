(function () {
  const statusEl = document.getElementById("live-review-status");
  const cardsEl = document.getElementById("live-review-cards");
  if (!statusEl || !cardsEl) return;

  const cfg = window.SITE_CONFIG || {};
  const apiKey = String(cfg.googleMapsApiKey || "").trim();
  const placeQuery = String(cfg.googlePlaceQuery || "").trim();
  const reviewsShareUrl = String(cfg.googleReviewsShareUrl || "").trim();
  const maxReviews = Number(cfg.maxLiveReviews) || 4;

  // New Places API uses ids that can change; cache the resolved id in-browser.
  const placeIdCacheKey = "ld_google_place_id_v3";
  const debug = new URLSearchParams(window.location.search).get("debugReviews") === "1";

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function debugLog(...args) {
    if (!debug) return;
    // eslint-disable-next-line no-console
    console.log("[live-reviews]", ...args);
  }

  function debugError(...args) {
    if (!debug) return;
    // eslint-disable-next-line no-console
    console.error("[live-reviews]", ...args);
  }

  function setStatusWithDebug(message, err) {
    if (!debug) {
      setStatus(message);
      return;
    }
    const name = err && err.name ? String(err.name) : "Error";
    const msg = err && err.message ? String(err.message) : String(err || "");
    setStatus(`${message} (${name}: ${msg})`);
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderStars(rating) {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    const full = "★".repeat(r);
    const empty = "☆".repeat(5 - r);
    return `${full}${empty}`;
  }

  function getTextValue(maybeLocalizedText) {
    if (!maybeLocalizedText) return "";
    if (typeof maybeLocalizedText === "string") return maybeLocalizedText;
    // Places (new) returns { text, languageCode } for some fields.
    if (typeof maybeLocalizedText.text === "string") return maybeLocalizedText.text;
    return "";
  }

  function getCachedPlaceId() {
    try {
      return (window.localStorage && window.localStorage.getItem(placeIdCacheKey)) || "";
    } catch {
      return "";
    }
  }

  function setCachedPlaceId(id) {
    try {
      if (window.localStorage) window.localStorage.setItem(placeIdCacheKey, id);
    } catch {
      // ignore
    }
  }

  function clearCachedPlaceId() {
    try {
      if (window.localStorage) window.localStorage.removeItem(placeIdCacheKey);
    } catch {
      // ignore
    }
  }

  async function loadMapsJs() {
    if (!apiKey) throw new Error("Missing Google Maps API key");
    if (window.google && google.maps && typeof google.maps.importLibrary === "function") return;

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load https://maps.googleapis.com/maps/api/js"));
      document.head.appendChild(script);
    });
  }

  function tryParseTimeSeconds(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function renderReviewCards(reviews, placeMeta) {
    const sorted = (Array.isArray(reviews) ? reviews : [])
      .slice()
      .sort((a, b) => {
        const ta = tryParseTimeSeconds(a.time) || Date.parse(a.publishTime || "") / 1000 || 0;
        const tb = tryParseTimeSeconds(b.time) || Date.parse(b.publishTime || "") / 1000 || 0;
        return tb - ta;
      })
      .slice(0, maxReviews);

    if (!sorted.length) {
      setStatus("No live reviews available right now.");
      return;
    }

    cardsEl.innerHTML = sorted
      .map((review) => {
        const rating = Number(review.rating) || 0;
        const stars = renderStars(rating);

        // Legacy PlacesService fields:
        const authorLegacy = review.author_name;
        const textLegacy = review.text;
        const relLegacy = review.relative_time_description;

        // New Place fields:
        const authorNew = review.authorAttribution && review.authorAttribution.displayName;
        const textNew = getTextValue(review.text);
        const relNew = review.relativePublishTimeDescription;

        const author = escapeHtml(authorNew || authorLegacy || "Google User");
        const text = escapeHtml(textNew || textLegacy || "");
        const relative = escapeHtml(relNew || relLegacy || "");

        return `
          <article class="card">
            <p class="stars" aria-label="${rating} out of 5 stars">${stars}</p>
            <blockquote>"${text}"</blockquote>
            <p class="author">- ${author}</p>
            <p class="meta">${relative}</p>
          </article>
        `;
      })
      .join("");

    const rating = Number(placeMeta.rating || 0);
    const count = Number(placeMeta.userRatingCount || placeMeta.user_ratings_total || 0);
    const ratingText = rating ? `${rating.toFixed(1)}/5` : "N/A";
    const countText = count ? `${count}` : "N/A";
    setStatus(`Google rating: ${ratingText} from ${countText} reviews.`);
  }

  async function resolvePlaceId(placesLib) {
    const cached = getCachedPlaceId().trim();
    if (cached) return cached;

    if (!placeQuery) return "";

    // Preferred: new Places API search.
    if (placesLib.Place && typeof placesLib.Place.searchByText === "function") {
      const resp = await placesLib.Place.searchByText({
        textQuery: placeQuery,
        fields: ["id", "displayName", "formattedAddress"],
      });
      const place = resp && resp.places && resp.places[0];
      const id = place && String(place.id || "").trim();
      if (id) {
        setCachedPlaceId(id);
        return id;
      }
    }

    // Fallback: Autocomplete predictions (legacy).
    if (google.maps.places && typeof google.maps.places.AutocompleteService === "function") {
      const ac = new google.maps.places.AutocompleteService();
      const pred = await new Promise((resolve) => {
        ac.getPlacePredictions({ input: placeQuery }, function (preds, status) {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !preds || !preds.length) {
            resolve(null);
            return;
          }
          resolve(preds[0]);
        });
      });
      const id = pred && String(pred.place_id || "").trim();
      if (id) {
        setCachedPlaceId(id);
        return id;
      }
    }

    return "";
  }

  async function fetchViaNewPlaceApi(placesLib) {
    if (!placesLib.Place) throw new Error("Places library missing Place");

    const placeId = await resolvePlaceId(placesLib);
    if (!placeId) throw new Error("Unable to resolve place id");

    debugLog("Resolved place id:", placeId);

    const place = new placesLib.Place({ id: placeId });
    await place.fetchFields({
      fields: ["displayName", "rating", "userRatingCount", "reviews", "googleMapsUri"],
    });

    const reviews = place.reviews || [];
    renderReviewCards(reviews, place);
  }

  function fetchViaLegacyPlacesService() {
    // Best-effort fallback for environments that don't support the new Place API.
    const service = new google.maps.places.PlacesService(document.createElement("div"));
    const placeId = String(cfg.googlePlaceId || "").trim();
    if (!placeId) {
      setStatus("Unable to load live Google reviews at the moment.");
      return;
    }

    service.getDetails(
      { placeId, fields: ["name", "rating", "user_ratings_total", "reviews", "url"] },
      function (place, status) {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          setStatus("Unable to load live Google reviews at the moment.");
          return;
        }
        renderReviewCards(place.reviews || [], place);
      }
    );
  }

  async function main() {
    // Manual escape hatch: add ?clearPlaceCache=1 once.
    if (new URLSearchParams(window.location.search).get("clearPlaceCache") === "1") {
      clearCachedPlaceId();
    }

    if (!apiKey) {
      setStatus("Live reviews are not configured yet. Add the Google Maps API key in site-config.js.");
      return;
    }

    setStatus("Loading live reviews...");
    try {
      await loadMapsJs();
    } catch (e) {
      debugError("Maps JS load failed", e);
      setStatusWithDebug("Unable to load Google Maps JavaScript", e);
      return;
    }

    let placesLib = null;
    try {
      placesLib = await google.maps.importLibrary("places");
    } catch {
      placesLib = null;
    }

    if (!placesLib) {
      setStatus("Unable to load live Google reviews at the moment.");
      if (debug) {
        setStatus(
          "Unable to import Google Places library. Check that 'Maps JavaScript API' and 'Places API (New)' are enabled and billing is active."
        );
      }
      return;
    }

    // If Place API fetch fails (often due to cached/invalid ids), clear cache and retry once.
    if (placesLib && placesLib.Place) {
      try {
        await fetchViaNewPlaceApi(placesLib);
        return;
      } catch (e) {
        debugError("New Place API failed (first try)", e);
        clearCachedPlaceId();
        try {
          await fetchViaNewPlaceApi(placesLib);
          return;
        } catch (e2) {
          debugError("New Place API failed (second try)", e2);
          // fall through
        }
      }
    }

    // Legacy fallback.
    try {
      fetchViaLegacyPlacesService();
      return;
    } catch (e) {
      debugError("Legacy PlacesService fallback failed", e);
      // fall through
    }

    const link = reviewsShareUrl ? ` You can still read reviews here: ${reviewsShareUrl}` : "";
    setStatus(`Unable to load live Google reviews at the moment.${link}`);
  }

  main().catch((e) => {
    debugError("Unhandled failure in main()", e);
    const link = reviewsShareUrl ? ` You can still read reviews here: ${reviewsShareUrl}` : "";
    setStatusWithDebug(`Unable to load live Google reviews at the moment.${link}`, e);
  });
})();
