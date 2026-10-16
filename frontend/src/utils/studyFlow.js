export function readYayanNotebook(storage = localStorage) {
  try {
    const rows = JSON.parse(storage.getItem('gufeng_yayan_list') || '[]')
    if (!Array.isArray(rows)) throw new Error('Invalid notebook')
    const valid = rows.filter(row => row && typeof row.ancient === 'string' && row.ancient.trim())
    const text = value => typeof value === 'string' ? value : ''
    return {
      items: valid.map((row, index) => ({
        key: `${row.id ?? 'excerpt'}:${index}`, ancient: row.ancient, modern: text(row.modern),
        author: text(row.author), explanation: text(row.explanation), createdAt: text(row.createdAt),
        source: row.offline === true ? '离线范例摘录' : row.offline === false ? '在线雅译摘录' : '首页摘录（来源未标注）',
      })),
      error: valid.length === rows.length ? '' : '部分摘录暂不可读，原稿已保留。',
    }
  } catch {
    return { items: [], error: '未能读取本机摘录，原稿已保留，请稍后重试。' }
  }
}

export function finishStudySession(storage = localStorage, target = window) {
  storage.removeItem('token')
  try { storage.removeItem('userInfo') } catch { /* Old profile cache must not prevent a completed sign-out. */ }
  target.dispatchEvent(new Event('scholarSessionChanged'))
}

export function formatStudyDate(value) {
  if (!value) return '日期未记录'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '日期未记录'
  return date.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
}
