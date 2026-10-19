import { attrs, html } from '../lib/html.mjs';
import { decorativeNumber, formatPrice, isFallback, pick } from '../lib/i18n.mjs';
import { icon } from './icons.mjs';
import { picture } from './media.mjs';

/** Text from a bilingual field; marks English shown on an Arabic page as English. */
export function text(field, lang) {
  const value = pick(field, lang);
  return isFallback(field, lang) ? html`<span lang="en" dir="ltr">${value}</span>` : value;
}

export function paragraphs(list) {
  return (Array.isArray(list) ? list : [list]).filter(Boolean).map((p) => html`<p>${p}</p>`);
}

/**
 * Every route to WhatsApp goes through here. With a number configured it is
 * a real wa.me link carrying a prefilled message the customer reviews and
 * sends themselves. Without one it opens a "not connected yet" notice —
 * never a made-up number.
 */
export function whatsappButton(ctx, message, { label, variant = 'primary', className = '', size = '', withIcon = true, extra = {} } = {}) {
  const classes = ['btn', `btn--${variant}`, size && `btn--${size}`, className].filter(Boolean).join(' ');
  const content = html`${withIcon ? icon('whatsapp') : ''}<span>${label}</span>`;
  const link = ctx.whatsapp(message);
  if (link) {
    return html`<a${attrs({ class: classes, href: link, target: '_blank', rel: 'noopener', 'data-wa': '', ...extra })}>${content}</a>`;
  }
  return html`<a${attrs({ class: classes, href: '#whatsapp-setup', 'data-wa-setup': '', 'data-wa-message': message, ...extra })}>${content}</a>`;
}

export function button(href, label, { variant = 'primary', className = '', arrow = false } = {}) {
  const classes = ['btn', `btn--${variant}`, className].filter(Boolean).join(' ');
  return html`<a class="${classes}" href="${href}"><span>${label}</span>${arrow ? icon('arrow', { className: 'icon icon--flip' }) : ''}</a>`;
}

export function textLink(href, label) {
  return html`<a class="text-link" href="${href}"><span>${label}</span>${icon('arrow', { className: 'icon icon--flip' })}</a>`;
}

export function sectionHeading({ eyebrow, title, intro, level = 2, id, align = '' }) {
  const tag = `h${level}`;
  return html`<header class="section-heading${align ? ` section-heading--${align}` : ''}">
    ${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ''}
    ${html([`<${tag}${id ? ` id="${id}"` : ''} class="section-title">`, `</${tag}>`], title)}
    ${intro ? html`<p class="section-intro">${intro}</p>` : ''}
  </header>`;
}

export function priceText(ctx, price) {
  if (!price) return '';
  const formatted = formatPrice(price, ctx.lang);
  return price.from ? ctx.t('product.price_from', { price: formatted }) : formatted;
}

export function collectionCard(ctx, collection, { headingLevel = 3, sizes, linkLabel } = {}) {
  const tag = `h${headingLevel}`;
  const name = pick(collection.name, ctx.lang);
  return html`<article class="card card--collection">
    <div class="card__media">
      ${picture(ctx, collection.image, {
        sizes: sizes ?? '(min-width: 1100px) 30vw, (min-width: 700px) 45vw, 50vw',
        alt: name,
        placeholder: { icon: collection.icon, subject: name },
      })}
    </div>
    <div class="card__body">
      ${html([`<${tag} class="card__title">`, `</${tag}>`], html`<a class="card__link" href="${ctx.url(`/collections/${collection.slug}/`)}">${text(collection.name, ctx.lang)}</a>`)}
      <p class="card__text">${text(collection.short, ctx.lang)}</p>
      <span class="card__more" aria-hidden="true">${linkLabel ?? ctx.t('home.explore_collection')}${icon('arrow', { className: 'icon icon--flip' })}</span>
    </div>
  </article>`;
}

export function productCard(ctx, product, { headingLevel = 3, showCollection = true } = {}) {
  const tag = `h${headingLevel}`;
  const collection = ctx.collection(product.collection);
  const name = pick(product.name, ctx.lang);
  return html`<article class="card card--product">
    <div class="card__media">
      ${picture(ctx, product.images[0], {
        sizes: '(min-width: 1100px) 25vw, (min-width: 700px) 33vw, 50vw',
        alt: name,
        placeholder: { icon: collection.icon, subject: name },
      })}
      ${product.sample ? html`<span class="badge">${ctx.t('product.sample_badge')}</span>` : ''}
    </div>
    <div class="card__body">
      ${showCollection ? html`<p class="card__eyebrow">${text(collection.name, ctx.lang)}</p>` : ''}
      ${html([`<${tag} class="card__title card__title--product">`, `</${tag}>`], html`<a class="card__link" href="${ctx.url(`/products/${product.slug}/`)}">${text(product.name, ctx.lang)}</a>`)}
      ${product.price ? html`<p class="card__price">${priceText(ctx, product.price)}</p>` : ''}
    </div>
  </article>`;
}

export function breadcrumbs(ctx, items) {
  return html`<nav class="breadcrumbs" aria-label="${ctx.t('nav.breadcrumb')}">
    <ol>
      ${items.map((item, i) =>
        i === items.length - 1
          ? html`<li><span aria-current="page">${item.label}</span></li>`
          : html`<li><a href="${item.href}">${item.label}</a></li>`,
      )}
    </ol>
  </nav>`;
}

export function steps(ctx, list = ctx.t('steps')) {
  return html`<ol class="steps">
    ${list.map(
      (step, i) => html`<li class="step">
        <span class="step__number" aria-hidden="true">${decorativeNumber(i + 1, ctx.lang)}</span>
        <h3 class="step__title">${step.title}</h3>
        <p class="step__text">${step.text}</p>
      </li>`,
    )}
  </ol>`;
}

export function whatsappNote(ctx) {
  return html`<p class="wa-note">${icon('info')}<span>${ctx.t('whatsapp.opens_note')}</span></p>`;
}
