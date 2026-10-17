import { rhymeGroupOf, toToneArray, identifyPattern, checkTi, TONE_SYMBOL } from './poemMetre.js'

export function analyzeTurnMetre(rawLine) {
  const clean = typeof rawLine === 'string' ? rawLine.replace(/[^\u4e00-\u9fa5]/g, '') : ''
  if (!clean) return null
  const lastChar = clean.slice(-1), group = rhymeGroupOf(lastChar), tones = toToneArray(clean)
  const unknownCharacters = tones.filter(t => t.tone === 'unknown').map(t => t.ch)
  const modernCharacters = tones.filter(t => t.confidence === 'modern').map(t => t.ch)
  const verified = Boolean(group) && !unknownCharacters.length && !modernCharacters.length
  const ti = checkTi(tones)
  return {
    lastChar, unknownCharacters, modernCharacters, verified,
    rhymeName: group?.name ? `${group.name}韵` : '韵部待核',
    rhymeTone: group ? group.tone === 'level' ? '平声' : '仄声' : '待核',
    toneNotation: tones.map(t => t.tone === 'level' ? '平' : t.tone === 'oblique' ? '仄' : '？').join(''),
    toneSymbols: tones.map(t => TONE_SYMBOL[t.tone] || '△').join(''),
    patternName: identifyPattern(tones)?.name || '句式待核',
    tiStatus: !verified ? '含待核读音' : !ti.checked ? '字数不足，未校验替节' : ti.ok ? '替节相符' : '替节不符',
    verdict: verified ? '字表与句内替节分析 · 多音字仍需结合语境' : '待核：部分字音或韵部未确认',
  }
}
