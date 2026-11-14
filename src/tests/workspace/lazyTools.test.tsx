import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

const graphImport = vi.hoisted(() => {
  let releaseImport!: () => void
  const pendingImport = new Promise<void>(resolve => { releaseImport = resolve })
  return { pendingImport, release: () => releaseImport() }
})

vi.mock('../../features/graphing/GraphingTool', async () => {
  await graphImport.pendingImport
  return { default: () => <div>Graph module ready</div> }
})
vi.mock('../../components/display/MathEditor', () => ({ default: () => <div aria-label="محرر المعادلة" /> }))

import App from '../../app/App'

it('shows an accessible shimmer skeleton until the lazy Graph module resolves', async () => {
  render(<App />)
  fireEvent.click(screen.getByRole('tab', { name: /الرسم البياني/ }))

  const loadingState = await screen.findByRole('status', { name: 'جارٍ تحميل الأداة' })
  expect(loadingState).toBeVisible()
  expect(loadingState.querySelector('.tool-skeleton-title')).toBeInTheDocument()
  expect(loadingState.querySelector('.tool-skeleton-chart')).toBeInTheDocument()

  graphImport.release()
  expect(await screen.findByText('Graph module ready')).toBeInTheDocument()
  expect(screen.queryByRole('status', { name: 'جارٍ تحميل الأداة' })).not.toBeInTheDocument()
})
