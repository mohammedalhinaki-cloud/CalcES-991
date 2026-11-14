import { useCallback, useEffect, useRef } from 'react'

type TextField = HTMLInputElement | HTMLTextAreaElement

/**
 * Quick constants go where the user was typing: into the last text field of the visible tool
 * when there is one, otherwise into the calculator editor (via `insertIntoCalculator`).
 */
export function useQuickConstantInsertion(insertIntoCalculator: (latex: string) => void) {
  const lastTextField = useRef<TextField | null>(null)

  useEffect(() => {
    const rememberField = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
      if (target instanceof HTMLInputElement && target.type === 'search') return
      if (target.closest('.quick-access-dialog')) return
      lastTextField.current = target
    }
    document.addEventListener('focusin', rememberField)
    return () => document.removeEventListener('focusin', rememberField)
  }, [])

  return useCallback((latex: string, value: string) => {
    const target = lastTextField.current
    const panel = target?.closest<HTMLElement>('[role="tabpanel"]')
    if (!target?.isConnected || panel?.hidden) {
      insertIntoCalculator(latex)
      return
    }

    const start = target.selectionStart ?? target.value.length
    const end = target.selectionEnd ?? start
    const next = `${target.value.slice(0, start)}${value}${target.value.slice(end)}`
    // Use the native setter so React-controlled inputs observe the change.
    const prototype = target instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
    if (setter) setter.call(target, next)
    else target.value = next
    target.dispatchEvent(new Event('input', { bubbles: true }))
    target.setSelectionRange(start + value.length, start + value.length)
    window.requestAnimationFrame(() => {
      if (target.isConnected && !panel?.hidden) target.focus()
    })
  }, [insertIntoCalculator])
}
