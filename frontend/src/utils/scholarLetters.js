import axios from '../http'
export function scholarScope() {
  const token = localStorage.getItem('token')
  if (!token) return 'guest'
  try { return `user:${JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id}` } catch { return 'invalid-session' }
}
const key = () => `scholar-letters:v1:${scholarScope()}`
export function cachedLetters() {
  try { const value = JSON.parse(localStorage.getItem(key()) || '[]'); return Array.isArray(value) ? value.slice(0, 100) : [] } catch { return [] }
}
export function cacheLetter(letter) {
  try { localStorage.setItem(key(), JSON.stringify([letter, ...cachedLetters().filter(l => l.sageId !== letter.sageId)].slice(0, 100))); window.dispatchEvent(new Event('scholarLettersUpdated')) } catch { /* Private mode and quota errors never stop a conversation. */ }
}
export function shichen(at) {
  const date = new Date(at)
  if (!Number.isFinite(date.getTime())) return '尚未对席'
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', hourCycle: 'h23' }).format(date))
  const minute = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', minute: '2-digit' }).format(date))
  return `${['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][Math.floor(((hour + 1) % 24) / 2)]}时${['初','一','二','三','四','五','六','七'][Math.floor((((hour + 1) % 2) * 60 + minute) / 15)]}刻`
}
export async function loadLetters() {
  if (!localStorage.getItem('token')) return cachedLetters()
  const scope = scholarScope(), response = await axios.get('/api/deepseek/scholar/letters', { timeout: 10000 })
  if (scope !== scholarScope()) return []
  response.data.data.forEach(row => {
    const local = cachedLetters().find(l => l.sageId === row.sageId)
    cacheLetter({ ...local, ...row })
  })
  return cachedLetters()
}
export function saveLocalTurn(sageId, turn) {
  const previous = cachedLetters().find(l => l.sageId === sageId) || { sageId, rounds: 0, turns: [] }
  if (previous.turns?.some(t => t.id === turn.id)) return
  cacheLetter({ ...previous, rounds: previous.rounds + 1, lastMsg: turn.answer, at: turn.at, turns: [...(previous.turns || []), turn].slice(-20) })
}
export function leaveScholar(sageId) {
  if (localStorage.getItem('token')) {
    // keepalive survives SPA unmount and normal page navigation; no credentials in URL.
    fetch(axios.getUri({ url: `/api/deepseek/scholar/letters/${encodeURIComponent(sageId)}/leave` }), { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, body: '{}', keepalive: true }).catch(() => {})
    return
  }
  const row = cachedLetters().find(l => l.sageId === sageId)
  if (!row || row.rounds < 4 || row.rounds - (row.leaveRounds || 0) < 4) return
  cacheLetter({ ...row, leaveRounds: row.rounds, reply: { id: crypto.randomUUID(), text: '山水相逢，墨香不散。四番清谈尚有余韵，愿足下珍重，改日续叙。', at: Date.now(), unread: true, kind: '本机规则回柬' } })
}
