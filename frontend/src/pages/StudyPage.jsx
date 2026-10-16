import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LeftOutline, RedoOutline } from 'antd-mobile-icons'
import { Toast, Modal } from 'antd-mobile'
import InkWashBackground from '../components/InkWashBackground'
import ScholarArchive from '../components/ScholarArchive'
import ScholarArtifactDrawer from '../components/ScholarArtifactDrawer'
import EmptyState from '../components/EmptyState'
import { useScholarScope } from '../utils/useScholarScope'
import { cachedLetters, loadLetters, scholarScope, shichen } from '../utils/scholarLetters'
import { readYayanNotebook, formatStudyDate } from '../utils/studyFlow'
import '../styles/studyPages.less'

const SECTIONS = {
  archive: { title: '藏牒阁', seal: '修持存卷', subtitle: '历局唱和，皆有回响' },
  artifacts: { title: '物溯宝鉴', seal: '器以载道', subtitle: '藏一物，见一段风雅' },
  yayan: { title: '雅译锦囊', seal: '本机摘录', subtitle: '寻常言语，亦可成章' },
  messages: { title: '知音回柬', seal: '尺素传情', subtitle: '山水相逢，墨香不散' },
}
const SAGES = { libai: '李白', sushi: '苏轼', liqingzhao: '李清照', dufu: '杜甫', wangyangming: '王阳明' }

function RefreshButton({ onClick, busy }) {
  return <button type='button' className='study-page__refresh' onClick={onClick} disabled={busy}><RedoOutline aria-hidden='true' />{busy ? '展卷中…' : '重新展卷'}</button>
}

function YayanNotebook() {
  const navigate = useNavigate()
  const [notebook, setNotebook] = useState(readYayanNotebook)
  const refresh = () => setNotebook(readYayanNotebook())
  useEffect(() => {
    const reload = () => setNotebook(readYayanNotebook())
    window.addEventListener('focus', reload)
    window.addEventListener('storage', reload)
    return () => { window.removeEventListener('focus', reload); window.removeEventListener('storage', reload) }
  }, [])
  const copy = async text => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      Toast.show({ content: '已复制雅言，可粘贴取用', icon: 'success' })
    } catch {
      Modal.alert({ title: '请长按或选中文字复制', content: <textarea className='study-copy-text' aria-label='待复制雅言' readOnly value={text} onFocus={event => event.target.select()} />, confirmText: '合笺' })
    }
  }
  return <>
    <div className='study-page__toolbar'><span>共 {notebook.items.length} 则摘录</span><RefreshButton onClick={refresh} /></div>
    <p className='study-page__note'>来自首页「摘录入卷」，仅保存在本机浏览器，尚未同步到账号；来源随原稿保留。</p>
    {notebook.error && <p className='study-page__notice' role='status'>{notebook.error}</p>}
    {!notebook.items.length && <EmptyState seal='待题' title={notebook.error ? '摘录暂未展开' : '案头尚虚 · 待君题墨'} desc={notebook.error ? '可重新展卷，存档内容没有被覆盖。' : '在首页完成白话雅译并摘录，便可在此回看。'} actionText={notebook.error ? '重新读取' : '前往雅集'} onAction={notebook.error ? refresh : () => navigate('/home')} />}
    {notebook.items.map(item => <article className='study-note-card' key={item.key}>
      <h2>「{item.ancient}」</h2>
      {item.modern && <p><span className='study-note-card__label'>今语</span>{item.modern}</p>}
      {item.explanation && <p><span className='study-note-card__label'>释义</span>{item.explanation}</p>}
      <footer><small>{item.source}{item.author && ` · ${item.author}`}<br />{formatStudyDate(item.createdAt)}</small><button type='button' onClick={() => copy(item.ancient)}>复制雅言</button></footer>
    </article>)}
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
      setBusy(true); setNotice('')
      try { const rows = await loadLetters(); if (valid()) setLetters(rows) }
      catch { if (valid()) { setLetters(cachedLetters(scope)); setNotice('暂未连上信驿，现展示本机缓存；可重新展卷。') } }
      finally { if (valid()) setBusy(false) }
    }
    const readCache = () => { if (alive && scope === scholarScope()) setLetters(cachedLetters(scope)) }
    refreshRef.current = refresh
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('scholarLettersUpdated', readCache)
    return () => {
      alive = false; generation++
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('scholarLettersUpdated', readCache)
    }
  }, [scope])
  const replies = letters.filter(row => typeof row.reply?.text === 'string' && row.reply.text.trim())
  const unread = replies.filter(row => row.reply.unread).length
  return <>
    <div className='study-page__toolbar'><span>{unread ? `${unread} 封待展读` : '往来回柬'} · 共 {replies.length} 封</span><RefreshButton busy={busy} onClick={() => refreshRef.current()} /></div>
    <p className='study-page__note'>此处收取站内回柬，不发送浏览器或手机系统通知。进入对席后，可展读来信并继续交谈。</p>
    {notice && <p className='study-page__notice' role='status'>{notice}</p>}
    {busy && <p role='status'>信驿展卷中…</p>}
    {!busy && replies.length === 0 && <EmptyState seal='待书' title='尚无知音回柬' desc='与先贤完成四轮清谈并离开对席后，再来收取回柬。' actionText='前往知音' onAction={() => navigate('/letters')} />}
    {replies.map(row => <article className='study-note-card' key={row.sageId}>
      <div className='study-note-card__heading'><h2>{SAGES[row.sageId] || row.name || '知音'}来柬</h2><span className='study-note-card__seal'>{row.reply.unread ? '未展' : '已阅'}</span></div>
      <p className='study-note-card__letter'>{row.reply.text}</p>
      <footer><small>{formatStudyDate(row.reply.at)} · {shichen(row.reply.at)}{scope === 'guest' && <><br />本机规则回柬</>}</small><button type='button' onClick={() => navigate(`/chat/${encodeURIComponent(row.sageId)}`)}>展笺续谈</button></footer>
    </article>)}
  </>
}

export default function StudyPage({ section }) {
  const navigate = useNavigate()
  const scope = useScholarScope()
  const info = SECTIONS[section] || SECTIONS.yayan
  useEffect(() => { window.scrollTo(0, 0) }, [section])
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
