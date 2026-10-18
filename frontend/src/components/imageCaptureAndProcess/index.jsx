import { useCallback, useRef, useState } from 'react'
import SceneCamera from '../SceneCamera'
import './index.less'
import { useNavigate } from 'react-router-dom'

/**
 * 图片采集器（成员 A / TRD v3.0 §2.2）
 * 职责：复用实时相机或从相册选择器物照片，压缩编码后交给 onRecognition 发起识物请求。
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

export default function ImageCaptureAndProcess({ onRecognition, children, previewImage = null, onClear = null }) {
  const [internalImage, setInternalImage] = useState(null)
  const selectedImage = previewImage || internalImage
  const [hint, setHint] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const closeCamera = useCallback(() => setCameraOpen(false), [])
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const submit = async (file) => {
    setHint('')
    let payload
    try {
      payload = await toRecognitionPayload(file)
    } catch {
      setHint('这张影像读取失败，请换一张再试。')
      return
    }
    setInternalImage(payload)
    if (onClear) onClear()
    onRecognition(payload)
  }

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0]
    if (file) submit(file)
    event.target.value = '' // 允许重复选取同一张图
  }

  const handleClear = () => {
    setInternalImage(null)
    setHint('')
    if (onClear) onClear()
  }

  return (
    <div className='image-capture-root'>
      <header className='image-capture-header'>
        <button type='button' className='image-capture-header__back' onClick={() => navigate(-1)} aria-label='返回'>
          <i className='iconfont icon-fanhui' aria-hidden='true' />
        </button>
        <h1 className='image-capture-header__title'>物溯古今 · 拍照识器</h1>
        <span style={{ width: '38px', flex: 'none' }} aria-hidden='true' />
      </header>

      <main className='image-capture-main'>
        <section className='image-capture-preview'>
          {
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
          }
        </section>

        {hint && <p className='image-capture-hint'>{hint}</p>}

        <section className='image-capture-actions'>
          <button
            type='button'
            className='image-capture-btn image-capture-btn--primary'
            onClick={() => setCameraOpen(true)}
          >
            <i className='iconfont icon-xiangji' aria-hidden='true' />
            拍照
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

      {cameraOpen && <SceneCamera title='拍下眼前器物' eyebrow='观物识古' confirmLabel='用这张识物' captureLabel='拍照识物' onClose={closeCamera} onCapture={file => { closeCamera(); submit(file) }} />}
    </div>
  )
}
