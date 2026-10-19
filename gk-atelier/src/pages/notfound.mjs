import { html } from '../lib/html.mjs';
import { button } from '../components/ui.mjs';

// Hosts serve one 404 page for every missing address, so it speaks both languages.
export function notFoundPage(ctx) {
  const languages = [ctx.defaultLang, ctx.defaultLang === 'ar' ? 'en' : 'ar'];
  const block = (lang, primary) => {
    const t = (key) => ctx.copyFor(lang, key);
    return html`<div class="notfound__block" lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
      <p class="eyebrow">404</p>
      <h${primary ? '1' : '2'} class="page-title">${t('notfound.heading')}</h${primary ? '1' : '2'}>
      <p class="lead">${t('notfound.text')}</p>
      <div class="page-hero__actions">
        ${button(ctx.urlFor(lang, '/'), t('notfound.home'))}
        ${button(ctx.urlFor(lang, '/collections/'), t('notfound.collections'), { variant: 'secondary' })}
      </div>
    </div>`;
  };

  return {
    name: 'notfound',
    route: '/404.html',
    switchRoute: '/',
    langRedirect: false,
    alternates: false,
    index: false,
    section: null,
    title: `${languages.map((l) => ctx.copyFor(l, 'notfound.title')).join(' · ')} | GK Atelier`,
    description: ctx.t('notfound.text'),
    body: html`<section class="section notfound">
  <div class="container notfound__grid">
    ${block(languages[0], true)}
    ${block(languages[1], false)}
  </div>
</section>`,
  };
}
