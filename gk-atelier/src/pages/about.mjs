import { html } from '../lib/html.mjs';
import { pick } from '../lib/i18n.mjs';
import { picture } from '../components/media.mjs';
import { breadcrumbs, button, paragraphs, sectionHeading, text, whatsappButton, whatsappNote } from '../components/ui.mjs';

const PROCESS_ICONS = ['atelier', 'yarn', 'hoop'];

export function aboutPage(ctx) {
  const { t, content } = ctx;
  const { photos, collections } = content;
  const story = t('about.story');
  const ghadaName = ctx.lang === 'ar' ? 'غادة خليل' : 'Ghada Khalil';

  const body = html`
<section class="page-hero page-hero--about">
  <div class="container">
    ${breadcrumbs(ctx, [{ href: ctx.url('/'), label: t('nav.home') }, { label: t('nav.about') }])}
    <div class="page-hero__grid">
      <div class="page-hero__text">
        <p class="eyebrow">${t('about.eyebrow')}</p>
        <h1 class="page-title">${t('about.heading')}</h1>
        <p class="lead">${t('about.lead')}</p>
      </div>
      <div class="page-hero__media portrait">
        ${picture(ctx, photos.ghada, {
          eager: true,
          sizes: '(min-width: 900px) 40vw, 100vw',
          alt: ghadaName,
          placeholder: { icon: 'portrait', label: t('placeholder.ghada') },
        })}
      </div>
    </div>
  </div>
</section>

<section class="section section--tight">
  <div class="container story">
    ${t('about.sections').map(
      (section) => html`<div class="story__row">
        <h2 class="story__title">${section.title}</h2>
        <div class="prose story__text">${paragraphs(section.text)}</div>
      </div>`,
    )}
    ${Array.isArray(story) && story.length
      ? html`<div class="story__row story__row--quote">
          <h2 class="story__title">${t('about.story_title')}</h2>
          <blockquote class="prose story__text">${paragraphs(story)}</blockquote>
        </div>`
      : ''}
  </div>
</section>

<section class="section section--beige" aria-labelledby="crafts-title">
  <div class="container">
    ${sectionHeading({ title: t('about.crafts_title'), intro: t('about.crafts_text'), id: 'crafts-title', align: 'center' })}
    <ul class="crafts">
      ${collections.map(
        (c) => html`<li class="crafts__item">
          <a href="${ctx.url(`/collections/${c.slug}/`)}">
            <span class="crafts__name">${text(c.name, ctx.lang)}</span>
            <span class="crafts__text">${text(c.short, ctx.lang)}</span>
          </a>
        </li>`,
      )}
    </ul>
  </div>
</section>

<section class="section" aria-labelledby="process-title">
  <div class="container">
    ${sectionHeading({ title: t('about.process_title'), intro: t('about.process_text'), id: 'process-title' })}
    <div class="process">
      ${photos.process.map(
        (item, i) => html`<figure class="process__item">
          ${picture(ctx, item.image, {
            sizes: '(min-width: 900px) 33vw, 100vw',
            alt: pick(item.caption, ctx.lang),
            placeholder: { icon: PROCESS_ICONS[i % PROCESS_ICONS.length], subject: pick(item.caption, ctx.lang) },
          })}
          ${pick(item.caption, ctx.lang) ? html`<figcaption>${text(item.caption, ctx.lang)}</figcaption>` : ''}
        </figure>`,
      )}
    </div>
  </div>
</section>

<section class="final-cta" aria-labelledby="about-cta">
  <div class="container final-cta__inner">
    <h2 class="final-cta__title" id="about-cta">${t('about.cta_title')}</h2>
    <p class="final-cta__text">${t('about.cta_text')}</p>
    <div class="final-cta__actions">
      ${whatsappButton(ctx, t('whatsapp.messages.general'), { label: t('home.final_button'), variant: 'light' })}
      ${button(ctx.url('/custom-orders/'), t('home.custom_link'), { variant: 'ghost-light' })}
    </div>
    ${whatsappNote(ctx)}
  </div>
</section>`;

  return {
    name: 'about',
    route: '/about/',
    section: 'about',
    title: `${t('about.title')} | ${t('meta.title_suffix')}`,
    description: t('about.description'),
    shareImage: photos.ghada ? ctx.shareImage(photos.ghada.src) : ctx.defaultShareImage,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: t('about.heading'),
        url: ctx.absoluteUrl(ctx.url('/about/')),
        inLanguage: ctx.lang,
        mainEntity: { '@type': 'Person', name: 'Ghada Khalil', worksFor: { '@type': 'Organization', name: 'GK Atelier' } },
      },
    ],
    body,
  };
}
