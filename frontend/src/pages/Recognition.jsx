import { useCallback, useRef, useState } from 'react'
import { Toast } from 'antd-mobile'
import axios from '../http'
import ImageCaptureAndProcess from '../components/imageCaptureAndProcess/index.jsx'
import RecognitionResult, { RecognitionSkeleton } from '../components/recognitionResult/Index.jsx'
import { buildFallbackResult } from '../components/recognitionResult/localFallback.js'

const REQUEST_TIMEOUT = 65000 // 真实 Coze 大模型流水线（视觉识别 + 文史流变 + TTS 语音）耗时约 15~35 秒，给足等待窗口

export default function Recognition() {
  const [recognitionResult, setRecognitionResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scene, setScene] = useState(0) // 每次识别递增，用作结果组件的 key，确保新一轮结果从干净状态起渲染
  const requestSeq = useRef(0) // 请求序号：旧响应一律丢弃，避免覆盖新一次识别

  const recognize = useCallback(async (dataUrl) => {
    const seq = ++requestSeq.current
    setScene(seq)
    setLoading(true)
    setRecognitionResult(null)
    Toast.show({ content: '呈递图卷 · 先贤研墨考证中…', duration: 3500 })

    try {
      const res = await axios.post('/api/coze/recognition', { img: dataUrl }, { timeout: REQUEST_TIMEOUT })
      if (requestSeq.current !== seq) return
      const body = res?.data
      if (body && body.code === 1 && body.data) {
        // 真实识别结果直接上屏
        setRecognitionResult(body)
        Toast.show({ content: '考释完毕 · 雅文已著', icon: 'success' })
      } else {
        setRecognitionResult(buildFallbackResult())
      }
    } catch (err) {
      console.warn('Recognition request failed or timed out:', err?.message)
      if (requestSeq.current !== seq) return
      setRecognitionResult(buildFallbackResult())
      Toast.show({ content: '网络稍有迟滞，先行呈现典库推演', duration: 2500 })
    } finally {
      if (requestSeq.current === seq) {
        setLoading(false)
      }
    }
  }, [])

  return (
    <ImageCaptureAndProcess onRecognition={recognize}>
      {loading && <RecognitionSkeleton />}
      {!loading && recognitionResult && (
        <RecognitionResult key={scene} recognitionResult={recognitionResult} />
      )}
    </ImageCaptureAndProcess>
  )
}
