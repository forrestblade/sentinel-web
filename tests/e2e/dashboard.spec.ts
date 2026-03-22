import { test, expect } from '@playwright/test'

test.describe('Sentinel Dashboard', () => {
  test('loads the dashboard page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Sentinel/)
    await expect(page.locator('h1')).toContainText('Sentinel')
  })

  test('shows the state badge', async ({ page }) => {
    await page.goto('/')
    const badge = page.locator('#state-badge')
    await expect(badge).toBeVisible()
    await expect(badge).not.toBeEmpty()
  })

  test('displays receipts table', async ({ page }) => {
    await page.goto('/')
    const table = page.locator('#receipts-table')
    await expect(table).toBeVisible()
    // Wait for data to load (auto-fetches on page load)
    await page.waitForResponse('**/api/receipts*')
    const rows = table.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
  })

  test('displays stats section', async ({ page }) => {
    await page.goto('/')
    await page.waitForResponse('**/api/stats*')
    const stats = page.locator('#stats-bar')
    await expect(stats).toBeVisible()
  })

  test('filter controls are present', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('select, input[type="text"]').first()).toBeVisible()
  })

  test('verify button triggers verification', async ({ page }) => {
    await page.goto('/')
    const verifyBtn = page.locator('button:has-text("Verify")')
    if (await verifyBtn.isVisible()) {
      const responsePromise = page.waitForResponse('**/api/verify*')
      await verifyBtn.click()
      const response = await responsePromise
      expect(response.status()).toBe(200)
    }
  })

  test('API returns valid JSON for /api/state', async ({ page }) => {
    const response = await page.goto('/api/state')
    expect(response).not.toBeNull()
    expect(response!.status()).toBe(200)
    const json = await response!.json()
    expect(json).toHaveProperty('current')
  })

  test('API returns valid JSON for /api/receipts', async ({ page }) => {
    const response = await page.goto('/api/receipts?limit=5')
    expect(response).not.toBeNull()
    expect(response!.status()).toBe(200)
    const json = await response!.json()
    expect(Array.isArray(json)).toBe(true)
  })

  test('API returns valid JSON for /api/stats', async ({ page }) => {
    const response = await page.goto('/api/stats')
    expect(response).not.toBeNull()
    expect(response!.status()).toBe(200)
    const json = await response!.json()
    expect(json).toHaveProperty('totalReceipts')
  })

  test('screenshot of dashboard', async ({ page }) => {
    await page.goto('/')
    await page.waitForResponse('**/api/receipts*')
    // Wait for rendering
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true })
  })
})
