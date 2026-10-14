import { useEffect, useRef } from 'react'

export function useScholarSheet(onClose) {
  const sheet = useRef(null), close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    const before = document.activeElement, oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const element = sheet.current
    element?.querySelector('button')?.focus()
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return }
      if (event.key !== 'Tab' || !element) return
      const controls = [...element.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary')].filter(node => node.getClientRects().length)
      const first = controls[0], last = controls.at(-1)
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', key); if (before?.isConnected) before.focus() }
  }, [])
  return sheet
}
