import { useRef, useState } from 'react'
import './index.less'
import { useNavigate } from 'react-router-dom'

/**
 * 图片采集器（成员 A / TRD v3.0 §2.2）
 * 职责：拍摄或选取现代器物影像 ➔ FileReader 异步转 Base64 ➔ 交给 onRecognition 发起识物请求。
 * 约定：本组件只负责采集与编码，不发起网络请求（识物请求统一在 Recognition.jsx 走公共 Axios）。
 */

// 视觉大模型最佳输入长边：1280px（兼顾金石纹理细节与秒级传输速度）
const MAX_SIDE = 1280
// 超过 400KB 的图片一律通过 Canvas 智能降采样，保障任何超大图（20MB~50MB）均可秒级识别
const COMPRESS_THRESHOLD_BYTES = 400 * 1024
const SUPPORTED_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,/

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片解码失败'))
    image.src = src
  })
}

/** 等比缩放并重编码为高质量 JPEG（使用 ObjectURL 零拷贝，完美吃下 20MB~50MB 手机原图） */
async function shrinkFileToJpeg(file) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    if (!width || !height) throw new Error('图片尺寸无效')
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    // 开启高质量图像平滑插值
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function toRecognitionPayload(file) {
  // 任何大于 400KB 的大文件（如 10MB~50MB 手机原图/相机照），直接走 ObjectURL 极速降维，杜绝内存溢出
  if (file.size > COMPRESS_THRESHOLD_BYTES) {
    return shrinkFileToJpeg(file)
  }
  const raw = await readAsDataUrl(file)
  if (SUPPORTED_DATA_URL.test(raw)) return raw
  return shrinkFileToJpeg(file)
}

export default function ImageCaptureAndProcess({ onRecognition, children }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const [hint, setHint] = useState('')
  const [capturing, setCapturing] = useState(false)
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const submit = async (file) => {
    setHint('')
    let payload
    try {
      payload = await toRecognitionPayload(file)
    } catch {
      setHint('这张影像读取失败，请换一张再试。')
      return
    }
    setSelectedImage(payload)
    onRecognition(payload)
  }

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0]
    if (file) submit(file)
    event.target.value = '' // 允许重复选取同一张图
  }

  // 拍照：取景 1 秒后定格一帧（沿用既有采集节奏），失败一律落到温和提示，不抛红
  const handleTakePhoto = async () => {
    setHint('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setHint('当前环境无法调用摄像头，请改用「上传图片」。')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCapturing(true)
      const video = videoRef.current
      if (!video) throw new Error('取景器不可用')
      video.srcObject = stream
      await video.play()
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      if (!canvas.width || !canvas.height) throw new Error('取景失败')
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
      if (!blob) throw new Error('取景失败')
      setCapturing(false)
      await submit(new File([blob], 'captured-image.jpg', { type: 'image/jpeg' }))
    } catch (error) {
      setHint(
        error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
          ? '未获得摄像头授权，可在浏览器设置中允许后重试，或改用「上传图片」。'
          : '摄像头调用失败，请改用「上传图片」。'
      )
    } finally {
      stopStream()
      setCapturing(false)
    }
  }

  const handleClear = () => {
    setSelectedImage(null)
    setHint('')
  }

  return (
    <div className='image-capture-root'>
      <header className='image-capture-header'>
        <button type='button' className='image-capture-header__back' onClick={() => navigate(-1)} aria-label='返回'>
          <i className='iconfont icon-fanhui' aria-hidden='true' />
        </button>
        <h1 className='image-capture-header__title'>物溯古今 · 拍照识器</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.12rem' }}>
          <i className='image-capture-header__seal' aria-hidden='true'>华风</i>
        </div>
      </header>

      <main className='image-capture-main'>
        <section className='image-capture-preview'>
          <video
            ref={videoRef}
            className={`image-capture-preview__video${capturing ? ' is-live' : ''}`}
            playsInline
            muted
          />
          {!capturing && (
            selectedImage ? (
              <div className='image-capture-preview__image-container'>
                <img src={selectedImage} alt='待考证的器物影像' className='image-capture-preview__image' />
                <button type='button' className='image-capture-preview__clear' onClick={handleClear} aria-label='清除影像'>
                  <i className='iconfont icon-close' aria-hidden='true' />
                </button>
              </div>
            ) : (
              <div className='image-capture-preview__placeholder'>
                <i className='iconfont icon-image image-capture-preview__placeholder-icon' aria-hidden='true' />
                <p>轻触下方按钮，拍摄或上传器物影像</p>
                <span>拍现代之物，溯其古代雅称与千年流变</span>
              </div>
            )
          )}
        </section>

        {hint && <p className='image-capture-hint'>{hint}</p>}

        <section className='image-capture-actions'>
          <button
            type='button'
            className='image-capture-btn image-capture-btn--primary'
            onClick={handleTakePhoto}
            disabled={capturing}
          >
            <i className='iconfont icon-xiangji' aria-hidden='true' />
            {capturing ? '取景中…' : '拍照'}
          </button>
          <button
            type='button'
            className='image-capture-btn image-capture-btn--secondary'
            onClick={() => fileInputRef.current?.click()}
          >
            <i className='iconfont icon-shangchuan' aria-hidden='true' />
            上传图片
          </button>

          <input
            type='file'
            accept='image/*'
            ref={fileInputRef}
            onChange={handleImageUpload}
            hidden
          />
        </section>

        {children}
      </main>

      {/* 定格帧画布，仅用于拍照取样 */}
      <canvas ref={canvasRef} className='image-capture-canvas' aria-hidden='true' />
    </div>
  )
}
