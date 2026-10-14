import './index.less'
import { useEffect, useRef, useState } from 'react'
import { AddOutline } from 'antd-mobile-icons'
import { Toast } from 'antd-mobile'
import axios from '../../http'

/**
 * 物溯古今 · 识别结果（成员 A / TRD v3.0 §2.2、§3.1、§4.4）
 * 三大卡片：金石鉴赏（古物名称 / 朝代印章 / 品位鉴值）
 *          器物考释（详释：今物名称 ➔ 古代器物原型）
 *          文人品鉴心得（流变路线 + 语音试听播放器）
 * 字段口径（§3.1 ④）：{ name, dynasty, description, score, audio_url }
 * 兜底标注：服务端或前端兜底数据带 degraded，此处按「待考」呈现，不编造评价分数。
 */

/** 器物考释与流变路线智能拆分：兼容多种流变考略标识 */
function splitDescription(description) {
  const text = typeof description === 'string' ? description.trim() : ''
  const regex = /(?:【流变考略】|\[流变考略\]|流变考略[：:]?)/
  const match = text.match(regex)
  if (!match) {
    const arrowIdx = text.search(/(?:唐代|宋代|明代|清代|当代).*?[➔\->→]/)
    if (arrowIdx > 0) {
      return {
        interpretation: text.slice(0, arrowIdx).trim(),
        flow: text.slice(arrowIdx).trim()
      }
    }
    return { interpretation: text, flow: '' }
  }
  return {
    interpretation: text.slice(0, match.index).trim(),
    flow: text.slice(match.index + match[0].length).trim()
  }
}

export default function RecognitionResult({ recognitionResult, pending = false }) {
  const data = recognitionResult?.data || {}
  const degraded = Boolean(recognitionResult?.degraded)
  const notice = recognitionResult?.notice
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [saving, setSaving] = useState(false), [saved, setSaved] = useState(false)
  const artifactId = useRef(null), saveLock = useRef(false)
  const saveArtifact = async () => {
    if (saveLock.current || saved || pending) return
    if (!localStorage.getItem('token')) { Toast.show({ content: '请先登录再收入宝鉴' }); return }
    saveLock.current = true; setSaving(true)
    artifactId.current ||= crypto.randomUUID()
    try {
      await axios.post('/api/deepseek/scholar/artifacts', { id: artifactId.current, name: data.name || '待考器物', dynasty: data.dynasty || '', description: data.description || '本次记录未附考释。', score: data.score, degraded }, { timeout: 10000 })
      setSaved(true); Toast.show({ content: '已收入宝鉴，可前往知音携物入席' })
    } catch { Toast.show({ content: '尚未保存，请稍后重试' }) }
    finally { saveLock.current = false; setSaving(false) }
  }

  const { interpretation, flow } = splitDescription(data.description)
  const hasAudio = Boolean(data.audio_url)

  // 离开页面时停止所有音频
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // 本地浏览器古雅朗诵兜底（确保设备静音拦截或跨域异常时 100% 有声音）
  const playWithSpeechSynthesis = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const textToRead = `${data.name || '此物'}。${interpretation}。${flow}`
      const utter = new SpeechSynthesisUtterance(textToRead)
      utter.lang = 'zh-CN'
      utter.rate = 0.85
      utter.pitch = 0.96
      utter.onstart = () => setIsPlaying(true)
      utter.onend = () => setIsPlaying(false)
      utter.onerror = () => setIsPlaying(false)
      window.speechSynthesis.speak(utter)
    } else {
      setIsPlaying(false)
    }
  }

  const handleVoicePlay = () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause()
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      setIsPlaying(false)
      return
    }
    if (hasAudio && audioRef.current) {
      // 优先播放 Coze 生成的高清文人 MP3 语音
      audioRef.current.currentTime = 0
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true)
          })
          .catch((err) => {
            console.warn('[Audio Play blocked or failed, fallback to SpeechSynthesis]:', err)
            playWithSpeechSynthesis()
          })
      } else {
        setIsPlaying(true)
      }
    } else {
      playWithSpeechSynthesis()
    }
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
              className='object-recognition-result__voice'
              onClick={handleVoicePlay}
              aria-label='播放古风文人讲解语音'
              title='点击播放或暂停'
            >
              <i className='iconfont icon-yinliang-F' aria-hidden='true' />
              <span>{isPlaying ? '暂停讲解' : (hasAudio ? '听文人讲解' : '听品鉴吟诵')}</span>
            </button>
          </div>
        </div>
      </section>

      <p className='object-recognition-result__statement'>
        本功能为国风趣味科普推演与文脉流变研习，非严谨考古鉴定工具。
      </p>
      <button type='button' className='object-recognition-result__voice' disabled={pending || saving || saved} onClick={saveArtifact}>
        <AddOutline /> {saved ? '已收入宝鉴' : saving ? '正在入藏…' : pending ? '待考释结束后入藏' : '收入宝鉴'}
      </button>

      <audio
        ref={audioRef}
        src={data.audio_url || undefined}
        preload='auto'
        crossOrigin='anonymous'
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={(e) => {
          console.warn('[Audio Playback Error, triggering fallback]:', e)
          setIsPlaying(false)
        }}
      />
    </div>
  )
}

/** 加载态：两宋宣纸灰骨架占位 + 动态考释阶段提示 */
export function RecognitionSkeleton() {
  const [stepIndex, setStepIndex] = useState(0)

  const steps = [
    '【1/4 辨物】大模型正在考释画卷器形与材质…',
    '【2/4 溯源】文史大模型翻阅典籍，推演唐宋明演变脉络…',
    '【3/4 赋词】两宋先贤拟文人品鉴长文，评定雅士品位…',
    '【4/4 雅诵】生成专属文人品鉴讲解音频…',
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev))
    }, 4500)
    return () => clearInterval(timer)
  }, [])

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
      <div className='object-recognition-skeleton__step-box'>
        <span className='object-recognition-skeleton__pulse' />
        <p className='object-recognition-skeleton__hint'>{steps[stepIndex]}</p>
      </div>
    </div>
  )
}
