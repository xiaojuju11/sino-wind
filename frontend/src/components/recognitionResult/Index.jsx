import './index.less'
import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toast } from 'antd-mobile'
import { playInkDropSound } from '../../utils/guofengAudio'
import { safeUUID } from '../../utils/uuid'
import { saveScholarArtifact } from '../../utils/scholarAssets'

/**
 * 物溯古今 · 识别结果
 * 核心卡片：
 *   1. 金石鉴赏：古物名称 / 朝代印章 / 专属博古鉴藏朱批印章（品位分值与雅级）
 *   2. 器物考释：详释今物名称 ➔ 古代器物原型
 *   3. 文人品鉴心得：流变路线考略
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
  const navigate = useNavigate()
  const data = recognitionResult?.data || {}
  const degraded = Boolean(recognitionResult?.degraded)
  const notice = recognitionResult?.notice

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const artifactId = useRef(null)
  const saveLock = useRef(false)

  const { interpretation, flow } = splitDescription(data.description)
  const rank = getScoreRank(data.score)

  // 收入宝鉴功能（统一走 saveScholarArtifact：兼顾游客本地暂存与登录用户云端存储）
  const saveArtifact = async (silent = false) => {
    if (saveLock.current || saved || pending) return
    saveLock.current = true
    setSaving(true)
    artifactId.current ||= safeUUID()
    try {
      const validScore = typeof data.score === 'number' && Number.isFinite(data.score)
        ? Math.max(0, Math.min(100, Math.round(data.score)))
        : 80
      await saveScholarArtifact({
        id: artifactId.current,
        name: (data.name || '待考器物').trim().slice(0, 100),
        dynasty: (data.dynasty || '').trim().slice(0, 80),
        description: (data.description || '本次记录未附考释。').trim().slice(0, 8000),
        score: validScore,
        degraded
      })
      setSaved(true)
      playInkDropSound()
      if (!silent) {
        Toast.show({ content: '已收入书斋物溯宝鉴，可前往知音携物入席', icon: 'success' })
      }
    } catch (err) {
      if (!silent) {
        Toast.show({ content: err?.response?.data?.message || err?.message || '尚未保存，请稍候重试' })
      }
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }

  // 识别成功后自动收录入宝鉴，无需用户滑到底部手动操作
  useEffect(() => {
    if (!pending && data?.name && !saved && !saveLock.current) {
      saveArtifact(true)
    }
  }, [data?.name, pending])

  return (
    <div className='object-recognition-result'>
      {/* 顶部醒目入藏状态标签：点击可直接穿梭前往物溯宝鉴 */}
      {saved && (
        <div
          className='object-recognition-result__saved-badge'
          onClick={() => navigate('/mine/artifacts')}
          role='button'
          tabIndex={0}
          title='点击前往书斋物溯宝鉴'
        >
          <span>✦ 已收录入【物溯宝鉴】</span>
          <span>前往查验 ➔</span>
        </div>
      )}

      {(degraded || pending) && (
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
                <span className='scholar-appraise-seal__label'>品位鉴值</span>
                <span className='scholar-appraise-seal__value'>
                  {degraded ? '待考' : `${typeof data.score === 'number' ? data.score : 0}`}
                </span>
                {!degraded && <span className='scholar-appraise-seal__unit'>分</span>}
              </div>
              <div className='scholar-appraise-seal__rank'>
                <div className='scholar-appraise-seal__tag'>{rank.tag}</div>
                <div className='scholar-appraise-seal__desc'>{rank.desc}</div>
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

      {/* ── ③ 文人品鉴心得：流变脉络 ── */}
      <section className='object-recognition-card'>
        <h2 className='object-recognition-card__title'>
          <i className='iconfont icon-zhinan' aria-hidden='true' />
          文人品鉴心得
        </h2>
        <div className='object-recognition-card__body'>
          <p className='object-recognition-result__text'>
            {flow || '本次考释未附流变路线。'}
          </p>
        </div>
      </section>

      {/* ── 底部操作区：入藏文士物溯宝鉴 ── */}
      <p className='object-recognition-result__statement'>
        本功能为两宋文风趣味科普推演与物脉流变研习，非严谨考古鉴定工具。
      </p>

      <button
        type='button'
        className={`object-recognition-result__save-btn ${saved ? 'is-saved' : ''}`}
        disabled={pending || saving}
        onClick={saved ? () => navigate('/mine/artifacts') : () => saveArtifact(false)}
      >
        <i className={`iconfont ${saved ? 'icon-zhanpin' : 'icon-shoucang'}`} aria-hidden='true' />
        <span>{saved ? '已入藏物溯宝鉴 · 前往查验' : saving ? '正在镌录入藏…' : pending ? '考释完毕后方可入藏' : '收入物溯宝鉴'}</span>
      </button>
    </div>
  )
}

const RECOGNITION_SKELETON_STEPS = [
  '【1/4 辨物】文博大模型正在考释画卷器形与金石材质…',
  '【2/4 溯源】文史算法翻阅《广韵》《考工记》，推演唐宋明流变…',
  '【3/4 赋词】两宋先贤拟文人品鉴长文，评定雅士品位…',
  '【4/4 毕功】以器载道，物脉考释落卷…',
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
