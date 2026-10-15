import axios from '../http'
export function scholarScope() {
  const token = localStorage.getItem('token')
  if (!token) return 'guest'
  try {
    const id = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id
    return Number.isSafeInteger(id) && id > 0 ? `user:${id}` : 'invalid-session'
  } catch { return 'invalid-session' }
}
const key = scope => `scholar-letters:v1:${scope}`
export function cachedLetters(scope = scholarScope()) {
  try {
    const value = JSON.parse(localStorage.getItem(key(scope)) || '[]')
    return Array.isArray(value) ? value.filter(l => l && typeof l.sageId === 'string').map(row => ({ ...row, turns: Array.isArray(row.turns) ? row.turns.map(t => ({ ...t, pending: typeof t?.pending === 'boolean' ? t.pending : scope.startsWith('user:') && !t?.archiveSaved })) : [] })) : []
  } catch { return [] }
}
export function cacheLetter(letter, scope = scholarScope()) {
  if (!letter?.sageId) return false
  try {
    localStorage.setItem(key(scope), JSON.stringify([letter, ...cachedLetters(scope).filter(l => l.sageId !== letter.sageId)]))
    window.dispatchEvent(new Event('scholarLettersUpdated'))
    return true
  } catch { return false }
}
export function shichen(at) {
  const date = new Date(at)
  if (!Number.isFinite(date.getTime())) return '尚未对席'
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', hourCycle: 'h23' }).format(date))
  const minute = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', minute: '2-digit' }).format(date))
  return `${['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][Math.floor(((hour + 1) % 24) / 2)]}时${['初','一','二','三','四','五','六','七'][Math.floor((((hour + 1) % 2) * 60 + minute) / 15)]}刻`
}
function mergeRemote(row, scope, detailed = false) {
  const local = cachedLetters(scope).find(l => l.sageId === row.sageId)
  const remoteAt = Math.max(row.at || 0, ...(row.turns || []).map(t => t.at || 0))
  const turns = detailed ? [...(row.turns || []).map(t => ({ ...t, pending: false })), ...(local?.turns || []).filter(t => (t.pending || t.at >= remoteAt) && !row.turns?.some(r => r.id === t.id))] : local?.turns || []
  turns.sort((a, b) => a.at - b.at)
  const latest = turns.at(-1), newer = latest && latest.at > (row.at || 0)
  const acknowledged = turns.filter(t => !t.pending).slice(-20)
  const retained = [...acknowledged, ...turns.filter(t => t.pending)].sort((a, b) => a.at - b.at)
  const merged = { ...local, ...row, rounds: Math.max(local?.rounds || 0, row.rounds || 0), turns: retained, ...(newer ? { lastMsg: latest.answer, at: latest.at } : {}) }
  cacheLetter(merged, scope)
  return merged
}
const syncing = new Map()
export function syncLocalLetters() {
  const scope = scholarScope()
  if (!scope.startsWith('user:')) return Promise.resolve()
  if (syncing.has(scope)) return syncing.get(scope)
  const task = (async () => {
    const turns = cachedLetters(scope).flatMap(l => (l.turns || []).filter(t => t.pending).map(t => ({ ...t, sageId: l.sageId })))
    for (let i = 0; i < turns.length; i += 100) {
      if (scope !== scholarScope()) return
      const response = await axios.post('/api/deepseek/scholar/sync', { turns: turns.slice(i, i + 100) }, { timeout: 15000 })
      if (scope !== scholarScope()) return
      const accepted = new Set(response.data.data.accepted)
      for (const row of cachedLetters(scope)) cacheLetter({ ...row, turns: row.turns?.map(t => accepted.has(t.id) ? { ...t, pending: false } : t) }, scope)
    }
  })().finally(() => syncing.delete(scope))
  syncing.set(scope, task)
  return task
}
export async function loadLetters() {
  const scope = scholarScope()
  if (!scope.startsWith('user:')) return cachedLetters(scope)
  await syncLocalLetters().catch(() => {}) // Pending originals remain; cloud reads must still work.
  const response = await axios.get('/api/deepseek/scholar/letters', { timeout: 10000 })
  if (scope !== scholarScope()) return cachedLetters()
  response.data.data.forEach(row => mergeRemote(row, scope))
  return cachedLetters(scope)
}
export async function loadLetterDetail(sageId) {
  const scope = scholarScope()
  if (!scope.startsWith('user:')) return cachedLetters(scope).find(l => l.sageId === sageId)
  await syncLocalLetters().catch(() => {})
  const response = await axios.get(`/api/deepseek/scholar/letters/${encodeURIComponent(sageId)}`, { timeout: 10000 })
  if (scope !== scholarScope()) return null
  return mergeRemote(response.data.data, scope, true)
}
export function saveLocalTurn(sageId, turn) {
  const previous = cachedLetters().find(l => l.sageId === sageId) || { sageId, rounds: 0, turns: [] }
  if (previous.turns?.some(t => t.id === turn.id)) return true
  const saved = cacheLetter({ ...previous, rounds: previous.rounds + 1, lastMsg: turn.answer, at: turn.at, turns: [...(previous.turns || []), { ...turn, pending: scholarScope() !== 'guest' && !turn.archiveSaved }] })
  window.dispatchEvent(new Event('scholarAssetsUpdated'))
  return saved
}
export async function markLetterRead(sageId, replyId) {
  const scope = scholarScope()
  if (scope.startsWith('user:')) await axios.post(`/api/deepseek/scholar/letters/${encodeURIComponent(sageId)}/read`, { replyId }, { timeout: 10000 })
  if (scope !== scholarScope()) return
  const row = cachedLetters(scope).find(l => l.sageId === sageId)
  if (row?.reply?.id === replyId) cacheLetter({ ...row, reply: { ...row.reply, unread: false } }, scope)
}
export function leaveScholar(sageId) {
  const scope = scholarScope()
  if (scope.startsWith('user:')) {
    return syncLocalLetters().then(async () => {
      if (scope !== scholarScope()) return
      const response = await fetch(axios.getUri({ url: `/api/deepseek/scholar/letters/${encodeURIComponent(sageId)}/leave` }), { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, body: '{}', keepalive: true })
      if (!response.ok) return
      const body = await response.json()
      if (scope !== scholarScope() || !body.data) return
      const row = cachedLetters(scope).find(l => l.sageId === sageId)
      if (row) cacheLetter({ ...row, reply: { ...body.data, at: new Date(body.data.at).getTime(), unread: true } }, scope)
    }).catch(() => {})
  }
  const row = cachedLetters(scope).find(l => l.sageId === sageId)
  if (!row || row.rounds < 4 || row.rounds - (row.leaveRounds || 0) < 4) return
  cacheLetter({ ...row, leaveRounds: row.rounds, reply: { id: crypto.randomUUID(), text: '山水相逢，墨香不散。四番清谈尚有余韵，愿足下珍重，改日续叙。', at: Date.now(), unread: true, kind: '本机规则回柬' } }, scope)
}
// Only an explicit action may move this browser's guest material to an account.
export async function importGuestLetters() {
  const scope = scholarScope()
  if (!scope.startsWith('user:')) throw new Error('请先登录')
  const turns = cachedLetters('guest').flatMap(l => (l.turns || []).map(t => ({ ...t, sageId: l.sageId })))
  for (let i = 0; i < turns.length; i += 100) {
    if (scope !== scholarScope()) throw new Error('账户已变更，请重新确认')
    const response = await axios.post('/api/deepseek/scholar/sync', { turns: turns.slice(i, i + 100) }, { timeout: 15000 })
    if (scope !== scholarScope()) throw new Error('账户已变更，本机原稿保留')
    const accepted = new Set(response.data.data.accepted)
    for (const row of cachedLetters('guest')) {
      const remaining = (row.turns || []).filter(t => !accepted.has(t.id))
      if (!cacheLetter({ ...row, rounds: remaining.length, turns: remaining, lastMsg: remaining.at(-1)?.answer || '', at: remaining.at(-1)?.at || 0, reply: null }, 'guest')) throw new Error('云端已收到，本机原稿尚未整理，请重试')
    }
  }
  await loadLetters()
  window.dispatchEvent(new Event('scholarAssetsUpdated'))
}
