import { cachedLetters, scholarScope } from './scholarLetters'

const PREFIX = 'scholar-custom-sages:v1:'

function normalizedSageName(sage) {
  return String(sage?.name || '').trim().replace(/\s+/g, '')
}

function sameCustomSage(item, sage) {
  if (!item?.id || !sage?.id) return false
  if (item.id === sage.id) return true
  return item.id.startsWith('sage_') && sage.id.startsWith('sage_') && normalizedSageName(item) === normalizedSageName(sage)
}

function dedupeCustomSages(list) {
  return (Array.isArray(list) ? list : []).filter((item, index, rows) => (
    item?.id && rows.findIndex(candidate => sameCustomSage(candidate, item)) === index
  ))
}

/**
 * 将自定知音置于列表首位，并确保同一知音只保留一席。
 * 事件刷新与创建回调可能连续到达；同名自定知音也应复用同一席位。
 */
export function prependUniqueSage(list, sage) {
  if (!sage?.id) return Array.isArray(list) ? list : []
  return [sage, ...(Array.isArray(list) ? list.filter(item => !sameCustomSage(item, sage)) : [])]
}

export function customSagesKey(scope = scholarScope()) {
  return `${PREFIX}${scope}`
}

/**
 * 迁移或清理旧版未做多账号隔离的全局键 'gufeng_custom_sages'
 * 隔离铁律：
 * 1. 若当前账户已经存在 scoped 数据，说明已完成隔离，无需迁移。
 * 2. 若存在旧版全局数据，检查其中人物是否属于当前 scope（通过当前账号的历史信札判断）。
 * 3. 若当前 scope 确实拥有此人物，迁移至当前 scope。
 * 4. 如果发现其它账户的记录（比如 localStorage 中有其他 scholar-profile/letters 记录），
 *    将未匹配的人物转移到该旧账户中，坚决不泄露给当前新账号！
 * 5. 最后移除全局键 'gufeng_custom_sages'。
 */
function migrateLegacyCustomSages(currentScope) {
  if (typeof localStorage === 'undefined') return
  try {
    const legacyRaw = localStorage.getItem('gufeng_custom_sages')
    if (!legacyRaw) return

    const legacyList = JSON.parse(legacyRaw)
    if (!Array.isArray(legacyList) || legacyList.length === 0) {
      localStorage.removeItem('gufeng_custom_sages')
      return
    }

    // 检查当前账号是否与这些人物有过往信札
    const currentLetters = cachedLetters(currentScope)
    const currentOwned = legacyList.filter(item => item?.id && currentLetters.some(l => l.sageId === item.id))
    const others = legacyList.filter(item => item?.id && !currentLetters.some(l => l.sageId === item.id))

    // 如果属于当前账号，保存到当前账号的 scoped 存储
    if (currentOwned.length > 0) {
      const currentKey = `${PREFIX}${currentScope}`
      const existing = JSON.parse(localStorage.getItem(currentKey) || '[]')
      const merged = [...currentOwned, ...existing.filter(e => !currentOwned.some(o => o.id === e.id))]
      localStorage.setItem(currentKey, JSON.stringify(merged))
    }

    // 对于不属于当前账号的人物（例如上一账号创建的人物）：
    if (others.length > 0) {
      const allKeys = []
      const len = typeof localStorage.length === 'number' ? localStorage.length : 0
      for (let i = 0; i < len; i++) {
        const k = typeof localStorage.key === 'function' ? localStorage.key(i) : null
        if (k && (k.startsWith('scholar-letters:v1:') || k.startsWith('scholar-profile:v1:'))) {
          const s = k.replace(/^scholar-(?:letters|profile):v1:/, '')
          if (s && s !== currentScope && !allKeys.includes(s)) allKeys.push(s)
        }
      }
      const targetScope = allKeys.find(s => s.startsWith('user:')) || (currentScope === 'guest' ? null : 'guest')
      if (targetScope) {
        const targetKey = `${PREFIX}${targetScope}`
        const existing = JSON.parse(localStorage.getItem(targetKey) || '[]')
        const merged = [...others, ...existing.filter(e => !others.some(o => o.id === e.id))]
        localStorage.setItem(targetKey, JSON.stringify(merged))
      }
    }

    // 清除旧的全局未隔离 key，杜绝任何新登录账号被跨账号污染
    localStorage.removeItem('gufeng_custom_sages')
  } catch (err) {
    console.warn('[customSages migration]:', err)
  }
}

/**
 * 获取当前账户作用域下的自定知音
 */
export function getCustomSages(scope = scholarScope()) {
  if (typeof localStorage === 'undefined') return []
  try {
    const key = customSagesKey(scope)
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      const parsed = JSON.parse(raw)
      const clean = dedupeCustomSages(parsed)
      if (Array.isArray(parsed) && clean.length !== parsed.length) localStorage.setItem(key, JSON.stringify(clean))
      return clean
    }

    // 尝试做一次 legacy 兼容迁移
    migrateLegacyCustomSages(scope)

    const afterMigration = localStorage.getItem(key)
    if (afterMigration !== null) {
      const parsed = JSON.parse(afterMigration)
      return dedupeCustomSages(parsed)
    }

    return []
  } catch {
    return []
  }
}

/**
 * 迎请/保存自定知音到当前账户
 */
export function saveCustomSage(newSage, scope = scholarScope()) {
  if (!newSage?.id || typeof localStorage === 'undefined') return false
  try {
    const key = customSagesKey(scope)
    const list = getCustomSages(scope).filter(s => !sameCustomSage(s, newSage))
    list.unshift(newSage)
    localStorage.setItem(key, JSON.stringify(list))
    // 确保旧全局 key 不复存在
    try { localStorage.removeItem('gufeng_custom_sages') } catch { /* optional legacy cleanup */ }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('customSagesUpdated', { detail: { scope, sageId: newSage.id } }))
    }
    return true
  } catch {
    return false
  }
}

/**
 * 从当前账户移出自定知音
 */
export function removeCustomSage(sageId, scope = scholarScope()) {
  if (!sageId || typeof localStorage === 'undefined') return false
  try {
    const key = customSagesKey(scope)
    const list = getCustomSages(scope).filter(s => s?.id !== sageId)
    localStorage.setItem(key, JSON.stringify(list))
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('customSagesUpdated', { detail: { scope, sageId } }))
    }
    return true
  } catch {
    return false
  }
}
