# Editing the GK Atelier website

This guide is for Ghada, or anyone helping her keep the website up to date.
You never need to touch the design or the code. Everything you will change
lives in two folders:

| Folder | What's inside |
| --- | --- |
| `content/` | All the text, the WhatsApp number, the products and the settings |
| `images/` | Ghada's original photographs and the logo |

You can edit these files straight on GitHub in the browser: open the file,
press the pencil icon (✏️ **Edit**), make the change, then press
**Commit changes**. To add a photo, open the folder and choose
**Add file → Upload files**.

> **Golden rule for the text files:** only change what comes *after* the
> colon (`:`), and keep the spaces at the start of each line exactly as they
> were. Lines starting with `#` are notes for you; the website ignores them.

---

## 1. Add or change the WhatsApp number

Open `content/settings.yml` and fill in the number:

```yaml
whatsapp:
  number: "201XXXXXXXXX"
```

Write it in international format with **digits only**: the country code, then
the number without its first zero, with no `+` and no spaces. For an Egyptian
mobile written locally as `01X XXXX XXXX`, that means `20` followed by the 10
digits after the first `0`.

Every WhatsApp button on the site uses this one number. If it is ever written
in the wrong format, the website explains what to fix instead of publishing a
broken link.

## 2. The logo

The supplied logo is already in place (`images/brand/gk-atelier-logo.png`).
The site uses a few versions of it, all cut from that same file and never
redrawn or stretched:

| File | Where it appears |
| --- | --- |
| `gk-atelier-logo.png` | the original, used by Google |
| `gk-atelier-monogram.png` | the GK monogram in the header |
| `gk-atelier-logo-without-tagline.png` | the homepage (until a hero photo is added) and the footer |
| `gk-atelier-icon.png` | browser tabs and phone home screens |
| `gk-atelier-share.jpg` | the preview card when a link is shared on WhatsApp or Instagram |

If the logo ever changes, replace these files (same names) or point to the new
ones in `content/settings.yml` under `brand:`. An SVG version from the
designer would make the header monogram even sharper.

## Language

Arabic is the main language: the site opens in Arabic, and English lives
under `/en/`. To make English the main language instead, change
`default_language: ar` to `default_language: en` in `content/settings.yml`.

## 3. Add a product

1. **Photos.** Make a folder for the product inside `images/products/`, for
   example `images/products/embroidered-name-hoop/`, and upload its photos.
   Name them simply: `1.jpg`, `2.jpg`, `3.jpg`. The first photo is the main one.
2. **Details.** In `content/products/`, open `_TEMPLATE.yml`, copy everything
   in it, and create a new file named after the product, such as
   `embroidered-name-hoop.yml`. Paste in the template and fill it in.
3. **Commit.** The product page, its place in the collection, and its WhatsApp
   button (with the product's name and link already in the message) are
   created automatically.

Some things to know:

- **Only write what Ghada has confirmed.** Price, materials, sizes, colours,
  personalization, production time and availability are all optional. Leave
  any of them out and the page simply invites the customer to ask Ghada on
  WhatsApp.
- `slug` is the product's web address (`/products/embroidered-name-hoop/`).
  Use lowercase letters, numbers and dashes, and **don't change it after
  launch**, or links already shared on Instagram will stop working.
- `featured: true` also shows the piece on the homepage (up to four pieces)
  and puts it first in its collection. The other pieces follow in
  alphabetical order of their file names.
- Write a short description of each photo after `alt:`. It is read aloud to
  blind visitors and helps the piece appear in Google.

**To remove a product**, delete its file in `content/products/`.
**To hide one temporarily**, move its file into a folder named `_hidden`, or
rename it so it starts with `_`.

### The sample listings

The files starting with `sample-` were placeholders that showed how product
pages look before Ghada's real pieces arrived. They are now switched off
(`show_sample_products: false` in `content/settings.yml`) and can be deleted.

### Photos with a lot of background

Product photos are shown in tall frames. For a wide photo, add `focus: left`
(or `right`, `top`, `bottom`) under its `src:` line to choose which part stays
in view. The macramé curtain uses this. The enlarged view always shows the
whole photo.

## 4. Photographs for the homepage, collections and About page

- **Homepage and About page:** upload photos to `images/atelier/` and write
  their paths in `content/photos.yml`: the big homepage photo (`hero`), Ghada's
  portrait (`ghada`), six photos for "A glimpse into the atelier" (`glimpse`),
  and three for the About page (`process`: workspace, tools, a piece in
  progress).
- **Collection covers:** upload to `images/collections/` and write the path
  under that collection's `image:` in `content/collections.yml`.
- **Reusing product photos:** any photo already in `images/products/` can be
  used in these places too, without uploading it again. Most collection
  covers and the "glimpse" gallery do this today.

Until a photo is added, the site shows a neutral "Photograph coming soon"
panel, so nothing ever looks broken.

**Photo tips**

- Portrait (tall) photos work best. The site crops gently to a 4 : 5 shape.
- Daylight near a window, a plain background, and at least one close-up of the
  stitching, knots or texture.
- Upload the original from the phone. The website makes smaller, fast versions
  itself, and removes the location data phones hide inside photos.
- File names: lowercase, no spaces (`wedding-cushion-1.jpg`).
- Only use photographs of Ghada's own work.

## 5. Change the text

All the words on the site are in:

- `content/copy/en.yml` for English
- `content/copy/ar.yml` for Arabic (the same names, in the same order)

Find the sentence, change it, and commit. Keep anything in `{curly brackets}`
exactly as it is, because the website fills those in (for example `{product}`
becomes the product name in WhatsApp messages).

Collection names and descriptions are in `content/collections.yml`.

**"You're welcome to ask about"** (`custom_options` in both copy files) lists
what customers can enquire about. Keep only the options Ghada is happy to
offer.

**Ghada's own words** for the About page go under `about → story` in both copy
files. That section stays hidden until it has text.

## 6. Instagram and other links

In `content/settings.yml`, under `social:`, paste the full link to each
account (starting with `https://`). Icons appear in the footer and on the
Contact page. Leave a line empty (`""`) to hide that icon.

## 7. Check your changes

If the site is connected to a host such as Netlify or Cloudflare Pages (see
README.md), every commit rebuilds and publishes it automatically within a
minute or two. If something in a file is wrong, the build stops with a plain
message such as:

```
✖ content/products/embroidered-name-hoop.yml: collection "embroidery" doesn't exist.
  Use one of: wedding-bridal, embroidery-textile-art, …
```

Fix the line it mentions and commit again. The previous version of the site
stays online until then.

**Common slip-ups**

| Message | Usual cause |
| --- | --- |
| "Could not read this file (line N)" | A line lost its leading spaces, or a quote `"` isn't closed |
| "the photo … was not found" | The path or file name is spelled differently (capital letters matter: `Photo.JPG` ≠ `photo.jpg`) |
| Text containing a colon breaks | Put the whole text in quotes: `en: "Note: made to order"` |
