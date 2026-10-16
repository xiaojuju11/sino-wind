import { useCallback, useRef, useState } from 'react'
import { Toast } from 'antd-mobile'
import axios from '../http'
import ImageCaptureAndProcess from '../components/imageCaptureAndProcess/index.jsx'
import RecognitionResult, { RecognitionSkeleton } from '../components/recognitionResult/Index.jsx'

const REQUEST_TIMEOUT = 65000 // 比服务端默认 60 秒超时多留出传输时间
const FAILURE_MESSAGE = '本次未能取得识别结果，请检查网络后重试。'

export default function Recognition() {
  const [recognitionResult, setRecognitionResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scene, setScene] = useState(0) // 每次识别递增，用作结果组件的 key，确保新一轮结果从干净状态起渲染
  const requestSeq = useRef(0) // 请求序号：旧响应一律丢弃，避免覆盖新一次识别
  const selectedImage = useRef(null)

  const recognize = useCallback(async (dataUrl) => {
    const seq = ++requestSeq.current
    selectedImage.current = dataUrl
    setScene(seq)
    setLoading(true)
    setRecognitionResult(null)
    setError('')
    Toast.show({ content: '呈递图卷 · 先贤研墨考证中…', duration: 3500 })

    try {
      const res = await axios.post('/api/coze/recognition', { img: dataUrl }, { timeout: REQUEST_TIMEOUT })
      if (requestSeq.current !== seq) return
      const body = res?.data
      if (body && body.code === 1 && body.data && !body.degraded && body.source !== 'local-fallback') {
        // 真实识别结果直接上屏
        setRecognitionResult(body)
        Toast.show({ content: '考释完毕 · 雅文已著', icon: 'success' })
      } else {
        setError(body?.degraded || body?.source === 'local-fallback'
          ? '本次未能完成图片识别，服务返回了离线示例，请重试或联系管理员。'
          : body?.message || FAILURE_MESSAGE)
      }
    } catch (err) {
      console.warn('Recognition request failed or timed out:', err?.message)
      if (requestSeq.current !== seq) return
      setError(err?.response?.data?.message || err?.data?.message || FAILURE_MESSAGE)
    } finally {
      if (requestSeq.current === seq) {
        setLoading(false)
      }
    }
  }, [])

  return (
    <ImageCaptureAndProcess onRecognition={recognize}>
      {loading && <RecognitionSkeleton />}
      {!loading && error && (
        <section className='object-recognition-error' role='alert'>
          <h2>本次识别未完成</h2>
          <p>{error}</p>
          <button type='button' className='image-capture-btn image-capture-btn--secondary'
            onClick={() => recognize(selectedImage.current)}>重新识别</button>
        </section>
      )}
      {!loading && recognitionResult && (
        <RecognitionResult key={scene} recognitionResult={recognitionResult} />
      )}
    </ImageCaptureAndProcess>
  )
}
