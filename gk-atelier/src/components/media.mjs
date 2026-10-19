import { attrs, html } from '../lib/html.mjs';
import { pick } from '../lib/i18n.mjs';
import { craftIcon } from './icons.mjs';

const FOCUS = { left: '25% 50%', right: '75% 50%', top: '50% 25%', bottom: '50% 75%' };

/**
 * A clearly labelled stand-in shown wherever a real photograph hasn't been
 * supplied yet. It is deliberately graphic, never photographic, so it can't
 * be mistaken for one of Ghada's pieces.
 */
export function placeholder(ctx, { icon = 'gift', subject = '', label } = {}) {
  const text = label ?? ctx.t('placeholder.photo');
  return html`<div class="ph" role="img" aria-label="${subject ? `${text} — ${subject}` : text}">
    ${craftIcon(icon)}
    <span class="ph__label" aria-hidden="true">${text}</span>
  </div>`;
}

/**
 * A responsive photograph. `sizes` describes how wide it is displayed so the
 * browser downloads the smallest file that still looks sharp.
 */
export function picture(ctx, image, { sizes = '100vw', eager = false, alt = '', className = '', placeholder: ph = {} } = {}) {
  const processed = image && ctx.image(image.src);
  if (!processed) return placeholder(ctx, ph);
  const text = pick(image.alt, ctx.lang) || alt;
  const srcset = processed.webp.map((v) => `${v.url} ${v.width}w`).join(', ');
  return html`<picture${attrs({ class: className || null })}>
    <source type="image/webp" srcset="${srcset}" sizes="${sizes}">
    <img${attrs({
      src: processed.fallback,
      alt: text,
      width: processed.width,
      height: processed.height,
      loading: eager ? 'eager' : 'lazy',
      fetchpriority: eager ? 'high' : null,
      decoding: eager ? null : 'async',
      style: FOCUS[image.focus] ? `object-position: ${FOCUS[image.focus]}` : null,
    })}>
  </picture>`;
}

/** Largest available version of a photo, for the enlarged view. */
export function largestUrl(ctx, image) {
  const processed = image && ctx.image(image.src);
  return processed ? processed.webp.at(-1).url : null;
}
