import { useEffect, useState } from 'react'

export function useFrequencyResource(endpoint) {
  const [result, setResult] = useState({})
  const [attempt, setAttempt] = useState(0)
  const key = endpoint + ':' + attempt
  useEffect(() => {
    if (!endpoint) return
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort('timeout'), 35000)
    async function load() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/poetry-frequency/${endpoint}`, { signal: controller.signal })
        const data = await response.json().catch(() => { throw Error('诗库暂未连接，请稍后重新展卷') })
        if (!response.ok) throw Error(data.message || '诗库读取失败')
        if (!controller.signal.aborted) setResult({ key, data })
      } catch (error) {
        if (!controller.signal.aborted || controller.signal.reason === 'timeout') setResult({ key, error: controller.signal.reason === 'timeout' ? '读取超时，请重新展卷' : error.message })
      } finally { clearTimeout(timer) }
    }
    load()
    return () => { clearTimeout(timer); controller.abort() }
  }, [endpoint, key])
  return { ...(result.key === key ? result : {}), loading: Boolean(endpoint) && result.key !== key, retry: () => setAttempt(value => value + 1) }
}
