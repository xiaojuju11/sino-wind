import './index.less'
import { useEffect, useRef, useState } from 'react'
import { Toast } from 'antd-mobile'
import axios from '../../http'
import { playInkDropSound } from '../../utils/guofengAudio'

/**
 * 物溯古今 · 识别结果（郑小君 · 视觉体系与前端雅言吟诵闭环）
 * 核心卡片：
 *   1. 金石鉴赏：古物名称 / 朝代印章 / 专属博古鉴藏朱批印章（品位分值与雅级）
 *   2. 器物考释：详释今物名称 ➔ 古代器物原型
 *   3. 文人品鉴心得：流变路线 + 【先贤雅音吟诵器】（Web Speech API 毫秒级原生驱动，水墨声波微澜动效）
 *   4. 收入宝鉴：一键收入文士个人书斋物溯宝鉴
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

/** 依据品位鉴值得出品评雅级标签 */
function getScoreRank(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return { tag: '待考', desc: '文脉推演中' }
  if (score >= 90) return { tag: '神品', desc: '天工开物 · 极尽高古典雅' }
  if (score >= 80) return { tag: '妙品', desc: '格调清奇 · 深契文人雅怀' }
  if (score >= 70) return { tag: '能品', desc: '器以载道 · 匠心工巧可鉴' }
  if (score > 0) return { tag: '逸品', desc: '别出机杼 · 独具古今流韵' }
  return { tag: '待考', desc: '典库推演中' }
}

export default function RecognitionResult({ recognitionResult, pending = false }) {
  const data = recognitionResult?.data || {}
  const degraded = Boolean(recognitionResult?.degraded)
  const isExample = recognitionResult?.source === 'preset-specimen'
  const notice = recognitionResult?.notice
  const audioRef = useRef(null)

  // 语音播放控制状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [voiceMode, setVoiceMode] = useState('male') // 'male' (名士雅韵) | 'female' (清词婉约)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const artifactId = useRef(null)
  const saveLock = useRef(false)

  const { interpretation, flow } = splitDescription(data.description)
  const hasAudioUrl = Boolean(data.audio_url && /^https?:\/\//.test(data.audio_url))
  const rank = isExample ? { tag: '研习', desc: '内置案例 · 不作识别评分' } : getScoreRank(data.score)

  // 收入宝鉴功能
  const saveArtifact = async () => {
    if (saveLock.current || saved || pending || isExample) return
    if (!localStorage.getItem('token')) {
      Toast.show({ content: '请先登录，方可收入书斋物溯宝鉴' })
      return
    }
    saveLock.current = true
    setSaving(true)
    artifactId.current ||= crypto.randomUUID()
    try {
      await axios.post(
        '/api/deepseek/scholar/artifacts',
        {
          id: artifactId.current,
          name: data.name || '待考器物',
          dynasty: data.dynasty || '',
          description: data.description || '本次记录未附考释。',
          score: data.score,
          degraded
        },
        { timeout: 10000 }
      )
      setSaved(true)
      playInkDropSound()
      Toast.show({ content: '已收入书斋物溯宝鉴，可前往知音携物入席', icon: 'success' })
    } catch {
      Toast.show({ content: '尚未保存，请稍候重试' })
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }

  // 页面离开时彻底停止所有音频与合成语音
  useEffect(() => {
    const audioEl = audioRef.current
    return () => {
      if (audioEl) {
        audioEl.pause()
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Web Speech 雅言吟诵引擎（调校中文字符、语速、音调）
  const playWithSpeechSynthesis = (targetVoiceMode = voiceMode) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      Toast.show({ content: '当前浏览器未开启语音合成能力' })
      setIsPlaying(false)
      return
    }

    window.speechSynthesis.cancel()

    // 剔除技术符号与标记，确保吟诵宛如名士当面徐徐道来
    const cleanInterp = (interpretation || '').replace(/[【】[\]➔→-]/g, ' ')
    const cleanFlow = (flow || '').replace(/[➔→-]/g, '，流变为：')
    const textToRead = `${data.name || '此物'}，源自${data.dynasty || '古代'}。${cleanInterp}。文人流变脉络：${cleanFlow}`

    const utter = new SpeechSynthesisUtterance(textToRead)
    utter.lang = 'zh-CN'

    // 获取系统已安装的中文配音
    const voices = window.speechSynthesis.getVoices()
    const zhVoices = voices.filter(v => v.lang.includes('zh') || v.lang.includes('cmn') || v.lang.includes('CN'))

    if (targetVoiceMode === 'male') {
      // 名士雅韵：沉雄从容、语速稍缓、抑扬顿挫
      utter.rate = 0.84
      utter.pitch = 0.90
      const maleVoice = zhVoices.find(v => /Yunxi|Kangkang|Danny|Male|男/i.test(v.name)) || zhVoices[0]
      if (maleVoice) utter.voice = maleVoice
    } else {
      // 清词婉约：温润空灵、轻柔徐缓
      utter.rate = 0.88
      utter.pitch = 1.06
      const femaleVoice = zhVoices.find(v => /Xiaoxiao|Yaoyao|Huihui|Female|女/i.test(v.name)) || zhVoices[0]
      if (femaleVoice) utter.voice = femaleVoice
    }

    utter.onstart = () => setIsPlaying(true)
    utter.onend = () => setIsPlaying(false)
    utter.onerror = (e) => {
      console.warn('[Web Speech synthesis error]:', e)
      setIsPlaying(false)
    }

    window.speechSynthesis.speak(utter)
  }

  // 播放/暂停总控
  const handleVoicePlay = () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause()
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      setIsPlaying(false)
      return
    }

    // 若有上游外部音频直链，优先播放音频直链；否则 100% 呼起 Web Speech 雅音引擎
    if (hasAudioUrl && audioRef.current) {
      audioRef.current.currentTime = 0
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('[Audio Play blocked, fallback to Web Speech]:', err)
            playWithSpeechSynthesis()
          })
      } else {
        setIsPlaying(true)
      }
    } else {
      playWithSpeechSynthesis()
    }
  }

  // 切换音色模式
  const handleToggleVoiceMode = (mode) => {
    setVoiceMode(mode)
    if (isPlaying) {
      playWithSpeechSynthesis(mode)
    }
  }

  return (
    <div className='object-recognition-result'>
      {(degraded || pending || isExample) && (
        <p className='object-recognition-result__notice'>
          {pending ? '仍在等待真实工作流，先行呈现典库文脉推演。' : notice}
        </p>
      )}

      {/* ── ① 金石鉴赏：名物考据 + 朱批博古鉴藏章 ── */}
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

          {/* 专属国风朱批博古鉴藏印章 */}
          <div className='scholar-appraise-seal'>
            <div className='scholar-appraise-seal__inner'>
              <div className='scholar-appraise-seal__badge'>
                <span className='scholar-appraise-seal__label'>{isExample ? '内置案例' : '趣味品评'}</span>
                <span className='scholar-appraise-seal__value'>
                  {isExample ? '研习' : degraded ? '待考' : `${typeof data.score === 'number' ? data.score : 0}`}
                </span>
                {!degraded && !isExample && <span className='scholar-appraise-seal__unit'>分</span>}
              </div>
              <div className='scholar-appraise-seal__rank'>
                <div className='scholar-appraise-seal__tag'>{rank.tag}</div>
                <div className='scholar-appraise-seal__desc'>{rank.desc}</div>
              </div>
              <div className='scholar-appraise-seal__stamp'>
                <span>博古</span>
                <span>珍赏</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ② 器物考释：今昔文脉渊源 ── */}
      <section className='object-recognition-card'>
        <h2 className='object-recognition-card__title'>
          <i className='iconfont icon-shuben' aria-hidden='true' />
          器物考释
        </h2>
        <div className='object-recognition-card__body'>
          <p className='object-recognition-result__text'>{interpretation || '本次考释未返回详释。'}</p>
        </div>
      </section>

      {/* ── ③ 文人品鉴心得：流变脉络 + 【先贤雅音吟诵器】 ── */}
      <section className='object-recognition-card'>
        <h2 className='object-recognition-card__title'>
          <i className='iconfont icon-zhinan' aria-hidden='true' />
          文人品鉴心得
        </h2>
        <div className='object-recognition-card__body'>
          <p className='object-recognition-result__text'>
            {flow || '本次考释未附流变路线。'}
          </p>

          {/* 先贤雅音吟诵模块（全中文原生 Web Speech，水墨声波微澜动效） */}
          <div className='scholar-voice-deck'>
            <div className='scholar-voice-deck__header'>
              <div className='scholar-voice-deck__title-wrap'>
                <i className='iconfont icon-yinliang-F' aria-hidden='true' />
                <span className='scholar-voice-deck__title'>先贤雅音吟诵</span>
              </div>
              {/* 音色切换 */}
              <div className='scholar-voice-deck__timbre-toggle'>
                <button
                  type='button'
                  className={`scholar-voice-deck__timbre-btn ${voiceMode === 'male' ? 'is-active' : ''}`}
                  onClick={() => handleToggleVoiceMode('male')}
                >
                  名士雅韵
                </button>
                <button
                  type='button'
                  className={`scholar-voice-deck__timbre-btn ${voiceMode === 'female' ? 'is-active' : ''}`}
                  onClick={() => handleToggleVoiceMode('female')}
                >
                  清词婉约
                </button>
              </div>
            </div>

            <div className='scholar-voice-deck__player-row'>
              <button
                type='button'
                className={`scholar-voice-btn ${isPlaying ? 'is-playing' : ''}`}
                onClick={handleVoicePlay}
                aria-label='播放古风文人讲解语音'
                title='点击播放或暂停'
              >
                <span className='scholar-voice-btn__ink-ring' aria-hidden='true' />
                <i className={`iconfont ${isPlaying ? 'icon-jieshu' : 'icon-yinliang-F'}`} aria-hidden='true' />
                <span className='scholar-voice-btn__text'>
                  {isPlaying ? '暂停吟诵' : '听先贤雅诵'}
                </span>
              </button>

              {/* 水墨声波律动动态频谱 */}
              <div className={`ink-soundwave ${isPlaying ? 'is-animating' : ''}`} aria-hidden='true'>
                <span className='ink-soundwave__bar bar-1' />
                <span className='ink-soundwave__bar bar-2' />
                <span className='ink-soundwave__bar bar-3' />
                <span className='ink-soundwave__bar bar-4' />
                <span className='ink-soundwave__bar bar-5' />
              </div>

              <span className='scholar-voice-deck__status'>
                {isPlaying
                  ? `【${voiceMode === 'male' ? '先贤沉雄' : '清词空灵'}】徐徐道来…`
                  : '以器载道 · 名士亲解'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 底部操作区：入藏文士物溯宝鉴 ── */}
      <p className='object-recognition-result__statement'>
        本功能为两宋文风趣味科普推演与物脉流变研习，非严谨考古鉴定工具。
      </p>

      <button
        type='button'
        className={`object-recognition-result__save-btn ${saved ? 'is-saved' : ''}`}
        disabled={pending || saving || saved || isExample}
        onClick={saveArtifact}
      >
        <i className='iconfont icon-shoucang' aria-hidden='true' />
        <span>{isExample ? '内置案例不计入个人识物成果' : saved ? '已入藏物溯宝鉴' : saving ? '正在镌录入藏…' : pending ? '考释完毕后方可入藏' : '收入物溯宝鉴'}</span>
      </button>

      {hasAudioUrl && (
        <audio
          ref={audioRef}
          src={data.audio_url}
          preload='auto'
          crossOrigin='anonymous'
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsPlaying(false)}
        />
      )}
    </div>
  )
}

const RECOGNITION_SKELETON_STEPS = [
  '【1/4 辨物】文博大模型正在考释画卷器形与金石材质…',
  '【2/4 溯源】文史算法翻阅《广韵》《考工记》，推演唐宋明流变…',
  '【3/4 赋词】两宋先贤拟文人品鉴长文，评定雅士品位…',
  '【4/4 雅诵】以器载道，先贤雅音赋魂吟诵…',
]

/** 加载态：两宋宣纸灰骨架占位 + 动态考释阶段提示 */
export function RecognitionSkeleton() {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < RECOGNITION_SKELETON_STEPS.length - 1 ? prev + 1 : prev))
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
        <p className='object-recognition-skeleton__hint'>{RECOGNITION_SKELETON_STEPS[stepIndex]}</p>
      </div>
    </div>
  )
}
