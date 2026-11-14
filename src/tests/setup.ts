import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(cleanup)

// jsdom has no display-mode media query implementation.
Object.defineProperty(window,'matchMedia',{writable:true,value:vi.fn(query=>({matches:false,media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()}))})

// Existing calculator tests start after onboarding; first-launch behavior has dedicated tests.
localStorage.setItem('calces_language','ar')

// jsdom does not implement modal dialogs; mirror the open/close state so dialog content is queryable.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
