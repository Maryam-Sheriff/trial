# Launch checklist

The website is complete and working, but it ships as a **preview**. It
contains no invented contact details, products, prices or biography, so a few
real things from Ghada are needed before it goes public.

While anything in the first section is missing, the site shows a slim
"Preview" bar, tells search engines not to index it, and
`npm run build:release` refuses to build. `npm run check` lists what is left
at any time.

## Required before launch (the site checks these itself)

- [ ] **WhatsApp number:** `content/settings.yml` → `whatsapp.number`.
      Then test it: on a phone *and* on a computer, open a product page, press
      **Order This via WhatsApp**, and check that the chat opens with Ghada and
      the message names the product and links back to it.
- [ ] **Website address:** `content/settings.yml` → `site.url` (for example
      `https://www.gkatelier.com`). It is used for product links inside
      WhatsApp messages, Google and social previews.
- [x] **Logo:** added (`images/brand/`), with the header monogram, homepage
      and footer versions, browser icon and sharing image cut from it.
- [ ] **Real products:** add Ghada's pieces (see EDITING-GUIDE.md), then delete
      the `sample-*.yml` files or set `launch.show_sample_products: false`.
- [ ] **Arabic review:** a fluent Arabic speaker, ideally someone familiar with
      both Egyptian and Gulf customers, reads all of `content/copy/ar.yml`, the
      Arabic in `content/collections.yml` and every product, then sets
      `launch.arabic_reviewed: true`. The Arabic was drafted to be natural
      Modern Standard Arabic addressed to customers in the respectful plural,
      but it has not been reviewed by a native speaker yet.

## Confirm with Ghada

- [ ] **"You're welcome to ask about"** (`custom_options` in both copy files)
      lists personalized pieces, custom colours, names, embroidery, gift sets
      and designs for special occasions, as in the brief. Remove anything Ghada
      doesn't want to offer.
- [ ] **About page wording:** the text describes the atelier and handmade work
      in general terms and invents nothing about Ghada's life or experience.
      Ghada should be happy with it. Her own words can be added under
      `about.story`.
- [ ] **Privacy notice:** it says messages are used only to reply to
      enquiries and arrange orders, and that Ghada will delete a customer's
      messages on request. Ghada must be comfortable committing to that. Update
      `privacy.updated_on` if the text changes.
- [ ] **Where we work:** the Contact page says the atelier is based in Egypt
      and serves Egypt and the Gulf, with delivery arranged per order. Adjust
      if needed.

## Strongly recommended

- [ ] Homepage photo (`content/photos.yml` → `hero`), a cover photo for each
      collection, six "glimpse" photos, Ghada's portrait and three
      process photos. Until then, tidy "Photograph coming soon" panels are
      shown.
- [ ] Instagram (and any other) account links in `content/settings.yml`.
- [ ] Optional: an SVG version of the logo from the designer, for an even
      sharper header monogram.

## Going live

- [ ] `npm run build:release` completes without errors.
- [ ] Deploy `dist/` (see README.md → Deploying).
- [ ] Open the live site from Instagram's in-app browser and from WhatsApp
      and test a product enquiry and a custom order enquiry end to end.
- [ ] Paste the site link into a WhatsApp chat to check the preview card.
- [ ] Add the site to Google Search Console and submit `/sitemap.xml`.
- [ ] Put the website link in the Instagram bio.
