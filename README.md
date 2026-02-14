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
- `widget-loader.js`
- `reviews-embed.html`

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

The site now expects a third-party reviews widget embed snippet.

1. Choose a provider (examples: Elfsight, SociableKIT, EmbedSocial).
2. Connect your Google Business Profile inside that provider.
3. Copy the provider's embed snippet.
4. Paste it into `reviews-embed.html`.

## Reviews Retention Notes

- Google reviews themselves stay on your Google Business Profile (not on your website host), so they are retained.
- This redesign includes preserved testimonial text and a widget-based live reviews feed.
- If the widget fails, static testimonials still remain visible.

## Picture Retention

- Gallery is currently configured to keep the existing image URLs in use.
