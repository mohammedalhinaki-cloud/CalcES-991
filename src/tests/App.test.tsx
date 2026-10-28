import { render, screen } from '@testing-library/react'
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
