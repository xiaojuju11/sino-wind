const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const { Communicate } = require('edge-tts.js')

const CACHE_DIR = path.resolve(__dirname, '../../public/tts-cache')
const MAX_TEXT_LENGTH = 500
const VALID_VOICES = new Set([
  'zh-CN-YunxiNeural',
  'zh-CN-YunjianNeural',
  'zh-CN-XiaoxiaoNeural'
])
const FEMALE_POETS = /李清照|鱼玄机|朱淑真|薛涛|班婕妤|蔡琰|柳如是/
const inFlightTasks = new Map()

fs.mkdirSync(CACHE_DIR, { recursive: true })

function resolveVoice(author = '', preferredVoice = '') {
  if (preferredVoice && VALID_VOICES.has(preferredVoice)) return preferredVoice
  return FEMALE_POETS.test(String(author)) ? 'zh-CN-XiaoxiaoNeural' : 'zh-CN-YunxiNeural'
}

function validateRequest({ text, voice = '' } = {}) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('朗读文本不能为空')
  if ([...text].length > MAX_TEXT_LENGTH) throw new Error(`朗读文本不能超过${MAX_TEXT_LENGTH}字`)
  if (voice && !VALID_VOICES.has(voice)) throw new Error('不支持的国风音色')
  return { text: text.trim(), voice: voice || 'zh-CN-YunxiNeural' }
}

function createCacheKey({ text, voice, rate = '-10%' }) {
  return crypto.createHash('sha256').update(`${voice}\0${rate}\0${text}`).digest('hex')
}

async function synthesizeSpeech({ text, voice = '', rate = '-10%' } = {}) {
  const request = validateRequest({ text, voice })
  const selectedVoice = request.voice
  const cacheKey = createCacheKey({ text: request.text, voice: selectedVoice, rate })
  const fileName = `${cacheKey}.mp3`
  const filePath = path.join(CACHE_DIR, fileName)
  const audioUrl = `/tts-cache/${fileName}`

  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 500) {
    return { audioUrl, url: audioUrl, cacheKey, voice: selectedVoice, cached: true }
  }
  if (inFlightTasks.has(cacheKey)) return inFlightTasks.get(cacheKey)

  const task = (async () => {
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
    try {
      const communicate = new Communicate(request.text, selectedVoice)
      await communicate.save(tempPath)
      if (!fs.existsSync(tempPath) || fs.statSync(tempPath).size <= 500) {
        throw new Error('音频文件生成异常')
      }
      await fs.promises.rename(tempPath, filePath)
      return { audioUrl, url: audioUrl, cacheKey, voice: selectedVoice, cached: false }
    } finally {
      if (fs.existsSync(tempPath)) await fs.promises.rm(tempPath, { force: true })
      inFlightTasks.delete(cacheKey)
    }
  })()
  inFlightTasks.set(cacheKey, task)
  return task
}

async function synthesizePoemTTS({ text = '', title = '', author = '', voice = '', rate = '-10%' } = {}) {
  let content = String(text || '').trim()
  if (title && !content.startsWith(`《${title}》`)) {
    content = `《${title}》。${author ? `${author}。` : ''}${content}`
  }
  return synthesizeSpeech({ text: content, voice: resolveVoice(author, voice), rate })
}

module.exports = {
  MAX_TEXT_LENGTH,
  VALID_VOICES,
  resolveVoice,
  validateRequest,
  createCacheKey,
  synthesizeSpeech,
  synthesizePoemTTS
}
