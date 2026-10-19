import { html } from '../lib/html.mjs';
import { formatWhatsAppNumber } from '../lib/whatsapp.mjs';
import { icon } from '../components/icons.mjs';
import { breadcrumbs, paragraphs, sectionHeading, steps, whatsappButton, whatsappNote } from '../components/ui.mjs';

const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', pinterest: 'Pinterest' };

export function contactPage(ctx) {
  const { t, settings } = ctx;
  const message = t('whatsapp.messages.general');
  const link = ctx.whatsapp(message);
  const social = Object.entries(settings.social);

  const body = html`
<section class="page-hero">
  <div class="container">
    ${breadcrumbs(ctx, [{ href: ctx.url('/'), label: t('nav.home') }, { label: t('nav.contact') }])}
    <div class="page-hero__text">
      <p class="eyebrow">${t('contact.eyebrow')}</p>
      <h1 class="page-title">${t('contact.heading')}</h1>
      <p class="lead">${t('contact.lead')}</p>
    </div>
  </div>
</section>

<section class="section section--flush-top">
  <div class="container contact-layout">
    <div class="contact-card">
      <span class="contact-card__icon" aria-hidden="true">${icon('whatsapp')}</span>
      <h2 class="contact-card__title">${t('contact.whatsapp_title')}</h2>
      <p>${t('contact.whatsapp_text')}</p>
      ${whatsappButton(ctx, message, { label: t('whatsapp.start_enquiry'), variant: 'light', size: 'large', className: 'btn--block' })}
      ${link
        ? html`<p class="contact-card__number">${t('contact.number_label')}: <a href="${link}" target="_blank" rel="noopener" dir="ltr">${formatWhatsAppNumber(settings.whatsapp)}</a></p>`
        : ''}
      ${whatsappNote(ctx)}
    </div>

    <div class="contact-info">
      <div class="contact-info__block">
        <h2 class="contact-info__title">${t('contact.service_title')}</h2>
        <div class="prose">${paragraphs(t('contact.service_text'))}</div>
      </div>
      <div class="contact-info__block">
        <h2 class="contact-info__title">${t('contact.expectations_title')}</h2>
        <ul class="option-list option-list--compact">
          ${t('contact.expectations').map((item) => html`<li>${item}</li>`)}
        </ul>
      </div>
      ${social.length
        ? html`<div class="contact-info__block">
            <h2 class="contact-info__title">${t('contact.social_title')}</h2>
            <ul class="social-list">
              ${social.map(
                ([network, href]) => html`<li><a href="${href}" target="_blank" rel="noopener">${icon(network in SOCIAL_LABELS ? network : 'arrow')}<span>${SOCIAL_LABELS[network] ?? network}</span></a></li>`,
              )}
            </ul>
          </div>`
        : ''}
    </div>
  </div>
</section>

<section class="section section--beige" aria-labelledby="contact-steps">
  <div class="container">
    ${sectionHeading({ title: t('contact.steps_title'), id: 'contact-steps', align: 'center' })}
    ${steps(ctx)}
  </div>
</section>`;

  return {
    name: 'contact',
    route: '/contact/',
    section: 'contact',
    title: `${t('contact.title')} | ${t('meta.title_suffix')}`,
    description: t('contact.description'),
    // The page itself is one large WhatsApp button; no floating duplicate.
    floatingWhatsApp: false,
    body,
  };
}
