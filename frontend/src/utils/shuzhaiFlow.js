// The Home owner currently writes a browser-wide notebook without account ownership.
// Read it honestly as local material; never silently claim it belongs to an account.
export function readYayanNotebook(storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem('gufeng_yayan_list') || '[]')
    if (!Array.isArray(value)) return { records: [], error: '本机摘录格式有误，原稿已保留' }
    const records = value.filter(row => row && typeof row.ancient === 'string' && row.ancient.trim()).map((row, index) => ({
      key: `${String(row.id ?? 'local')}:${index}`, ancient: row.ancient,
      modern: typeof row.modern === 'string' ? row.modern : '',
      explanation: typeof row.explanation === 'string' ? row.explanation : '',
      author: typeof row.author === 'string' ? row.author : '',
      createdAt: typeof row.createdAt === 'string' ? row.createdAt : '', offline: row.offline === true
    }))
    return { records, error: records.length !== value.length ? '部分摘录格式有误，原稿已保留' : '' }
  } catch { return { records: [], error: '本机摘录暂未读出，原稿未改动，请重试' } }
}

export function finishShuzhaiSession(storage = localStorage, eventTarget = window) {
  // Remove the credential first. Optional cached profile cleanup never removes assets/theme.
  storage.removeItem('token')
  try { storage.removeItem('userInfo') } catch { /* Legacy UI cache is not a credential. */ }
  eventTarget.dispatchEvent(new Event('scholarSessionChanged'))
}

export function unreadReplyCount(rows) {
  return Array.isArray(rows) ? rows.filter(row => row?.reply?.unread === true).length : 0
}
