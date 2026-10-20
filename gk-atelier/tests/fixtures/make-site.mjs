// Builds throwaway copies of the site for tests. The "configured" fixture
// fills in everything a launch needs using test-only values (a reserved
// example.com domain, an obviously fake number, generated images) so the
// real content files are never touched.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import yaml from 'js-yaml';
import { build } from '../../src/build.mjs';

export const PROJECT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const TMP = path.join(PROJECT, 'tests/.tmp');
export const TEST_NUMBER = '201000000000';
export const TEST_URL = 'https://www.example.com';

export function copySite(name) {
  const root = path.join(TMP, name);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  fs.cpSync(path.join(PROJECT, 'content'), path.join(root, 'content'), { recursive: true });
  fs.cpSync(path.join(PROJECT, 'images'), path.join(root, 'images'), { recursive: true });
  return root;
}

export function editYaml(root, relative, edit) {
  const file = path.join(root, relative);
  const data = yaml.load(fs.readFileSync(file, 'utf8'));
  const result = edit(data) ?? data;
  fs.writeFileSync(file, yaml.dump(result, { lineWidth: -1 }));
}

async function testImage(file, { width, height, color }) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp({ create: { width, height, channels: 3, background: color } })
    .jpeg()
    .toFile(file);
}

export async function makeConfiguredSite(name = 'configured') {
  const root = copySite(name);
  editYaml(root, 'content/settings.yml', (s) => {
    s.whatsapp.number = TEST_NUMBER;
    s.site.url = TEST_URL;
    s.social.instagram = 'https://www.instagram.com/example';
    s.launch.arabic_reviewed = true;
    s.launch.show_sample_products = false;
  });
  await testImage(path.join(root, 'images/atelier/test-hero.jpg'), { width: 1600, height: 2000, color: '#c9b79f' });
  editYaml(root, 'content/photos.yml', (p) => {
    p.hero = { src: 'images/atelier/test-hero.jpg', alt: { en: 'Test hero photo', ar: 'صورة اختبار' } };
  });

  for (let i = 1; i <= 3; i++) {
    await testImage(path.join(root, `images/products/test-hoop/${i}.jpg`), { width: 1200 + i * 200, height: 1500 + i * 200, color: ['#b69a70', '#d8bdb5', '#887565'][i - 1] });
  }
  const product = {
    id: 'TEST-001',
    slug: 'test-embroidered-hoop',
    collection: 'embroidery-textile-art',
    featured: true,
    name: { en: 'Test Hoop & "Name"', ar: 'طارة اختبار' },
    description: { en: 'First paragraph for testing.\nSecond paragraph for testing.', ar: 'وصف اختبار.' },
    images: [1, 2, 3].map((i) => ({ src: `images/products/test-hoop/${i}.jpg`, alt: { en: `Test photo ${i}`, ar: `صورة اختبار ${i}` } })),
    price: { amount: 1250, currency: 'EGP' },
    materials: { en: 'Test cotton', ar: 'قطن اختبار' },
    techniques: { en: 'Test embroidery', ar: 'تطريز اختبار' },
    dimensions: { en: '20 cm', ar: '٢٠ سم' },
    colours: { en: 'Ivory', ar: 'عاجي' },
    sizes: { en: 'One size', ar: 'مقاس واحد' },
    customization: { en: 'Any name', ar: 'أي اسم' },
    production_time: { en: 'About 7 days', ar: 'حوالي ٧ أيام' },
    availability: 'made-to-order',
  };
  fs.writeFileSync(path.join(root, 'content/products/test-embroidered-hoop.yml'), yaml.dump(product));
  const second = {
    id: 'TEST-002',
    slug: 'test-from-price',
    collection: 'embroidery-textile-art',
    name: { en: 'Test From Price', ar: 'سعر يبدأ من' },
    description: { en: 'A piece with a starting price.', ar: 'قطعة بسعر يبدأ من.' },
    price: { amount: 900, currency: 'SAR', from: true },
  };
  fs.writeFileSync(path.join(root, 'content/products/test-from-price.yml'), yaml.dump(second));

  const outDir = path.join(root, 'dist');
  const result = await build({ root, outDir, log: () => {} });
  return { root, outDir, ...result };
}

export async function makePreviewSite(name = 'preview') {
  const root = copySite(name);
  const outDir = path.join(root, 'dist');
  const result = await build({ root, outDir, log: () => {} });
  return { root, outDir, ...result };
}
