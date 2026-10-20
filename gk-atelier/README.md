# GK Atelier by Ghada Khalil — website

*Handmade Creations for Meaningful Moments.*

A bilingual (English / Arabic) website for GK Atelier, a handmade studio in
Egypt serving customers in Egypt and the Gulf. It showcases Ghada's work and
turns interest into **WhatsApp conversations**. There is deliberately no
checkout, payment, account or stock system: every journey ends with the
customer reviewing a prefilled message and sending it to Ghada themselves.

- **For Ghada / content editors:** see [EDITING-GUIDE.md](EDITING-GUIDE.md)
- **Before going live:** see [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md)

## Quick start

```bash
npm install
npm run dev        # build + preview at http://localhost:4173
npm run check      # check the content files and list what's left before launch
npm test           # unit + build tests
npm run test:e2e   # browser tests (Playwright, phone + desktop)
npm run build:release   # production build — refuses to run until launch-ready
```

Requires Node 20.9+. The output is a plain static site in `dist/`.

## What's included

| Page | URL (Arabic · English) |
| --- | --- |
| Home | `/` · `/en/` |
| Collections | `/collections/` · `/en/collections/` |
| Collection (×7) | `/collections/wedding-bridal/` … |
| Product (one per file in `content/products/`) | `/products/<slug>/` |
| About Ghada | `/about/` |
| Custom orders (enquiry form → WhatsApp) | `/custom-orders/` |
| Contact | `/contact/` |
| Privacy notice | `/privacy/` |
| Not found (both languages) | `/404.html` |

Every page exists in both languages. **Arabic is the default**: it lives at
the main address with a right-to-left layout, Arabic typefaces (Amiri for
headings, IBM Plex Sans Arabic for text) and its own titles, descriptions and
WhatsApp messages. English lives under `/en/`. The default is one setting
(`site.default_language` in `content/settings.yml`), and `x-default`
`hreflang` follows it. A globe language switch is always visible at the top
of every page, including on phones.

### WhatsApp ordering

- One number in `content/settings.yml` drives every button
  (`https://wa.me/<number>?text=<encoded message>`). The build validates the
  format and explains mistakes (local `0…` format, `200…` for Egypt, and so on).
- **Product pages:** "Order This via WhatsApp" prefills the product name and
  its full page link. On phones, a slim order bar appears once the main button
  scrolls away.
- **Collections:** "Ask about this collection" names the collection.
- **Custom orders:** the form validates in the visitor's language, then opens
  WhatsApp with the enquiry written out and shows a confirmation with the exact
  message and a fallback link. It says plainly that this is an enquiry, not an
  order. Nothing is sent or stored by the website, and reference photos are
  attached in WhatsApp, never uploaded here.
- Links open in a new tab, so visitors keep their place, and nothing is ever
  sent without the visitor pressing send.
- **No number configured:** buttons open a "WhatsApp isn't connected yet"
  notice that shows the message they *would* send. No placeholder number is
  ever linked.

### Preview vs. release

The build knows what is still missing (number, domain, logo, Arabic review,
sample products). Until all of it is in place:

- a slim **Preview** bar lists the open items,
- every page carries `noindex`, `robots.txt` disallows crawling, and no sitemap
  is produced,
- `npm run build:release` exits with the list instead of building.

Once complete, the same build produces the indexable site with `sitemap.xml`
(with `hreflang` alternates) and an allowing `robots.txt`.

### Honest content

The brief asks for nothing to be invented, so the site ships with:

- **The supplied logo, untouched.** The header uses the GK monogram and the
  homepage and footer use the monogram and name; both are straight crops of
  the supplied transparent PNG, never redrawn or stretched. Until a hero
  photograph is added, the logo leads the homepage. The browser icon and the
  link-preview image are made from the same file.
- **No invented photographs.** Clearly labelled "Photograph coming soon"
  panels (a linen-weave pattern with a line drawing of the craft) fill the
  photo slots that are still empty (Ghada's portrait, the About page and the
  Silk Painting cover). They are intentionally graphic and can't be mistaken
  for products.
- **Real pieces described only from their photographs.** Twenty-three of
  Ghada's pieces across six collections (katb el-ketab cushions, ring trays and
  bridal pieces; macramé home and Ramadan décor; embroidery; crochet; newborn
  sets; personalized gifts) use her photos, re-saved without their
  metadata, with names, descriptions and alt text in both languages. The same photos fill
  the homepage gallery and the collection covers. The pieces carry no
  prices, sizes, materials, timings or availability until Ghada confirms
  them, so each product page invites an enquiry instead.
- **Sample listings switched off.** The eight `sample-*` files that
  demonstrated the product page before real pieces existed are disabled with
  `show_sample_products: false`. If switched back on, they are labelled
  "Sample listing", excluded from search and structured data, and block a
  release build.
- **No biography, testimonials, address, opening hours or phone numbers.**
- **Structured data only where accurate:** `Organization` (with logo,
  social links and WhatsApp only once supplied), `BreadcrumbList`, and
  `Product` + `Offer` only for real pieces with an exact price (never for
  "from" prices or samples). No reviews or ratings.

## Content model

Everything editable is YAML in `content/` (documented inline):

```
content/
  settings.yml          WhatsApp number, site URL, default language, logo, social links, launch switches
  photos.yml            homepage hero, Ghada's portrait, "glimpse" gallery, About photos
  collections.yml       the 7 collections (name, short text, intro, cover photo, icon)
  products/*.yml        one file per product; _TEMPLATE.yml documents every field
  copy/en.yml, ar.yml   every interface and page text, plus WhatsApp message templates
images/                 original photos and the logo (resized automatically)
```

Product fields: `id`, `slug`, `collection`, `featured`, `name`, `description`,
`images[]` (with bilingual `alt`), and optional `price` (`amount`,
`currency`, `from`), `materials`, `techniques`, `dimensions`, `colours`,
`sizes`, `customization`, `production_time` and `availability`
(`made-to-order` | `available` | `unavailable`). Missing optional fields are
simply left out, and the page invites the customer to ask instead.

The loader validates everything (unknown fields, duplicate slugs and IDs,
missing photos, bad prices, broken YAML) and reports file-specific, plain
English messages. Missing Arabic falls back to English, marked `lang="en"`,
with a warning.

## How it's built

A small static generator with no framework and two runtime dependencies:
`js-yaml` and `sharp`.

```
src/
  build.mjs             orchestrates the build (CLI + programmatic `build()`)
  check.mjs             `npm run check`
  lib/                  content loading & validation, i18n, WhatsApp links,
                        image pipeline, fonts/asset hashing, escaping HTML templates
  components/           layout (head, header, footer), cards, media, icons
  pages/                one module per page type
  assets/css/site.css   the design system (mobile-first, logical properties for RTL)
  assets/js/site.js     progressive enhancement (~4 KB gzipped), no dependencies
scripts/serve.mjs       local static server
tests/unit/             node:test — WhatsApp encoding, validation, full builds
tests/e2e/              Playwright — customer journeys, axe accessibility, overflow
```

- **Templating:** tagged templates that escape every interpolated value by
  default.
- **Images:** originals are auto-rotated, stripped of metadata (including GPS),
  and resized to 480–2000 px WebP with a JPEG fallback. Output has `srcset`,
  `sizes`, `width`/`height` (no layout shift), lazy loading, and
  `fetchpriority="high"` for the first image. A 1200 × 630 crop is made for
  social previews. Results are cached in `.cache/`.
- **Fonts:** self-hosted (Cormorant Garamond, Jost, Amiri, IBM Plex Sans
  Arabic via Fontsource), subset by script with `unicode-range`, two preloads
  per language, `font-display: swap`. No third-party requests.
- **Assets:** content-hashed file names for long-term caching.
- **Language:** each page links to its counterpart. An explicit language choice
  is remembered (`localStorage`), so a returning visitor who chose English and
  opens an Arabic link from outside the site is sent to the English version
  (and the other way round). Browsing within the site never redirects.
- **Without JavaScript** every page and link still works. Navigation shows as a
  simple list, and the enquiry form falls back to opening the WhatsApp chat.

### Design system

| Token | Value | Use |
| --- | --- | --- |
| Ivory | `#F8F4EE` | page background |
| Soft beige | `#E9DED1` | alternate sections, placeholders, footer |
| Champagne gold | `#B69A70` | hairlines, frames, icons on dark |
| Gold (text) | `#725E3D` | small gold labels (5.7 : 1 on ivory, 4.7 : 1 on beige) |
| Muted taupe | `#887565` | large text and decoration |
| Taupe (text) | `#6E5D50` | secondary body text (5.7 : 1 on ivory) |
| Deep espresso | `#342A25` | text, primary buttons, dark bands (12.7 : 1) |
| Dusty blush | `#D8BDB5` | preview bar, sample notices |

The brand gold and taupe are too light for small text on ivory, so darker
shades of the same hues are used where text must stay readable (WCAG AA).

## Testing

`npm test` runs 41 unit and build tests, including full preview and
configured builds with a link checker over every page.

`npm run test:e2e` builds two sites, the shipped content (preview) and a fully
configured fixture (test-only number `201000000000` and `example.com`), and
runs on an emulated Pixel 7 and desktop Chrome:

- browse → collection → product → WhatsApp (exact prefilled message and link)
- Arabic as the default at `/`, the always-visible language switch, RTL,
  and the remembered preference
- custom order validation, error summary focus, the WhatsApp message, the
  confirmation panel, and Arabic messages
- preview behaviour with no number (setup notice, no `wa.me` links)
- gallery, enlarged view, mobile menu (focus, Escape, `inert`), sticky order
  bar, skip link
- axe (WCAG 2.1 A/AA + best practice) on every key page in both languages
- no horizontal scrolling on any page at 320, 375, 768 and 1280 px
- tap targets of at least 40 px on phones

WhatsApp requests are intercepted in tests, so nothing leaves the machine.

## Deploying

The site is static: build it, then publish the `dist/` folder anywhere.

**Netlify / Cloudflare Pages / Vercel (recommended, free tiers are enough):**
connect the repository, then set:

| Setting | Value |
| --- | --- |
| Base directory | `gk-atelier` (while it lives in this folder) |
| Build command | `npm run build:release` |
| Publish directory | `dist` |
| Node version | 20 or 22 |

Each commit (for example, a product added on GitHub) then republishes the site.
If a content file has a mistake, the build fails with a clear message and the
previous version stays online.

**GitHub Pages:** run `npm ci && npm run build:release` in a GitHub Actions
workflow and publish `dist/` with `actions/upload-pages-artifact` and
`actions/deploy-pages`. If the site is served from a sub-folder
(`https://user.github.io/gk-atelier/`), put that full address in
`site.url`, and every link adapts.

> This repository currently also hosts another site from its root, so give
> GK Atelier its own repository (or a host such as Netlify) rather than
> turning on GitHub Pages here.

## Browser support

Current Safari (iOS 15.5+), Chrome, Edge, Firefox and Samsung Internet,
including the Instagram and Facebook in-app browsers. Uses `<dialog>`, `inert`,
CSS logical properties and `aspect-ratio`.
