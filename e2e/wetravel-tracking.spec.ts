import { test, expect, type Page } from '@playwright/test';

test.setTimeout(60000);
test.use({ actionTimeout: 20000 });
const key = 'wetravel_tracking_v1_' + JSON.stringify(['e2e-wetravel', 'sin-fecha', 1, {}, []]);
const paymentUrl = 'https://www.wetravel.com/checkout/e2e-mocked';
const pending = { status: 'pending', paymentStatus: 'pending' };
const confirmed = { status: 'completed', paymentStatus: 'paid', reservationId: 'r-test', reservationCode: 'BAFT-TEST', reservationStatus: 'reserved', reservation: { title: 'Test Tour', slug: 'e2e-wetravel', date: 'sin-fecha', people: 2, amountTotal: 25000, currency: 'usd', paymentMethod: 'wetravel', extras: [] } };

async function restore(page: Page) {
  await page.addInitScript(({ key, paymentUrl }) => {
    sessionStorage.setItem(key, JSON.stringify({ intentId: 'test-intent', url: paymentUrl }));
  }, { key, paymentUrl });
}

test.beforeEach(async ({ page }) => {
  // No payment creation or external provider access can occur in these tests.
  await page.route('**/api/mercadopago/preference', route => route.abort());
  await page.context().route('https://www.wetravel.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Mock payment</p>' }));
});

test('mobile: restored checkout opens a safe new tab, reuses link and follows verified success', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await restore(page);
  let status = pending;
  let writes = 0;
  page.on('request', request => { if (request.url().includes('/api/') && request.method() === 'POST') writes++; });
  await page.route('**/api/wetravel/status?*', route => route.fulfill({ json: status }));
  await page.goto('/en/checkout/testing?slug=e2e-wetravel&date=sin-fecha&people=1&ref=test');
  const link = page.getByRole('link', { name: 'Open WeTravel' });
  await expect(link).toHaveAttribute('target', '_blank', { timeout: 20000 });
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  const popupEvent = page.waitForEvent('popup');
  await link.click();
  const popup = await popupEvent;
  await popup.waitForLoadState();
  await expect(popup).toHaveURL(paymentUrl);
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  await popup.close();
  await page.bringToFront();
  await page.reload();
  await expect(link).toHaveAttribute('href', paymentUrl);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  status = confirmed;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page).toHaveURL(/\/en\/checkout\/success\?/);
  expect(new URL(page.url()).searchParams.get('ref')).toBe('test');
  expect(new URL(page.url()).searchParams.get('intentId')).toBe('test-intent');
  await expect(page.getByRole('heading', { name: 'Your booking is confirmed!' })).toBeVisible();
  await expect(page.getByText('BAFT-TEST')).toBeVisible();
  await expect(page.getByText('Test Tour')).toBeVisible();
  expect(writes).toBe(0);
});

test('paid without reservation does not redirect or offer another payment; failure and review are terminal', async ({ page }) => {
  await restore(page);
  let status = { ...pending, paymentStatus: 'paid' };
  let requests = 0;
  await page.route('**/api/wetravel/status?*', route => { requests++; return route.fulfill({ json: status }); });
  await page.goto('/es/checkout/testing');
  await expect(page.getByRole('heading', { name: 'Pago recibido' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Abrir WeTravel/ })).toHaveCount(0);
  status = { status: 'needs_review', paymentStatus: 'disputed' };
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading', { name: 'Tu pago necesita revisión' })).toBeVisible();
  const before = requests;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(3300);
  expect(requests).toBe(before);
  status = { status: 'failed', paymentStatus: 'failed' };
  await page.reload();
  await expect(page.getByRole('heading', { name: 'No se pudo completar el pago' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver al checkout' }).click();
  expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBeNull();
  await expect(page.getByTestId('wetravel-modal')).toHaveCount(0);
});

test('transient errors recover and ten-minute timeout never becomes a rejection', async ({ page }) => {
  await restore(page);
  let fail = true;
  await page.route('**/api/wetravel/status?*', route => route.fulfill(fail ? { status: 503, json: {} } : { json: pending }));
  await page.goto('/en/checkout/testing');
  await expect(page.getByText(/We could not check the status/)).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(page.getByRole('link', { name: /Open WeTravel/ })).toBeVisible();
  await expect(page.getByText(/We could not check the status/)).toHaveCount(0);
  await page.clock.install();
  await page.clock.fastForward(10 * 60 * 1000 + 1000);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText(/We are still waiting for confirmation/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Complete your payment on WeTravel' })).toBeVisible();
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(page.getByText(/We are still waiting for confirmation/)).toHaveCount(0);
});

test('pauses when hidden and verifies immediately on visibility return', async ({ page }) => {
  await restore(page);
  let requests = 0;
  await page.route('**/api/wetravel/status?*', route => { requests++; return route.fulfill({ json: pending }); });
  await page.goto('/en/checkout/testing');
  await expect(page.getByRole('link', { name: /Open WeTravel/ })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const before = requests;
  await page.waitForTimeout(3500);
  expect(requests).toBe(before);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => requests).toBeGreaterThan(before);
});

for (const country of ['Chile', 'Argentina']) {
  test(`creates one checkout: ${country === 'Argentina' ? 'Mercado Pago keeps same-tab navigation' : 'WeTravel stays in BAFT'}`, async ({ page }) => {
    await page.addInitScript(country => {
      sessionStorage.setItem('checkout_form_v2_e2e-wetravel_sin-fecha_1', JSON.stringify({
        customerFirstName: 'Test', customerLastName: 'Traveler', customerEmail: 'test@example.com',
        customerCountry: country, customerPhone: '+541112345678', customerDocument: '12345678', customerBirthDate: '1990-01-01',
      }));
    }, country);
    const method = country === 'Argentina' ? 'mercadopago' : 'wetravel';
    let calls = 0;
    await page.route('**/api/mercadopago/preference', route => {
      calls++;
      expect(route.request().postDataJSON().paymentMethod).toBe(method);
      return route.fulfill({ json: { url: method === 'wetravel' ? paymentUrl : 'https://www.mercadopago.com.ar/mock', intentId: 'created-intent', provider: method } });
    });
    await page.route('https://www.mercadopago.com.ar/mock', route => route.fulfill({ contentType: 'text/html', body: 'Mock MP' }));
    await page.route('**/api/wetravel/status?*', route => route.fulfill({ json: pending }));
    await page.goto('/es/checkout/testing');
    await expect(page.locator('#customerFirstName')).toHaveValue('Test');
    await page.getByRole('button', { name: 'Pagar con', exact: true }).click();
    await page.getByRole('button', { name: /Pagar con.*(?:WeTravel|WeeTravel|Mercado Pago)/i }).click();
    if (method === 'wetravel') {
      await expect(page.getByRole('link', { name: /Abrir WeTravel/ })).toBeVisible();
      await expect(page).toHaveURL(/\/es\/checkout\/testing$/);
      await page.reload();
      await expect(page.getByRole('link', { name: /Abrir WeTravel/ })).toBeVisible();
    } else {
      await expect(page).toHaveURL('https://www.mercadopago.com.ar/mock');
    }
    expect(calls).toBe(1);
  });
}

