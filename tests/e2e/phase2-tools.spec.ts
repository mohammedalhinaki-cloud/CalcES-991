import type { MathfieldElement } from 'mathlive'
import { expect, test } from './fixtures'

test('equation solver returns a step-by-step linear solution', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /حل المعادلات/ }).click()

  const panel = page.getByRole('tabpanel')
  await panel.getByRole('button', { name: 'خطية' }).click()
  await panel.getByRole('button', { name: 'حل المعادلة' }).click()
  await expect(panel.locator('.solution-roots strong')).toHaveText('3')
  await expect(panel.getByRole('list', { name: 'خطوات الحل' })).toContainText('اقسم الطرفين على معامل x')
})

test('graphing adds functions, zooms, and applies a custom x-range', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /الرسم البياني/ }).click()

  const graph = page.getByRole('img', { name: 'الرسم البياني للدوال' })
  await expect(graph.locator('path.graph-function-path')).toHaveCount(1)
  await page.getByRole('button', { name: 'إضافة دالة' }).click()
  await expect(page.getByRole('textbox', { name: 'الدالة 2' })).toHaveValue('x^2')
  await expect(graph.locator('path.graph-function-path')).toHaveCount(2)

  const firstTick = graph.locator('text').first()
  await expect(firstTick).toHaveText('-10')
  await page.getByRole('button', { name: 'تكبير الرسم', exact: true }).click()
  await expect(firstTick).toHaveText('-7.2')

  await page.getByLabel('بداية مجال x').fill('-4')
  await page.getByLabel('نهاية مجال x').fill('4')
  await page.getByRole('button', { name: 'تطبيق المجال' }).click()
  await expect(firstTick).toHaveText('-4')
})

test('unit conversion works and a scientific constant inserts into the calculator', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /تحويل الوحدات/ }).click()
  await page.getByLabel('نوع الكمية').selectOption('temperature')
  await page.getByLabel('القيمة').fill('32')
  await page.getByLabel('وحدة المصدر').selectOption('fahrenheit')
  await page.getByLabel('وحدة الهدف').selectOption('celsius')
  await expect(page.locator('.conversion-result strong')).toContainText('0 °C')

  await page.getByRole('button', { name: 'إدراج ثابت سرعة الضوء في الفراغ' }).click()
  await expect(page.getByRole('tab', { name: /الحاسبة/ })).toHaveAttribute('aria-selected', 'true')
  const editor = page.locator('math-field')
  await expect(editor).toBeVisible()
  await expect.poll(() => editor.evaluate(element => (element as MathfieldElement).getValue())).toContain('299792458')
})

test('inserting a scientific constant wakes a powered-off calculator', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-key="shift"]').click()
  await page.locator('[data-key="clear"]').click()
  await expect(page.locator('.calculator-display-status')).toHaveText('اضغط ON للتشغيل')

  await page.getByRole('tab', { name: /تحويل الوحدات/ }).click()
  await page.getByRole('button', { name: 'إدراج ثابت سرعة الضوء في الفراغ' }).click()
  const editor = page.locator('math-field')
  await expect(editor).toBeVisible()
  await expect.poll(() => editor.evaluate(element => (element as MathfieldElement).getValue())).toContain('299792458')
})
