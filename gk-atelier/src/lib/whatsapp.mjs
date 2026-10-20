// WhatsApp click-to-chat links: https://wa.me/<number>?text=<encoded message>
// The number is stored once in content/settings.yml.

/**
 * Cleans a number typed by a person ("+20 101 234 5678", "0020…") into the
 * digits-only international format wa.me expects, or explains what is wrong.
 */
export function normalizeWhatsAppNumber(input) {
  let digits = String(input ?? '').trim();
  if (!digits) return { ok: false, reason: 'missing' };
  digits = digits.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  if (!/^\d+$/.test(digits)) {
    return { ok: false, reason: 'Use digits only (country code + number), without letters or symbols.' };
  }
  if (digits.startsWith('0')) {
    return {
      ok: false,
      reason: 'The number starts with 0, which is the local format. Add the country code and drop the first 0 (e.g. 20 for Egypt).',
    };
  }
  if (digits.startsWith('200')) {
    return { ok: false, reason: 'Remove the 0 that follows the Egyptian country code 20 (201…, not 2001…).' };
  }
  if (digits.startsWith('20') && digits.length !== 12) {
    return { ok: false, reason: 'Egyptian mobile numbers have 12 digits in this format: 20 followed by 10 digits starting with 1.' };
  }
  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, reason: 'International numbers have between 8 and 15 digits including the country code.' };
  }
  return { ok: true, number: digits };
}

export function whatsappUrl(number, message) {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Human-friendly display, e.g. +20 10 1234 5678 for Egyptian mobiles. */
export function formatWhatsAppNumber(number) {
  if (number.startsWith('20') && number.length === 12) {
    return `+20 ${number.slice(2, 4)} ${number.slice(4, 8)} ${number.slice(8)}`;
  }
  return `+${number}`;
}
