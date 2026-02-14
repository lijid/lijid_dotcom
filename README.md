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
- `reviews.js`

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

## Live Google Reviews Setup

The site now has a live reviews section that pulls the latest Google reviews automatically.

1. Sign in with `er.liji@gmail.com` at Google Cloud Console.
2. Create/select a project.
3. Enable APIs:
   - `Places API`
   - `Maps JavaScript API`
4. Create an API key and restrict it:
   - Application restriction: HTTP referrers (`www.lijideepak.com/*`, `lijideepak.com/*`)
   - API restriction: limit to Places API + Maps JavaScript API
5. Open `site-config.js` and set:
   - `googleMapsApiKey: "YOUR_KEY_HERE"`
6. Keep this place id as-is unless your business listing changes:
   - `googlePlaceId: "ChIJ9WYin_E39ocRjjv-SfNSlAY"`

## Reviews Retention Notes

- Google reviews themselves stay on your Google Business Profile (not on your website host), so they are retained.
- This redesign includes preserved testimonial text and a live reviews feed.
- If the live feed fails, static testimonials still remain visible.

## Picture Retention

- Gallery is currently configured to keep the existing image URLs in use.
