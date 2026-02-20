(function () {
  const openBtn = document.getElementById("open-lead-form");
  const modal = document.getElementById("lead-modal");
  const form = document.getElementById("lead-form");
  const statusEl = document.getElementById("lead-status");
  const submitBtn = document.getElementById("lead-submit");
  const turnstileHost = document.getElementById("turnstile-widget");
  const turnstileSiteKey = String((window.SITE_CONFIG && window.SITE_CONFIG.turnstileSiteKey) || "").trim();

  if (!openBtn || !modal || !form || !statusEl || !submitBtn) return;

  let lastFocus = null;
  let turnstileWidgetId = null;
  let turnstileLoadPromise = null;

  function setOpen(open) {
    modal.classList.toggle("is-open", open);
    modal.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) {
      lastFocus = document.activeElement;
      const first = form.querySelector("input[name='firstName']");
      if (first) first.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function sanitize(s) {
    return String(s || "").trim();
  }

  function looksLikeEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
  }

  function looksLikePhone(s) {
    const digits = String(s || "").replace(/[^\d]/g, "");
    return digits.length >= 7;
  }

  function validate(payload) {
    if (!payload.firstName) return "Please enter your first name.";
    if (!payload.phone && !payload.email) return "Please enter a phone number or an email address.";
    return "";
  }

  function ensureTurnstileScript() {
    if (window.turnstile) return Promise.resolve();
    if (turnstileLoadPromise) return turnstileLoadPromise;
    turnstileLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-turnstile='1']");
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Turnstile")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.setAttribute("data-turnstile", "1");
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Turnstile"));
      document.head.appendChild(script);
    });
    return turnstileLoadPromise;
  }

  async function ensureTurnstileRendered() {
    if (!turnstileSiteKey || !turnstileHost) return;
    await ensureTurnstileScript();
    if (turnstileWidgetId !== null) return;
    turnstileWidgetId = window.turnstile.render(turnstileHost, {
      sitekey: turnstileSiteKey,
      theme: "light",
    });
  }

  openBtn.addEventListener("click", () => {
    setStatus("");
    form.reset();
    if (turnstileWidgetId !== null && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId);
    }
    setOpen(true);
    ensureTurnstileRendered().catch(() => {
      setStatus("Captcha failed to load. Please refresh and try again.");
    });
  });

  modal.addEventListener("click", (e) => {
    const el = e.target;
    if (el && el.getAttribute && el.getAttribute("data-close") === "1") {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      setOpen(false);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");

    const fd = new FormData(form);
    const payload = {
      firstName: sanitize(fd.get("firstName")),
      lastName: sanitize(fd.get("lastName")),
      phone: sanitize(fd.get("phone")),
      email: sanitize(fd.get("email")),
      company: sanitize(fd.get("company")), // honeypot
      page: window.location.href,
      ts: new Date().toISOString(),
      turnstileToken:
        turnstileWidgetId !== null && window.turnstile ? window.turnstile.getResponse(turnstileWidgetId) : "",
    };

    // Be forgiving if the user puts email in the phone field or vice versa.
    if (!payload.email && payload.phone && looksLikeEmail(payload.phone)) {
      payload.email = payload.phone;
      payload.phone = "";
    }
    if (!payload.phone && payload.email && !looksLikeEmail(payload.email) && looksLikePhone(payload.email)) {
      payload.phone = payload.email;
      payload.email = "";
    }

    const err = validate(payload);
    if (err) {
      setStatus(err);
      return;
    }

    if (turnstileSiteKey && !payload.turnstileToken) {
      setStatus("Please complete the captcha.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const data = await res.json();
          const code = data && data.error ? String(data.error) : "";
          if (code === "invalid_phone") msg = "Please enter a valid phone number (or leave it blank and use email).";
          else if (code === "invalid_email") msg = "Please enter a valid email address (or leave it blank and use phone).";
          else if (code === "missing_first_name") msg = "Please enter your first name.";
          else if (code === "missing_contact") msg = "Please enter a phone number or an email address.";
          else if (code === "server_not_configured")
            msg = "The contact form is not configured yet. Please call (612) 800-3202.";
          else if (code === "mail_send_failed")
            msg = "Email delivery failed. Please call (612) 800-3202 while we fix this.";
          else if (code === "captcha_failed") msg = "Captcha verification failed. Please try again.";
          else if (code === "rate_limited") msg = "Too many requests. Please wait a few minutes and try again.";
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(msg);
      }

      setStatus("Thanks! I’ll reach out soon.");
      form.reset();
      if (turnstileWidgetId !== null && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId);
      }
      setTimeout(() => setOpen(false), 800);
    } catch (ex) {
      setStatus(ex && ex.message ? String(ex.message) : "Sorry, something went wrong. Please call (612) 800-3202.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send";
    }
  });
})();
