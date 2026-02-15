(function () {
  const openBtn = document.getElementById("open-lead-form");
  const modal = document.getElementById("lead-modal");
  const form = document.getElementById("lead-form");
  const statusEl = document.getElementById("lead-status");
  const submitBtn = document.getElementById("lead-submit");

  if (!openBtn || !modal || !form || !statusEl || !submitBtn) return;

  let lastFocus = null;

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

  openBtn.addEventListener("click", () => {
    setStatus("");
    form.reset();
    setOpen(true);
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
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(msg);
      }

      setStatus("Thanks! I’ll reach out soon.");
      form.reset();
      setTimeout(() => setOpen(false), 800);
    } catch (ex) {
      setStatus(ex && ex.message ? String(ex.message) : "Sorry, something went wrong. Please call (612) 800-3202.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send";
    }
  });
})();
