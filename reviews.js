(function () {
  const statusEl = document.getElementById("live-review-status");
  const cardsEl = document.getElementById("live-review-cards");
  const cfg = window.SITE_CONFIG || {};
  const apiKey = (cfg.googleMapsApiKey || "").trim();
  const configuredPlaceId = (cfg.googlePlaceId || "").trim();
  const placeQuery = (cfg.googlePlaceQuery || "").trim();
  const maxReviews = Number(cfg.maxLiveReviews) || 4;
  const placeIdCacheKey = "ld_google_place_id_v1";

  function setStatus(message) {
    if (statusEl) {
      statusEl.textContent = message;
    }
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
    const full = "★".repeat(Math.max(0, Math.min(5, rating || 0)));
    const empty = "☆".repeat(Math.max(0, 5 - (rating || 0)));
    return `${full}${empty}`;
  }

  function renderReviews(place) {
    const all = Array.isArray(place.reviews) ? place.reviews : [];
    const sorted = all
      .slice()
      .sort((a, b) => (b.time || 0) - (a.time || 0))
      .slice(0, maxReviews);

    if (!sorted.length) {
      setStatus("No live reviews available right now.");
      return;
    }

    cardsEl.innerHTML = sorted
      .map((review) => {
        const author = escapeHtml(review.author_name || "Google User");
        const text = escapeHtml(review.text || "");
        const relative = escapeHtml(review.relative_time_description || "");
        const stars = renderStars(review.rating);

        return `
          <article class="card">
            <p class="stars" aria-label="${review.rating || 0} out of 5 stars">${stars}</p>
            <blockquote>"${text}"</blockquote>
            <p class="author">- ${author}</p>
            <p class="meta">${relative}</p>
          </article>
        `;
      })
      .join("");

    const total = Number(place.user_ratings_total || 0);
    const rating = Number(place.rating || 0).toFixed(1);
    setStatus(`Google rating: ${rating}/5 from ${total} reviews.`);
  }

  function canRetryWithQuery(status) {
    // These usually indicate the Place ID is wrong/expired.
    return (
      status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST ||
      status === google.maps.places.PlacesServiceStatus.NOT_FOUND
    );
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
      if (window.localStorage) {
        window.localStorage.setItem(placeIdCacheKey, id);
      }
    } catch {
      // ignore cache issues
    }
  }

  function resolvePlaceId(service, onResolved) {
    const cached = getCachedPlaceId().trim();
    if (cached) {
      onResolved(cached);
      return;
    }

    if (!placeQuery) {
      onResolved("");
      return;
    }

    service.findPlaceFromQuery(
      {
        query: placeQuery,
        fields: ["place_id", "name", "formatted_address"],
      },
      function (results, status) {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results.length) {
          onResolved("");
          return;
        }
        const id = (results[0].place_id || "").trim();
        if (id) {
          setCachedPlaceId(id);
        }
        onResolved(id);
      }
    );
  }

  function fetchDetails(service, placeId, allowRetry) {
    service.getDetails(
      {
        placeId,
        fields: ["name", "rating", "user_ratings_total", "reviews", "url"],
      },
      function (place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          renderReviews(place);
          return;
        }

        if (allowRetry && canRetryWithQuery(status)) {
          resolvePlaceId(service, function (resolved) {
            if (!resolved) {
              setStatus("Unable to load live Google reviews at the moment.");
              return;
            }
            fetchDetails(service, resolved, false);
          });
          return;
        }

        setStatus("Unable to load live Google reviews at the moment.");
      }
    );
  }

  function initPlaces() {
    const service = new google.maps.places.PlacesService(document.createElement("div"));

    const cached = getCachedPlaceId().trim();
    const initialId = cached || configuredPlaceId;
    if (!initialId) {
      resolvePlaceId(service, function (resolved) {
        if (!resolved) {
          setStatus("Unable to load live Google reviews at the moment.");
          return;
        }
        fetchDetails(service, resolved, false);
      });
      return;
    }

    fetchDetails(service, initialId, true);
  }

  function loadGoogleMapsScript() {
    const callbackName = "initLijiGoogleReviews";
    window[callbackName] = initPlaces;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = function () {
      setStatus("Unable to load Google Maps script. Check API key and restrictions.");
    };
    document.head.appendChild(script);
  }

  if (!cardsEl || !statusEl) {
    return;
  }

  if (!apiKey) {
    setStatus("Live reviews are not configured yet. Add the Google Maps API key in site-config.js.");
    return;
  }

  loadGoogleMapsScript();
})();
