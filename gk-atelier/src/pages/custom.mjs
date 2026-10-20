import { attrs, html, raw } from '../lib/html.mjs';
import { decorativeNumber, pick } from '../lib/i18n.mjs';
import { icon } from '../components/icons.mjs';
import { breadcrumbs, whatsappNote } from '../components/ui.mjs';

function field(ctx, { id, label, required, hint, control }) {
  const { t } = ctx;
  const describedBy = [hint && `${id}-hint`, `${id}-error`].filter(Boolean).join(' ');
  return html`<div class="field" data-field="${id}">
    <label class="field__label" for="f-${id}">${label}${required
      ? html`<span class="field__required" aria-hidden="true"> *</span>`
      : html` <span class="field__optional">(${t('custom.form.optional')})</span>`}</label>
    ${hint ? html`<p class="field__hint" id="${id}-hint">${hint}</p>` : ''}
    ${control(describedBy)}
    <p class="field__error" id="${id}-error" data-error-for="${id}" hidden></p>
  </div>`;
}

function select(id, name, required, describedBy, placeholderText, options) {
  return html`<select${attrs({ id: `f-${id}`, name, required, 'aria-describedby': describedBy })}>
    <option value="">${placeholderText}</option>
    ${options.map((o) => html`<option value="${o.value}">${o.label}</option>`)}
  </select>`;
}

export function customPage(ctx) {
  const { t, content, settings } = ctx;
  const f = (key) => t(`custom.form.${key}`);
  const typeOptions = [
    ...content.collections.map((c) => ({ value: c.slug, label: pick(c.name, ctx.lang) })),
    { value: 'unsure', label: f('type_unsure') },
  ];
  const occasionOptions = f('occasions').map((label) => ({ value: label, label }));
  const action = settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : '#whatsapp-setup';

  // Everything the browser needs to turn the form into a WhatsApp message.
  const config = {
    number: settings.whatsapp,
    lang: ctx.lang,
    intro: t('whatsapp.messages.custom_intro'),
    outro: t('whatsapp.messages.custom_outro'),
    labels: t('custom.form.labels'),
    errors: t('custom.form.errors'),
  };

  const body = html`
<section class="page-hero page-hero--custom">
  <div class="container">
    ${breadcrumbs(ctx, [{ href: ctx.url('/'), label: t('nav.home') }, { label: t('nav.custom') }])}
    <div class="page-hero__text">
      <p class="eyebrow">${t('custom.eyebrow')}</p>
      <h1 class="page-title">${t('custom.heading')}</h1>
      <p class="lead">${t('custom.lead')}</p>
    </div>
  </div>
</section>

<section class="section section--flush-top">
  <div class="container custom-layout">

    <div class="enquiry">
      <form class="enquiry-form" data-enquiry-form action="${action}" method="get" target="_blank" aria-labelledby="enquiry-title">
        <h2 class="enquiry-form__title" id="enquiry-title">${f('title')}</h2>
        <p class="enquiry-form__required">${f('required_note')}</p>

        <div class="error-summary" data-error-summary role="alert" tabindex="-1" hidden>
          <h3 class="error-summary__title">${t('custom.form.errors.summary')}</h3>
          <ul data-error-list></ul>
        </div>

        ${field(ctx, {
          id: 'name',
          label: f('name'),
          required: true,
          control: (d) => html`<input${attrs({ id: 'f-name', name: 'name', type: 'text', autocomplete: 'name', required: true, maxlength: 80, 'aria-describedby': d })}>`,
        })}
        <div class="field-row">
          ${field(ctx, {
            id: 'occasion',
            label: f('occasion'),
            required: true,
            control: (d) => select('occasion', 'occasion', true, d, f('occasion_placeholder'), occasionOptions),
          })}
          ${field(ctx, {
            id: 'type',
            label: f('type'),
            required: true,
            control: (d) => select('type', 'type', true, d, f('type_placeholder'), typeOptions),
          })}
        </div>
        ${field(ctx, {
          id: 'description',
          label: f('description'),
          required: true,
          hint: f('description_hint'),
          control: (d) => html`<textarea${attrs({ id: 'f-description', name: 'description', rows: 5, required: true, minlength: 10, maxlength: 1500, 'aria-describedby': d })}></textarea>`,
        })}
        ${field(ctx, {
          id: 'personalization',
          label: f('personalization'),
          hint: f('personalization_hint'),
          control: (d) => html`<textarea${attrs({ id: 'f-personalization', name: 'personalization', rows: 2, maxlength: 500, 'aria-describedby': d })}></textarea>`,
        })}
        ${field(ctx, {
          id: 'date',
          label: f('date'),
          hint: f('date_hint'),
          control: (d) => html`<input${attrs({ id: 'f-date', name: 'date', type: 'date', 'aria-describedby': d })}>`,
        })}

        <p class="form-privacy">${icon('lock')}<span>${f('privacy')} <a href="${ctx.url('/privacy/')}">${f('privacy_link')}</a></span></p>
        <button class="btn btn--primary btn--block btn--large" type="submit">${icon('whatsapp')}<span>${f('submit')}</span></button>
        ${whatsappNote(ctx)}
      </form>

      <div class="enquiry-success" data-enquiry-success tabindex="-1" hidden>
        <p class="eyebrow">${t('custom.eyebrow')}</p>
        <h2 class="enquiry-success__title">${f('success_title')}</h2>
        <p>${f('success_text')}</p>
        <div class="message-preview">
          <h3 class="message-preview__title">${f('preview_title')}</h3>
          <p class="message-preview__text" data-message-preview></p>
        </div>
        <div class="enquiry-success__actions">
          <a class="btn btn--primary" data-success-link href="${action}" target="_blank" rel="noopener">${icon('whatsapp')}<span>${f('success_fallback')}</span></a>
          <button class="btn btn--secondary" type="button" data-edit-enquiry>${f('success_edit')}</button>
        </div>
      </div>
    </div>

    <div class="custom-aside">
      <div class="custom-aside__block">
        <h2 class="custom-aside__title">${t('custom.options_title')}</h2>
        <ul class="option-list option-list--compact">
          ${t('custom_options').map((option) => html`<li>${option}</li>`)}
        </ul>
      </div>
      <div class="custom-aside__block">
        <h2 class="custom-aside__title">${t('custom.how_title')}</h2>
        <ol class="mini-steps">
          ${t('custom.how').map(
            (step, i) => html`<li><span class="mini-steps__n" aria-hidden="true">${decorativeNumber(i + 1, ctx.lang)}</span><span>${step}</span></li>`,
          )}
        </ol>
      </div>
      <div class="notice">
        <h2 class="notice__title">${icon('info')}<span>${t('custom.enquiry_notice_title')}</span></h2>
        <p>${t('custom.enquiry_notice')}</p>
      </div>
      <div class="custom-aside__block">
        <h2 class="custom-aside__title">${icon('photo')}<span>${f('reference_title')}</span></h2>
        <p>${f('reference_text')}</p>
      </div>
    </div>
  </div>
</section>
<script type="application/json" id="enquiry-config">${raw(JSON.stringify(config).replace(/</g, '\\u003c'))}</script>`;

  return {
    name: 'custom',
    route: '/custom-orders/',
    section: 'custom',
    title: `${t('custom.title')} | ${t('meta.title_suffix')}`,
    description: t('custom.description'),
    floatingWhatsApp: false,
    body,
  };
}
