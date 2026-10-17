import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LeftOutline, RedoOutline } from 'antd-mobile-icons'
import { Toast, Modal } from 'antd-mobile'
import InkWashBackground from '../components/InkWashBackground'
import ScholarArchive from '../components/ScholarArchive'
import ScholarArtifactDrawer from '../components/ScholarArtifactDrawer'
import EmptyState from '../components/EmptyState'
import { useScholarScope } from '../utils/useScholarScope'
import { cachedLetters, loadLetters, scholarScope, shichen, markLetterRead } from '../utils/scholarLetters'
import { readYayanNotebook, formatStudyDate } from '../utils/studyFlow'
import { playSilkScrollSound } from '../utils/guofengAudio'
import '../styles/studyPages.less'

const SECTIONS = {
  archive: { title: '藏牒阁', seal: '修持存卷', subtitle: '历局唱和，皆有回响' },
  artifacts: { title: '物溯宝鉴', seal: '器以载道', subtitle: '藏一物，见一段风雅' },
  yayan: { title: '雅译锦囊', seal: '本机摘录', subtitle: '寻常言语，亦可成章' },
  messages: { title: '知音回柬', seal: '尺素传情', subtitle: '山水相逢，墨香不散' },
}

const SAGE_METAS = {
  libai: { name: '李白', title: '谪仙人', dynasty: '唐' },
  sushi: { name: '苏轼', title: '东坡居士', dynasty: '宋' },
  liqingzhao: { name: '李清照', title: '易安居士', dynasty: '宋' },
  dufu: { name: '杜甫', title: '少陵野老', dynasty: '唐' },
  wangyangming: { name: '王阳明', title: '阳明先生', dynasty: '明' },
  xinqiji: { name: '辛弃疾', title: '稼轩居士', dynasty: '宋' },
  group_zhulin: { name: '竹林雅集', title: '魏晋名士', dynasty: '晋' },
}

function YayanNotebook() {
  const navigate = useNavigate()
  const [notebook, setNotebook] = useState(readYayanNotebook)
  const [confirmKey, setConfirmKey] = useState(null)

  const refresh = () => {
    setNotebook(readYayanNotebook())
    setConfirmKey(null)
  }

  useEffect(() => {
    const reload = () => {
      setNotebook(readYayanNotebook())
      setConfirmKey(null)
    }
    window.addEventListener('focus', reload)
    window.addEventListener('storage', reload)
    return () => {
      window.removeEventListener('focus', reload)
      window.removeEventListener('storage', reload)
    }
  }, [])

  const copy = async text => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      Toast.show({ content: '已复制雅言，可粘贴取用', icon: 'success' })
    } catch {
      Modal.alert({
        title: '请长按或选中文字复制',
        content: <textarea className='study-copy-text' aria-label='待复制雅言' readOnly value={text} onFocus={event => event.target.select()} />,
        confirmText: '合笺',
      })
    }
  }

  const handleDeleteYayan = item => {
    if (confirmKey !== item.key) {
      setConfirmKey(item.key)
      return
    }
    try {
      const raw = localStorage.getItem('gufeng_yayan_list') || '[]'
      const rows = JSON.parse(raw)
      if (Array.isArray(rows)) {
        const next = rows.filter((r, idx) => {
          if (!r) return false
          const rowKey = `${r.id ?? 'excerpt'}:${idx}`
          if (item.id !== undefined && r.id !== undefined) {
            return r.id !== item.id
          }
          return rowKey !== item.key && r.ancient !== item.ancient
        })
        localStorage.setItem('gufeng_yayan_list', JSON.stringify(next))
        setNotebook(readYayanNotebook())
        Toast.show({ content: '已移出雅言锦囊', icon: 'success' })
      }
    } catch {
      Toast.show({ content: '移出未完成，请稍后重试', icon: 'fail' })
    } finally {
      setConfirmKey(null)
    }
  }

  const handleDebate = item => {
    navigate('/chat/libai', {
      state: {
        sageId: 'libai',
        prefillMessage: `太白先生，后生偶得雅言「${item.ancient}」，愿请先生从唐人诗心与文意辨析其微旨。`,
      },
    })
  }

  const hasItems = notebook.items.length > 0

  return <>
    {/* 顶部工具与统计条 */}
    <div className='scholar-summary-banner'>
      <div className='scholar-summary-banner__info'>
        <span className='scholar-summary-banner__rank'>锦囊雅韵</span>
        <span className='scholar-summary-banner__divider'>·</span>
        <span className='scholar-summary-banner__count'>共 {notebook.items.length} 则</span>
      </div>
      <div className='scholar-summary-banner__actions'>
        <button
          type='button'
          className='scholar-capsule-btn primary'
          onClick={() => navigate('/home')}
        >
          去雅集题新辞
        </button>
        <button
          type='button'
          className='scholar-icon-refresh-btn'
          onClick={refresh}
          aria-label='重新展卷'
        >
          <RedoOutline />
        </button>
      </div>
    </div>

    {notebook.error && <p className='study-page__notice' role='status'>{notebook.error}</p>}

    {!hasItems && (
      <EmptyState
        seal='待题'
        title={notebook.error ? '摘录暂未展开' : '案头尚虚 · 待君题墨'}
        desc={notebook.error ? '可重新展卷，存档内容没有被覆盖。' : '在首页将心绪雅译为唐风宋韵并摘录，便可在此长久回看研赏。'}
        actionText={notebook.error ? '重新读取' : '前往雅集题新辞'}
        onAction={notebook.error ? refresh : () => navigate('/home')}
      />
    )}

    {hasItems && (
      <div className='scholar-records-list'>
        {notebook.items.map(item => (
          <article className='study-note-card yayan-card' key={item.key}>
            <div className='yayan-card__ornament'>
              <span className='yayan-card__seal'>雅言</span>
            </div>
            <h2>「{item.ancient}」</h2>
            {item.modern && (
              <p><span className='study-note-card__label'>今语</span>{item.modern}</p>
            )}
            {item.explanation && (
              <p><span className='study-note-card__label'>释义</span>{item.explanation}</p>
            )}
            <footer>
              <small>
                {item.source}{item.author && ` · ${item.author}`}
                <br />
                {formatStudyDate(item.createdAt)}
              </small>
              <div className='scholar-card-ops'>
                <button
                  type='button'
                  className='scholar-btn-action primary'
                  onClick={() => handleDebate(item)}
                >
                  携句论道
                </button>
                <button
                  type='button'
                  className='scholar-btn-action subtle'
                  onClick={() => copy(item.ancient)}
                >
                  复制雅言
                </button>
                <button
                  type='button'
                  className={`scholar-btn-action ${confirmKey === item.key ? 'danger-active' : 'subtle'}`}
                  onClick={() => handleDeleteYayan(item)}
                >
                  {confirmKey === item.key ? '确认移出' : '移出'}
                </button>
                {confirmKey === item.key && (
                  <button
                    type='button'
                    className='scholar-btn-action text'
                    onClick={() => setConfirmKey(null)}
                  >
                    取消
                  </button>
                )}
              </div>
            </footer>
          </article>
        ))}
        <p className='study-page__footer-note'>案头常拂拭，心有千钟粟 · 雅言长存本机，换机前请妥善留存</p>
      </div>
    )}
  </>
}

function Messages({ scope }) {
  const navigate = useNavigate()
  const [letters, setLetters] = useState(() => cachedLetters(scope))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const refreshRef = useRef(() => {})

  useEffect(() => {
    let alive = true, generation = 0
    const refresh = async () => {
      const version = ++generation
      const valid = () => alive && scope === scholarScope() && version === generation
      setBusy(true)
      setNotice('')
      try {
        const rows = await loadLetters()
        if (valid()) setLetters(rows)
      } catch {
        if (valid()) {
          setLetters(cachedLetters(scope))
          setNotice('暂未连上信驿，现展示本机缓存；可重新展卷。')
        }
      } finally {
        if (valid()) setBusy(false)
      }
    }
    const readCache = () => {
      if (alive && scope === scholarScope()) setLetters(cachedLetters(scope))
    }
    refreshRef.current = refresh
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('scholarLettersUpdated', readCache)
    return () => {
      alive = false
      generation++
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('scholarLettersUpdated', readCache)
    }
  }, [scope])

  const replies = letters.filter(row => typeof row.reply?.text === 'string' && row.reply.text.trim())
  const unread = replies.filter(row => row.reply.unread).length

  return <>
    {/* 顶部工具与统计条 */}
    <div className='scholar-summary-banner'>
      <div className='scholar-summary-banner__info'>
        <span className='scholar-summary-banner__rank'>{unread ? `${unread} 封待展读` : '知音尺素'}</span>
        <span className='scholar-summary-banner__divider'>·</span>
        <span className='scholar-summary-banner__count'>共 {replies.length} 封</span>
      </div>
      <div className='scholar-summary-banner__actions'>
        <button
          type='button'
          className='scholar-capsule-btn primary'
          onClick={() => navigate('/letters')}
        >
          入席拜访知音
        </button>
        <button
          type='button'
          className='scholar-icon-refresh-btn'
          disabled={busy}
          onClick={() => refreshRef.current()}
          aria-label='重新展卷'
        >
          <RedoOutline className={busy ? 'is-spinning' : ''} />
        </button>
      </div>
    </div>

    {notice && <p className='study-page__notice' role='status'>{notice}</p>}
    {busy && <div className='scholar-loading-hint' role='status'><RedoOutline className='is-spinning' /> 信驿展卷中…</div>}

    {!busy && replies.length === 0 && (
      <EmptyState
        seal='待书'
        title='尺素案头尚待墨'
        desc='与先贤入席四番清谈并告退后，先贤感念雅意，将手书回柬寄至书斋，纸短情长。'
        actionText='入席拜访知音'
        onAction={() => navigate('/letters')}
      />
    )}

    {replies.length > 0 && (
      <div className='scholar-records-list'>
        {replies.map(row => {
          const meta = SAGE_METAS[row.sageId] || { name: row.name || '知音', title: '千古知音', dynasty: '唐' }
          const sageName = meta.name
          return (
            <article className='study-note-card study-letter-card' key={row.sageId}>
              <div className='study-note-card__heading study-letter-card__heading'>
                <div className='study-letter-card__sender'>
                  <div className='study-letter-card__seal-ring'>
                    <span>{sageName.slice(0, 1)}</span>
                  </div>
                  <div>
                    <h2>{sageName}来柬</h2>
                    <small className='study-letter-card__title'>{meta.title} · {meta.dynasty}</small>
                  </div>
                </div>
                <span className={`study-letter-card__seal ${row.reply.unread ? 'unread' : 'read'}`}>
                  {row.reply.unread ? '朱砂未展' : '已阅手札'}
                </span>
              </div>

              <div className='study-letter-card__paper'>
                <p className='study-note-card__letter'>{row.reply.text}</p>
              </div>

              <footer>
                <small>
                  {formatStudyDate(row.reply.at)} · {shichen(row.reply.at)}
                  {scope === 'guest' ? <><br />本机规则回柬</> : <><br />云端信驿存卷</>}
                </small>
                <div className='scholar-card-ops'>
                  <button
                    type='button'
                    className='scholar-btn-action primary'
                    onClick={async () => {
                      if (row.reply.unread && row.reply.id) {
                        await markLetterRead(row.sageId, row.reply.id).catch(() => {})
                      }
                      navigate(`/chat/${encodeURIComponent(row.sageId)}`)
                    }}
                  >
                    展笺续谈
                  </button>
                  <button
                    type='button'
                    className='scholar-btn-action subtle'
                    onClick={() => navigate('/mine/artifacts')}
                  >
                    赠物回敬
                  </button>
                </div>
              </footer>
            </article>
          )
        })}
        <p className='study-page__footer-note'>尺素传情，山水有相逢 · 先贤回柬随心阅览，常谈常新</p>
      </div>
    )}
  </>
}

export default function StudyPage({ section }) {
  const navigate = useNavigate()
  const scope = useScholarScope()
  const info = SECTIONS[section] || SECTIONS.yayan
  useEffect(() => {
    window.scrollTo(0, 0)
    playSilkScrollSound?.()
  }, [section])
  return <div className='study-page'>
    <InkWashBackground />
    <header className='study-page__header'>
      <button type='button' className='study-page__back' aria-label='返回书斋' onClick={() => navigate('/mine')}><LeftOutline /></button>
      <div><h1>{info.title}</h1><p>{info.subtitle}</p></div>
      <span className='study-page__seal'>{info.seal}</span>
    </header>
    <main className='study-page__body' key={`${section}:${scope}`}>
      {section === 'archive' ? <ScholarArchive presentation='page' /> : section === 'artifacts' ? <ScholarArtifactDrawer presentation='page' /> : section === 'messages' ? <Messages scope={scope} /> : <YayanNotebook />}
    </main>
  </div>
}
