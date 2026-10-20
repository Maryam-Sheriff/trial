import { html } from '../lib/html.mjs';
import { LANGS } from '../lib/i18n.mjs';
import { breadcrumbs, paragraphs } from '../components/ui.mjs';

export function privacyPage(ctx) {
  const { t } = ctx;
  const updated = new Date(`${t('privacy.updated_on')}T12:00:00Z`);
  const date = new Intl.DateTimeFormat(LANGS[ctx.lang].intl, { day: 'numeric', month: 'long', year: 'numeric' }).format(updated);

  const body = html`
<section class="page-hero page-hero--plain">
  <div class="container container--narrow">
    ${breadcrumbs(ctx, [{ href: ctx.url('/'), label: t('nav.home') }, { label: t('privacy.heading') }])}
    <h1 class="page-title">${t('privacy.heading')}</h1>
    <p class="meta-line">${t('privacy.updated', { date })}</p>
  </div>
</section>
<section class="section section--flush-top">
  <div class="container container--narrow prose prose--legal">
    ${t('privacy.sections').map((section) => html`<h2>${section.title}</h2>${paragraphs(section.text)}`)}
  </div>
</section>`;

  return {
    name: 'privacy',
    route: '/privacy/',
    section: 'privacy',
    title: `${t('privacy.title')} | ${t('meta.title_suffix')}`,
    description: t('privacy.description'),
    body,
  };
}
