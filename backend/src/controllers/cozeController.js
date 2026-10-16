const axios = require('axios')
const db = require('../config/db')
require('dotenv').config({ path: ['.env.local', '.env'] })

/**
 * 物溯古今 · 拍照识器网关（成员 A / TRD v3.0 §3.1、§4.4）
 *   POST /api/coze/recognition
 * 上游：COZE_ENDPOINT 指定的工作流（视觉识别 ➔ 古物推演 ➔ 结构化输出）
 * 输出字段（TRD §3.1 ④）：{ name, dynasty, description, score, audio_url }
 * 请求失败时返回明确错误；不把固定示例作为本次图像的识别结果。
 */

const COZE_ENDPOINT = process.env.COZE_ENDPOINT || 'https://r85vf8qf77.coze.site/run'
const COZE_TIMEOUT = parseInt(process.env.COZE_TIMEOUT, 10) || 60000
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function parseResult(payload) {
  let value = payload
  for (let i = 0; i < 5; i++) {
    if (typeof value === 'string') { value = JSON.parse(value); continue }
    if (value && typeof value === 'object' && typeof value.name === 'string') break
    value = value?.data ?? value?.output ?? value?.result
  }
  if (!value || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 100 ||
      typeof value.dynasty !== 'string' || !value.dynasty.trim() || value.dynasty.length > 100 ||
      typeof value.description !== 'string' || !value.description.trim() || value.description.length > 20000 ||
      typeof value.score !== 'number' || !Number.isFinite(value.score) || value.score < 0 || value.score > 100) throw new Error('Invalid recognition response')
  // TTS 讲解音频（TRD §3.1 ③）：只接受 http(s) 直链，缺失时置空字符串，不伪造资源地址
  const audioUrl = typeof value.audio_url === 'string' && /^https?:\/\//.test(value.audio_url.trim())
    ? value.audio_url.trim().slice(0, 2000)
    : ''
  return { name: value.name, dynasty: value.dynasty, description: value.description, score: value.score, audio_url: audioUrl }
}

function failure(ctx, status, error, message) {
  ctx.status = status
  ctx.body = { code: 0, error, message, source: 'coze' }
}

async function recognition(ctx) {
  const { img } = ctx.request.body || {}
  if (typeof img !== 'string' || img.length > 14 * 1024 * 1024 || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(img)) {
    ctx.status = 400; ctx.body = { code: 0, message: '请上传有效的 JPEG、PNG 或 WebP 图片（不超过 10MB）' }; return
  }
  const encoded = img.slice(img.indexOf(',') + 1)
  const imageBytes = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0)
  if (encoded.length % 4 !== 0 || imageBytes > MAX_IMAGE_BYTES) { ctx.status = 400; ctx.body = { code: 0, message: '图片编码无效或超过 10MB' }; return }
  const apiKey = process.env.COZE_API_TOKEN || process.env.COZE_IMAGE_TO_TEXT_AND_VOICE || process.env.VITE_COZE_IMAGE_TO_TEXT_AND_VOICE
  if (!apiKey) {
    failure(ctx, 503, 'COZE_NOT_CONFIGURED', '识物服务尚未配置，暂时无法识别图片，请联系管理员。')
    return
  }
  let data
  let receivedResponse = false
  try {
    const response = await axios.post(COZE_ENDPOINT, { image: img }, {
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      timeout: COZE_TIMEOUT, signal: AbortSignal.timeout(COZE_TIMEOUT), maxContentLength: 10 * 1024 * 1024
    })
    receivedResponse = true
    data = parseResult(response.data)
  } catch (err) {
    const status = err?.response?.status
    console.error('[Coze Recognition Error]', { code: err?.code, status, phase: receivedResponse ? 'parse' : 'request' })
    if (receivedResponse) {
      failure(ctx, 502, 'COZE_INVALID_RESPONSE', '识物服务返回的考释格式异常，本次未能完成识别，请重试。')
    } else if (['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'].includes(err?.code)) {
      failure(ctx, 504, 'COZE_TIMEOUT', '图片识别超时，本次尚未取得结果，请重试。')
    } else if (status === 401 || status === 403) {
      failure(ctx, 502, 'COZE_AUTH_FAILED', '识物服务授权失效，请联系管理员更新配置。')
    } else if (status === 429) {
      failure(ctx, 503, 'COZE_RATE_LIMITED', '识物服务当前繁忙，请稍后重试。')
    } else {
      failure(ctx, 502, 'COZE_UNAVAILABLE', '暂时无法连接识物服务，本次未能完成识别，请稍后重试。')
    }
    return
  }
  try {
    if (ctx.userId) {
      await db.execute('UPDATE users SET appraise_count = COALESCE(appraise_count, 0) + 1 WHERE id = ?', [ctx.userId])
    }
    ctx.body = { code: 1, data }
  } catch (dbErr) {
    console.warn('⚠️ [Coze Appraise Count Update Warning]:', dbErr?.message)
    // 计数失败不丢弃已拿到的识别结果，只提示未计入书斋看板
    ctx.body = { code: 1, data, notice: '识物记录暂未计入书斋看板' }
  }
}

module.exports = { recognition }
