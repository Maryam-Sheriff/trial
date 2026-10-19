import { attrs, html, raw } from '../lib/html.mjs';
import { LANGS } from '../lib/i18n.mjs';
import { icon } from './icons.mjs';
import { picture } from './media.mjs';
import { whatsappButton } from './ui.mjs';

const NAV = [
  { key: 'collections', route: '/collections/' },
  { key: 'custom', route: '/custom-orders/' },
  { key: 'about', route: '/about/' },
  { key: 'contact', route: '/contact/' },
];

const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', pinterest: 'Pinterest' };

function jsonLd(data) {
  // `<` is escaped so text inside the JSON can never close the script tag.
  return raw(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`);
}

function head(ctx, page) {
  const { t, lang, assets, brand } = ctx;
  const other = LANGS[lang].other;
  const canonical = ctx.absoluteUrl(ctx.url(page.route));
  const alternates = page.alternates === false ? [] : [
    { hreflang: 'en', href: ctx.absoluteUrl(ctx.urlFor('en', page.route)) },
    { hreflang: 'ar', href: ctx.absoluteUrl(ctx.urlFor('ar', page.route)) },
    { hreflang: 'x-default', href: ctx.absoluteUrl(ctx.urlFor(ctx.defaultLang, page.route)) },
  ];
  const share = page.shareImage ?? ctx.defaultShareImage;
  const fonts = assets.fontPreloads[lang];
  const otherUrl = ctx.urlFor(other, page.switchRoute ?? page.route);
  // Before anything renders: mark JS as available, and send returning
  // visitors who chose the other language to the same page in that language
  // (only when they arrive from outside the site, so browsing never loops).
  const redirect = page.langRedirect === false
    ? ''
    : `try{var p=localStorage.getItem('gk-lang'),r=document.referrer;if(p&&p!==d.lang&&!(r&&r.indexOf(location.origin)===0)){location.replace(${JSON.stringify(otherUrl)})}}catch(e){}`;
  const boot = `(function(){var d=document.documentElement;d.className=d.className.replace('no-js','js');${redirect}})();`;

  return html`<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title}</title>
<meta name="description" content="${page.description}">
${ctx.indexable && page.index !== false ? '' : html`<meta name="robots" content="noindex, nofollow">\n`}<link rel="canonical" href="${canonical}">
${alternates.map((a) => html`<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}">\n`)}<meta name="theme-color" content="#F8F4EE">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${t('meta.site_name')}">
<meta property="og:title" content="${page.socialTitle ?? page.title}">
<meta property="og:description" content="${page.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${t('meta.locale')}">
<meta property="og:locale:alternate" content="${ctx.copyFor(other, 'meta.locale')}">
${share ? html`<meta property="og:image" content="${ctx.absoluteUrl(share.url)}">
<meta property="og:image:width" content="${share.width}">
<meta property="og:image:height" content="${share.height}">
<meta name="twitter:card" content="summary_large_image">
` : html`<meta name="twitter:card" content="summary">
`}${brand.icon ? html`<link rel="icon" href="${brand.icon.favicon}" sizes="32x32">
${brand.icon.svg ? html`<link rel="icon" href="${brand.icon.svg}" type="image/svg+xml">\n` : ''}<link rel="apple-touch-icon" href="${brand.icon.apple}">
` : html`<link rel="icon" href="data:,">
`}${fonts.map((href) => html`<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>\n`)}<link rel="stylesheet" href="${assets.css}">
<script>${raw(boot)}</script>
<script src="${assets.js}" defer></script>
${(page.jsonLd ?? []).map(jsonLd)}
</head>`;
}

function brandMark(ctx, { className = 'brand' } = {}) {
  const { brand, t } = ctx;
  if (brand.mark) {
    return html`<a class="${className}" href="${ctx.url('/')}">
      <img class="brand__logo" src="${brand.mark.url}" width="${brand.mark.width}" height="${brand.mark.height}" alt="${t('meta.site_name')}">
    </a>`;
  }
  // Until the supplied logo file is added, show the name as plain text rather
  // than an imitation of the GK monogram.
  return html`<a class="${className} brand--text" href="${ctx.url('/')}">
    <span class="brand__name" lang="en" dir="ltr">GK Atelier</span>
    <span class="brand__by">${t('meta.brand_by')}</span>
  </a>`;
}

function languageSwitch(ctx, page, className = 'lang-switch') {
  const other = LANGS[ctx.lang].other;
  return html`<a${attrs({
    class: className,
    href: ctx.urlFor(other, page.switchRoute ?? page.route),
    hreflang: other,
    'data-lang-switch': other,
    title: ctx.t('nav.switch_hint'),
  })}>${icon('globe')}<span lang="${other}">${ctx.t('nav.switch_label')}</span></a>`;
}

function header(ctx, page) {
  const { t } = ctx;
  const generalMessage = t('whatsapp.messages.general');
  return html`<header class="site-header">
  <div class="container site-header__inner">
    ${brandMark(ctx)}
    <nav class="site-nav" id="site-nav" aria-label="${t('nav.label')}">
      <ul class="site-nav__list">
        ${NAV.map(
          (item) => html`<li><a${attrs({
            class: 'site-nav__link',
            href: ctx.url(item.route),
            'aria-current': page.section === item.key ? 'page' : null,
          })}>${t(`nav.${item.key}`)}</a></li>`,
        )}
      </ul>
      <div class="site-nav__extra">
        ${whatsappButton(ctx, generalMessage, { label: t('whatsapp.order'), variant: 'primary', className: 'btn--block' })}
      </div>
    </nav>
    <div class="site-header__actions">
      ${languageSwitch(ctx, page)}
      ${whatsappButton(ctx, generalMessage, { label: 'WhatsApp', variant: 'secondary', size: 'small', className: 'header-wa' })}
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-label-open="${t('nav.menu')}" data-label-close="${t('nav.close_menu')}">
        <span class="nav-toggle__icon nav-toggle__icon--open">${icon('menu')}</span>
        <span class="nav-toggle__icon nav-toggle__icon--close">${icon('close')}</span>
        <span class="nav-toggle__label">${t('nav.menu')}</span>
      </button>
    </div>
  </div>
</header>`;
}

function footer(ctx, page, floating = '') {
  const { t, settings, brand } = ctx;
  const year = new Date().getFullYear();
  const social = Object.entries(settings.social);
  return html`<footer class="site-footer">
  <div class="container site-footer__grid">
    <div class="site-footer__brand">
      ${brand.lockup
        ? html`<a class="brand-lockup" href="${ctx.url('/')}">${picture(ctx, brand.lockup, { sizes: '240px', alt: t('meta.site_name') })}</a>`
        : brandMark(ctx, { className: 'brand brand--footer' })}
      <p class="site-footer__tagline">${t('footer.tagline')}</p>
      <p class="site-footer__service">${t('footer.service')}</p>
    </div>
    <nav class="site-footer__nav" aria-labelledby="footer-explore">
      <h2 class="site-footer__heading" id="footer-explore">${t('footer.explore')}</h2>
      <ul>
        <li><a href="${ctx.url('/')}">${t('nav.home')}</a></li>
        ${NAV.map((item) => html`<li><a href="${ctx.url(item.route)}">${t(`nav.${item.key}`)}</a></li>`)}
      </ul>
    </nav>
    <div class="site-footer__connect">
      <h2 class="site-footer__heading">${t('footer.connect')}</h2>
      ${whatsappButton(ctx, t('whatsapp.messages.general'), { label: t('whatsapp.order'), variant: 'primary' })}
      ${social.length
        ? html`<ul class="social-links">
            ${social.map(
              ([network, href]) => html`<li><a href="${href}" target="_blank" rel="noopener" aria-label="${SOCIAL_LABELS[network] ?? network}">${icon(network in SOCIAL_LABELS ? network : 'arrow')}</a></li>`,
            )}
          </ul>`
        : ''}
      ${languageSwitch(ctx, page, 'lang-switch lang-switch--footer')}
    </div>
  </div>
  <div class="container site-footer__bottom">
    <p>${t('footer.note')}</p>
    <p><span>${t('footer.copyright', { year })}</span> · <a href="${ctx.url('/privacy/')}">${t('footer.privacy')}</a></p>
  </div>
  ${floating}
</footer>`;
}

function previewBar(ctx) {
  if (!ctx.blockers.length) return '';
  const items = ctx.blockers.map((b) => ctx.t(`preview.items.${b.key}`)).join(ctx.lang === 'ar' ? '، ' : ', ');
  return html`<div class="preview-bar" role="note">
  <div class="container"><strong>${ctx.t('preview.label')}</strong> ${ctx.t('preview.text', { items })}</div>
</div>`;
}

function setupDialog(ctx) {
  if (ctx.settings.whatsapp) return '';
  const { t } = ctx;
  return html`<dialog class="dialog" id="whatsapp-setup" aria-labelledby="whatsapp-setup-title">
  <form method="dialog" class="dialog__inner">
    <h2 class="dialog__title" id="whatsapp-setup-title">${t('whatsapp.unconfigured.title')}</h2>
    <p>${t('whatsapp.unconfigured.body')}</p>
    <p class="dialog__message" data-wa-setup-message></p>
    <button class="btn btn--secondary" type="submit">${t('whatsapp.unconfigured.close')}</button>
  </form>
</dialog>`;
}

export function documentPage(ctx, page) {
  const { lang, t } = ctx;
  const floating = page.floatingWhatsApp !== false
    ? whatsappButton(ctx, page.whatsappMessage ?? t('whatsapp.messages.general'), {
        label: t('whatsapp.floating_label'),
        variant: 'float',
        extra: { 'data-float': '' },
      })
    : '';
  return `<!doctype html>
${html`<html lang="${lang}" dir="${LANGS[lang].dir}" class="no-js">
${head(ctx, page)}
<body class="page-${page.name}${page.floatingWhatsApp !== false ? ' has-float' : ''}">
<a class="skip-link" href="#main">${t('nav.skip')}</a>
${previewBar(ctx)}
${header(ctx, page)}
<main id="main" tabindex="-1">
${page.body}
</main>
${footer(ctx, page, floating)}
${page.after ?? ''}
${setupDialog(ctx)}
</body>
</html>`}
`;
}
