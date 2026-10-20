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
- [x] **Real products:** twenty-seven pieces are on the site and the sample
      listings are switched off. Keep adding pieces (see EDITING-GUIDE.md), and
      add prices, sizes and timings to each piece once Ghada confirms them.
- [ ] **Arabic review:** a fluent Arabic speaker, ideally someone familiar with
      both Egyptian and Gulf customers, reads all of `content/copy/ar.yml`, the
      Arabic in `content/collections.yml` and every product, then sets
      `launch.arabic_reviewed: true`. The Arabic was drafted to be natural
      Modern Standard Arabic addressed to customers in the respectful plural,
      but it has not been reviewed by a native speaker yet.

## Confirm with Ghada

- [ ] **Customers' names in photos:** several product photos show real
      couples' and babies' names and dates. Ghada should be sure those
      customers are happy for their pieces to appear on the website, or
      replace those photos with ones showing sample names.
- [ ] **Product names and collections:** each piece is named and described
      from its photo only. Ghada should check the names, especially the
      katb el-ketab cushions and ring trays, and the collection each piece
      sits in. The abstract gold painting is under Macramé & Home Décor
      because it isn't silk painting, and the jewelled black dress and the
      fabric flowers are under Embroidery & Textile Art.
- [ ] **Bridal gown photo:** unlike the others, it carries no GK Atelier
      logo. Confirm that it shows Ghada's own work (or say which part of it
      is hers, such as the embroidery) before launch.
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

- [ ] Pieces and a cover photo for Silk Painting (it shows "New pieces are
      on their way" until then), Ghada's portrait and three process photos.
      Until then, tidy "Photograph coming soon" panels are shown.
- [ ] Optional: a homepage photo (`content/photos.yml` → `hero`; the logo
      leads the homepage until then), and close-ups of stitching, knots and
      tools for the "glimpse" gallery, which currently uses six product
      photos.
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
