import { expect, test } from '@playwright/test';

const PREVIEW = 'http://localhost:4311';
const NUMBER = '201000000000';

// Never leave the test machine: answer WhatsApp requests locally.
test.beforeEach(async ({ context }) => {
  await context.route('https://wa.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: 'WhatsApp' }));
});

const waText = (url) => new URL(url).searchParams.get('text');

test('browse a collection, open a product and start a WhatsApp enquiry', async ({ page }) => {
  await page.goto('/en/');
  await page.getByRole('link', { name: 'Explore Our Creations' }).click();
  await expect(page).toHaveURL(/\/en\/collections\/$/);

  await page.getByRole('link', { name: 'Embroidery & Textile Art' }).click();
  await expect(page).toHaveURL(/\/en\/collections\/embroidery-textile-art\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Embroidery & Textile Art');

  await page.getByRole('link', { name: 'Test Hoop & "Name"' }).first().click();
  await expect(page).toHaveURL(/\/en\/products\/test-embroidered-hoop\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Test Hoop & "Name"');

  const cta = page.locator('[data-product-cta] a');
  await expect(cta).toHaveText('Order This via WhatsApp');
  await expect(cta).toHaveAttribute('target', '_blank');
  const [popup] = await Promise.all([page.waitForEvent('popup'), cta.click()]);
  expect(popup.url().startsWith(`https://wa.me/${NUMBER}?text=`)).toBe(true);
  const text = waText(popup.url());
  expect(text).toContain("I'm interested in Test Hoop & \"Name\"");
  expect(text).toContain('Product link: https://www.example.com/en/products/test-embroidered-hoop/');
  // The visitor stays on the product page; nothing claims an order was placed.
  await expect(page).toHaveURL(/\/en\/products\/test-embroidered-hoop\/$/);
  await expect(page.getByText(/order (has been )?(placed|confirmed)/i)).toHaveCount(0);
});

test('Arabic is the default language at the main address', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('إبداعات يدوية للحظات لها معنى.');
  // The language switch is always visible at the top, on phones too.
  const top = page.locator('.site-header__actions .lang-switch');
  await expect(top).toBeVisible();
  await expect(top).toHaveText('English');
  await expect(top.locator('svg')).toBeVisible();
  await top.click();
  await expect(page).toHaveURL('http://localhost:4310/en/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('switching language keeps the page, mirrors the layout and is remembered', async ({ page }) => {
  await page.goto('/en/products/test-embroidered-hoop/');
  await page.locator('.lang-switch--footer').click();
  await expect(page).toHaveURL('http://localhost:4310/products/test-embroidered-hoop/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('طارة اختبار');
  await expect(page.locator('[data-product-cta] a')).toHaveText('اطلبوا هذه القطعة عبر واتساب');
  const arText = waText(await page.locator('[data-product-cta] a').getAttribute('href'));
  expect(arText).toMatch(/^مرحبًا غادة!/);
  expect(arText).toContain('https://www.example.com/products/test-embroidered-hoop/');

  // Moving around keeps Arabic.
  await page.locator('.site-footer__nav').getByRole('link', { name: 'المجموعات' }).click();
  await expect(page).toHaveURL('http://localhost:4310/collections/');

  // A later visit straight to an English address opens the Arabic version.
  await page.goto('/en/about/');
  await expect(page).toHaveURL('http://localhost:4310/about/');

  // Choosing English sticks: the main address then opens in English.
  await page.locator('.lang-switch--footer').click();
  await expect(page).toHaveURL('http://localhost:4310/en/about/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.goto('/contact/');
  await expect(page).toHaveURL('http://localhost:4310/en/contact/');
});

test('custom order enquiry validates, then opens WhatsApp with the details', async ({ page }) => {
  await page.goto('/en/custom-orders/?type=silk-painting');
  await expect(page.locator('#f-type')).toHaveValue('silk-painting');

  const submit = page.getByRole('button', { name: 'Continue to WhatsApp' });
  await submit.click();
  const summary = page.locator('[data-error-summary]');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(summary.locator('li')).toHaveText([
    'Please enter your name.',
    'Please choose an occasion or purpose.',
    'Please describe the piece in a few words (at least 10 characters).',
  ]);
  await expect(page.locator('#f-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#name-error')).toHaveText('Please enter your name.');

  await page.fill('#f-name', 'Test Customer');
  await expect(page.locator('#f-name')).not.toHaveAttribute('aria-invalid', 'true');
  await page.selectOption('#f-occasion', { label: 'Wedding or engagement' });
  await page.fill('#f-description', 'A small piece with our names & the date.');
  await page.fill('#f-personalization', 'Ivory and gold');
  await page.fill('#f-date', '2000-01-01');
  await submit.click();
  await expect(summary.locator('li')).toHaveText(['Please choose a date that is today or later.']);

  const next = new Date();
  next.setFullYear(next.getFullYear() + 1, 2, 14);
  const iso = `${next.getFullYear()}-03-14`;
  await page.fill('#f-date', iso);
  const [popup] = await Promise.all([page.waitForEvent('popup'), submit.click()]);
  const text = waText(popup.url());
  expect(popup.url().startsWith(`https://wa.me/${NUMBER}?text=`)).toBe(true);
  expect(text).toBe(
    [
      "Hello Ghada! I'd like to enquire about a custom piece from GK Atelier.",
      '',
      'Name: Test Customer',
      'Occasion: Wedding or engagement',
      'Type of creation: Silk Painting',
      'Description: A small piece with our names & the date.',
      'Colours / personalization: Ivory and gold',
      `Needed by: 14 March ${next.getFullYear()}`,
      '',
      'I understand this is an enquiry, not a confirmed order.',
    ].join('\n'),
  );

  const success = page.locator('[data-enquiry-success]');
  await expect(success).toBeVisible();
  await expect(success).toBeFocused();
  await expect(page.locator('[data-message-preview]')).toHaveText(text);
  expect(waText(await page.locator('[data-success-link]').getAttribute('href'))).toBe(text);
  await page.getByRole('button', { name: 'Edit my details' }).click();
  await expect(page.locator('[data-enquiry-form]')).toBeVisible();
  await expect(page.locator('#f-name')).toHaveValue('Test Customer');
});

test('Arabic enquiry messages are written in Arabic', async ({ page }) => {
  await page.goto('/custom-orders/');
  await page.fill('#f-name', 'عميل اختبار');
  await page.selectOption('#f-occasion', { label: 'مولود جديد' });
  await page.selectOption('#f-type', 'baby-newborn');
  await page.fill('#f-description', 'طقم بسيط بألوان هادئة للمولود.');
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'المتابعة إلى واتساب' }).click()]);
  const text = waText(popup.url());
  expect(text).toContain('مرحبًا غادة! أودّ الاستفسار عن قطعة مخصّصة من GK Atelier.');
  expect(text).toContain('الاسم: عميل اختبار');
  expect(text).toContain('نوع القطعة: أطقم وهدايا المواليد');
  expect(text.endsWith('أعلم أن هذا استفسار وليس طلبًا مؤكدًا.')).toBe(true);
});

test('product gallery thumbnails and enlarged view work', async ({ page, isMobile }) => {
  await page.goto('/en/products/test-embroidered-hoop/');
  const thumbs = page.locator('[data-gallery-thumb]');
  await expect(thumbs).toHaveCount(3);
  await thumbs.nth(1).click();
  await expect(thumbs.nth(1)).toHaveAttribute('aria-current', 'true');

  await page.locator('[data-gallery-zoom="0"]').click();
  const lightbox = page.locator('[data-lightbox]');
  await expect(lightbox).toBeVisible();
  await expect(lightbox.locator('[data-lightbox-count]')).toHaveText('1 / 3');
  await expect(lightbox.locator('[data-lightbox-image]')).toHaveAttribute('alt', 'Test photo 1');
  if (!isMobile) {
    await page.keyboard.press('ArrowRight');
    await expect(lightbox.locator('[data-lightbox-count]')).toHaveText('2 / 3');
  }
  await lightbox.getByRole('button', { name: 'Next photo' }).click();
  await page.keyboard.press('Escape');
  await expect(lightbox).toBeHidden();
});

test('the order bar appears on phones once the main button scrolls away', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only');
  await page.goto('/en/products/test-embroidered-hoop/');
  const bar = page.locator('[data-sticky-cta]');
  await expect(bar).not.toHaveClass(/is-visible/);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await expect(bar).toHaveClass(/is-visible/);
  await expect(bar.getByRole('link', { name: 'Order This via WhatsApp' })).toBeVisible();
  // The footer is padded so the bar never hides its last line.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(bar).toHaveClass(/is-visible/);
  const footerText = await page.locator('.site-footer__bottom').boundingBox();
  const barBox = await bar.boundingBox();
  expect(footerText.y + footerText.height).toBeLessThanOrEqual(barBox.y + 1);
});

test('the floating WhatsApp button never covers the footer', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only');
  await page.goto('/en/about/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const float = await page.locator('[data-float]').boundingBox();
  const footer = await page.locator('.site-footer__bottom').boundingBox();
  expect(footer.y + footer.height).toBeLessThanOrEqual(float.y + 1);
  const text = waText(await page.locator('[data-float]').getAttribute('href'));
  expect(text).toContain('Hello Ghada!');
});

test('mobile menu opens, can be closed with Escape and navigates', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only');
  await page.goto('/en/');
  const toggle = page.locator('.nav-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#site-nav')).toBeVisible();
  await expect(page.locator('#site-nav a').first()).toBeFocused();
  expect(await page.locator('main').evaluate((el) => el.inert)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await expect(page.locator('#site-nav')).toBeHidden();

  await toggle.click();
  await page.locator('#site-nav').getByRole('link', { name: 'About Ghada' }).click();
  await expect(page).toHaveURL(/\/en\/about\/$/);
});

test('keyboard users can skip straight to the content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard');
  await page.goto('/en/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test.describe('preview without a WhatsApp number', () => {
  test('buttons explain the missing number and show the prepared message', async ({ page }) => {
    await page.goto(`${PREVIEW}/en/products/macrame-mirror-wall-shelf/`);
    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
    await expect(page.locator('.preview-bar')).toBeVisible();
    await page.locator('[data-product-cta] a').click();
    const dialog = page.locator('#whatsapp-setup');
    await expect(dialog).toBeVisible();
    const message = dialog.locator('[data-wa-setup-message]');
    await expect(message).toContainText("I'm interested in Macramé Mirror with Shelf");
    await expect(message).toContainText(`Product link: ${PREVIEW}/en/products/macrame-mirror-wall-shelf/`);
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  });

  test('the custom form still validates and previews the message', async ({ page }) => {
    await page.goto(`${PREVIEW}/en/custom-orders/`);
    await page.fill('#f-name', 'Preview Visitor');
    await page.selectOption('#f-occasion', { label: 'Birthday' });
    await page.selectOption('#f-type', 'unsure');
    await page.fill('#f-description', 'Something soft and handmade for a birthday.');
    await page.getByRole('button', { name: 'Continue to WhatsApp' }).click();
    const dialog = page.locator('#whatsapp-setup');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-wa-setup-message]')).toContainText('Type of creation: Not sure yet');
    await expect(page.locator('[data-enquiry-success]')).toBeHidden();
  });

  test("Ghada's pieces appear in their collections with their photographs", async ({ page }) => {
    await page.goto(`${PREVIEW}/en/collections/macrame-home-decor/`);
    const cards = page.locator('.card--product');
    await expect(cards).toHaveCount(2);
    await expect(page.locator('.card--product .badge')).toHaveCount(0);
    for (const img of await cards.locator('img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true);
    }
    await page.goto(`${PREVIEW}/collections/baby-newborn/`);
    await expect(page.locator('.card--product .card__title')).toHaveText(['طقم مواليد مخصّص بالاسم']);
    // Collections still waiting for photographs explain themselves.
    await page.goto(`${PREVIEW}/en/collections/silk-painting/`);
    await expect(page.getByRole('heading', { name: 'New pieces are on their way' })).toBeVisible();
  });
});
