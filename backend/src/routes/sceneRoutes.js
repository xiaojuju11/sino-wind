const Router = require('koa-router')
const { Worker } = require('node:worker_threads')
const path = require('node:path')
const fs = require('node:fs')
const sharp = require('sharp')
const { root, segmentationModel } = require('../utils/sceneModelConfig')
const router = new Router({ prefix: '/api/scene' })
let worker = null, busy = false
const available = () => segmentationModel().available

router.get('/status', ctx => {
  ctx.body = { code: 1, data: { available: available(), busy, model: segmentationModel().name, depthAvailable: fs.existsSync(path.join(root, 'depth/onnx/model_quantized.onnx')) } }
})

router.post('/analyze', async ctx => {
  const image = ctx.request.body?.image
  if (typeof image !== 'string' || image.length > 6 * 1024 * 1024 || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) {
    ctx.status = 400; ctx.body = { code: 0, message: '请选择 4MB 以内的 JPEG、PNG 或 WebP 照片。' }; return
  }
  if (!available()) { ctx.status = 503; ctx.body = { code: 0, message: '识景模型尚未准备好，可先手动圈选景物。' }; return }
  if (busy) { ctx.status = 429; ctx.body = { code: 0, message: '正在展读另一幅风景，请稍后再试。' }; return }
  busy = true
  try {
    try {
      const meta = await sharp(Buffer.from(image.split(',')[1], 'base64'), { limitInputPixels: 16000000 }).metadata()
      if (!meta.width || !meta.height || !['jpeg', 'png', 'webp'].includes(meta.format)) throw new Error('Invalid image')
    } catch { ctx.status = 400; ctx.body = { code: 0, message: '照片无法读取或像素过大，请换一张图片。' }; return }
    const data = await new Promise((resolve, reject) => {
      worker ||= new Worker(path.join(__dirname, '../utils/sceneWorker.cjs'))
      const current = worker
      const finish = (error, data) => {
        clearTimeout(timer); ctx.res.off('close', closed)
        current.off('message', received); current.off('error', failed); current.off('exit', exited)
        if (error) { worker = null; void current.terminate(); reject(error) } else resolve(data)
      }
      const received = result => result.error ? finish(new Error('模型暂未完成识景，请重试或手动圈选。')) : finish(null, result.data)
      const failed = () => finish(new Error('识景服务暂不可用，请重试。'))
      const exited = () => finish(new Error('识景服务已中断，请重试。'))
      const closed = () => finish(new Error('本次识景已取消。'))
      const timer = setTimeout(() => finish(new Error('识景超时，请缩小图片后重试。')), 90000)
      ctx.res.once('close', closed)
      current.once('message', received); current.once('error', failed); current.once('exit', exited)
      current.postMessage({ image })
    })
    ctx.body = { code: 1, data }
  } catch (error) { ctx.status = 503; ctx.body = { code: 0, message: error.message } }
  finally { busy = false }
})
module.exports = router
