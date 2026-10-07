# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wetravel-tracking.spec.ts >> mobile: restored checkout opens a safe new tab, reuses link and follows verified success
- Location: e2e\wetravel-tracking.spec.ts:23:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByRole('link', { name: 'Pay now' })
Expected: "_blank"
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 20000ms
  - waiting for getByRole('link', { name: 'Pay now' })

```

```yaml
- main:
  - status:
    - img
    - text: Checking payment status…
- region "Notifications alt+T"
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | test.setTimeout(60000);
  4   | test.use({ actionTimeout: 20000 });
  5   | const key = 'wetravel_tracking_v1_' + JSON.stringify(['e2e-wetravel', 'sin-fecha', 1, {}, []]);
  6   | const paymentUrl = 'https://www.wetravel.com/checkout/e2e-mocked';
  7   | const pending = { status: 'pending', paymentStatus: 'pending' };
  8   | const confirmed = { status: 'completed', paymentStatus: 'paid', reservationId: 'r-test', reservationCode: 'BAFT-TEST', reservationStatus: 'reserved', reservation: { title: 'Test Tour', slug: 'e2e-wetravel', date: 'sin-fecha', people: 2, amountTotal: 25000, currency: 'usd', paymentMethod: 'wetravel', extras: [] } };
  9   | 
  10  | async function restore(page: Page, launched = true) {
  11  |   await page.addInitScript(({ key, paymentUrl, launched }) => {
  12  |     sessionStorage.setItem(key, JSON.stringify({ intentId: 'test-intent', url: paymentUrl }));
  13  |     if (launched) sessionStorage.setItem('wetravel_launched_v1_test-intent', '1');
  14  |   }, { key, paymentUrl, launched });
  15  | }
  16  | 
  17  | test.beforeEach(async ({ page }) => {
  18  |   // No payment creation or external provider access can occur in these tests.
  19  |   await page.route('**/api/mercadopago/preference', route => route.abort());
  20  |   await page.context().route('https://www.wetravel.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Mock payment</p>' }));
  21  | });
  22  | 
  23  | test('mobile: restored checkout opens a safe new tab, reuses link and follows verified success', async ({ page }) => {
  24  |   await page.setViewportSize({ width: 390, height: 844 });
  25  |   await restore(page, false);
  26  |   let status = pending;
  27  |   let writes = 0;
  28  |   page.on('request', request => { if (request.url().includes('/api/') && request.method() === 'POST') writes++; });
  29  |   await page.route('**/api/wetravel/status?*', route => route.fulfill({ json: status }));
  30  |   await page.goto('/en/checkout/testing?slug=e2e-wetravel&date=sin-fecha&people=1&ref=test');
  31  |   const link = page.getByRole('link', { name: 'Pay now' });
> 32  |   await expect(link).toHaveAttribute('target', '_blank', { timeout: 20000 });
      |                      ^ Error: expect(locator).toHaveAttribute(expected) failed
  33  |   await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  34  |   const popupEvent = page.waitForEvent('popup');
  35  |   await link.click();
  36  |   const popup = await popupEvent;
  37  |   await popup.waitForLoadState();
  38  |   await expect(popup).toHaveURL(paymentUrl);
  39  |   expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  40  |   await popup.close();
  41  |   await page.bringToFront();
  42  |   await page.reload();
  43  |   const reopen = page.getByRole('link', { name: 'Reopen payment tab' });
  44  |   await expect(reopen).toHaveAttribute('href', paymentUrl, { timeout: 20000 });
  45  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  46  |   status = confirmed;
  47  |   await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  48  |   await expect(page).toHaveURL(/\/en\/checkout\/success\?/);
  49  |   expect(new URL(page.url()).searchParams.get('ref')).toBe('test');
  50  |   expect(new URL(page.url()).searchParams.get('intentId')).toBe('test-intent');
  51  |   await expect(page.getByRole('heading', { name: 'Your booking is confirmed!' })).toBeVisible();
  52  |   await expect(page.getByText('BAFT-TEST')).toBeVisible();
  53  |   await expect(page.getByText('Test Tour')).toBeVisible();
  54  |   expect(writes).toBe(0);
  55  | });
  56  | 
  57  | test('paid without reservation does not redirect or offer another payment; failure and review are terminal', async ({ page }) => {
  58  |   await restore(page);
  59  |   let status = { ...pending, paymentStatus: 'paid' };
  60  |   let requests = 0;
  61  |   await page.route('**/api/wetravel/status?*', route => { requests++; return route.fulfill({ json: status }); });
  62  |   await page.goto('/es/checkout/testing');
  63  |   await expect(page.getByRole('heading', { name: 'Pago recibido' })).toBeVisible();
  64  |   await expect(page.getByRole('link', { name: /Pagar ahora|Reabrir/ })).toHaveCount(0);
  65  |   status = { status: 'needs_review', paymentStatus: 'disputed' };
  66  |   await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  67  |   await expect(page.getByRole('heading', { name: 'Tu pago necesita revisión' })).toBeVisible();
  68  |   const before = requests;
  69  |   await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  70  |   await page.waitForTimeout(3300);
  71  |   expect(requests).toBe(before);
  72  |   status = { status: 'failed', paymentStatus: 'failed' };
  73  |   await page.reload();
  74  |   await expect(page.getByRole('heading', { name: 'No se pudo completar el pago' })).toBeVisible();
  75  |   await page.getByRole('button', { name: 'Volver al checkout' }).click();
  76  |   expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBeNull();
  77  |   await expect(page.getByTestId('wetravel-modal')).toHaveCount(0);
  78  | });
  79  | 
  80  | test('transient errors recover and ten-minute timeout never becomes a rejection', async ({ page }) => {
  81  |   await restore(page);
  82  |   let fail = true;
  83  |   await page.route('**/api/wetravel/status?*', route => route.fulfill(fail ? { status: 503, json: {} } : { json: pending }));
  84  |   await page.goto('/en/checkout/testing');
  85  |   await expect(page.getByText(/We could not check the status/)).toBeVisible();
  86  |   fail = false;
  87  |   await page.getByRole('button', { name: 'Check again' }).click();
  88  |   await expect(page.getByRole('link', { name: /Reopen payment tab/ })).toBeVisible();
  89  |   await expect(page.getByText(/We could not check the status/)).toHaveCount(0);
  90  |   await page.clock.install();
  91  |   await page.clock.fastForward(10 * 60 * 1000 + 1000);
  92  |   await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  93  |   await expect(page.getByText(/We are still waiting for confirmation/)).toBeVisible();
  94  |   await expect(page.getByRole('heading', { name: 'Complete your payment on WeTravel' })).toBeVisible();
  95  |   await page.getByRole('button', { name: 'Check again' }).click();
  96  |   await expect(page.getByText(/We are still waiting for confirmation/)).toHaveCount(0);
  97  | });
  98  | 
  99  | test('pauses when hidden and verifies immediately on visibility return', async ({ page }) => {
  100 |   await restore(page);
  101 |   let requests = 0;
  102 |   await page.route('**/api/wetravel/status?*', route => { requests++; return route.fulfill({ json: pending }); });
  103 |   await page.goto('/en/checkout/testing');
  104 |   await expect(page.getByRole('link', { name: /Reopen payment tab/ })).toBeVisible();
  105 |   await page.evaluate(() => {
  106 |     Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  107 |     document.dispatchEvent(new Event('visibilitychange'));
  108 |   });
  109 |   const before = requests;
  110 |   await page.waitForTimeout(3500);
  111 |   expect(requests).toBe(before);
  112 |   await page.evaluate(() => {
  113 |     Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  114 |     document.dispatchEvent(new Event('visibilitychange'));
  115 |   });
  116 |   await expect.poll(() => requests).toBeGreaterThan(before);
  117 | });
  118 | 
  119 | for (const country of ['Chile', 'Argentina']) {
  120 |   test(`creates one checkout: ${country === 'Argentina' ? 'Mercado Pago keeps same-tab navigation' : 'WeTravel stays in BAFT'}`, async ({ page }) => {
  121 |     await page.addInitScript(country => {
  122 |       sessionStorage.setItem('checkout_form_v2_e2e-wetravel_sin-fecha_1', JSON.stringify({
  123 |         customerFirstName: 'Test', customerLastName: 'Traveler', customerEmail: 'test@example.com',
  124 |         customerCountry: country, customerPhone: '+541112345678', customerDocument: '12345678', customerBirthDate: '1990-01-01',
  125 |       }));
  126 |     }, country);
  127 |     const method = country === 'Argentina' ? 'mercadopago' : 'wetravel';
  128 |     let calls = 0;
  129 |     await page.route('**/api/mercadopago/preference', route => {
  130 |       calls++;
  131 |       expect(route.request().postDataJSON().paymentMethod).toBe(method);
  132 |       return route.fulfill({ json: { url: method === 'wetravel' ? paymentUrl : 'https://www.mercadopago.com.ar/mock', intentId: 'created-intent', provider: method } });
```