// UTF-8 decoding and SSE framing are independent of network chunk boundaries.
export function createSSEParser(onEvent) {
  let buffer = '', event = 'message', data = []
  const line = value => {
    if (!value) {
      if (data.length) onEvent(event, JSON.parse(data.join('\n')))
      event = 'message'; data = []
      return
    }
    if (value.startsWith(':')) return
    const colon = value.indexOf(':')
    const field = colon < 0 ? value : value.slice(0, colon)
    let content = colon < 0 ? '' : value.slice(colon + 1)
    if (content.startsWith(' ')) content = content.slice(1)
    if (field === 'event') event = content
    if (field === 'data') data.push(content)
  }
  return {
    push(text) {
      buffer += text
      if (buffer.length > 131072) throw new Error('流式数据过长')
      let match
      while ((match = /\r\n|\r(?!$)|\n/.exec(buffer))) {
        line(buffer.slice(0, match.index))
        buffer = buffer.slice(match.index + match[0].length)
      }
    },
    finish() { if (buffer || data.length) throw new Error('流式响应提前中断') }
  }
}

export async function receiveScholarStream(url, body, signal, onEvent) {
  const token = localStorage.getItem('token')
  const response = await fetch(url, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  })
  if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream') || !response.body) throw new Error('对席连接暂不可用')
  let done = false
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const parser = createSSEParser((event, data) => {
    if (done) return
    if (event === 'done') done = true
    if (event === 'error') throw new Error(data.message || '对席暂时中断')
    onEvent(event, data)
  })
  const reader = response.body.getReader()
  try {
    while (!done) {
      const chunk = await reader.read()
      if (chunk.done) break
      parser.push(decoder.decode(chunk.value, { stream: true }))
    }
    parser.push(decoder.decode())
    parser.finish()
    if (!done) throw new Error('对席连接提前中断，请重试')
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
