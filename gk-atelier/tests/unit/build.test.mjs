import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { build } from '../../src/build.mjs';
import { TEST_NUMBER, TEST_URL, copySite, editYaml, makeConfiguredSite, makePreviewSite } from '../fixtures/make-site.mjs';

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const htmlFiles = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.html')).map(String);
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attrValues = (page, name) => [...page.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map((m) => decode(m[1]));
const jsonLd = (page) => [...page.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

/** Every internal href/src must point at a file that exists in the build. */
function brokenLinks(outDir, base = '') {
  const broken = [];
  for (const file of htmlFiles(outDir)) {
    const page = read(outDir, file);
    const ids = new Set(attrValues(page, 'id'));
    for (const value of [...attrValues(page, 'href'), ...attrValues(page, 'src'), ...attrValues(page, 'srcset').flatMap((s) => s.split(',').map((p) => p.trim().split(' ')[0]))]) {
      if (/^(https?:|data:|mailto:)/.test(value)) continue;
      if (value.startsWith('#')) {
        if (value.length > 1 && !ids.has(value.slice(1))) broken.push(`${file}: missing anchor ${value}`);
        continue;
      }
      if (!value.startsWith(`${base}/`)) {
        broken.push(`${file}: unexpected link ${value}`);
        continue;
      }
      const clean = value.slice(base.length).split(/[?#]/)[0];
      const target = path.join(outDir, clean.endsWith('/') ? `${clean}index.html` : clean);
      if (!fs.existsSync(target)) broken.push(`${file}: ${value}`);
    }
  }
  return broken;
}

const preview = await makePreviewSite();
const configured = await makeConfiguredSite();

test('preview: every page is built in both languages with correct direction', () => {
  const files = htmlFiles(preview.outDir);
  assert.equal(files.length, preview.pages.length);
  for (const file of files) {
    const page = read(preview.outDir, file);
    const ar = file.startsWith('ar/');
    assert.match(page, ar ? /<html lang="ar" dir="rtl"/ : /<html lang="en" dir="ltr"/, file);
    assert.match(page, /<title>[^<]{10,}<\/title>/, file);
    assert.match(page, /<meta name="description" content="[^"]{20,}">/, file);
    assert.match(page, /<link rel="canonical" href="[^"]+">/, file);
  }
});

test('preview: page titles and descriptions are unique per language', () => {
  for (const lang of ['en', 'ar']) {
    const pages = htmlFiles(preview.outDir).filter((f) => (lang === 'ar') === f.startsWith('ar/') && f !== '404.html');
    const titles = pages.map((f) => read(preview.outDir, f).match(/<title>(.*?)<\/title>/)[1]);
    assert.equal(new Set(titles).size, titles.length, `${lang} titles: ${titles.join(' | ')}`);
    const descriptions = pages.map((f) => read(preview.outDir, f).match(/<meta name="description" content="(.*?)">/)[1]);
    const collectionPages = pages.filter((f) => !f.includes('products/'));
    assert.equal(new Set(collectionPages.map((f) => read(preview.outDir, f).match(/<meta name="description" content="(.*?)">/)[1])).size, collectionPages.length, `${lang} descriptions`);
    assert.ok(descriptions.every(Boolean));
  }
});

test('preview: no WhatsApp link is invented while the number is missing', () => {
  for (const file of htmlFiles(preview.outDir)) {
    const page = read(preview.outDir, file);
    assert.ok(!page.includes('wa.me/'), `${file} links to wa.me without a number`);
    assert.ok(!/\+?20\s?1\d{2}/.test(page.replace(/<script[\s\S]*?<\/script>/g, '')), `${file} shows something that looks like a phone number`);
  }
  const home = read(preview.outDir, 'index.html');
  assert.match(home, /id="whatsapp-setup"/);
  assert.match(home, /data-wa-setup="" data-wa-message="Hello Ghada! I found your GK Atelier website/);
});

test('preview: kept out of search engines and clearly marked', () => {
  assert.equal(read(preview.outDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  assert.ok(!fs.existsSync(path.join(preview.outDir, 'sitemap.xml')));
  for (const file of htmlFiles(preview.outDir)) {
    const page = read(preview.outDir, file);
    assert.match(page, /<meta name="robots" content="noindex, nofollow">/, file);
    assert.match(page, /class="preview-bar"/, file);
  }
  const product = read(preview.outDir, 'products/sample-bridal-keepsake/index.html');
  assert.match(product, /class="sample-notice"/);
  assert.ok(!product.includes('"@type":"Product"'), 'samples never get Product structured data');
});

test('preview: product messages carry a placeholder origin the browser fills in', () => {
  const page = read(preview.outDir, 'products/sample-bridal-keepsake/index.html');
  assert.ok(page.includes('Product link: __ORIGIN__/products/sample-bridal-keepsake/'));
});

test('preview: all internal links and anchors resolve', () => {
  assert.deepEqual(brokenLinks(preview.outDir), []);
});

test('preview: the release build refuses to run', async () => {
  const root = copySite('release-refused');
  const lines = [];
  await assert.rejects(build({ root, outDir: path.join(root, 'dist'), release: true, log: (l) => lines.push(l) }), /Not ready for release/);
  assert.match(lines.join('\n'), /WhatsApp number/);
  assert.match(lines.join('\n'), /Arabic text reviewed/);
});

test('configured: no preview markers, indexable, with sitemap and hreflang', () => {
  assert.deepEqual(configured.blockers, []);
  for (const file of htmlFiles(configured.outDir)) {
    const page = read(configured.outDir, file);
    assert.ok(!page.includes('preview-bar'), file);
    assert.ok(!page.includes('__ORIGIN__'), file);
    if (file === '404.html') assert.match(page, /noindex/);
    else assert.ok(!page.includes('noindex'), file);
  }
  const about = read(configured.outDir, 'ar/about/index.html');
  assert.match(about, /<link rel="canonical" href="https:\/\/www\.example\.com\/ar\/about\/">/);
  assert.match(about, /<link rel="alternate" hreflang="en" href="https:\/\/www\.example\.com\/about\/">/);
  assert.match(about, /<link rel="alternate" hreflang="x-default" href="https:\/\/www\.example\.com\/about\/">/);

  const sitemap = read(configured.outDir, 'sitemap.xml');
  assert.match(sitemap, /<loc>https:\/\/www\.example\.com\/products\/test-embroidered-hoop\/<\/loc>/);
  assert.match(sitemap, /hreflang="ar" href="https:\/\/www\.example\.com\/ar\/products\/test-embroidered-hoop\/"/);
  assert.ok(!sitemap.includes('404'));
  assert.equal((sitemap.match(/<url>/g) ?? []).length, configured.pages.filter((p) => p.index).length);
  assert.match(read(configured.outDir, 'robots.txt'), /Sitemap: https:\/\/www\.example\.com\/sitemap\.xml/);
});

test('configured: product WhatsApp links name the product and link to its page', () => {
  const page = read(configured.outDir, 'products/test-embroidered-hoop/index.html');
  const links = attrValues(page, 'href').filter((h) => h.startsWith('https://wa.me/'));
  assert.ok(links.length >= 3);
  const productLinks = links.filter((h) => new URL(h).searchParams.get('text').includes('Test Hoop'));
  assert.ok(productLinks.length >= 2, 'main and sticky buttons');
  const text = new URL(productLinks[0]).searchParams.get('text');
  assert.equal(
    text,
    `Hello Ghada! I found your GK Atelier website and I'm interested in Test Hoop & "Name". Could you please share the price, availability, customization options, and delivery details? Product link: ${TEST_URL}/products/test-embroidered-hoop/`,
  );
  assert.ok(productLinks[0].startsWith(`https://wa.me/${TEST_NUMBER}?text=`));
  assert.match(page, /target="_blank" rel="noopener" data-wa=""><svg[^>]*>.*?<\/svg><span>Order This via WhatsApp<\/span>/);

  const ar = read(configured.outDir, 'ar/products/test-embroidered-hoop/index.html');
  const arText = new URL(attrValues(ar, 'href').find((h) => h.includes('wa.me') && decodeURIComponent(h).includes('طارة اختبار'))).searchParams.get('text');
  assert.match(arText, /^مرحبًا غادة!/);
  assert.ok(arText.endsWith(`${TEST_URL}/ar/products/test-embroidered-hoop/`));
});

test('configured: confirmed details, price and structured data are shown', () => {
  const page = read(configured.outDir, 'products/test-embroidered-hoop/index.html');
  for (const label of ['Materials', 'Techniques', 'Dimensions', 'Colours', 'Sizes', 'Personalization', 'Production time', 'Availability', 'Made to order']) {
    assert.ok(page.includes(label), label);
  }
  assert.match(page, /<p class="product__price">EGP\s1,250<\/p>/);
  assert.match(page, /<p>First paragraph for testing\.<\/p>\s*<p>Second paragraph for testing\.<\/p>/);
  const product = jsonLd(page).find((d) => d['@type'] === 'Product');
  assert.equal(product.offers.price, '1250');
  assert.equal(product.offers.priceCurrency, 'EGP');
  assert.equal(product.offers.availability, 'https://schema.org/MadeToOrder');
  assert.ok(product.image.every((u) => u.startsWith(`${TEST_URL}/img/`)));
  assert.ok(!('aggregateRating' in product) && !('review' in product));

  const from = read(configured.outDir, 'products/test-from-price/index.html');
  assert.match(from, /From SAR\s900/);
  assert.ok(!jsonLd(from).some((d) => d['@type'] === 'Product'), 'a "from" price is not published as an exact offer');
  assert.match(from, /Prices and details, personally/);
  assert.ok(!from.includes('class="details"'), 'no empty details table');
});

test('configured: images are responsive, sized and stripped of metadata', async () => {
  const page = read(configured.outDir, 'products/test-embroidered-hoop/index.html');
  const img = page.match(/<source type="image\/webp" srcset="([^"]+)"[^>]*>\s*<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/);
  assert.ok(img, 'picture with webp srcset and dimensions');
  assert.ok(img[1].split(',').length >= 3);
  assert.equal(img[3], 'Test photo 1');
  const fallback = path.join(configured.outDir, img[2]);
  const meta = await sharp(fallback).metadata();
  assert.equal(meta.exif, undefined);
  assert.match(page, /data-gallery-thumb="2"/);
  assert.match(page, /<dialog class="lightbox"/);
});

test('configured: collections without real pieces show a helpful empty state', () => {
  const page = read(configured.outDir, 'collections/silk-painting/index.html');
  assert.match(page, /New pieces are on their way/);
  assert.match(page, /href="\/custom-orders\/\?type=silk-painting"/);
  const wa = attrValues(page, 'href').find((h) => h.includes('wa.me') && decodeURIComponent(h).includes('Silk Painting collection'));
  assert.ok(wa, 'empty state offers a collection enquiry');
});

test('configured: custom order page carries the enquiry settings', () => {
  const page = read(configured.outDir, 'custom-orders/index.html');
  const config = JSON.parse(page.match(/<script type="application\/json" id="enquiry-config">(.*?)<\/script>/)[1]);
  assert.equal(config.number, TEST_NUMBER);
  assert.equal(config.lang, 'en');
  assert.match(config.outro, /enquiry, not a confirmed order/);
  assert.match(page, /action="https:\/\/wa\.me\/201000000000"/);
  assert.ok(!page.includes('type="file"'), 'no uploads: reference photos go through WhatsApp');
});

test('configured: logo, social links and organisation data use supplied values only', () => {
  const home = read(configured.outDir, 'index.html');
  assert.match(home, /<img class="brand__logo" src="\/img\/test-logo-[0-9a-f]+\.svg" width="240" height="80" alt="GK Atelier by Ghada Khalil">/);
  assert.match(home, /href="https:\/\/www\.instagram\.com\/example"/);
  const org = jsonLd(home).find((d) => d['@type'] === 'Organization');
  assert.deepEqual(org.sameAs, ['https://www.instagram.com/example']);
  assert.ok(!('address' in org) && !('telephone' in org) && !('openingHours' in org));
  assert.match(home, /<meta property="og:image" content="https:\/\/www\.example\.com\/img\/test-hero-[0-9a-f]+-share\.jpg">/);
});

test('configured: all internal links and anchors resolve', () => {
  assert.deepEqual(brokenLinks(configured.outDir), []);
});

test('configured: the release build succeeds', async () => {
  const result = await build({ root: configured.root, outDir: path.join(configured.root, 'dist-release'), release: true, log: () => {} });
  assert.equal(result.blockers.length, 0);
});

test('a site in a sub-folder links everything under that folder', async () => {
  const root = copySite('sub-folder');
  editYaml(root, 'content/settings.yml', (s) => {
    s.site.url = 'https://user.github.io/gk-atelier';
  });
  const outDir = path.join(root, 'dist');
  await build({ root, outDir, log: () => {} });
  assert.deepEqual(brokenLinks(outDir, '/gk-atelier'), []);
  assert.match(read(outDir, 'index.html'), /href="\/gk-atelier\/collections\/"/);
});
