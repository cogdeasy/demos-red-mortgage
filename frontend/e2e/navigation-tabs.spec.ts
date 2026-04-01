import { test, expect } from '@playwright/test';

test.describe('Top Navigation Tabs - Desktop', () => {
  test('should display the header with HSBC logo and navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.header-logo img')).toBeVisible();
    await expect(page.locator('.header-nav')).toBeVisible();
  });

  test('should show Dashboard tab as active on the home page', async ({ page }) => {
    await page.goto('/');
    const dashboardLink = page.locator('.header-nav a', { hasText: 'Dashboard' });
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveClass(/active/);
  });

  test('should show New Application tab in the navigation', async ({ page }) => {
    await page.goto('/');
    const newAppLink = page.locator('.header-nav a', { hasText: 'New Application' });
    await expect(newAppLink).toBeVisible();
  });

  test('should navigate to Dashboard and display stats grid', async ({ page }) => {
    await page.goto('/applications/new');
    const dashboardLink = page.locator('.header-nav a', { hasText: 'Dashboard' });
    await dashboardLink.click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('.stats-grid')).toBeVisible();
    await expect(page.locator('.stat-card')).toHaveCount(4);
  });

  test('should navigate to New Application and display the form', async ({ page }) => {
    await page.goto('/');
    const newAppLink = page.locator('.header-nav a', { hasText: 'New Application' });
    await newAppLink.click();
    await expect(page).toHaveURL('/applications/new');
    await expect(page.locator('h2', { hasText: 'New Mortgage Application' })).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
  });

  test('should show New Application tab as active on the new application page', async ({ page }) => {
    await page.goto('/applications/new');
    const newAppLink = page.locator('.header-nav a', { hasText: 'New Application' });
    await expect(newAppLink).toHaveClass(/active/);
  });

  test('should navigate between all tabs in sequence', async ({ page }) => {
    // Start on Dashboard
    await page.goto('/');
    await expect(page.locator('.stats-grid')).toBeVisible();

    // Navigate to New Application
    await page.locator('.header-nav a', { hasText: 'New Application' }).click();
    await expect(page).toHaveURL('/applications/new');
    await expect(page.locator('form')).toBeVisible();

    // Navigate back to Dashboard
    await page.locator('.header-nav a', { hasText: 'Dashboard' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('.stats-grid')).toBeVisible();
  });

  test('should display Dashboard page content correctly', async ({ page }) => {
    await page.goto('/');

    // Stat cards
    await expect(page.locator('.stat-card h3', { hasText: 'Total Applications' })).toBeVisible();
    await expect(page.locator('.stat-card h3', { hasText: 'Pending Review' })).toBeVisible();
    await expect(page.locator('.stat-card h3', { hasText: 'Approved' })).toBeVisible();
    await expect(page.locator('.stat-card h3', { hasText: 'Avg Loan Amount' })).toBeVisible();

    // Recent Applications section
    await expect(page.locator('.card-header h2', { hasText: 'Recent Applications' })).toBeVisible();

    // Search and filter bar
    await expect(page.locator('.search-input')).toBeVisible();
    await expect(page.locator('.status-filter')).toBeVisible();

    // New Application button in card header
    await expect(page.locator('.card-header .btn-primary', { hasText: '+ New Application' })).toBeVisible();
  });

  test('should display New Application form sections correctly', async ({ page }) => {
    await page.goto('/applications/new');

    // Applicant Details section
    await expect(page.locator('.form-section h3', { hasText: 'Applicant Details' })).toBeVisible();
    await expect(page.locator('#first_name')).toBeVisible();
    await expect(page.locator('#last_name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();

    // Property Details section
    await expect(page.locator('.form-section h3', { hasText: 'Property Details' })).toBeVisible();
    await expect(page.locator('#address1')).toBeVisible();
    await expect(page.locator('#city')).toBeVisible();
    await expect(page.locator('#postcode')).toBeVisible();

    // Loan Details section
    await expect(page.locator('.form-section h3', { hasText: 'Loan Details' })).toBeVisible();
    await expect(page.locator('#loan_amount')).toBeVisible();
    await expect(page.locator('#loan_term')).toBeVisible();
    await expect(page.locator('#loan_type')).toBeVisible();

    // Form actions
    await expect(page.locator('.form-actions .btn-outline', { hasText: 'Cancel' })).toBeVisible();
    await expect(page.locator('.form-actions .btn-primary', { hasText: 'Create Application' })).toBeVisible();
  });

  test('should navigate home via HSBC logo click', async ({ page }) => {
    await page.goto('/applications/new');
    await page.locator('.header-logo').click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('.stats-grid')).toBeVisible();
  });
});
