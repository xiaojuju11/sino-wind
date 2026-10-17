// Images belong to this browser + account scope; never imply server synchronization.
const DB_NAME = 'yunshan-scene-poetry-v1'
const STORE = 'scenes'
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'key' })
      store.createIndex('scope', 'scope')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('本机藏卷暂不可用，请检查浏览器存储权限。'))
    request.onblocked = () => reject(new Error('藏卷正被其他页面占用，请关闭旧页面后重试。'))
  })
}
async function run(mode, action) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    let request
    try { request = action(tx.objectStore(STORE)) } catch (error) { db.close(); reject(error); return }
    tx.oncomplete = () => { const result = request.result; db.close(); resolve(result) }
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error('未能保存藏卷，可能是本机存储空间不足。请导出诗境后重试。')) }
  })
}
export async function saveScene(scope, scene) {
  if (!scope || scope === 'invalid-session') throw new Error('请重新登录后再保存。')
  const record = { ...scene, scope, key: `${scope}:${scene.id}`, saved: true, updatedAt: Date.now() }
  await run('readwrite', store => store.put(record))
  window.dispatchEvent(new Event('sceneArchiveUpdated'))
  return record
}
export async function loadScene(scope, id) { return run('readonly', store => store.get(`${scope}:${id}`)) }
export async function listScenes(scope) {
  const records = await run('readonly', store => store.index('scope').getAll(scope))
  return records.filter(row => row.saved).sort((a, b) => b.updatedAt - a.updatedAt)
}
export async function deleteScene(scope, id) {
  await run('readwrite', store => store.delete(`${scope}:${id}`))
  window.dispatchEvent(new Event('sceneArchiveUpdated'))
}
export async function putDraft(scope, scene) {
  await run('readwrite', store => store.put({ ...scene, scope, key: `${scope}:draft`, saved: false }))
}
export async function getDraft(scope) { return loadScene(scope, 'draft') }
