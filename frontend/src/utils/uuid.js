/**
 * 安全的 UUID v4 生成器
 * 优先用浏览器原生 crypto.randomUUID()（仅在 HTTPS 或 localhost 可用）。
 * 纯 HTTP / 局域网 IP 访问时 randomUUID 不存在，这里改用 crypto.getRandomValues()：
 * 它是 Crypto 接口里唯一在非安全上下文也可用、同样是密码学强度的随机源，
 * 按 RFC 9562 §5.4 手动拼出 v4 UUID，避免退化成 Math.random() 那种可预测的 ID。
 * 只有连 getRandomValues 都不可用时才落到最后兜底，保证任何环境都不会
 * 抛 `crypto.randomUUID is not a function` 中断页面。
 */
export function safeUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // 部分老旧浏览器会在非安全上下文抛异常，继续往下走
    }
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    try {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      // v4 位布局：byte[6] 高 4 位 = 0100，byte[8] 高 2 位 = 10
      bytes[6] = (bytes[6] & 0x0f) | 0x40
      bytes[8] = (bytes[8] & 0x3f) | 0x80
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    } catch {
      // 极少数环境禁用或限制了 getRandomValues，落到最后兜底
    }
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
