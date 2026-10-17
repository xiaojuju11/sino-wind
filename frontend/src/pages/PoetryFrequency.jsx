import { useEffect } from 'react'
import { useFrequencyResource } from '../utils/useFrequencyResource'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LeftOutline, RightOutline, DownlandOutline } from 'antd-mobile-icons'
import InkWashBackground from '../components/InkWashBackground'
import ReferenceCorners from '../components/ReferenceCorners'
import FrequencyWordCloud from '../components/FrequencyWordCloud'
import '../styles/studyPages.less'
import '../styles/poetryFrequency.less'

const fmt = value => Number(value || 0).toLocaleString('zh-CN')
export function FrequencyFrame({ title, subtitle, onBack, children }) {
  return <div className='study-page frequency-page'><InkWashBackground /><header className='study-page__header'><button type='button' className='study-page__back' aria-label='返回' onClick={onBack}><LeftOutline /></button><div><h1>{title}</h1><p>{subtitle}</p></div><span className='study-page__seal'>字衡</span></header><main className='frequency-main'>{children}</main></div>
}
export function ResourceNotice({ resource }) {
  if (resource.loading) return <p role='status' className='frequency-notice'>正在展卷，细数诗中字词…</p>
  return resource.error ? <div role='alert' className='frequency-notice'><p>{resource.error}</p><button type='button' onClick={resource.retry}>重新展卷</button></div> : null
}
export function Highlight({ text, term }) {
  if (!term) return text
  const parts = text.split(term)
  return parts.map((part, i) => <span key={i}>{i > 0 && <mark>{term}</mark>}{part}</span>)
}
function Contexts({ query, term, page, changePage, returnQuery }) {
  const navigate = useNavigate()
  const resource = useFrequencyResource(`contexts?${query}&term=${encodeURIComponent(term)}&page=${page}`)
  return <section id='frequency-contexts' className='frequency-panel' aria-label='原诗用例'><ReferenceCorners /><h2>循「{term}」寻句</h2><ResourceNotice resource={resource} />{resource.data && <>
    <p className='frequency-quiet'>见于 {fmt(resource.data.total)} 篇诗词</p>
    {resource.data.items.map(p => <button type='button' className='frequency-context' key={p.id} onClick={() => navigate(`/poetry-frequency/poem/${p.id}?term=${encodeURIComponent(term)}`, { state: { returnQuery } })}><small>{p.corpus === 'tang' ? '唐诗' : '宋词'} · {p.author}</small><h3>{p.title}<RightOutline /></h3><p><Highlight text={p.excerpt} term={term} /></p></button>)}
    {!resource.data.total && <p>此范围暂未找到对应诗句。</p>}
    {resource.data.total > 10 && <nav className='frequency-pagination' aria-label='诗句翻页'><button type='button' disabled={page <= 1} onClick={() => changePage(page - 1)}>上一卷</button><span>{page} / {Math.ceil(resource.data.total / 10)}</span><button type='button' disabled={page * 10 >= resource.data.total} onClick={() => changePage(page + 1)}>下一卷</button></nav>}
  </>}</section>
}
function exportStats(data, query) {
  const csv = [['范围', query.corpus === 'tang' ? '唐诗' : query.corpus === 'song' ? '宋词' : '唐诗与宋词'], ['作者', query.author || '全部'], ['篇目', query.title || '全部'], ['篇数', data.poems], ['统计方式', query.mode === 'word' ? '二字及以上分词' : '单字'], ['分母', data.total], ['字词', '出现次数', '涉及篇数', '每万单位次数'], ...data.terms.map(t => [t.term, t.count, t.poems, t.per10k])].map(row => row.map(value => `"${String(value).replace(/^[=+\-@\t\r]/, "'$&").replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a'); a.href = url; a.download = '诗海字衡-统计.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export default function PoetryFrequency() {
  const navigate = useNavigate(), [params, setParams] = useSearchParams()
  const filters = { corpus: params.get('corpus') || '', author: params.get('author') || '', title: params.get('title') || '', mode: params.get('mode') === 'char' ? 'char' : 'word', stop: params.get('stop') === '0' ? '0' : '1' }
  const query = new URLSearchParams(filters).toString()
  const meta = useFrequencyResource('meta'), stats = useFrequencyResource(`stats?${query}`)
  const term = params.get('term') || stats.data?.terms[0]?.term || ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const choose = (value, nextPage = 1) => {
    const p = new URLSearchParams(params); p.set('term', value); p.set('page', String(nextPage)); setParams(p, { replace: true })
    requestAnimationFrame(() => document.getElementById('frequency-contexts')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }))
  }
  function submit(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget)); values.stop = values.stop ? '1' : '0'
    setParams(values)
  }
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const authors = meta.data?.authors.filter(a => !filters.corpus || a.corpus === filters.corpus) || []
  const names = [...new Set(authors.map(a => a.name))]
  return <FrequencyFrame title='诗海字衡' subtitle='从一字一词，读万卷风华' onBack={() => navigate('/home')}>
    <section className='frequency-panel frequency-intro'><ReferenceCorners /><p className='frequency-eyebrow'>一字有声 · 万卷成章</p><h2>唐风宋韵，皆可细数</h2><p>选一部诗集，寻一位诗人，看看哪些字词在笔下反复回响。</p>{meta.data && <small>唐诗 {fmt(meta.data.counts.tang)} 篇 · 宋词 {fmt(meta.data.counts.song)} 篇</small>}</section>
    <section className='frequency-panel'><ReferenceCorners /><h2>第一折 · 选卷定衡</h2><ResourceNotice resource={meta} /><form key={query} onSubmit={submit} className='frequency-form'>
      <label>诗集<select name='corpus' defaultValue={filters.corpus}><option value=''>唐诗与宋词</option><option value='tang'>唐诗</option><option value='song'>宋词</option></select></label>
      <label>统计方式<select name='mode' defaultValue={filters.mode}><option value='char'>逐字统计</option><option value='word'>分词统计</option></select></label>
      <label className='frequency-wide'>诗人<input name='author' list='frequency-authors' placeholder='全部诗人，或输入姓名' maxLength={40} defaultValue={filters.author} /><datalist id='frequency-authors'>{names.map(name => <option key={name} value={name} />)}</datalist></label>
      <label className='frequency-wide'>篇目<input name='title' placeholder='全部篇目，或输入标题关键词' maxLength={80} defaultValue={filters.title} /></label>
      <label className='frequency-wide frequency-checkbox'><input name='stop' type='checkbox' value='1' defaultChecked={filters.stop === '1'} />略去常用字词</label>
      <button className='frequency-primary frequency-wide' type='submit'>展卷观频</button>
    </form></section>
    <ResourceNotice resource={stats} />
    {stats.data && <><section className='frequency-panel'><ReferenceCorners /><h2>第二折 · 字词回响</h2><div className='frequency-metrics'><div><strong>{fmt(stats.data.poems)}</strong><span>篇诗词</span></div><div><strong>{fmt(stats.data.authors)}</strong><span>位诗人</span></div><div><strong>{fmt(stats.data.distinct)}</strong><span>种{filters.mode === 'word' ? '词语' : '汉字'}</span></div></div>
      <p className='frequency-quiet'>正文共 {fmt(stats.data.total)} {filters.mode === 'word' ? '个二字及以上分词' : '字'}{filters.stop === '1' ? `，略去常用字词后 ${fmt(stats.data.included)} 个统计单位` : ''}</p>
      {!stats.data.terms.length ? <p className='frequency-notice'>此范围暂无可统计的正文，请调整诗集、诗人或篇目。</p> : <><FrequencyWordCloud key={query} terms={stats.data.cloudTerms || stats.data.terms} selected={term} onSelect={choose} />
      <p className='frequency-quiet'>点选字词，展开原诗。以下为出现次数前 30 项。</p><div className='frequency-bars'>{stats.data.terms.map((t, i) => <button type='button' key={t.term} aria-pressed={term === t.term} className='frequency-bar' onClick={() => choose(t.term)}><span className='frequency-bar__label'><small>{i + 1}</small>{t.term}</span><span className='frequency-bar__track'><i style={{ width: `${t.count / stats.data.terms[0].count * 100}%` }} /></span><span className='frequency-bar__value'>{fmt(t.count)}<small>每万 {t.per10k}</small></span></button>)}</div><button type='button' className='frequency-export' onClick={() => exportStats(stats.data, filters)}><DownlandOutline /> 导出统计</button></>}
    </section>{term && (stats.data.cloudTerms || stats.data.terms).some(t => t.term === term) && <Contexts key={query + term} query={query} term={term} page={page} changePage={next => choose(term, next)} returnQuery={params.toString()} />}</>}
  </FrequencyFrame>
}
