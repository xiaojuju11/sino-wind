import { useCallback, useEffect, useRef, useState } from 'react'
import axios from '../http'
import ImageCaptureAndProcess from '../components/imageCaptureAndProcess/index.jsx'
import RecognitionResult, { RecognitionSkeleton } from '../components/recognitionResult/Index.jsx'
import { buildFallbackResult } from '../components/recognitionResult/localFallback.js'

/**
 * 物溯古今 · 拍照识器（成员 A / TRD v3.0 §2.2、§3.1、§4.4）
 *  - 图片由 ImageCaptureAndProcess 采集并转成 Base64（FileReader）；
 *  - 统一通过公共 Axios 实例（../http）POST /api/coze/recognition（AC-A3）；
 *  - AC-A1：上传后立即进入 Loading 动画，并在 2 秒内给出考证推演结果；
 *  - AC-A2：断网 / 无 Token / 上游超时一律落到内置文博库兜底，页面不抛红、不崩溃、不白屏。
 */

const RESULT_BUDGET = 2000 // AC-A1：2 秒内必须有结果上屏
const REQUEST_TIMEOUT = 5000 // 公共 Axios 未设置有效超时，这里显式给真实工作流 5 秒等待窗口

export default function Recognition() {
  const [recognitionResult, setRecognitionResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false) // 已上屏兜底结果，仍在等待真实识别回填
  const [scene, setScene] = useState(0) // 每次识别递增，用作结果组件的 key，确保新一轮结果从干净状态起渲染
  const budgetTimer = useRef(null)
  const requestSeq = useRef(0) // 请求序号：旧响应一律丢弃，避免覆盖新一次识别

  useEffect(() => () => clearTimeout(budgetTimer.current), [])

  const recognize = useCallback(async (dataUrl) => {
    const seq = ++requestSeq.current
    setScene(seq)
    setLoading(true)
    setPending(false)
    setRecognitionResult(null)

    // 2 秒预算：先保证画面里有考证结果，真实工作流回来后再替换
    clearTimeout(budgetTimer.current)
    budgetTimer.current = setTimeout(() => {
      if (requestSeq.current !== seq) return
      setRecognitionResult(buildFallbackResult())
      setLoading(false)
      setPending(true)
    }, RESULT_BUDGET)

    try {
      const res = await axios.post('/api/coze/recognition', { img: dataUrl }, { timeout: REQUEST_TIMEOUT })
      if (requestSeq.current !== seq) return
      clearTimeout(budgetTimer.current)
      const body = res?.data
      if (body && body.code === 1 && body.data) {
        // 真实识别结果直接上屏；服务端兜底结果同样带 degraded 标记，交由结果组件标注
        setRecognitionResult(body)
      } else {
        setRecognitionResult((prev) => prev ?? buildFallbackResult())
      }
      setLoading(false)
      setPending(false)
    } catch {
      // 网络异常、超时、上游报错：保留已上屏的兜底结果，绝不向页面抛红
      if (requestSeq.current !== seq) return
      clearTimeout(budgetTimer.current)
      setRecognitionResult((prev) => prev ?? buildFallbackResult())
      setLoading(false)
      setPending(false)
    }
  }, [])

  return (
    <ImageCaptureAndProcess onRecognition={recognize}>
      {loading && <RecognitionSkeleton />}
      {!loading && recognitionResult && (
        <RecognitionResult key={scene} recognitionResult={recognitionResult} pending={pending} />
      )}
    </ImageCaptureAndProcess>
  )
}
