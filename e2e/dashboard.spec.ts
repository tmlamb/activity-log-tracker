import { expect, test } from '@playwright/test'

test('homepage has Workout Activity Log Tracker in title and links to the settings and create program screens', async ({
  page
}) => {
  await page.goto('/')

  // Expect the title to match the app name
  await expect(page).toHaveTitle('Workout Activity Log Tracker')

  // Expect the settings button to be present
  const settingsLink = page.locator('role=button[name="Navigate to Application Settings"]')
  await expect(settingsLink).toBeVisible()

  // Expect the header title to be empty (although it's at the top, it comes second in the DOM)
  const headerTitle = page.locator('role=heading[level=1]').nth(1)
  await expect(headerTitle).toHaveText('')

  // Expect the app title to be the app name.
  const appTitle = page.locator('role=heading[level=1]').first()
  await expect(appTitle).toHaveText(/Workout\nActivity Log Tracker/)

  // Expect the getting started text to display when there are no programs
  const getStartedText = page.locator(
    'text=To get started, first create a new workout program, which will be used to track your workout sessions.'
  )
  await expect(getStartedText).toBeVisible()

  // Expect the create program button to be visible
  const createProgramLink = page.locator(
    'role=button[name="Navigate to Create Workout Program Form"]'
  )
  await expect(await createProgramLink.innerText()).toMatch(/Create Workout Program/)
  // .to(/Create Workout Program/)

  // Click the create Program Link
  await createProgramLink.click()

  // Expects the URL to contain the program form path
  await expect(page).toHaveURL(/.*program\/form/)
})
