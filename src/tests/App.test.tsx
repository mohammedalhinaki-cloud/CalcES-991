import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import App from '../app/App'

// Real MathLive selection is tested in Chromium, not emulated by jsdom.
vi.mock('../components/display/MathEditor', () => ({ default: () => <div aria-label="محرر المعادلة" /> }))
it('renders the display and separate result with the original keypad groups', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'CalcES 991 — حاسبة علمية' })).toBeInTheDocument()
  expect(screen.getByLabelText('الشاشة التفاعلية')).toBeInTheDocument()
  expect(screen.getByLabelText('النتيجة')).toHaveTextContent('—')
  expect(screen.getByLabelText('لوحة مفاتيح الحاسبة')).toBeInTheDocument()
  expect(screen.getByLabelText('الدوال العلمية')).toHaveClass('grid-cols-6')
  expect(screen.getByLabelText('الأرقام والعمليات')).toHaveClass('grid-cols-5')
})

it('shows all five workspace tabs and opens the functional graphing tool', async () => {
  render(<App />)
  expect(screen.getAllByRole('tab')).toHaveLength(5)
  expect(screen.getByRole('tab', { name: /القوانين والصيغ/ })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: /الحاسبة/ })).toHaveAttribute('aria-selected', 'true')

  fireEvent.click(screen.getByRole('tab', { name: /الرسم البياني/ }))
  expect(screen.getByRole('tab', { name: /الرسم البياني/ })).toHaveAttribute('aria-selected', 'true')
  const panel = screen.getByRole('tabpanel')
  expect(await within(panel).findByRole('heading', { name: 'الرسم البياني' })).toBeInTheDocument()
  expect(within(panel).getByRole('heading', { name: 'الدوال' })).toBeInTheDocument()
  expect(within(panel).getByRole('img', { name: 'الرسم البياني للدوال' })).toBeInTheDocument()
  expect(within(panel).getByLabelText('الدالة 1')).toHaveValue('sin(x)')
})

it('solves a linear equation from the equation-solver workspace', async () => {
  render(<App />)
  fireEvent.click(screen.getByRole('tab', { name: /حل المعادلات/ }))
  const panel = screen.getByRole('tabpanel')
  fireEvent.click(await within(panel).findByRole('button', { name: 'خطية' }))
  fireEvent.click(within(panel).getByRole('button', { name: 'حل المعادلة' }))
  expect(panel.querySelector('.solution-roots strong')).toHaveTextContent('3')
  expect(within(panel).getByRole('list', { name: 'خطوات الحل' })).toBeInTheDocument()
})

it('converts units and exposes insertable scientific constants', async () => {
  render(<App />)
  fireEvent.click(screen.getByRole('tab', { name: /تحويل الوحدات/ }))
  const panel = screen.getByRole('tabpanel')
  expect(await within(panel).findByLabelText('القيمة')).toHaveValue('1')
  expect(within(panel).getByText(/1000 m/)).toBeInTheDocument()
  expect(within(panel).getByRole('heading', { name: 'ثوابت علمية' })).toBeInTheDocument()
  expect(within(panel).getByRole('button', { name: 'إدراج ثابت سرعة الضوء في الفراغ' })).toBeInTheDocument()
})

it('persists the light theme and exposes Shift/Alpha from the Advanced toggle', () => {
  localStorage.removeItem('calces_theme')
  const { unmount } = render(<App />)

  fireEvent.click(screen.getByRole('button', { name: 'التبديل إلى الوضع الفاتح' }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  expect(localStorage.getItem('calces_theme')).toBe('light')

  fireEvent.click(screen.getByRole('button', { name: 'الوظائف المتقدمة' }))
  const choices = screen.getByRole('group', { name: 'اختيار وظائف SHIFT وALPHA' })
  fireEvent.click(within(choices).getByRole('button', { name: /SHIFT/ }))
  expect(screen.getByRole('button', { name: 'sin⁻¹' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'الوظائف المتقدمة' }))
  fireEvent.click(within(screen.getByRole('group', { name: 'اختيار وظائف SHIFT وALPHA' })).getByRole('button', { name: /ALPHA/ }))
  expect(screen.getByRole('button', { name: 'D' })).toBeInTheDocument()

  unmount()
  localStorage.removeItem('calces_theme')
})
