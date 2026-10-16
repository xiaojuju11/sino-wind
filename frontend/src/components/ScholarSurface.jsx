import { useScholarSheet } from '../utils/useScholarSheet'

// Only actual drawers lock scrolling and trap focus. Routed pages use the normal document flow.
function ScholarDialog({ children, onClose, label }) {
  const sheet = useScholarSheet(onClose)
  return <div className='scholar-sheet-backdrop'>
    <section ref={sheet} className='scholar-sheet' role='dialog' aria-modal='true' aria-label={label}>{children}</section>
  </div>
}

export default function ScholarSurface({ presentation = 'drawer', children, onClose, label }) {
  if (presentation === 'page') return <section className='study-page__surface scholar-sheet' aria-label={label}>{children}</section>
  return <ScholarDialog onClose={onClose} label={label}>{children}</ScholarDialog>
}
