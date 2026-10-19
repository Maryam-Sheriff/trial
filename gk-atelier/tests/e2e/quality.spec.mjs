import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const KEY_PAGES = [
  '/',
  '/collections/',
  '/collections/embroidery-textile-art/',
  '/collections/silk-painting/',
  '/products/test-embroidered-hoop/',
  '/products/test-from-price/',
  '/about/',
  '/custom-orders/',
  '/contact/',
  '/privacy/',
];

async function allPages(request) {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  return [...sitemap.matchAll(/<loc>https:\/\/www\.example\.com([^<]+)<\/loc>/g)].map((m) => m[1]).concat('/404.html');
}

for (const lang of ['en', 'ar']) {
  test(`no accessibility violations on key pages (${lang})`, async ({ page }) => {
    for (const path of KEY_PAGES) {
      await page.goto(lang === 'ar' ? `/ar${path}` : path);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
      const summary = results.violations.map((v) => `${path}: ${v.id} — ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`);
      expect(summary, summary.join('\n')).toEqual([]);
    }
  });
}

test('custom order form errors are accessible', async ({ page }) => {
  await page.goto('/custom-orders/');
  await page.getByRole('button', { name: 'Continue to WhatsApp' }).click();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test('no page scrolls sideways on phones, tablets or desktops', async ({ page, request, isMobile }) => {
  test.skip(isMobile, 'viewport sizes are set explicitly');
  test.setTimeout(240_000);
  const pages = await allPages(request);
  expect(pages.length).toBeGreaterThan(30);
  const problems = [];
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of pages) {
      await page.goto(path);
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (extra > 0) problems.push(`${path} @${width}px: ${extra}px`);
    }
  }
  expect(problems).toEqual([]);
});

test('every page has one main heading and localized metadata', async ({ page, request, isMobile }) => {
  test.skip(isMobile, 'markup check');
  for (const path of await allPages(request)) {
    await page.goto(path);
    await expect(page.locator('h1'), path).toHaveCount(1);
    const lang = await page.locator('html').getAttribute('lang');
    expect(['en', 'ar']).toContain(lang);
    expect(await page.title()).not.toBe('');
  }
});

test('buttons and links are large enough to tap', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only');
  for (const path of ['/', '/products/test-embroidered-hoop/', '/custom-orders/', '/ar/contact/']) {
    await page.goto(path);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('.btn, .nav-toggle, .lang-switch, .pill, .gallery__thumb, input, select, textarea')]
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ el: el.className || el.tagName, rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => rect.height < 40 || rect.width < 40)
        .map(({ el, rect }) => `${el} ${Math.round(rect.width)}x${Math.round(rect.height)}`),
    );
    expect(small, path).toEqual([]);
  }
});
