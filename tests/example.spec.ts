// tests/example.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Example Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('https://playwright.dev');
    await expect(page).toHaveTitle(/Playwright/);
  });

  test('get started link is visible', async ({ page }) => {
    await page.goto('https://playwright.dev');
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
  });

  test('docs page loads', async ({ page }) => {
    await page.goto('https://playwright.dev/docs/intro');
    await expect(page.locator('h1')).toContainText('Installation');
  });
});
