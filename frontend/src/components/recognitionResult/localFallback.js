/**
 * 物溯古今 · 拍照识器 —— 前端内置文博库兜底
 *
 * 依据 TRD v3.0 §10「弱网/断网离线应急预案」第二级：
 * 「服务端与前端均置入《广韵》《考工记》文博器物知识图谱，断网时秒级返回预置高保真数据」。
 * 因此前端保有一份与服务端同构的兜底条目，网络层完全不可达时也能立即出图出文。
 *
 * 兜底文案取自 TRD §4.4 的既有示例（保温杯 ➔ 宋代执壶 / 汤瓶）与 §3.1 的流变路线，不另行编造。
 */

export const FALLBACK_RECOGNITION = Object.freeze({
  name: '宋代执壶 / 青白瓷汤瓶',
  dynasty: '宋代',
  description:
    '此物在今世名曰「保温器皿」，溯其渊源，实乃唐宋文士点茶所用之「执壶」与「汤瓶」。' +
    '宋代点茶点汤、击拂之用，以器载茶事。' +
    '【流变考略】唐代金银执壶 ➔ 宋代影青汤瓶 ➔ 明代紫砂提梁 ➔ 当代真空器。',
  score: 0,
  audio_url: ''
})

export const OFFLINE_NOTICE =
  '网络不可达，本结果为内置文博库兜底推演，非真实图像识别。'

/** 组装与后端同形的响应体：code / data / degraded / source / notice */
export function buildFallbackResult() {
  return {
    code: 1,
    data: { ...FALLBACK_RECOGNITION },
    degraded: true,
    source: 'local-fallback',
    notice: OFFLINE_NOTICE
  }
}
