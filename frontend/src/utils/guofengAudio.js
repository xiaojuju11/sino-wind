// ════════════════════════════════════════════════════
//  云山竹简 · 华风雅韵 —— Web Audio 纯算法合成国风微交互声效
//  特点：零外部音频资源下载、零网络延迟、零版权侵权风险
// ════════════════════════════════════════════════════

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass()
    } catch {
      return null
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * 移动端触觉微震动反馈（国风金石手感）
 */
export function triggerHaptic(pattern = 15) {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      // 降级静音处理
    }
  }
}

/**
 * 1. 落砚盖章音效（厚重温润，墨滴入砚或朱砂落款）
 */
export function playInkDropSound() {
  triggerHaptic(18)
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(145, now)
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.16)

    gain.gain.setValueAtTime(0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.19)
  } catch {
    // 降级静音处理
  }
}

/**
 * 2. 编钟清磬之声（金石清越，飞花合律与先贤应令）
 */
export function playChimeSound() {
  triggerHaptic([15, 30, 15])
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // 基频 (A5 ~ 880Hz) 与高次泛音 (1760Hz)
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)
    osc1.frequency.exponentialRampToValueAtTime(876, now + 0.8)

    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1760, now)
    osc2.frequency.exponentialRampToValueAtTime(1752, now + 0.6)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 1.12)
    osc2.stop(now + 1.12)
  } catch {
    // 降级静音处理
  }
}

/**
 * 3. 丝帛展卷沙沙声（古典宣纸缓缓铺展）
 */
export function playSilkScrollSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // 生成微量带通滤波白噪音模拟宣纸微细摩擦
    const bufferSize = Math.floor(ctx.sampleRate * 0.22)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1200, now)
    filter.Q.setValueAtTime(1.5, now)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + 0.23)
  } catch {
    // 降级静音处理
  }
}
