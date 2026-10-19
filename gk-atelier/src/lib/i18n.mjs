import { fill } from './html.mjs';

export const LANGS = {
  en: { code: 'en', dir: 'ltr', prefix: '', intl: 'en-GB', other: 'ar' },
  ar: { code: 'ar', dir: 'rtl', prefix: '/ar', intl: 'ar-EG-u-nu-latn', other: 'en' },
};

export const LANG_CODES = Object.keys(LANGS);

function lookup(tree, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), tree);
}

/**
 * Returns a translator for one language. Missing Arabic keys fall back to
 * English (and are reported by the content checks) so a page never shows a
 * raw key.
 */
export function translator(copy, lang) {
  const primary = copy[lang];
  const fallback = copy.en;
  const t = (key, vars) => {
    let value = lookup(primary, key);
    if (value === undefined || value === null || value === '') value = lookup(fallback, key);
    if (value === undefined || value === null) throw new Error(`Missing text "${key}" in content/copy/en.yml`);
    return typeof value === 'string' ? fill(value, vars) : value;
  };
  t.lang = lang;
  t.plural = (key, count) => {
    const forms = t(key);
    const category = new Intl.PluralRules(LANGS[lang].intl).select(count);
    const template = forms[count === 0 && forms.zero ? 'zero' : category] ?? forms.other;
    return fill(template, { count: formatNumber(count, lang) });
  };
  return t;
}

/** Picks the right language from a bilingual { en, ar } field, falling back to English. */
export function pick(field, lang) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  return field[lang] || field.en || '';
}

/** True when `pick` had to fall back to English on an Arabic page. */
export function isFallback(field, lang) {
  return lang !== 'en' && field && typeof field === 'object' && !field[lang] && Boolean(field.en);
}

export function formatNumber(value, lang) {
  return new Intl.NumberFormat(LANGS[lang].intl).format(value);
}

/** Arabic-Indic digits for decorative numerals (step numbers) on Arabic pages. */
export function decorativeNumber(value, lang) {
  const text = String(value).padStart(2, '0');
  return lang === 'ar' ? text.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]) : text;
}

export function formatPrice(price, lang) {
  const whole = Number.isInteger(price.amount);
  return new Intl.NumberFormat(LANGS[lang].intl, {
    style: 'currency',
    currency: price.currency,
    currencyDisplay: lang === 'en' ? 'code' : 'symbol',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(price.amount);
}
