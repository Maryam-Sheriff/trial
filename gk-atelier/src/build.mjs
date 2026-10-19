// Builds the complete website into dist/.
//
//   npm run build            preview build (shows what is still missing)
//   npm run build:release    refuses to build until the site is ready to launch

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildAssets } from './lib/assets.mjs';
import { launchBlockers, loadContent } from './lib/content.mjs';
import { LANG_CODES, LANGS, translator } from './lib/i18n.mjs';
import { createImagePipeline } from './lib/images.mjs';
import { whatsappUrl } from './lib/whatsapp.mjs';
import { documentPage } from './components/layout.mjs';
import { aboutPage } from './pages/about.mjs';
import { collectionPage, collectionsPage } from './pages/collections.mjs';
import { contactPage } from './pages/contact.mjs';
import { customPage } from './pages/custom.mjs';
import { homePage } from './pages/home.mjs';
import { notFoundPage } from './pages/notfound.mjs';
import { privacyPage } from './pages/privacy.mjs';
import { productPage } from './pages/product.mjs';

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(SRC_DIR, '..');

function printIssues(report, log) {
  for (const w of report.warnings) log(`  ⚠ ${w.file}: ${w.message}`);
  for (const e of report.errors) log(`  ✖ ${e.file}: ${e.message}`);
}

async function processImages(content, pipeline) {
  const { settings, photos, collections, allProducts } = content;
  const photoRefs = [
    photos.hero,
    photos.ghada,
    ...photos.glimpse.map((g) => g.image),
    ...photos.process.map((p) => p.image),
    ...collections.map((c) => c.image),
    ...allProducts.flatMap((p) => p.images),
  ].filter(Boolean);

  const images = new Map();
  for (const ref of photoRefs) images.set(ref.src, await pipeline.photo(ref.src));

  const shareSources = [
    settings.brand.share_image,
    photos.hero,
    photos.ghada,
    ...collections.map((c) => c.image),
    ...allProducts.map((p) => p.images[0]),
  ].filter(Boolean);
  const shares = new Map();
  for (const ref of shareSources) shares.set(ref.src, await pipeline.share(ref.src));

  const brand = {
    logo: settings.brand.logo ? await pipeline.logo(settings.brand.logo.src) : null,
    icon: settings.brand.icon ? await pipeline.icon(settings.brand.icon.src) : null,
  };
  const defaultShare = settings.brand.share_image ?? photos.hero ?? null;
  return { images, shares, brand, defaultShareImage: defaultShare ? shares.get(defaultShare.src) : null };
}

function createContext({ content, lang, assets, media, blockers, indexable, base }) {
  const { settings } = content;
  const t = translator(content.copy, lang);
  const urlFor = (l, route) => `${base}${LANGS[l].prefix}${route}`;
  return {
    lang,
    t,
    content,
    settings,
    assets,
    blockers,
    indexable,
    brand: media.brand,
    defaultShareImage: media.defaultShareImage,
    url: (route) => urlFor(lang, route),
    urlFor,
    // Full address for canonical links and search engines (path-only until the
    // domain is known, which only happens in previews).
    absoluteUrl: (p) => (settings.siteUrl ? `${settings.siteUrl}${p}` : p),
    // Address placed inside WhatsApp messages. In a preview without a domain,
    // the browser swaps __ORIGIN__ for the address it is being viewed at.
    shareableUrl: (p) => `${settings.siteUrl || '__ORIGIN__'}${p}`,
    whatsapp: (message) => (settings.whatsapp ? whatsappUrl(settings.whatsapp, message) : null),
    image: (src) => media.images.get(src),
    shareImage: (src) => media.shares.get(src) ?? null,
    collection: (slug) => content.collections.find((c) => c.slug === slug),
    copyFor: (l, key) => translator(content.copy, l)(key),
  };
}

function outputFile(outDir, base, url) {
  const relative = url.slice(base.length);
  return path.join(outDir, relative.endsWith('/') ? `${relative}index.html` : relative);
}

function sitemap(pages, siteUrl) {
  const byRoute = new Map();
  for (const page of pages) {
    if (page.index === false) continue;
    if (!byRoute.has(page.route)) byRoute.set(page.route, {});
    byRoute.get(page.route)[page.lang] = page.url;
  }
  const entries = [];
  for (const urls of byRoute.values()) {
    const links = Object.entries(urls)
      .map(([lang, url]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${siteUrl}${url}"/>`)
      .concat(urls.en ? [`    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}${urls.en}"/>`] : []);
    for (const url of Object.values(urls)) {
      entries.push(`  <url>\n    <loc>${siteUrl}${url}</loc>\n${links.join('\n')}\n  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
}

export async function build({
  root = PROJECT_DIR,
  outDir = path.join(root, 'dist'),
  cacheDir = path.join(root, '.cache/img'),
  release = false,
  log = console.log,
} = {}) {
  const content = loadContent(root);
  const { report, settings } = content;
  printIssues(report, log);
  if (report.errors.length) {
    throw new Error(`The content has ${report.errors.length} problem(s) to fix (marked ✖ above).`);
  }

  const blockers = launchBlockers(content);
  const indexable = blockers.length === 0;
  if (release && blockers.length) {
    for (const b of blockers) log(`  ✖ ${b.message}`);
    throw new Error('Not ready for release yet — see the items above (also listed in LAUNCH-CHECKLIST.md).');
  }

  const base = settings.basePath;
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const pipeline = createImagePipeline({ root, outDir, base, cacheDir });
  const media = await processImages(content, pipeline);
  const assets = buildAssets({ srcDir: SRC_DIR, outDir, base });

  const written = [];
  for (const lang of LANG_CODES) {
    const ctx = createContext({ content, lang, assets, media, blockers, indexable, base });
    const pages = [
      homePage(ctx),
      collectionsPage(ctx),
      ...content.collections.map((c) => collectionPage(ctx, c)),
      ...content.products.map((p) => productPage(ctx, p)),
      aboutPage(ctx),
      customPage(ctx),
      contactPage(ctx),
      privacyPage(ctx),
    ];
    if (lang === 'en') pages.push(notFoundPage(ctx));
    for (const page of pages) {
      const url = page.name === 'notfound' ? `${base}${page.route}` : ctx.url(page.route);
      const file = outputFile(outDir, base, url);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, documentPage(ctx, page));
      written.push({ lang, route: page.route, url, file, index: page.index !== false && page.name !== 'notfound' });
    }
  }

  if (indexable) {
    fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap(written, settings.siteUrl));
    fs.writeFileSync(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${settings.siteUrl}${base}/sitemap.xml\n`);
  } else {
    // Previews stay out of search engines until everything is ready.
    fs.writeFileSync(path.join(outDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  }
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

  log(`\n  Built ${written.length} pages (${content.products.length} products, ${content.collections.length} collections) into ${path.relative(process.cwd(), outDir) || outDir}`);
  if (blockers.length) {
    log('\n  PREVIEW BUILD — hidden from search engines until these are done:');
    for (const b of blockers) log(`   • ${b.message}`);
  } else {
    log('  Ready to publish.');
  }
  return { pages: written, blockers, content };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const outArg = args.find((a) => a.startsWith('--out='));
  build({ release: args.includes('--release'), outDir: outArg ? path.resolve(outArg.slice(6)) : undefined }).catch((err) => {
    console.error(`\n  ✖ ${err.message}\n`);
    process.exit(1);
  });
}
