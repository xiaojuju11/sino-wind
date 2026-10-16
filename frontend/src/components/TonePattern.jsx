import React, { useState } from 'react'

/**
 * 平仄声律谱（○ 平 · ● 仄 · △ 字表未收）
 *
 * 由 poemMetre.buildMetreReport() 的逐字平仄结果驱动：
 *  · 每字下方一个符号（○/●），点击可展开该字的判定依据
 *  · 每个字用 tone confidence 着色：字表判定=实色，普通话回退=浅色（如实区分可信度）
 *  · 句末韵脚单独标朱砂（押韵位置）
 *  · 每句右侧给出句式名与「替」的核验结果
 */
const TONE_CLASS = {
  level: 'is-level',
  oblique: 'is-oblique',
  unknown: 'is-unknown',
}

export default function TonePattern({ report, showConfidence = true }) {
  const [active, setActive] = useState(null) // { line, index }

  if (!report?.ok) return null

  return (
    <div className="tone-pattern">
      <div className="tone-pattern__legend">
        <span className="tone-pattern__legend-item is-level">○ 平</span>
        <span className="tone-pattern__legend-item is-oblique">● 仄</span>
        <span className="tone-pattern__legend-item is-unknown">△ 未收</span>
        {showConfidence && <span className="tone-pattern__legend-note">浅色 = 按普通话四声回退</span>}
      </div>

      <ol className="tone-pattern__lines">
        {report.lines.map((line) => {
          const isRhymeLine = report.rhyme.ends.some((e) => e.lineIndex === line.index && e.group)
          const lastIdx = line.tones.length - 1
          return (
            <li key={line.index} className="tone-pattern__line">
              <div className="tone-pattern__chars">
                {line.tones.map((t, i) => {
                  const isActive = active && active.line === line.index && active.index === i
                  return (
                    <button
                      key={`${line.index}-${i}-${t.ch}`}
                      type="button"
                      className={[
                        'tone-pattern__char',
                        TONE_CLASS[t.tone] || 'is-unknown',
                        t.confidence === 'modern' ? 'is-fallback' : '',
                        i === lastIdx && isRhymeLine ? 'is-rhyme' : '',
                        isActive ? 'is-active' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => setActive(isActive ? null : { line: line.index, index: i })}
                      aria-label={`${t.ch} ${t.tone === 'level' ? '平声' : t.tone === 'oblique' ? '仄声' : '未收'}`}
                    >
                      <span className="tone-pattern__glyph">{t.ch}</span>
                      <span className="tone-pattern__mark">
                        {t.tone === 'level' ? '○' : t.tone === 'oblique' ? '●' : '△'}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="tone-pattern__meta">
                <span className="tone-pattern__pattern">{line.patternName}</span>
                <span className={`tone-pattern__ti${line.ti.ok ? ' is-ok' : ' is-bad'}`}>
                  {line.ti.ok ? '替合' : '失替'}
                </span>
                {isRhymeLine && <span className="tone-pattern__rhyme-tag">韵</span>}
              </div>
            </li>
          )
        })}
      </ol>

      {active && (() => {
        const t = report.lines[active.line]?.tones[active.index]
        if (!t) return null
        return (
          <div className="tone-pattern__detail">
            <strong className="tone-pattern__detail-char">{t.ch}</strong>
            <span>
              判定：{t.tone === 'level' ? '平声' : t.tone === 'oblique' ? '仄声' : '字表未收'}
              {t.group ? ` · 平水韵【${t.group.name}】` : ''}
              {t.note ? ` · ${t.note}` : ''}
            </span>
            <span className="tone-pattern__detail-src">
              依据：{t.confidence === 'rhyme-book' ? '平水韵字表'
                : t.confidence === 'polyphone' ? '多音字（按格律取合律读音）'
                  : t.confidence === 'modern' ? '普通话四声回退（可能因入声而偏差）'
                    : '字表与普通话均未覆盖'}
            </span>
          </div>
        )
      })()}

      <div className="tone-pattern__summary">
        <span>替：{report.tiOk}/{report.tiTotal} 句合律</span>
        <span>对：{report.duiOk}/{report.duiTotal} 联合律</span>
        <span>粘：{report.nianOk}/{report.nianTotal} 处合律</span>
        <span>韵：{report.rhyme.mainGroupName || '未定'}</span>
        <span className="tone-pattern__compliance">综合合规 {report.compliance}%</span>
      </div>
      <p className="tone-pattern__note">{report.confidenceNote}</p>
    </div>
  )
}
