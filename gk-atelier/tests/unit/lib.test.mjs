import assert from 'node:assert/strict';
import test from 'node:test';
import { attrs, fill, html, raw } from '../../src/lib/html.mjs';
import { decorativeNumber, formatPrice, pick, translator } from '../../src/lib/i18n.mjs';

test('html escapes interpolated content but keeps nested templates', () => {
  const name = '<script>alert("x")</script> & \'quotes\'';
  const out = String(html`<p title="${name}">${name}${html`<b>ok</b>`}${raw('<i>raw</i>')}</p>`);
  assert.ok(!out.includes('<script>'));
  assert.ok(out.includes('&lt;script&gt;'));
  assert.ok(out.includes('&quot;x&quot;'));
  assert.ok(out.includes('&#39;quotes&#39;'));
  assert.ok(out.includes('<b>ok</b><i>raw</i>'));
});

test('html renders arrays and skips empty values', () => {
  assert.equal(String(html`${['a', null, false, undefined, 'b']}`), 'ab');
});

test('attrs renders boolean and skips empty attributes', () => {
  assert.equal(String(attrs({ required: true, hidden: false, id: 'x', title: null, 'data-a': '"q"' })), ' required id="x" data-a="&quot;q&quot;"');
});

test('fill replaces known placeholders only', () => {
  assert.equal(fill('Hi {name}, {unknown}', { name: 'Ghada' }), 'Hi Ghada, {unknown}');
});

test('translator falls back to English and supports Arabic plurals', () => {
  const copy = {
    en: { a: 'English', n: { one: '1 piece', other: '{count} pieces' } },
    ar: { n: { zero: 'لا توجد قطع', one: 'قطعة واحدة', two: 'قطعتان', few: '{count} قطع', many: '{count} قطعة', other: '{count} قطعة' } },
  };
  const ar = translator(copy, 'ar');
  assert.equal(ar('a'), 'English');
  assert.equal(ar.plural('n', 1), 'قطعة واحدة');
  assert.equal(ar.plural('n', 2), 'قطعتان');
  assert.equal(ar.plural('n', 3), '3 قطع');
  assert.equal(ar.plural('n', 11), '11 قطعة');
  const en = translator(copy, 'en');
  assert.equal(en.plural('n', 1), '1 piece');
  assert.equal(en.plural('n', 4), '4 pieces');
  assert.throws(() => en('missing.key'), /Missing text/);
});

test('pick falls back to English for missing Arabic', () => {
  assert.equal(pick({ en: 'Hoop', ar: '' }, 'ar'), 'Hoop');
  assert.equal(pick({ en: 'Hoop', ar: 'طارة' }, 'ar'), 'طارة');
  assert.equal(pick(null, 'en'), '');
});

test('prices are formatted per language without inventing decimals', () => {
  assert.match(formatPrice({ amount: 1250, currency: 'EGP' }, 'en'), /^EGP\s1,250$/);
  assert.match(formatPrice({ amount: 1250, currency: 'EGP' }, 'ar'), /1,250/);
  assert.match(formatPrice({ amount: 99.5, currency: 'SAR' }, 'en'), /99\.50/);
});

test('decorative step numbers use Arabic-Indic digits on Arabic pages', () => {
  assert.equal(decorativeNumber(1, 'en'), '01');
  assert.equal(decorativeNumber(3, 'ar'), '٠٣');
});
