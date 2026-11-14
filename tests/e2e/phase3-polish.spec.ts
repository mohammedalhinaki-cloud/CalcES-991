import type { MathfieldElement } from 'mathlive'
import { expect, test, openAppMenu } from './fixtures'

test('all five workspace tools stay available and formulas search and insert into the calculator', async ({ page }) => {
  await page.goto('/')
  const navigation = page.getByRole('tablist', { name: 'أدوات CalcES' })
  await expect(navigation.getByRole('tab')).toHaveCount(5)
  await navigation.getByRole('tab', { name: /القوانين والصيغ/ }).click()

  const panel = page.getByRole('tabpanel')
  await panel.getByRole('searchbox', { name: 'ابحث في القوانين' }).fill('Pythagorean')
  await expect(panel.locator('.formula-card')).toHaveCount(1)
  await panel.getByRole('button', { name: 'إدراج صيغة نظرية فيثاغورس' }).click()

  await expect(navigation.getByRole('tab', { name: /الحاسبة/ })).toHaveAttribute('aria-selected', 'true')
  const editor = page.locator('math-field')
  await expect.poll(() => editor.evaluate(element => (element as MathfieldElement).getValue())).toContain('a^2+b^2=c^2')
})

test('the remaining Study Desk panels fit a narrow phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await page.getByRole('button', { name: 'قائمة الأدوات', exact: true }).click()
  await page.getByRole('tab', { name: /القوانين والصيغ/ }).click()
  await expect(page.locator('.formula-card').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('mobile tools live behind a single header button that opens a drawer', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  const navigation = page.getByRole('tablist', { name: 'أدوات CalcES' })
  const trigger = page.getByRole('button', { name: 'قائمة الأدوات', exact: true })
  // No tab row on phones: the tablist is hidden until the Tools button opens the drawer.
  await expect(navigation).toBeHidden()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const tabs = navigation.getByRole('tab')
  await expect(tabs).toHaveCount(5)
  for (let index = 0; index < 5; index++) {
    const box = await tabs.nth(index).boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(375)
    expect(box!.y + box!.height).toBeLessThanOrEqual(667)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
  await page.keyboard.press('Escape')
  await expect(navigation).toBeHidden()
  await trigger.click()
  await navigation.getByRole('tab', { name: /الرسم البياني/ }).click()
  await expect(navigation).toBeHidden()
  await expect(trigger).toContainText('الرسم البياني')
  await expect(page.getByRole('tabpanel')).toBeVisible()
})

test('the header has no banner text and the calculator fills a 375px phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await expect(page.locator('math-field')).toBeVisible()
  await expect(page.getByText('حسابات علمية على جهازك')).toHaveCount(0)
  const geometry = await page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
    return { header: box('.workspace-header'), lcd: box('.lcd-panel'), keypad: box('.calculator-keypad'), scrollHeight: document.documentElement.scrollHeight }
  })
  expect(geometry.header.height).toBeLessThanOrEqual(50)
  expect(geometry.lcd.height).toBeGreaterThanOrEqual(80)
  expect(geometry.keypad.bottom).toBeLessThanOrEqual(667)
  expect(geometry.keypad.height).toBeGreaterThanOrEqual(420)
  expect(geometry.scrollHeight).toBeLessThanOrEqual(668)
})

test('header Quick Access searches scientific constants and inserts into the calculator', async ({ page }) => {
  await page.goto('/')
  await (await openAppMenu(page)).getByRole('button', { name: 'الثوابت السريعة' }).click()
  const dialog = page.getByRole('dialog', { name: 'الثوابت العلمية' })
  await dialog.getByRole('searchbox', { name: 'بحث في الثوابت' }).fill('Avogadro')
  await expect(dialog.locator('.quick-access-item')).toHaveCount(1)
  await dialog.getByRole('button', { name: 'إدراج ثابت ثابت أفوجادرو' }).click()
  await expect(page.getByRole('dialog', { name: 'الثوابت العلمية' })).not.toBeVisible()
  const editor = page.locator('math-field')
  await expect.poll(() => editor.evaluate(element => (element as MathfieldElement).getValue())).toContain('6.02214076')
})

test('Quick Access inserts a constant at the remembered cursor in the active tool input', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /الرسم البياني/ }).click()
  const functionInput = page.getByRole('textbox', { name: 'الدالة 1' })
  await functionInput.fill('x+')
  await (await openAppMenu(page)).getByRole('button', { name: 'الثوابت السريعة' }).click()
  const dialog = page.getByRole('dialog', { name: 'الثوابت العلمية' })
  await dialog.getByRole('searchbox', { name: 'بحث في الثوابت' }).fill('Avogadro')
  await dialog.getByRole('button', { name: 'إدراج ثابت ثابت أفوجادرو' }).click()
  await expect(functionInput).toHaveValue('x+6.02214076e23')
  await expect(page.getByRole('tab', { name: /الرسم البياني/ })).toHaveAttribute('aria-selected', 'true')
})

test('shows a shimmering skeleton while the Graph module chunk is loading', async ({ page }) => {
  await page.goto('/')

  let announceChunkStart!: () => void
  let releaseChunk!: () => void
  const chunkStarted = new Promise<void>(resolve => { announceChunkStart = resolve })
  const heldChunk = new Promise<void>(resolve => { releaseChunk = resolve })
  await page.route(/\/assets\/.*\.js$/, async route => {
    if (route.request().resourceType() === 'script') {
      announceChunkStart()
      await heldChunk
    }
    await route.continue()
  })

  await page.getByRole('tab', { name: /الرسم البياني/ }).click()
  await chunkStarted
  const skeleton = page.getByRole('status', { name: 'جارٍ تحميل الأداة' })
  await expect(skeleton).toBeVisible()
  expect(await skeleton.locator('.tool-skeleton-title').evaluate(element => getComputedStyle(element, '::after').animationName)).toBe('workspace-skeleton-shimmer')

  releaseChunk()
  await expect(page.getByRole('textbox', { name: 'الدالة 1' })).toBeVisible()
  await expect(skeleton).not.toBeVisible()
})

test('graph has floating pan and export controls and downloads a styled SVG', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /الرسم البياني/ }).click()
  await expect(page.getByRole('button', { name: 'تحريك الرسم لليسار' })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'تصدير الرسم بصيغة SVG' }).click()
  expect((await download).suggestedFilename()).toMatch(/^calces-graph-\d{4}-\d{2}-\d{2}\.svg$/)
  await page.getByRole('button', { name: 'عرض الرسم بملء الشاشة' }).click()
  const exitFullscreen = page.getByRole('button', { name: 'إغلاق ملء الشاشة' })
  await expect(exitFullscreen).toHaveAttribute('aria-pressed', 'true')
  await exitFullscreen.click()
  await expect(page.getByRole('button', { name: 'عرض الرسم بملء الشاشة' })).toHaveAttribute('aria-pressed', 'false')
})
