export function stopCameraStream(stream) {
  stream?.getTracks().forEach(track => track.stop())
}

// A permission prompt cannot be cancelled. Invalidate requests so a stream that
// arrives after closing/switching is stopped before it can reach the preview.
export function createCameraSession(mediaDevices) {
  let stream = null, generation = 0
  return {
    async start({ facing = 'environment', deviceId = '', exact = false } = {}) {
      const version = ++generation
      stopCameraStream(stream); stream = null
      if (!mediaDevices?.getUserMedia) throw Object.assign(Error('Camera unavailable'), { name: 'UnsupportedCameraError' })
      let next
      try {
        next = await mediaDevices.getUserMedia({ audio: false, video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: exact ? { exact: facing } : { ideal: facing } }),
          width: { ideal: 1920 }, height: { ideal: 1080 },
        } })
      } catch (error) { if (version !== generation) return null; throw error }
      if (version !== generation) { stopCameraStream(next); return null }
      stream = next; return next
    },
    isCurrent: candidate => stream === candidate,
    stop() { generation++; stopCameraStream(stream); stream = null },
  }
}

export function cameraErrorMessage(error, secure = true) {
  if (!secure) return '当前网址无法启用实时相机，请通过 HTTPS 打开此页；电脑本机可使用 localhost。'
  switch (error?.name) {
    case 'NotAllowedError': case 'SecurityError': return '相机权限未开启，请在浏览器的网站设置中允许使用摄像头后重新连接。'
    case 'NotFoundError': case 'OverconstrainedError': return '未找到所选摄像头，请选择其他镜头或重新连接。'
    case 'NotReadableError': case 'AbortError': return '摄像头可能被其他应用占用，请关闭其他相机应用后重新连接。'
    case 'UnsupportedCameraError': return '当前浏览器不支持实时相机，请使用手机系统浏览器或新版 Chrome、Edge 打开。'
    default: return '相机暂未连接，请重新连接或选择其他摄像头。'
  }
}

export function captureCameraFrame(video, createCanvas = () => document.createElement('canvas')) {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return Promise.reject(Error('画面尚未就绪，请稍候再拍。'))
  const canvas = createCanvas()
  const scale = Math.min(1, 2560 / Math.max(video.videoWidth, video.videoHeight))
  canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale)
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(Error('当前浏览器无法保存画面，请更换浏览器。'))
  // Save the full original frame, not the mirrored selfie preview or a CSS crop.
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('照片暂未生成，请重拍。')), 'image/jpeg', .92))
}
