import axios from '../http'
import { cachedLetters, importGuestLetters, scholarScope } from './scholarLetters'

const key = scope => `scholar-artifacts:v1:${scope}`
const gamesKey = 'scholar-games:v1:guest'
export function guestGames() {
  try { const value = JSON.parse(localStorage.getItem(gamesKey) || '[]'); return Array.isArray(value) ? value.filter(g => g?.status === 'finished' && g.settled) : [] } catch { return [] }
}
// Called by the FeihuaPanel owner only after the server confirms a guest settlement.
// This material is local practice; credentials and competitive points are excluded.
export function rememberGuestGame(game) {
  if (scholarScope() !== 'guest' || game?.status !== 'finished' || !game.settled || typeof game.id !== 'string' || !Array.isArray(game.turns)) return false
  const { id, sageId, keyword, rhyme, nickname, rounds, turns, winner, endedAt } = game
  const record = { id, sageId, keyword, rhyme, nickname, rounds, turns, winner, endedAt, status: 'finished', settled: true, pointsAwarded: 0 }
  localStorage.setItem(gamesKey, JSON.stringify([record, ...guestGames().filter(row => row.id !== id)]))
  window.dispatchEvent(new Event('scholarAssetsUpdated'))
  return true
}
export function localArtifacts(scope = scholarScope()) {
  try { const rows = JSON.parse(localStorage.getItem(key(scope)) || '[]'); return Array.isArray(rows) ? rows : [] } catch { return [] }
}
function writeArtifacts(rows, scope) {
  localStorage.setItem(key(scope), JSON.stringify(rows))
  window.dispatchEvent(new Event('scholarAssetsUpdated'))
}
// Integration entry point for the recognition owner: same result = same UUID.
// Call only after a completed recognition, not for pending/failed responses.
export async function saveScholarArtifact(item) {
  if (!item || typeof item.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 100 || typeof item.description !== 'string' || !item.description.trim() || item.description.length > 8000 || (item.dynasty !== undefined && (typeof item.dynasty !== 'string' || item.dynasty.length > 80)) || (!item.degraded && (!Number.isFinite(item.score) || item.score < 0 || item.score > 100))) throw new Error('器物档案不完整或品位分值无效')
  const scope = scholarScope()
  const payload = { id: item.id, name: item.name, dynasty: item.dynasty || '', description: item.description, score: item.score, degraded: Boolean(item.degraded) }
  if (scope === 'guest') {
    const previous = localArtifacts(scope)
    if (!previous.some(row => row.id === item.id)) writeArtifacts([{ ...payload, at: Date.now() }, ...previous], scope)
    return previous.find(row => row.id === item.id) || payload
  }
  if (!scope.startsWith('user:')) throw new Error('请重新登录')
  const response = await axios.post('/api/deepseek/scholar/artifacts', payload, { timeout: 10000 })
  if (scope !== scholarScope()) throw new Error('账户已变更')
  window.dispatchEvent(new Event('scholarAssetsUpdated'))
  return response.data.data
}
export function removeLocalArtifact(id) {
  if (scholarScope() !== 'guest') throw new Error('仅可移除本机游客藏品')
  writeArtifacts(localArtifacts('guest').filter(row => row.id !== id), 'guest')
}
export function guestArchiveCount() {
  return localArtifacts('guest').length + cachedLetters('guest').reduce((n, row) => n + (row.turns?.length || 0), 0)
}
export async function importGuestArchive() {
  const scope = scholarScope()
  if (!scope.startsWith('user:')) throw new Error('请先登录')
  await importGuestLetters()
  for (const item of localArtifacts('guest')) {
    if (scope !== scholarScope()) throw new Error('账户已变更')
    await saveScholarArtifact(item)
    if (scope !== scholarScope()) throw new Error('账户已变更，本机记录保留')
    writeArtifacts(localArtifacts('guest').filter(row => row.id !== item.id), 'guest')
  }
}
export function guestSummary() {
  return { appraise_count: localArtifacts().length, artifact_count: localArtifacts().length, debate_count: cachedLetters().reduce((n, row) => n + (row.rounds || 0), 0), poem_count: 0, yayan_count: 0 }
}
