import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LeftOutline, RightOutline, AddOutline, DeleteOutline } from 'antd-mobile-icons'
import { Modal, Toast } from 'antd-mobile'
import InkWashBackground from '../components/InkWashBackground'
import ReferenceCorners from '../components/ReferenceCorners'
import EmptyState from '../components/EmptyState'
import { useScholarScope } from '../utils/useScholarScope'
import { listScenes, deleteScene } from '../utils/sceneStorage'
import { SCENE_POEMS } from '../data/scenePoems'
import '../styles/studyPages.less'
import '../styles/scenePoetry.less'

function Archive({ scope }) {
  const navigate = useNavigate(), [records, setRecords] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0)
  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => {
    let current = true
    const refresh = () => listScenes(scope).then(rows => { if (current) { setRecords(rows); setError(''); setLoading(false) } }).catch(e => { if (current) { setError(e.message); setLoading(false) } })
    refresh(); window.addEventListener('focus', refresh); window.addEventListener('sceneArchiveUpdated', refresh)
    return () => { current = false; window.removeEventListener('focus', refresh); window.removeEventListener('sceneArchiveUpdated', refresh) }
  }, [scope, revision])
  const remove = async record => {
    const confirmed = await Modal.confirm({ title: '移出这幅诗境？', content: '将删除此浏览器中的这份藏卷，已导出的图片不受影响。', confirmText: '移出画阁', cancelText: '留在案头' })
    if (!confirmed) return
    try { await deleteScene(scope, record.id); Toast.show({ content: '已移出画阁' }) } catch (e) { Toast.show({ content: e.message }) }
  }
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/home')
    }
  }
  return <div className='study-page scene-page'><InkWashBackground /><header className='study-page__header'><button type='button' className='study-page__back' aria-label='返回' onClick={handleBack}><LeftOutline /></button><div><h1>诗境画阁</h1><p>收藏眼前山水，重逢旧日诗心</p></div><span className='study-page__seal'>藏境</span></header><main className='scene-main'><div className='scene-archive-toolbar'><span>共 {records.length} 幅</span><button type='button' className='scene-primary' onClick={() => navigate('/scene-poetry?reset=1')}><AddOutline />再寻一境</button></div>
    {loading && <p role='status'>正在启阁…</p>}
    {error && <section className='scene-panel'><p role='alert'>{error}</p><button type='button' onClick={() => setRevision(value => value + 1)}>重新读取</button></section>}
    {!loading && !error && !records.length && <EmptyState seal='待景' title='画阁尚静 · 待君藏景' desc='拍下眼前风景，寻一句会心的诗，便可留在此处。' actionText='前往寻镜入诗' onAction={() => navigate('/scene-poetry?reset=1')} />}
    <div className='scene-archive-grid'>{records.map(record => {
      const poem = SCENE_POEMS.find(row => row.id === record.poemId)
      return <article className='scene-panel scene-archive-card' key={record.id}><ReferenceCorners /><button type='button' className='scene-archive-open' onClick={() => navigate(`/scene-poetry/view/${record.id}`)}><img src={record.image} alt={poem ? `配诗《${poem.title}》的藏景` : '收藏的风景'} loading='lazy' /><div><small>{poem?.dynasty} · {poem?.author}</small><h2>{poem?.lines[0] || '一卷诗境'}</h2><p>{poem?.lines[1]}</p><span>展开此卷 <RightOutline /></span></div></button><footer><small>{new Date(record.createdAt).toLocaleDateString('zh-CN')}{record.example ? ' · 山水示例' : ''}</small><button type='button' className='scene-text-button' aria-label={`移出${poem?.title || '这幅诗境'}`} onClick={() => remove(record)}><DeleteOutline />移出</button></footer></article>
    })}</div></main></div>
}
export default function SceneArchive() { const scope = useScholarScope(); return <Archive key={scope} scope={scope} /> }
