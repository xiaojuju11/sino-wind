import './index.less'
import { useRef, useState } from 'react'

/**
 * 物溯古今 · 识别结果（成员 A / TRD v3.0 §2.2、§3.1、§4.4）
 * 三大卡片：金石鉴赏（古物名称 / 朝代印章 / 品位鉴值）
 *          器物考释（详释：今物名称 ➔ 古代器物原型）
 *          文人品鉴心得（流变路线 + 语音试听播放器）
 * 字段口径（§3.1 ④）：{ name, dynasty, description, score, audio_url }
 * 兜底标注：服务端或前端兜底数据带 degraded，此处按「待考」呈现，不编造评价分数。
 */

const FLOW_MARK = '【流变考略】'

/** 器物考释与流变路线同在一段详释里，按 §4.4 既有的【流变考略】标记拆成两卡 */
function splitDescription(description) {
  const text = typeof description === 'string' ? description.trim() : ''
  const index = text.indexOf(FLOW_MARK)
  if (index < 0) return { interpretation: text, flow: '' }
  return {
    interpretation: text.slice(0, index).trim(),
    flow: text.slice(index + FLOW_MARK.length).trim()
  }
}

export default function RecognitionResult({ recognitionResult, pending = false }) {
  const data = recognitionResult?.data || {}
  const degraded = Boolean(recognitionResult?.degraded)
  const notice = recognitionResult?.notice
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const { interpretation, flow } = splitDescription(data.description)
  const hasAudio = Boolean(data.audio_url)

  const handleVoicePlay = () => {
    if (!hasAudio) return
    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
      return
    }
    audioRef.current?.play()
    setIsPlaying(true)
  }

  return (
    <div className='object-recognition-result'>
      {(degraded || pending) && (
        <p className='object-recognition-result__notice'>
          {pending ? '仍在等待真实工作流，先行展示内置文博库兜底推演。' : notice}
        </p>
      )}

      {/* ── 金石鉴赏 ── */}
      <section className='object-recognition-card'>
        <h2 className='object-recognition-card__title'>
          <i className='iconfont icon-zhanpin' aria-hidden='true' />
          金石鉴赏
        </h2>
        <div className='object-recognition-card__body'>
          <div className='object-recognition-result__name'>
            <h3>{data.name || '待考'}</h3>
            {data.dynasty && <span className='object-recognition-result__dynasty'>{data.dynasty}</span>}
          </div>
          <p className='object-recognition-result__score'>
            品位鉴值：
            {degraded
              ? '待考（兜底推演未评分）'
              : `${typeof data.score === 'number' ? data.score : 0} 分`}
          </p>
        </div>
      </section>

      {/* ── 器物考释 ── */}
      <section className='object-recognition-card'>
        <h2 className='object-recognition-card__title'>
          <i className='iconfont icon-shuben' aria-hidden='true' />
          器物考释
        </h2>
        <div className='object-recognition-card__body'>
          <p className='object-recognition-result__text'>{interpretation || '本次考释未返回详释。'}</p>
        </div>
      </section>

      {/* ── 文人品鉴心得与流变 ── */}
      <section className='object-recognition-card'>
        <h2 className='object-recognition-card__title'>
          <i className='iconfont icon-zhinan' aria-hidden='true' />
          文人品鉴心得
        </h2>
        <div className='object-recognition-card__body'>
          <p className='object-recognition-result__text'>
            {flow || '本次考释未附流变路线。'}
          </p>
          <div className='object-recognition-result__voice-row'>
            <button
              type='button'
              className={`object-recognition-result__voice${hasAudio ? '' : ' is-disabled'}`}
              onClick={handleVoicePlay}
              disabled={!hasAudio}
              aria-label='播放古风讲解语音'
            >
              <i className='iconfont icon-yinliang-F' aria-hidden='true' />
              <span>{hasAudio ? (isPlaying ? '试听中…' : '听讲解') : '无语音讲解'}</span>
            </button>
          </div>
        </div>
      </section>

      <p className='object-recognition-result__statement'>
        本功能为国风趣味科普推演与文脉流变研习，非严谨考古鉴定工具。
      </p>

      <audio
        ref={audioRef}
        src={data.audio_url || undefined}
        preload='none'
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />
    </div>
  )
}

/** 加载态：宣纸灰骨架占位（AC-A1 的 Loading 动画，避免与版式脱节的圆形转圈） */
export function RecognitionSkeleton() {
  return (
    <div className='object-recognition-skeleton' role='status' aria-live='polite'>
      <div className='object-recognition-skeleton__card'>
        <span className='object-recognition-skeleton__line object-recognition-skeleton__line--title' />
        <span className='object-recognition-skeleton__line' />
        <span className='object-recognition-skeleton__line object-recognition-skeleton__line--short' />
      </div>
      <div className='object-recognition-skeleton__card'>
        <span className='object-recognition-skeleton__line object-recognition-skeleton__line--title' />
        <span className='object-recognition-skeleton__line' />
        <span className='object-recognition-skeleton__line' />
      </div>
      <p className='object-recognition-skeleton__hint'>正在考释器物源流…</p>
    </div>
  )
}
