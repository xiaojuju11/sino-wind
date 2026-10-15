import { useEffect, useState } from 'react'
import { scholarScope } from './scholarLetters'

// Key the personal views by identity, so no previous user's component state survives.
export function useScholarScope() {
  const [scope, setScope] = useState(scholarScope)
  useEffect(() => {
    const refresh = () => setScope(scholarScope())
    const events = ['storage', 'focus', 'userInfoUpdated', 'scholarSessionChanged']
    events.forEach(event => window.addEventListener(event, refresh))
    refresh()
    return () => events.forEach(event => window.removeEventListener(event, refresh))
  }, [])
  return scope
}
