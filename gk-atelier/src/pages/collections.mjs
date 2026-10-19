import { html } from '../lib/html.mjs';
import { pick } from '../lib/i18n.mjs';
import { picture } from '../components/media.mjs';
import {
  breadcrumbs,
  button,
  collectionCard,
  productCard,
  sectionHeading,
  text,
  whatsappButton,
  whatsappNote,
} from '../components/ui.mjs';

function askBand(ctx, { title, body, message, label, secondary }) {
  return html`<section class="ask-band" aria-label="${title}">
  <div class="container ask-band__inner">
    <div class="ask-band__text">
      <h2 class="ask-band__title">${title}</h2>
      <p>${body}</p>
    </div>
    <div class="ask-band__actions">
      ${whatsappButton(ctx, message, { label })}
      ${secondary ?? ''}
      ${whatsappNote(ctx)}
    </div>
  </div>
</section>`;
}

export function collectionsPage(ctx) {
  const { t, content } = ctx;
  const body = html`
<section class="page-hero">
  <div class="container">
    ${breadcrumbs(ctx, [
      { href: ctx.url('/'), label: t('nav.home') },
      { label: t('nav.collections') },
    ])}
    <div class="page-hero__text">
      <p class="eyebrow">${t('collections.eyebrow')}</p>
      <h1 class="page-title">${t('collections.heading')}</h1>
      <p class="lead">${t('collections.lead')}</p>
      <div class="page-hero__actions">
        ${whatsappButton(ctx, t('whatsapp.messages.general'), { label: t('whatsapp.ask'), variant: 'secondary' })}
      </div>
    </div>
  </div>
</section>

<section class="section section--flush-top" aria-label="${t('collections.heading')}">
  <div class="container">
    <div class="collection-grid collection-grid--index">
      ${content.collections.map((c) => collectionCard(ctx, c, { headingLevel: 2, linkLabel: t('collections.view') }))}
    </div>
  </div>
</section>

${askBand(ctx, {
  title: t('collections.band_title'),
  body: t('collections.band_text'),
  message: t('whatsapp.messages.general'),
  label: t('whatsapp.ask'),
  secondary: button(ctx.url('/custom-orders/'), t('home.custom_link'), { variant: 'secondary' }),
})}`;

  return {
    name: 'collections',
    route: '/collections/',
    section: 'collections',
    title: `${t('collections.title')} | ${t('meta.title_suffix')}`,
    description: t('collections.description'),
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t('nav.home'), item: ctx.absoluteUrl(ctx.url('/')) },
          { '@type': 'ListItem', position: 2, name: t('nav.collections'), item: ctx.absoluteUrl(ctx.url('/collections/')) },
        ],
      },
    ],
    body,
  };
}

export function collectionPage(ctx, collection) {
  const { t, content } = ctx;
  const name = pick(collection.name, ctx.lang);
  const route = `/collections/${collection.slug}/`;
  const message = t('whatsapp.messages.collection', { collection: name });
  const products = collection.products;
  const customHref = `${ctx.url('/custom-orders/')}?type=${collection.slug}`;

  const body = html`
<section class="page-hero page-hero--collection">
  <div class="container">
    ${breadcrumbs(ctx, [
      { href: ctx.url('/'), label: t('nav.home') },
      { href: ctx.url('/collections/'), label: t('nav.collections') },
      { label: name },
    ])}
    <div class="page-hero__grid">
      <div class="page-hero__text">
        <p class="eyebrow"><a href="${ctx.url('/collections/')}">${t('nav.collections')}</a></p>
        <h1 class="page-title">${text(collection.name, ctx.lang)}</h1>
        <p class="lead">${text(collection.intro, ctx.lang)}</p>
        ${products.length ? html`<p class="count">${t.plural('collection.count', products.length)}</p>` : ''}
        <div class="page-hero__actions">
          ${whatsappButton(ctx, message, { label: t('whatsapp.ask_collection'), variant: 'secondary' })}
        </div>
      </div>
      <div class="page-hero__media">
        ${picture(ctx, collection.image, {
          eager: true,
          sizes: '(min-width: 900px) 45vw, 100vw',
          alt: name,
          placeholder: { icon: collection.icon, subject: name },
        })}
      </div>
    </div>
  </div>
</section>

<section class="section section--tight" aria-label="${name}">
  <div class="container">
    ${products.length
      ? html`<div class="product-grid">${products.map((p) => productCard(ctx, p, { headingLevel: 2, showCollection: false }))}</div>`
      : html`<div class="empty-state">
          <h2 class="empty-state__title">${t('collection.empty_title')}</h2>
          <p>${t('collection.empty_text')}</p>
          <div class="empty-state__actions">
            ${whatsappButton(ctx, message, { label: t('whatsapp.ask_collection') })}
            ${button(customHref, t('home.custom_link'), { variant: 'secondary' })}
          </div>
        </div>`}
  </div>
</section>

${products.length
  ? askBand(ctx, {
      title: t('collection.ask_title'),
      body: t('collection.ask_text'),
      message,
      label: t('whatsapp.ask_collection'),
      secondary: button(customHref, t('home.custom_link'), { variant: 'secondary' }),
    })
  : ''}

<nav class="section section--tight other-collections" aria-labelledby="others-title">
  <div class="container">
    ${sectionHeading({ title: t('collection.others'), id: 'others-title', align: 'center' })}
    <ul class="pill-list">
      ${content.collections
        .filter((c) => c.slug !== collection.slug)
        .map((c) => html`<li><a class="pill" href="${ctx.url(`/collections/${c.slug}/`)}">${text(c.name, ctx.lang)}</a></li>`)}
    </ul>
  </div>
</nav>`;

  const shareImage = collection.image ? ctx.shareImage(collection.image.src) : null;
  return {
    name: 'collection',
    route,
    section: 'collections',
    title: `${t('collection.title', { collection: name })} | ${t('meta.title_suffix')}`,
    description: t('collection.description', { intro: pick(collection.intro, ctx.lang) || pick(collection.short, ctx.lang) }),
    shareImage,
    whatsappMessage: message,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t('nav.home'), item: ctx.absoluteUrl(ctx.url('/')) },
          { '@type': 'ListItem', position: 2, name: t('nav.collections'), item: ctx.absoluteUrl(ctx.url('/collections/')) },
          { '@type': 'ListItem', position: 3, name, item: ctx.absoluteUrl(ctx.url(route)) },
        ],
      },
    ],
    body,
  };
}
