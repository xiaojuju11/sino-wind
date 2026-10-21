/**
 * 安全的 UUID v4 生成器
 * 优先使用浏览器原生 crypto.randomUUID()（仅在 HTTPS 或 localhost 可用）
 * 在 HTTP（非安全上下文，如 IP 地址访问）环境下自动回退到标准 RFC4122 算法，杜绝 `crypto.randomUUID is not a function` 崩溃
 */
export function safeUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // 忽略部分老旧浏览器抛出的安全上下文异常，走下方标准回退
    }
  }

  // RFC4122 v4 格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
