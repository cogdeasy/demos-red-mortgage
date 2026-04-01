import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.describe('Navigation on mobile', () => {
    test('should hide the header nav links on mobile viewport', async ({ page }) => {
      await page.goto('/');
      // On mobile (<=768px), .header-nav is set to display:none via CSS
      const headerNav = page.locator('.header-nav');
      await expect(headerNav).toBeHidden();
    });

    test('should still display the HSBC logo on mobile', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.header-logo img')).toBeVisible();
    });

    test('should navigate home via logo tap on mobile', async ({ page }) => {
      await page.goto('/applications/new');
      await page.locator('.header-logo').click();
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Dashboard layout on mobile', () => {
    test('should display stats grid in a 2-column layout on mobile', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.stats-grid')).toBeVisible();

      const statsGrid = page.locator('.stats-grid');
      const computedStyle = await statsGrid.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });
      // On mobile, should be 2 columns (1fr 1fr)
      const columnCount = computedStyle.split(' ').length;
      expect(columnCount).toBeLessThanOrEqual(2);
    });

    test('should display all four stat cards on mobile', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.stat-card')).toHaveCount(4);
    });

    test('should display the applications table on mobile', async ({ page }) => {
      await page.goto('/');
      // The card with recent applications should be visible
      await expect(page.locator('.card-header h2', { hasText: 'Recent Applications' })).toBeVisible();
    });

    test('should display search and filter bar on mobile', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.search-input')).toBeVisible();
      await expect(page.locator('.status-filter')).toBeVisible();
    });
  });

  test.describe('New Application form on mobile', () => {
    test('should display form in single-column layout on mobile', async ({ page }) => {
      await page.goto('/applications/new');
      await expect(page.locator('form')).toBeVisible();

      const formGrid = page.locator('.form-grid').first();
      const computedStyle = await formGrid.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });
      // On mobile, form-grid should collapse to a single column
      const columnCount = computedStyle.split(' ').length;
      expect(columnCount).toBe(1);
    });

    test('should display all form sections on mobile', async ({ page }) => {
      await page.goto('/applications/new');
      await expect(page.locator('.form-section h3', { hasText: 'Applicant Details' })).toBeVisible();
      await expect(page.locator('.form-section h3', { hasText: 'Property Details' })).toBeVisible();
      await expect(page.locator('.form-section h3', { hasText: 'Loan Details' })).toBeVisible();
    });

    test('should have usable form inputs on mobile', async ({ page }) => {
      await page.goto('/applications/new');

      // Verify inputs are visible and interactable
      const firstNameInput = page.locator('#first_name');
      await expect(firstNameInput).toBeVisible();
      await firstNameInput.fill('Test');
      await expect(firstNameInput).toHaveValue('Test');

      const emailInput = page.locator('#email');
      await expect(emailInput).toBeVisible();
      await emailInput.fill('test@example.com');
      await expect(emailInput).toHaveValue('test@example.com');
    });

    test('should display form action buttons on mobile', async ({ page }) => {
      await page.goto('/applications/new');
      await expect(page.locator('.form-actions .btn-outline', { hasText: 'Cancel' })).toBeVisible();
      await expect(page.locator('.form-actions .btn-primary', { hasText: 'Create Application' })).toBeVisible();
    });
  });

  test.describe('Touch and viewport interactions on mobile', () => {
    test('should render the full page without horizontal overflow', async ({ page }) => {
      await page.goto('/');
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      // Body should not overflow the viewport significantly
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
    });

    test('should have viewport meta tag for mobile rendering', async ({ page }) => {
      await page.goto('/');
      const viewportMeta = page.locator('meta[name="viewport"]');
      await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
    });
  });
});
