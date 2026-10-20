import { html, raw } from '../lib/html.mjs';
import { isFallback, pick } from '../lib/i18n.mjs';
import { DETAIL_FIELDS } from '../lib/content.mjs';
import { icon } from '../components/icons.mjs';
import { largestUrl, picture } from '../components/media.mjs';
import { breadcrumbs, paragraphs, priceText, productCard, sectionHeading, text, whatsappButton, whatsappNote } from '../components/ui.mjs';

const SCHEMA_AVAILABILITY = {
  'made-to-order': 'https://schema.org/MadeToOrder',
  available: 'https://schema.org/InStock',
  unavailable: 'https://schema.org/OutOfStock',
};

function gallery(ctx, product, collection) {
  const { t } = ctx;
  const name = pick(product.name, ctx.lang);
  const images = product.images;
  if (images.length === 0) {
    return html`<div class="gallery gallery--empty">
      <div class="gallery__frame">${picture(ctx, null, { placeholder: { icon: collection.icon, subject: name } })}</div>
    </div>`;
  }
  const total = images.length;
  return html`<div class="gallery" data-gallery>
    <div class="gallery__track" data-gallery-track tabindex="0" role="region" aria-label="${t('gallery.label')}">
      ${images.map(
        (image, i) => html`<figure class="gallery__slide" id="photo-${i + 1}" data-gallery-slide>
          <a class="gallery__zoom" href="${largestUrl(ctx, image)}" data-gallery-zoom="${i}" aria-label="${t('gallery.enlarge')}${total > 1 ? ` — ${t('gallery.show', { n: i + 1, total })}` : ''}">
            ${picture(ctx, image, { eager: i === 0, sizes: '(min-width: 900px) 55vw, 100vw', alt: name })}
            <span class="gallery__zoom-icon" aria-hidden="true">${icon('expand')}</span>
          </a>
        </figure>`,
      )}
    </div>
    ${total > 1
      ? html`<div class="gallery__thumbs" role="group" aria-label="${t('gallery.label')}">
          ${images.map(
            (image, i) => html`<button class="gallery__thumb" type="button" data-gallery-thumb="${i}" aria-label="${t('gallery.show', { n: i + 1, total })}"${i === 0 ? html` aria-current="true"` : ''}>
              ${picture(ctx, image, { sizes: '96px', alt: '' })}
            </button>`,
          )}
        </div>`
      : ''}
  </div>`;
}

function lightbox(ctx, product) {
  if (product.images.length === 0) return '';
  const { t } = ctx;
  const name = pick(product.name, ctx.lang);
  const sources = product.images.map((image) => ({ src: largestUrl(ctx, image), alt: pick(image.alt, ctx.lang) || name }));
  return html`<dialog class="lightbox" data-lightbox aria-label="${t('gallery.label')}">
  <script type="application/json" data-lightbox-images>${raw(JSON.stringify(sources).replace(/</g, '\\u003c'))}</script>
  <img class="lightbox__image" alt="" data-lightbox-image>
  <p class="lightbox__count" data-lightbox-count aria-live="polite"></p>
  <button class="lightbox__close" type="button" data-lightbox-close aria-label="${t('gallery.close')}">${icon('close')}</button>
  ${product.images.length > 1
    ? html`<button class="lightbox__nav lightbox__nav--prev" type="button" data-lightbox-prev aria-label="${t('gallery.previous')}">${icon('chevronStart', { className: 'icon icon--flip' })}</button>
  <button class="lightbox__nav lightbox__nav--next" type="button" data-lightbox-next aria-label="${t('gallery.next')}">${icon('chevronEnd', { className: 'icon icon--flip' })}</button>`
    : ''}
</dialog>`;
}

function details(ctx, product) {
  const { t } = ctx;
  const rows = DETAIL_FIELDS.filter((field) => product.details[field]).map((field) => ({
    label: t(`product.fields.${field}`),
    value: text(product.details[field], ctx.lang),
  }));
  if (product.availability) {
    rows.push({ label: t('product.fields.availability'), value: t(`product.availability.${product.availability}`) });
  }
  if (!rows.length) return '';
  return html`<section class="details" aria-labelledby="details-title">
    <h2 class="details__title" id="details-title">${t('product.details')}</h2>
    <dl class="details__list">
      ${rows.map((row) => html`<div class="details__row"><dt>${row.label}</dt><dd>${row.value}</dd></div>`)}
    </dl>
  </section>`;
}

export function productPage(ctx, product) {
  const { t, content } = ctx;
  const collection = ctx.collection(product.collection);
  const name = pick(product.name, ctx.lang);
  const collectionName = pick(collection.name, ctx.lang);
  const route = `/products/${product.slug}/`;
  const collectionRoute = `/collections/${collection.slug}/`;
  const message = t('whatsapp.messages.product', { product: name, url: ctx.shareableUrl(ctx.url(route)) });
  const related = content.products.filter((p) => p.collection === product.collection && p.slug !== product.slug).slice(0, 4);
  const cta = whatsappButton(ctx, message, { label: t('whatsapp.order_product'), className: 'btn--block', size: 'large' });

  const body = html`
<div class="container">
  ${breadcrumbs(ctx, [
    { href: ctx.url('/'), label: t('nav.home') },
    { href: ctx.url('/collections/'), label: t('nav.collections') },
    { href: ctx.url(collectionRoute), label: collectionName },
    { label: name },
  ])}
</div>

<article class="product">
  <div class="container product__grid">
    <div class="product__media">
      ${gallery(ctx, product, collection)}
    </div>
    <div class="product__info">
      ${product.sample ? html`<p class="sample-notice" role="note">${icon('info')}<span>${t('product.sample_notice')}</span></p>` : ''}
      <p class="eyebrow"><a href="${ctx.url(collectionRoute)}">${text(collection.name, ctx.lang)}</a></p>
      <h1 class="product__title">${text(product.name, ctx.lang)}</h1>
      <p class="product__price">${product.price ? priceText(ctx, product.price) : t('product.price_on_request')}</p>
      <div class="prose product__description"${isFallback(product.description, ctx.lang) ? html` lang="en" dir="ltr"` : ''}>
        ${paragraphs(pick(product.description, ctx.lang).split(/\n+/))}
      </div>
      <div class="product__cta" data-product-cta>
        ${cta}
        ${whatsappNote(ctx)}
      </div>
      ${details(ctx, product)}
      ${!product.price || !product.availability
        ? html`<div class="ask-panel">
            <h2 class="ask-panel__title">${t('product.ask_title')}</h2>
            <p>${t('product.ask_text')}</p>
          </div>`
        : ''}
      <p class="product__ref">${t('product.reference', { id: product.id })}</p>
    </div>
  </div>
</article>

${related.length
  ? html`<section class="section section--tight related" aria-labelledby="related-title">
  <div class="container">
    ${sectionHeading({ title: t('product.related', { collection: collectionName }), id: 'related-title' })}
    <div class="product-grid">
      ${related.map((p) => productCard(ctx, p, { showCollection: false }))}
    </div>
  </div>
</section>`
  : ''}`;

  const after = html`<aside class="sticky-cta" data-sticky-cta aria-label="${t('whatsapp.order_product')}" inert>
  <div class="sticky-cta__inner">
    <p class="sticky-cta__name">${name}</p>
    ${whatsappButton(ctx, message, { label: t('whatsapp.order_product'), size: 'small' })}
  </div>
</aside>
${lightbox(ctx, product)}`;

  const absoluteImages = product.images.map((image) => ctx.absoluteUrl(ctx.image(image.src).fallback));
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t('nav.home'), item: ctx.absoluteUrl(ctx.url('/')) },
        { '@type': 'ListItem', position: 2, name: t('nav.collections'), item: ctx.absoluteUrl(ctx.url('/collections/')) },
        { '@type': 'ListItem', position: 3, name: collectionName, item: ctx.absoluteUrl(ctx.url(collectionRoute)) },
        { '@type': 'ListItem', position: 4, name, item: ctx.absoluteUrl(ctx.url(route)) },
      ],
    },
  ];
  // Product data is only published when it is complete and exact: a real
  // piece (not a sample) with a fixed price Ghada has supplied.
  if (!product.sample && product.price && !product.price.from && absoluteImages.length) {
    const offer = {
      '@type': 'Offer',
      price: String(product.price.amount),
      priceCurrency: product.price.currency,
      url: ctx.absoluteUrl(ctx.url(route)),
    };
    if (product.availability) offer.availability = SCHEMA_AVAILABILITY[product.availability];
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description: pick(product.description, ctx.lang),
      image: absoluteImages,
      sku: product.id,
      category: collectionName,
      brand: { '@type': 'Brand', name: 'GK Atelier' },
      offers: offer,
    });
  }

  return {
    name: 'product',
    route,
    section: 'collections',
    title: `${t('product.title', { product: name, collection: collectionName })} | ${t('meta.title_suffix')}`,
    description: pick(product.description, ctx.lang),
    shareImage: product.images[0] ? ctx.shareImage(product.images[0].src) : null,
    floatingWhatsApp: false,
    index: !product.sample,
    jsonLd,
    body,
    after,
  };
}
