import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraOutline, CloseOutline, RedoOutline } from 'antd-mobile-icons'
import { cameraErrorMessage, captureCameraFrame, createCameraSession } from '../utils/sceneCamera'
import '../styles/sceneCamera.less'

export default function SceneCamera({ onClose, onCapture }) {
  const dialogRef = useRef(null), videoRef = useRef(null), active = useRef(false), facingRef = useRef('environment'), deviceRef = useRef(''), previewUrl = useRef(''), captureVersion = useRef(0)
  const [camera] = useState(() => createCameraSession(navigator.mediaDevices))
  const [phase, setPhase] = useState('opening'), [error, setError] = useState(''), [devices, setDevices] = useState([]), [facing, setFacing] = useState(''), [deviceId, setDeviceId] = useState(''), [photo, setPhoto] = useState(null)
  const [frameRatio, setFrameRatio] = useState('4 / 3')
  const close = useCallback(() => { active.current = false; camera.stop(); dialogRef.current?.close(); onClose() }, [camera, onClose])
  const connect = useCallback(async (options = { facing: facingRef.current }) => {
    let stream
    try {
      if (!window.isSecureContext) throw Error('Insecure context')
      stream = await camera.start(options)
      if (!stream || !active.current) return
      const video = videoRef.current
      video.srcObject = stream
      await video.play()
      if (!active.current || !camera.isCurrent(stream)) return
      const settings = stream.getVideoTracks()[0]?.getSettings() || {}
      if (video.videoWidth && video.videoHeight) setFrameRatio(`${video.videoWidth} / ${video.videoHeight}`)
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (active.current && camera.isCurrent(stream)) { camera.stop(); setError('摄像头已断开，请重新连接。'); setPhase('error') }
      }, { once: true })
      const mode = ['user', 'environment'].includes(settings.facingMode) ? settings.facingMode : ''
      facingRef.current = mode || options.facing || facingRef.current; deviceRef.current = settings.deviceId || ''
      setFacing(mode); setDeviceId(settings.deviceId || ''); setPhase('ready'); setError('')
      const list = await navigator.mediaDevices.enumerateDevices().catch(() => [])
      if (active.current && camera.isCurrent(stream)) setDevices(list.filter(device => device.kind === 'videoinput'))
    } catch (failure) {
      if (!active.current || (stream && !camera.isCurrent(stream))) return
      camera.stop(); if (videoRef.current) videoRef.current.srcObject = null
      setError(cameraErrorMessage(failure, window.isSecureContext)); setPhase('error')
    }
  }, [camera])
  useEffect(() => {
    active.current = true
    const dialog = dialogRef.current
    dialog.showModal()
    connect()
    const stopWhenHidden = () => { if (document.hidden) close() }
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () => {
      active.current = false; camera.stop(); dialog.close()
      document.removeEventListener('visibilitychange', stopWhenHidden)
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    }
  }, [camera, connect, close])
  function start(options) { setPhase('opening'); setError(''); connect(options) }
  function switchCamera() {
    const alternate = devices.find(device => device.deviceId && device.deviceId !== deviceRef.current)
    start(facing ? { facing: facing === 'user' ? 'environment' : 'user', exact: true } : alternate ? { deviceId: alternate.deviceId } : { facing: facingRef.current === 'user' ? 'environment' : 'user', exact: true })
  }
  async function takePhoto() {
    if (phase !== 'ready') return
    const version = ++captureVersion.current
    setPhase('capturing'); setError('')
    try {
      const pending = captureCameraFrame(videoRef.current)
      camera.stop(); videoRef.current.srcObject = null
      const blob = await pending
      if (!active.current || version !== captureVersion.current) return
      const url = URL.createObjectURL(blob); previewUrl.current = url
      setPhoto({ blob, url }); setPhase('photo')
    } catch (failure) { if (active.current && version === captureVersion.current) { camera.stop(); setError(failure.message); setPhase('error') } }
  }
  function retake() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = ''; setPhoto(null); start({ facing: facingRef.current })
  }
  function confirm() {
    if (!photo || phase !== 'photo') return
    const file = new File([photo.blob], `寻镜-${Date.now()}.jpg`, { type: 'image/jpeg' })
    camera.stop(); setPhase('done'); onCapture(file)
  }
  return <dialog ref={dialogRef} className='scene-camera' aria-labelledby='scene-camera-title' onCancel={event => { event.preventDefault(); close() }}>
    <header><div><small>取一镜山河</small><h2 id='scene-camera-title'>拍下眼前</h2></div><button type='button' className='scene-camera__close' aria-label='关闭相机' onClick={close}><CloseOutline /></button></header>
    <div className={`scene-camera__view${phase === 'photo' ? ' is-photo' : ''}`} style={{ aspectRatio: frameRatio }}>
      <video ref={videoRef} autoPlay playsInline muted className={facing === 'user' ? 'is-mirrored' : ''} hidden={phase !== 'ready' && phase !== 'opening'} aria-label='相机实时预览' onResize={event => { const video = event.currentTarget; if (video.videoWidth && video.videoHeight) setFrameRatio(`${video.videoWidth} / ${video.videoHeight}`) }} />
      {photo && <img src={photo.url} alt='刚拍摄的照片' />}
      {phase === 'opening' && <p className='scene-camera__status' role='status'>正在连接相机，请允许使用摄像头…</p>}
      {phase === 'capturing' && <p className='scene-camera__status' role='status'>正在定格山河…</p>}
      {phase === 'error' && <p className='scene-camera__status' role='alert'>{error}</p>}
    </div>
    {!photo && <div className='scene-camera__devices'><span>{facing === 'user' ? '前置取景' : facing === 'environment' ? '后置取景' : '相机取景'}</span>{devices.length > 1 && <select aria-label='选择摄像头' value={deviceId} disabled={phase === 'opening' || phase === 'capturing'} onChange={event => start({ deviceId: event.target.value })}>{devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `摄像头 ${index + 1}`}</option>)}</select>}</div>}
    <footer>{photo ? <><button type='button' onClick={retake}><RedoOutline />重拍一张</button><button type='button' className='scene-camera__primary' disabled={phase !== 'photo'} onClick={confirm}>就用此景</button></> : <><button type='button' disabled={phase === 'opening' || phase === 'capturing' || (devices.length === 1 && !facing)} title={devices.length === 1 && !facing ? '当前设备只检测到一个摄像头' : ''} onClick={switchCamera}><RedoOutline />切换前后镜头</button>{phase === 'error' ? <button type='button' className='scene-camera__primary' onClick={() => start({ facing: facingRef.current })}>重新连接</button> : <button type='button' className='scene-camera__primary' disabled={phase !== 'ready'} onClick={takePhoto}><CameraOutline />拍照留景</button>}</>}</footer>
  </dialog>
}
