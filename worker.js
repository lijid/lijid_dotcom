function jsonResponse(obj, init) {
  const headers = new Headers(init && init.headers ? init.headers : undefined);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(obj), { ...init, headers });
}

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  // Allow same-origin and common dev cases; reflect origin to keep cookies off by default.
  if (!origin) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function normalize(s) {
  return String(s || "").trim();
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isPhoneLike(s) {
  // Loose check: at least 7 digits.
  const digits = String(s || "").replace(/[^\d]/g, "");
  return digits.length >= 7;
}

async function sendMail({ toEmail, fromEmail, subject, text, html }) {
  const payload = {
    personalizations: [{ to: [{ email: toEmail }] }],
    from: { email: fromEmail, name: "LijiDeepak.com" },
    subject,
    content: [
      { type: "text/plain", value: text },
      { type: "text/html", value: html },
    ],
  };

  const res = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`mailchannels_failed: ${res.status} ${body}`.slice(0, 400));
  }
}

async function handleLead(request, env, ctx) {
  if (request.method === "OPTIONS") {
    return jsonResponse({ ok: true }, { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, { status: 405 });
  }

  const toEmail = normalize(env.LEAD_TO_EMAIL);
  const fromEmail = normalize(env.LEAD_FROM_EMAIL);
  if (!toEmail || !fromEmail) {
    return jsonResponse(
      { ok: false, error: "server_not_configured" },
      { status: 500, headers: corsHeaders(request) }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, { status: 400, headers: corsHeaders(request) });
  }

  const firstName = normalize(body.firstName);
  const lastName = normalize(body.lastName);
  let phone = normalize(body.phone);
  let email = normalize(body.email);
  const company = normalize(body.company); // honeypot
  const page = normalize(body.page);
  const ts = normalize(body.ts);

  // Users often paste email into the phone field (or vice-versa). Be forgiving.
  if (!email && phone && isEmail(phone)) {
    email = phone;
    phone = "";
  }
  if (!phone && email && !isEmail(email) && isPhoneLike(email)) {
    phone = email;
    email = "";
  }

  if (company) {
    // Spam: pretend success.
    return jsonResponse({ ok: true }, { headers: corsHeaders(request) });
  }

  if (!firstName) {
    return jsonResponse({ ok: false, error: "missing_first_name" }, { status: 400, headers: corsHeaders(request) });
  }

  if (!phone && !email) {
    return jsonResponse({ ok: false, error: "missing_contact" }, { status: 400, headers: corsHeaders(request) });
  }

  if (email && !isEmail(email)) {
    return jsonResponse({ ok: false, error: "invalid_email" }, { status: 400, headers: corsHeaders(request) });
  }

  if (phone && !isPhoneLike(phone)) {
    return jsonResponse({ ok: false, error: "invalid_phone" }, { status: 400, headers: corsHeaders(request) });
  }

  const name = `${firstName}${lastName ? " " + lastName : ""}`.trim();
  const subject = `New website lead: ${name}`;
  const text =
    `Name: ${name}\n` +
    `Phone: ${phone || "-"}\n` +
    `Email: ${email || "-"}\n` +
    `Page: ${page || "-"}\n` +
    `Time: ${ts || "-"}\n`;
  const html =
    `<p><strong>Name:</strong> ${escapeHtml(name)}</p>` +
    `<p><strong>Phone:</strong> ${escapeHtml(phone || "-")}</p>` +
    `<p><strong>Email:</strong> ${escapeHtml(email || "-")}</p>` +
    `<p><strong>Page:</strong> ${page ? `<a href="${escapeAttr(page)}">${escapeHtml(page)}</a>` : "-"}</p>` +
    `<p><strong>Time:</strong> ${escapeHtml(ts || "-")}</p>`;

  ctx.waitUntil(sendMail({ toEmail, fromEmail, subject, text, html }));

  return jsonResponse({ ok: true }, { headers: corsHeaders(request) });
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(s) {
  // minimal for href
  return String(s || "").replaceAll('"', "%22");
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/lead") {
      return handleLead(request, env, ctx);
    }

    // Serve static assets.
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }
    return new Response("Assets binding not configured", { status: 500 });
  },
};
