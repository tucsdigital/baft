import { test, expect } from '@playwright/test';

test.setTimeout(90000);

test('English home renders translated sections and cards without missing messages', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (/MISSING_MESSAGE|INVALID_MESSAGE|FORMATTING_ERROR/.test(message.text())) errors.push(message.text());
  });
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Choose your next adventure' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Experiences for every traveler' })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Why choose BAFT' })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'We are BAFT' })).toBeAttached();
  await expect(page.getByText('What would you like a quote for?')).toBeAttached();
  await expect(page.locator('body')).not.toContainText('public.packages');
  await expect(page.locator('#excursiones')).not.toContainText('Destacado');
  await expect(page.locator('#excursiones')).not.toContainText('Ver mas');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  assertNoErrors();

  await page.goto('/en?ref=i18n-check#excursiones', { waitUntil: 'domcontentloaded' });
  await page.getByRole('combobox', { name: 'Language', exact: true }).first().selectOption('es');
  await expect(page).toHaveURL(/\/es\?ref=i18n-check#excursiones$/);
  await expect(page.getByRole('heading', { name: 'Elegí tu próxima aventura' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  assertNoErrors();

  function assertNoErrors() { expect(errors).toEqual([]); }
});

test('English home retains translated UI on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Choose your next adventure' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
