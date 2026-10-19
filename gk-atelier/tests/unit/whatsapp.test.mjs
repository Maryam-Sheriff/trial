import assert from 'node:assert/strict';
import test from 'node:test';
import { formatWhatsAppNumber, normalizeWhatsAppNumber, whatsappUrl } from '../../src/lib/whatsapp.mjs';

test('accepts international numbers written in common ways', () => {
  for (const input of ['201001234567', '+20 100 123 4567', '0020-100-123-4567', '+971 50 123 4567', '(966) 501234567']) {
    const result = normalizeWhatsAppNumber(input);
    assert.equal(result.ok, true, input);
    assert.match(result.number, /^\d+$/);
  }
  assert.equal(normalizeWhatsAppNumber('+20 100 123 4567').number, '201001234567');
  assert.equal(normalizeWhatsAppNumber('0020 100 123 4567').number, '201001234567');
});

test('rejects missing, local-format and malformed numbers with a reason', () => {
  assert.deepEqual(normalizeWhatsAppNumber(''), { ok: false, reason: 'missing' });
  assert.deepEqual(normalizeWhatsAppNumber('   '), { ok: false, reason: 'missing' });
  assert.match(normalizeWhatsAppNumber('01001234567').reason, /local format/);
  assert.match(normalizeWhatsAppNumber('2001001234567').reason, /Remove the 0/);
  assert.match(normalizeWhatsAppNumber('20100123456').reason, /12 digits/);
  assert.match(normalizeWhatsAppNumber('20-CALL-ME').reason, /digits only/);
  assert.match(normalizeWhatsAppNumber('1234').reason, /between 8 and 15/);
});

test('builds wa.me links with a fully encoded message', () => {
  const message = 'Hello Ghada! I\'m interested in Hoop & "Name" #2?\nProduct link: https://www.example.com/products/a/?x=1';
  const url = whatsappUrl('201001234567', message);
  assert.ok(url.startsWith('https://wa.me/201001234567?text='));
  const text = new URL(url).searchParams.get('text');
  assert.equal(text, message);
  assert.ok(!url.slice(url.indexOf('=') + 1).includes(' '), 'spaces must be encoded');
  assert.ok(url.includes('%0A'), 'new lines are encoded');
  assert.ok(url.includes('%26'), '& is encoded so it cannot split the query');
  assert.ok(url.includes('%23'), '# is encoded so it cannot become a fragment');
});

test('encodes Arabic messages', () => {
  const message = 'مرحبًا غادة! أعجبتني قطعة «طارة»';
  const url = whatsappUrl('201001234567', message);
  assert.equal(new URL(url).searchParams.get('text'), message);
  assert.ok(/^[\x21-\x7e]+$/.test(url), 'URL is plain ASCII');
});

test('links without a message open the chat only', () => {
  assert.equal(whatsappUrl('201001234567'), 'https://wa.me/201001234567');
});

test('formats numbers for display', () => {
  assert.equal(formatWhatsAppNumber('201001234567'), '+20 10 0123 4567');
  assert.equal(formatWhatsAppNumber('971501234567'), '+971501234567');
});
