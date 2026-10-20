import { html } from '../lib/html.mjs';
import { picture } from '../components/media.mjs';
import {
  button,
  collectionCard,
  paragraphs,
  productCard,
  sectionHeading,
  steps,
  textLink,
  whatsappButton,
  whatsappNote,
} from '../components/ui.mjs';

const GLIMPSE_ICONS = ['hoop', 'knot', 'yarn', 'brush', 'rings', 'gift'];

export function homePage(ctx) {
  const { t, content } = ctx;
  const { photos, collections, products } = content;
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const glimpse = photos.glimpse.length ? photos.glimpse : GLIMPSE_ICONS.map(() => ({ image: null }));

  const heroActions = html`<div class="hero__actions">
        ${button(ctx.url('/collections/'), t('home.hero_primary'))}
        ${whatsappButton(ctx, t('whatsapp.messages.general'), { label: t('home.hero_secondary'), variant: 'secondary' })}
      </div>`;
  // With a hero photograph: text beside the photo. Until one is added, the
  // logo leads the page instead of an empty photo frame.
  const hero = photos.hero || !ctx.brand.lockup
    ? html`<section class="hero">
  <div class="container hero__grid">
    <div class="hero__content">
      <p class="eyebrow">${t('home.hero_eyebrow')}</p>
      <h1 class="hero__title">${t('home.hero_title')}</h1>
      <p class="hero__text">${t('home.hero_text')}</p>
      ${heroActions}
    </div>
    <div class="hero__media">
      ${picture(ctx, photos.hero, {
        eager: true,
        sizes: '(min-width: 900px) 46vw, 100vw',
        alt: t('home.hero_title'),
        placeholder: { icon: 'hoop' },
      })}
    </div>
  </div>
</section>`
    : html`<section class="hero hero--brand">
  <div class="container hero__brand">
    <div class="hero__logo">
      ${picture(ctx, ctx.brand.lockup, { eager: true, sizes: '(min-width: 700px) 420px, 72vw', alt: t('meta.site_name') })}
    </div>
    <h1 class="hero__title">${t('home.hero_title')}</h1>
    <p class="hero__text">${t('home.hero_text')}</p>
    ${heroActions}
  </div>
</section>`;

  const body = html`
${hero}

<section class="section" aria-labelledby="collections-title">
  <div class="container">
    ${sectionHeading({ eyebrow: t('home.collections_eyebrow'), title: t('home.collections_title'), intro: t('home.collections_text'), id: 'collections-title' })}
    <div class="collection-grid collection-grid--home">
      ${collections.map((c) => collectionCard(ctx, c))}
    </div>
    <p class="section-more">${textLink(ctx.url('/collections/'), t('home.all_collections'))}</p>
  </div>
</section>

${featured.length
  ? html`<section class="section section--tight" aria-labelledby="featured-title">
  <div class="container">
    ${sectionHeading({ eyebrow: t('home.featured_eyebrow'), title: t('home.featured_title'), id: 'featured-title' })}
    <div class="product-grid">
      ${featured.map((p) => productCard(ctx, p))}
    </div>
  </div>
</section>`
  : ''}

<section class="section section--beige" aria-labelledby="custom-title">
  <div class="container split split--custom">
    <div>
      ${sectionHeading({ eyebrow: t('home.custom_eyebrow'), title: t('home.custom_title'), id: 'custom-title' })}
    </div>
    <div class="custom-teaser">
      <p>${t('home.custom_text')}</p>
      <ul class="option-list">
        ${t('custom_options').map((option) => html`<li>${option}</li>`)}
      </ul>
      <p class="custom-teaser__note">${t('home.custom_note')}</p>
      ${button(ctx.url('/custom-orders/'), t('home.custom_link'), { variant: 'secondary', arrow: true })}
    </div>
  </div>
</section>

<section class="section" aria-labelledby="glimpse-title">
  <div class="container">
    ${sectionHeading({ eyebrow: t('home.glimpse_eyebrow'), title: t('home.glimpse_title'), intro: t('home.glimpse_text'), id: 'glimpse-title', align: 'center' })}
    <div class="glimpse">
      ${glimpse.map(
        (item, i) => html`<figure class="glimpse__item glimpse__item--${i + 1}">
          ${picture(ctx, item.image, {
            sizes: '(min-width: 900px) 33vw, 50vw',
            alt: t('home.glimpse_eyebrow'),
            placeholder: { icon: GLIMPSE_ICONS[i % GLIMPSE_ICONS.length] },
          })}
        </figure>`,
      )}
    </div>
  </div>
</section>

<section class="section section--tight" aria-labelledby="ghada-title">
  <div class="container split split--ghada">
    <div class="split__media portrait">
      ${picture(ctx, photos.ghada, {
        sizes: '(min-width: 900px) 40vw, 100vw',
        alt: ctx.lang === 'ar' ? 'غادة خليل' : 'Ghada Khalil',
        placeholder: { icon: 'portrait', label: t('placeholder.ghada') },
      })}
    </div>
    <div class="split__content">
      ${sectionHeading({ eyebrow: t('home.ghada_eyebrow'), title: t('home.ghada_title'), id: 'ghada-title' })}
      <div class="prose">${paragraphs(t('home.ghada_text'))}</div>
      ${textLink(ctx.url('/about/'), t('home.ghada_link'))}
    </div>
  </div>
</section>

<section class="section section--beige" aria-labelledby="steps-title">
  <div class="container">
    ${sectionHeading({ eyebrow: t('home.steps_eyebrow'), title: t('home.steps_title'), id: 'steps-title', align: 'center' })}
    ${steps(ctx)}
  </div>
</section>

<section class="final-cta" aria-labelledby="final-title">
  <div class="container final-cta__inner">
    <h2 class="final-cta__title" id="final-title">${t('home.final_title')}</h2>
    <p class="final-cta__text">${t('home.final_text')}</p>
    ${whatsappButton(ctx, t('whatsapp.messages.general'), { label: t('home.final_button'), variant: 'light', size: 'large' })}
    ${whatsappNote(ctx)}
  </div>
</section>`;

  const siteName = t('meta.site_name');
  const homeUrl = ctx.absoluteUrl(ctx.url('/'));
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${ctx.absoluteUrl(ctx.urlFor(ctx.defaultLang, '/'))}#organization`,
    name: ctx.copyFor('en', 'meta.site_name'),
    alternateName: 'GK Atelier',
    url: homeUrl,
    description: t('home.description'),
    founder: { '@type': 'Person', name: 'Ghada Khalil' },
    areaServed: ['Egypt', 'Gulf region'],
  };
  if (ctx.brand.logo) organization.logo = ctx.absoluteUrl(ctx.image(ctx.brand.logo.src).fallback);
  const sameAs = Object.values(ctx.settings.social);
  if (sameAs.length) organization.sameAs = sameAs;
  const contact = ctx.whatsapp(t('whatsapp.messages.general'));
  if (contact) organization.contactPoint = { '@type': 'ContactPoint', contactType: 'customer service', url: contact };

  return {
    name: 'home',
    route: '/',
    section: 'home',
    title: `${siteName} | ${t('home.title')}`,
    description: t('home.description'),
    shareImage: ctx.defaultShareImage,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: siteName, url: homeUrl, inLanguage: ctx.lang },
      organization,
    ],
    body,
  };
}

