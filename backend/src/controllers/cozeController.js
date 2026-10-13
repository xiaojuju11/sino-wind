const axios = require('axios')
const db = require('../config/db')
require('dotenv').config({ path: ['.env.local', '.env'] })

/**
 * 物溯古今 · 拍照识器网关（成员 A / TRD v3.0 §3.1、§4.4）
 *   POST /api/coze/recognition
 * 上游：Coze 智能工作流 https://r85vf8qf77.coze.site/run（视觉识别 ➔ 古物推演 ➔ TTS ➔ 结构化输出）
 * 输出字段（TRD §3.1 ④）：{ name, dynasty, description, score, audio_url }
 * 容灾（TRD §3.1 末条、§10 第二级）：无 Token、超时、网络异常或上游返回不可解析时，
 * 秒级返回内置高保真文博库兜底推演（code:1 + degraded:true），演示永不断流。
 */

const COZE_ENDPOINT = 'https://r85vf8qf77.coze.site/run'
const COZE_TIMEOUT = 20000 // 放宽至 20 秒，保障真实大模型多节点工作流（视觉+流变+TTS）完整执行
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

// 内置文博库兜底条目：文案取自 TRD §4.4 的既有示例（保温杯 ➔ 宋代执壶 / 汤瓶）与 §3.1 的流变路线。
// score 在兜底条目里置 0 并标记 degraded，前端按「品位鉴值待考」呈现，不编造评价分数（DESIGN.md R4）。
const FALLBACK_RECOGNITION = Object.freeze({
  name: '宋代执壶 / 青白瓷汤瓶',
  dynasty: '宋代',
  description:
    '此物在今世名曰「保温器皿」，溯其渊源，实乃唐宋文士点茶所用之「执壶」与「汤瓶」。' +
    '宋代点茶点汤、击拂之用，以器载茶事。' +
    '【流变考略】唐代金银执壶 ➔ 宋代影青汤瓶 ➔ 明代紫砂提梁 ➔ 当代真空器。',
  score: 0,
  audio_url: ''
})

const OFFLINE_NOTICE =
  '当前未接入 Coze 工作流（缺少 Token 或服务不可达），本响应为内置文博库兜底推演，非真实图像识别。'

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

function fallbackBody() {
  return {
    code: 1,
    data: { ...FALLBACK_RECOGNITION },
    degraded: true,
    source: 'local-fallback',
    notice: OFFLINE_NOTICE
  }
}

async function recognition(ctx) {
  const { img } = ctx.request.body || {}
  if (typeof img !== 'string' || img.length > 14 * 1024 * 1024 || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(img)) {
    ctx.status = 400; ctx.body = { code: 0, message: '请上传有效的 JPEG、PNG 或 WebP 图片（不超过 10MB）' }; return
  }
  const encoded = img.slice(img.indexOf(',') + 1)
  const imageBytes = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0)
  if (encoded.length % 4 !== 0 || imageBytes > MAX_IMAGE_BYTES) { ctx.status = 400; ctx.body = { code: 0, message: '图片编码无效或超过 10MB' }; return }
  const apiKey = process.env.COZE_IMAGE_TO_TEXT_AND_VOICE || process.env.VITE_COZE_IMAGE_TO_TEXT_AND_VOICE
  if (!apiKey) { ctx.body = fallbackBody(); return }
  let data
  try {
    const response = await axios.post(COZE_ENDPOINT, { image: img }, {
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      timeout: COZE_TIMEOUT, signal: AbortSignal.timeout(COZE_TIMEOUT), maxContentLength: 10 * 1024 * 1024
    })
    data = parseResult(response.data)
  } catch {
    // 超时、DNS / 网络异常、上游不可解析：一律降级为内置文博库兜底，不向页面抛错
    ctx.body = fallbackBody()
    return
  }
  try {
    const [result] = await db.execute('UPDATE users SET appraise_count = COALESCE(appraise_count, 0) + 1 WHERE id = ?', [ctx.userId])
    if (result.affectedRows !== 1) { ctx.status = 401; ctx.body = { code: 0, message: '请重新入席' }; return }
    ctx.body = { code: 1, data }
  } catch {
    // 计数失败不丢弃已拿到的识别结果，只提示未计入书斋看板
    ctx.body = { code: 1, data, notice: '识物记录暂未计入书斋看板' }
  }
}

module.exports = { recognition }
