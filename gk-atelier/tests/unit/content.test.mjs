import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { launchBlockers, loadContent } from '../../src/lib/content.mjs';
import { PROJECT, copySite, editYaml } from '../fixtures/make-site.mjs';

const messages = (list) => list.map((i) => `${i.file}: ${i.message}`).join('\n');

test('the real content loads without errors', () => {
  const content = loadContent(PROJECT);
  assert.equal(content.report.errors.length, 0, messages(content.report.errors));
  assert.equal(content.collections.length, 7);
  assert.deepEqual(
    content.collections.map((c) => c.slug),
    ['wedding-bridal', 'embroidery-textile-art', 'macrame-home-decor', 'baby-newborn', 'silk-painting', 'crochet-teriko', 'personalized-gifts'],
  );
  for (const c of content.collections) {
    assert.ok(c.name.en && c.name.ar && c.short.en && c.short.ar && c.intro.en && c.intro.ar, c.slug);
  }
});

test('every English text has an Arabic counterpart', () => {
  const content = loadContent(PROJECT);
  const missing = content.report.warnings.filter((w) => w.file === 'content/copy/ar.yml');
  assert.deepEqual(missing, []);
});

test('the shipped content is a preview: nothing invented is presented as real', () => {
  const content = loadContent(PROJECT);
  assert.equal(content.settings.whatsapp, null, 'no WhatsApp number is made up');
  assert.equal(content.settings.siteUrl, '');
  assert.equal(content.settings.launch.arabicReviewed, false);
  assert.ok(content.allProducts.every((p) => p.sample), 'only sample products ship');
  assert.ok(content.allProducts.every((p) => !p.price && !p.availability && Object.keys(p.details).length === 0), 'samples carry no prices or specifications');
  assert.deepEqual(
    launchBlockers(content).map((b) => b.key),
    ['whatsapp', 'url', 'logo', 'arabic', 'samples'],
  );
});

test('product files are validated with helpful messages', () => {
  const root = copySite('validation');
  const dir = path.join(root, 'content/products');
  fs.writeFileSync(
    path.join(dir, 'broken.yml'),
    [
      'id: SAMPLE-01',
      'slug: Not A Slug',
      'collection: pottery',
      'name: { en: "" }',
      'description: { en: "" }',
      'images:',
      '  - src: images/products/missing.jpg',
      'price: { amount: -5, currency: EGP }',
      'availability: soon',
      'colors: { en: red }',
    ].join('\n'),
  );
  fs.writeFileSync(path.join(dir, 'bad-yaml.yml'), 'name:\n  en: "unclosed\n');
  const { report } = loadContent(root);
  const text = messages(report.errors);
  assert.match(text, /sample-bridal-keepsake\.yml: id "SAMPLE-01" is also used in content\/products\/broken\.yml/);
  assert.match(text, /broken\.yml: slug must use lowercase/);
  assert.match(text, /broken\.yml: collection "pottery" doesn't exist/);
  assert.match(text, /broken\.yml: name → en is missing/);
  assert.match(text, /broken\.yml: photo 1: the photo "images\/products\/missing\.jpg" was not found/);
  assert.match(text, /broken\.yml: price → amount must be a number greater than 0/);
  assert.match(text, /broken\.yml: availability must be one of/);
  assert.match(text, /bad-yaml\.yml: Could not read this file \(line \d+\)/);
  assert.match(messages(report.warnings), /Unknown field "colors"/);
});

test('settings are validated', () => {
  const root = copySite('settings-validation');
  editYaml(root, 'content/settings.yml', (s) => {
    s.whatsapp.number = '01001234567';
    s.site.url = 'gkatelier';
    s.social.instagram = 'instagram.com/x';
    s.brand.logo = 'images/brand/nope.svg';
  });
  const text = messages(loadContent(root).report.errors);
  assert.match(text, /whatsapp → number "01001234567": .*local format/);
  assert.match(text, /site → url "gkatelier" is not a full web address/);
  assert.match(text, /social → instagram: .*https:\/\//);
  assert.match(text, /brand → logo: the photo "images\/brand\/nope\.svg" was not found/);
});

test('a site URL with a sub-folder becomes the base path', () => {
  const root = copySite('base-path');
  editYaml(root, 'content/settings.yml', (s) => {
    s.site.url = 'https://user.github.io/gk-atelier/';
  });
  const { settings } = loadContent(root);
  assert.equal(settings.siteUrl, 'https://user.github.io');
  assert.equal(settings.basePath, '/gk-atelier');
});
