// Loads everything in content/ and checks it, so a typo in a YAML file
// produces a clear message instead of a broken page.

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { normalizeWhatsAppNumber } from './whatsapp.mjs';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CURRENCIES = ['EGP', 'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'USD', 'EUR', 'GBP'];
export const AVAILABILITY = ['made-to-order', 'available', 'unavailable'];
export const DETAIL_FIELDS = ['materials', 'techniques', 'dimensions', 'colours', 'sizes', 'customization', 'production_time'];
export const COLLECTION_ICONS = ['rings', 'hoop', 'knot', 'baby', 'brush', 'yarn', 'gift'];
const PRODUCT_KEYS = new Set(['id', 'slug', 'collection', 'sample', 'featured', 'name', 'description', 'images', 'price', 'availability', ...DETAIL_FIELDS]);
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'];

class Report {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }
  error(file, message) {
    this.errors.push({ file, message });
  }
  warn(file, message) {
    this.warnings.push({ file, message });
  }
}

function readYaml(root, relative, report) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    report.error(relative, 'File is missing.');
    return undefined;
  }
  try {
    return yaml.load(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    const where = err.mark ? ` (line ${err.mark.line + 1})` : '';
    report.error(relative, `Could not read this file${where}: ${err.reason || err.message}. Check the spaces at the start of the lines and any quotes.`);
    return undefined;
  }
}

const isText = (value) => typeof value === 'string' && value.trim() !== '';

/** Normalises a bilingual field to { en, ar } with trimmed strings. */
function bilingual(value) {
  if (value == null || value === '') return { en: '', ar: '' };
  if (typeof value === 'string' || typeof value === 'number') return { en: String(value).trim(), ar: '' };
  if (typeof value === 'object') {
    return { en: value.en == null ? '' : String(value.en).trim(), ar: value.ar == null ? '' : String(value.ar).trim() };
  }
  return { en: '', ar: '' };
}

function imageRef(root, value, where, report, { required = false } = {}) {
  const src = typeof value === 'string' ? value : value?.src;
  if (!isText(src)) {
    if (required) report.error(where.file, `${where.label}: the photo path is empty.`);
    return null;
  }
  const clean = src.trim().replace(/^\.?\//, '');
  const ext = path.extname(clean).toLowerCase();
  const isSvgAllowed = where.allowSvg && ext === '.svg';
  if (!IMAGE_EXTENSIONS.includes(ext) && !isSvgAllowed) {
    report.error(where.file, `${where.label}: "${clean}" is not a supported photo type (use JPG, PNG or WebP${where.allowSvg ? ', or SVG' : ''}).`);
    return null;
  }
  if (!fs.existsSync(path.join(root, clean))) {
    report.error(where.file, `${where.label}: the photo "${clean}" was not found. Check the folder and file name (capital letters matter).`);
    return null;
  }
  return { src: clean, alt: bilingual(value?.alt), caption: bilingual(value?.caption) };
}

function loadSettings(root, report) {
  const file = 'content/settings.yml';
  const data = readYaml(root, file, report) ?? {};
  const settings = { whatsapp: null, siteUrl: '', basePath: '', brand: {}, social: {}, launch: {} };

  const rawNumber = data.whatsapp?.number;
  const normalized = normalizeWhatsAppNumber(rawNumber == null ? '' : String(rawNumber));
  if (normalized.ok) settings.whatsapp = normalized.number;
  else if (normalized.reason !== 'missing') report.error(file, `whatsapp → number "${rawNumber}": ${normalized.reason}`);

  const url = String(data.site?.url ?? '').trim();
  if (url) {
    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error('protocol');
      settings.siteUrl = parsed.origin;
      settings.basePath = parsed.pathname.replace(/\/+$/, '');
    } catch {
      report.error(file, `site → url "${url}" is not a full web address. It should look like https://www.example.com`);
    }
  }

  for (const key of ['logo', 'icon', 'share_image']) {
    const value = data.brand?.[key];
    settings.brand[key] = isText(value)
      ? imageRef(root, value, { file, label: `brand → ${key}`, allowSvg: key !== 'share_image' }, report)
      : null;
  }

  for (const [network, value] of Object.entries(data.social ?? {})) {
    if (!isText(value)) continue;
    if (!/^https:\/\/\S+$/.test(value.trim())) {
      report.error(file, `social → ${network}: "${value}" should be a full link starting with https://`);
      continue;
    }
    settings.social[network] = value.trim();
  }

  settings.launch.arabicReviewed = data.launch?.arabic_reviewed === true;
  settings.launch.showSampleProducts = data.launch?.show_sample_products !== false;
  return settings;
}

function loadPhotos(root, report) {
  const file = 'content/photos.yml';
  const data = readYaml(root, file, report) ?? {};
  const withAlt = (image, label) => {
    if (image && !image.alt.en) report.warn(file, `${label} has no English description (alt). Describe what the photo shows.`);
    return image;
  };
  const one = (key) => withAlt(imageRef(root, data[key], { file, label: key }, report), key);
  const list = (key) =>
    (Array.isArray(data[key]) ? data[key] : []).map((item, i) => ({
      image: withAlt(imageRef(root, item, { file, label: `${key} photo ${i + 1}` }, report), `${key} photo ${i + 1}`),
      caption: bilingual(item?.caption),
    }));
  return { hero: one('hero'), ghada: one('ghada'), glimpse: list('glimpse'), process: list('process') };
}

function loadCollections(root, report) {
  const file = 'content/collections.yml';
  const data = readYaml(root, file, report);
  if (!Array.isArray(data)) {
    if (data !== undefined) report.error(file, 'Expected a list of collections (each starting with "- slug:").');
    return [];
  }
  const seen = new Set();
  const collections = [];
  data.forEach((entry, index) => {
    const label = `collection ${index + 1}${entry?.slug ? ` (${entry.slug})` : ''}`;
    if (!entry || typeof entry !== 'object') return report.error(file, `${label} is empty.`);
    if (!isText(entry.slug) || !SLUG_PATTERN.test(entry.slug)) {
      return report.error(file, `${label}: slug must use lowercase letters, numbers and dashes only.`);
    }
    if (seen.has(entry.slug)) return report.error(file, `${label}: the slug "${entry.slug}" is used twice.`);
    seen.add(entry.slug);
    const name = bilingual(entry.name);
    if (!name.en) report.error(file, `${label}: name → en is missing.`);
    for (const field of ['name', 'short', 'intro']) {
      const value = bilingual(entry[field]);
      if (!value.en) report.warn(file, `${label}: ${field} → en is empty.`);
      if (!value.ar) report.warn(file, `${label}: ${field} → ar (Arabic) is empty; English is shown instead.`);
    }
    const icon = COLLECTION_ICONS.includes(entry.icon) ? entry.icon : 'gift';
    if (entry.icon && icon !== entry.icon) report.warn(file, `${label}: unknown icon "${entry.icon}" (use ${COLLECTION_ICONS.join(', ')}).`);
    const image = imageRef(root, entry.image, { file, label: `${label} image` }, report);
    collections.push({
      slug: entry.slug,
      icon,
      name,
      short: bilingual(entry.short),
      intro: bilingual(entry.intro),
      image,
    });
  });
  return collections;
}

function loadProducts(root, collections, report) {
  const dir = path.join(root, 'content/products');
  if (!fs.existsSync(dir)) return [];
  const collectionSlugs = new Set(collections.map((c) => c.slug));
  const slugs = new Map();
  const ids = new Map();
  const products = [];
  const files = fs
    .readdirSync(dir)
    .filter((name) => /\.ya?ml$/i.test(name) && !name.startsWith('_'))
    .sort();

  for (const name of files) {
    const file = `content/products/${name}`;
    const data = readYaml(root, file, report);
    if (data === undefined) continue;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      report.error(file, 'This product file is empty or not laid out like _TEMPLATE.yml.');
      continue;
    }
    const before = report.errors.length;
    for (const key of Object.keys(data)) {
      if (!PRODUCT_KEYS.has(key)) report.warn(file, `Unknown field "${key}" is ignored. Check the spelling against _TEMPLATE.yml.`);
    }
    const id = data.id == null ? '' : String(data.id).trim();
    if (!id) report.error(file, 'id is missing (e.g. GK-0012).');
    else if (ids.has(id)) report.error(file, `id "${id}" is also used in ${ids.get(id)}.`);
    else ids.set(id, file);

    const slug = String(data.slug ?? '').trim();
    if (!SLUG_PATTERN.test(slug)) report.error(file, 'slug must use lowercase letters, numbers and dashes only (e.g. embroidered-name-hoop).');
    else if (slugs.has(slug)) report.error(file, `slug "${slug}" is also used in ${slugs.get(slug)}.`);
    else slugs.set(slug, file);

    if (!collectionSlugs.has(data.collection)) {
      report.error(file, `collection "${data.collection ?? ''}" doesn't exist. Use one of: ${[...collectionSlugs].join(', ')}.`);
    }

    const productName = bilingual(data.name);
    const description = bilingual(data.description);
    if (!productName.en) report.error(file, 'name → en is missing.');
    if (!description.en) report.error(file, 'description → en is missing.');
    if (!productName.ar) report.warn(file, 'name → ar (Arabic) is empty; English is shown on the Arabic page.');
    if (!description.ar) report.warn(file, 'description → ar (Arabic) is empty; English is shown on the Arabic page.');

    const images = [];
    if (data.images != null && !Array.isArray(data.images)) report.error(file, 'images should be a list (each photo starting with "- src:").');
    (Array.isArray(data.images) ? data.images : []).forEach((item, i) => {
      const image = imageRef(root, item, { file, label: `photo ${i + 1}` }, report, { required: true });
      if (!image) return;
      if (!image.alt.en) report.warn(file, `photo ${i + 1} has no English description (alt); the product name is used instead.`);
      images.push(image);
    });
    if (images.length === 0 && data.sample !== true) report.warn(file, 'No photos yet — a "photograph coming soon" placeholder is shown.');

    let price = null;
    if (data.price != null && data.price !== '') {
      const amount = Number(data.price.amount);
      const currency = String(data.price.currency ?? '').toUpperCase();
      if (!Number.isFinite(amount) || amount <= 0) report.error(file, 'price → amount must be a number greater than 0 (or remove the price section).');
      else if (!CURRENCIES.includes(currency)) report.error(file, `price → currency must be one of ${CURRENCIES.join(', ')}.`);
      else price = { amount, currency, from: data.price.from === true };
    }

    const details = {};
    for (const field of DETAIL_FIELDS) {
      const value = bilingual(data[field]);
      if (value.en || value.ar) details[field] = value;
    }

    let availability = null;
    if (data.availability != null && data.availability !== '') {
      if (AVAILABILITY.includes(data.availability)) availability = data.availability;
      else report.error(file, `availability must be one of: ${AVAILABILITY.join(', ')} (or leave it empty).`);
    }

    if (report.errors.length > before) continue;
    products.push({
      file,
      id,
      slug,
      collection: data.collection,
      sample: data.sample === true,
      featured: data.featured === true,
      name: productName,
      description,
      images,
      price,
      details,
      availability,
    });
  }
  return products;
}

function compareCopy(en, ar, trail, report) {
  for (const [key, value] of Object.entries(en ?? {})) {
    const here = trail ? `${trail}.${key}` : key;
    const other = ar?.[key];
    if (other === undefined || other === null || other === '') {
      report.warn('content/copy/ar.yml', `"${here}" has no Arabic text; English is shown instead.`);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      compareCopy(value, other, here, report);
    } else if (Array.isArray(value) && (!Array.isArray(other) || other.length !== value.length)) {
      report.warn('content/copy/ar.yml', `"${here}" should have ${value.length} items like the English list.`);
    }
  }
}

export function loadContent(root) {
  const report = new Report();
  const settings = loadSettings(root, report);
  const photos = loadPhotos(root, report);
  const collections = loadCollections(root, report);
  const allProducts = loadProducts(root, collections, report);
  const copy = {
    en: readYaml(root, 'content/copy/en.yml', report) ?? {},
    ar: readYaml(root, 'content/copy/ar.yml', report) ?? {},
  };
  compareCopy(copy.en, copy.ar, '', report);

  const products = allProducts.filter((p) => settings.launch.showSampleProducts || !p.sample);
  for (const collection of collections) {
    collection.products = products
      .filter((p) => p.collection === collection.slug)
      .sort((a, b) => Number(b.featured) - Number(a.featured));
  }
  return { settings, photos, collections, products, allProducts, copy, report };
}

/**
 * What still stands between the preview and a public launch. Each blocker
 * keeps the site out of search engines and stops `npm run build:release`.
 */
export function launchBlockers(content) {
  const { settings, allProducts } = content;
  const blockers = [];
  if (!settings.whatsapp) blockers.push({ key: 'whatsapp', message: "Add Ghada's WhatsApp number in content/settings.yml (whatsapp → number)." });
  if (!settings.siteUrl) blockers.push({ key: 'url', message: "Add the website's address in content/settings.yml (site → url)." });
  if (!settings.brand.logo) blockers.push({ key: 'logo', message: 'Add the GK Atelier logo file and its path in content/settings.yml (brand → logo).' });
  if (!settings.launch.arabicReviewed) blockers.push({ key: 'arabic', message: 'Have the Arabic text reviewed, then set launch → arabic_reviewed to true.' });
  if (settings.launch.showSampleProducts && allProducts.some((p) => p.sample)) {
    blockers.push({ key: 'samples', message: 'Replace or delete the sample products, or set launch → show_sample_products to false.' });
  }
  return blockers;
}
