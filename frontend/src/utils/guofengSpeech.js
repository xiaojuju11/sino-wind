export const GUOFENG_VOICES = Object.freeze({
  scholar: 'zh-CN-YunxiNeural',
  narrator: 'zh-CN-YunjianNeural',
  female: 'zh-CN-XiaoxiaoNeural'
})

export const VOICE_BY_SAGE = Object.freeze({
  liqingzhao: GUOFENG_VOICES.female,
  '李清照': GUOFENG_VOICES.female,
  suShi: GUOFENG_VOICES.scholar,
  '苏轼': GUOFENG_VOICES.scholar,
  libai: GUOFENG_VOICES.scholar,
  '李白': GUOFENG_VOICES.scholar,
  duFu: GUOFENG_VOICES.narrator,
  '杜甫': GUOFENG_VOICES.narrator,
  xinqiji: GUOFENG_VOICES.scholar,
  '辛弃疾': GUOFENG_VOICES.scholar
})

let currentAudio = null

export function voiceForSage(sage = '') {
  return VOICE_BY_SAGE[sage] || GUOFENG_VOICES.scholar
}

export function stopGuofengSpeech() {
  if (currentAudio) {
    currentAudio.pause?.()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
}

function playAudio(audio) {
  currentAudio = audio
  return new Promise((resolve, reject) => {
    const finish = () => { if (currentAudio === audio) currentAudio = null; resolve() }
    audio.addEventListener?.('ended', finish, { once: true })
    audio.addEventListener?.('error', () => reject(new Error('音频播放失败')), { once: true })
    Promise.resolve(audio.play()).catch(reject)
  })
}

export async function speakGuofeng({
  text,
  voice = GUOFENG_VOICES.scholar,
  rate = '-10%',
  signal,
  fallback,
  request = globalThis.fetch,
  audioFactory = url => new Audio(url)
} = {}) {
  if (!String(text || '').trim()) return
  stopGuofengSpeech()
  try {
    const response = await request('/api/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(text).trim(), voice, rate }),
      signal
    })
    if (!response.ok) throw new Error(`TTS ${response.status}`)
    const payload = await response.json()
    const audioUrl = payload?.data?.audioUrl || payload?.data?.url
    if (!audioUrl) throw new Error('TTS 音频地址缺失')
    await playAudio(audioFactory(audioUrl))
    return { mode: 'audio' }
  } catch (error) {
    if (error?.name === 'AbortError') return
    if (typeof fallback === 'function') {
      await fallback(String(text).trim())
      return { mode: 'fallback' }
    }
    else throw error
  }
}
