import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test.describe('Add Workout Program', () => {
  test('program form content', async ({ page }) => {
    await page.goto('/program/form')
    // Expects the URL to contain the program form path
    await expect(page).toHaveURL(/.*program\/form/)

    const programNameInput = await page.locator('data-testid=program-name-input')
    await expect(programNameInput).toBeEditable()

    const instructionText = page.locator(
      "text=Give your workout program a name, like 'Strength Training', 'Weightlifting', or 'Beach Bod 🏖️"
    )
    await expect(instructionText).toBeVisible()
  })
  test('program name required error', async ({ page }) => {
    await page.goto('/program/form')

    const submitButton = page.locator('role=button[name="Save Workout Program"]')
    await submitButton.click()
    const errorText = page.locator('text=Program Name is required')
    await expect(errorText).toBeVisible()
    await expect(page).toHaveURL(/.*program\/form/)
  })
  test('program name max length', async ({ page }) => {
    await page.goto('/program/form')
    const programNameInput = await page.locator('data-testid=program-name-input')
    await expect(programNameInput).toBeEditable()
    programNameInput.type('12345678901234567890123456')

    await expect(programNameInput).toHaveValue('1234567890123456789012345')
  })
  test('program form submit', async ({ page }) => {
    const createProgramLink = page.locator(
      'role=button[name="Navigate to Create Workout Program Form"]'
    )
    createProgramLink.click()
    await expect(page).toHaveURL(/.*program\/form/)

    const programNameInput = await page.locator('data-testid=program-name-input')
    programNameInput.type('My New Program')

    await expect(programNameInput).toHaveValue(/My\u00a0New\u00a0Program/)

    const submitButton = page.locator('role=button[name="Save Workout Program"]')
    await submitButton.click()

    await expect(page).toHaveURL('/')

    const newProgramButton = page.locator(
      'role=button[name="Navigate to View Workout Program with name My New Program"]'
    )

    await expect(newProgramButton).toBeVisible()
  })
})
