import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '../app/App'

// Real MathLive selection is tested in Chromium, not emulated by jsdom.
vi.mock('../components/display/MathEditor', () => ({ default: () => <div aria-label="محرر المعادلة" /> }))
beforeEach(() => { localStorage.clear(); localStorage.setItem('calces_language','ar'); localStorage.setItem('rate_done','1') })
afterEach(cleanup)

it('opens the integrated device by default and keeps the original advanced calculator as a switchable alternative', () => {
  render(<App />)
  expect(screen.getByRole('article',{name:'حاسبة الجهاز العلمية 991 ES PLUS'})).toBeInTheDocument()
  expect(screen.getByLabelText('شاشة الحاسبة')).toBeInTheDocument()
  expect(screen.getByLabelText('النتيجة')).toHaveTextContent('0')
  expect(screen.queryByText('مساحة العمل ·')).not.toBeInTheDocument()
  expect(screen.getByLabelText('الدوال العلمية')).toHaveClass('grid-cols-6')
  expect(screen.getByLabelText('الأرقام والعمليات')).toHaveClass('grid-cols-5')
  fireEvent.click(screen.getByRole('button',{name:'تبديل الحاسبة'}))
  expect(screen.getByRole('heading',{name:'CalcES 991 — حاسبة علمية'})).toBeInTheDocument()
  expect(screen.getByLabelText('الشاشة التفاعلية')).toBeInTheDocument()
  expect(localStorage.getItem('calces_interface')).toBe('workspace')
  fireEvent.click(screen.getByRole('button',{name:'تبديل الحاسبة'}))
  expect(screen.getByRole('article',{name:'حاسبة الجهاز العلمية 991 ES PLUS'})).toBeInTheDocument()
})

it('respects an explicitly chosen advanced calculator without making it the default for new visitors', () => {
  localStorage.setItem('calces_interface','workspace')
  render(<App />)
  expect(screen.getByRole('heading',{name:'CalcES 991 — حاسبة علمية'})).toBeInTheDocument()
  expect(screen.queryByRole('article',{name:'حاسبة الجهاز العلمية 991 ES PLUS'})).not.toBeInTheDocument()
})
