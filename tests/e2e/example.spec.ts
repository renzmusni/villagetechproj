import { test, expect } from '@playwright/test';

test.describe('HOA Platform E2E Tests', () => {
  test('platform loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/HOA Community Platform/);
  });

  test('admin application loads correctly', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await expect(page).toHaveTitle(/HOA Admin/);
  });

  test('residence application loads correctly', async ({ page }) => {
    await page.goto('http://localhost:3002');
    await expect(page).toHaveTitle(/HOA Residence/);
  });

  test('sentinel application loads correctly', async ({ page }) => {
    await page.goto('http://localhost:3003');
    await expect(page).toHaveTitle(/HOA Sentinel/);
  });
});