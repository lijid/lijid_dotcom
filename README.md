# Website Redesign for lijideepak.com

This project contains a redesigned one-page website that preserves:
- Core service content from the current site
- Contact information and office hours
- Existing testimonial comments
- Domain usage for `www.lijideepak.com`

## Files
- `index.html`
- `styles.css`
- `site-config.js`
- `lead-form.js`
- `worker.js`
 - `testimonials.js`

## Keep Your Current Domain

After deploying these files to your hosting provider (Netlify, Vercel, Cloudflare Pages, etc.), keep your current domain by updating DNS:

1. Leave domain registration at your current registrar.
2. Point `www` to the new host using:
   - `CNAME www -> <your-host-target>`
3. Point apex/root domain (`lijideepak.com`) using provider instructions:
   - `A` records, or
   - `ALIAS/ANAME` if supported.
4. In hosting dashboard, add both:
   - `lijideepak.com`
   - `www.lijideepak.com`
5. Enable HTTPS and redirect one version to the canonical one.

## Google Reviews Widget Setup

The site uses an Elfsight widget embedded directly in `index.html`.

If you ever need to change the widget:
- Update the `elfsight-app-...` div class in `index.html`
- Keep the Elfsight loader in `<head>` (`https://elfsightcdn.com/platform.js`)

## Lead Form (Email) Setup

The “Get In Touch” button opens a form. Submissions POST to `POST /api/lead` which is handled by the Cloudflare Worker in `worker.js`.

In your Cloudflare Worker/Pages settings, set environment variables:
- `LEAD_TO_EMAIL`: where you want leads delivered (example: `er.liji@gmail.com`)
- `LEAD_TO_EMAIL_2` (optional): backup recipient for lead emails
- `LEAD_FROM_EMAIL`: the sender address used by MailChannels (recommended: `no-reply@lijideepak.com`)
- `MAILCHANNELS_API_KEY` (Secret): API key used to authorize `api.mailchannels.net`

Notes:
- This uses MailChannels (`https://api.mailchannels.net/tx/v1/send`) from inside the Worker.
- Keep `LEAD_FROM_EMAIL` as a domain you control to reduce spam filtering.

## Reviews Retention Notes

- Google reviews themselves stay on your Google Business Profile (not on your website host), so they are retained.
- This redesign includes preserved testimonial text and a widget-based live reviews feed.
- If the widget fails, static testimonials still remain visible.

## Picture Retention

- Gallery is currently configured to keep the existing image URLs in use.
