import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LeftOutline, DownlandOutline as DownloadOutline, AddOutline, MessageOutline, RightOutline } from 'antd-mobile-icons'
import { Toast } from 'antd-mobile'
import InkWashBackground from '../components/InkWashBackground'
import ReferenceCorners from '../components/ReferenceCorners'
import ScenePicture from '../components/ScenePicture'
import SceneDepth from '../components/SceneDepth'
import { useScholarScope } from '../utils/useScholarScope'
import { scholarScope } from '../utils/scholarLetters'
import { getDraft, loadScene, saveScene } from '../utils/sceneStorage'
import { SCENE_POEMS, SCENE_TAGS } from '../data/scenePoems'
import { exportScene, createSceneFile } from '../utils/sceneImage'
import { shareSceneFile } from '../utils/sceneShare'
import { playInkDropSound, triggerHaptic } from '../utils/guofengAudio'
import '../styles/studyPages.less'
import '../styles/scenePoetry.less'

function Scroll({ scope }) {
  const { id } = useParams(), navigate = useNavigate(), alive = useRef(true)
  const [scene, setScene] = useState(null), [error, setError] = useState(''), [saving, setSaving] = useState(false), [exporting, setExporting] = useState(false)
  const [mode, setMode] = useState('poetry'), [highlight, setHighlight] = useState('')
  useEffect(() => {
    let current = true; alive.current = true
    ;(id === 'draft' ? getDraft(scope) : loadScene(scope, id)).then(value => {
      if (!current) return
      if (!value) setError('这幅诗境尚未留在当前账号的本机画阁，可重新摄景寻诗。')
      else setScene(value)
    }).catch(e => { if (current) setError(e.message) })
    return () => { current = false; alive.current = false }
  }, [id, scope])
  const poem = SCENE_POEMS.find(row => row.id === scene?.poemId)
  const regions = scene?.analysis.regions.filter(row => scene.selected.includes(row.id)) || []
  const tags = new Set(regions.map(row => row.tag))
  const save = async () => {
    if (saving || scene?.saved || scope !== scholarScope()) return
    setSaving(true)
    try { const stored = await saveScene(scope, scene); if (alive.current && scope === scholarScope()) { setScene(stored); Toast.show({ content: '已收入本机诗境画阁', icon: 'success' }) } }
    catch (e) { if (alive.current) Toast.show({ content: e.message }) }
    finally { if (alive.current) setSaving(false) }
  }
  const download = async () => {
    if (exporting) return
    setExporting(true)
    try { await exportScene(scene, poem) } catch (e) { Toast.show({ content: e.message }) } finally { if (alive.current) setExporting(false) }
  }
  const share = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const result = await shareSceneFile(await createSceneFile(scene, poem))
      if (result === 'downloaded') Toast.show({ content: '当前环境无法系统分享，已保存长图，可从相册或文件中分享。' })
    } catch (e) { Toast.show({ content: e.message || '分享未完成，可保存长图后分享。' }) }
    finally { if (alive.current) setExporting(false) }
  }
  const matchedSageKey = poem?.author?.includes('苏轼') ? 'sushi'
    : poem?.author?.includes('李白') ? 'libai'
    : poem?.author?.includes('李清照') ? 'liqingzhao'
    : poem?.author?.includes('杜甫') ? 'dufu'
    : poem?.author?.includes('王阳明') ? 'wangyangming'
    : null

  const discuss = sage => {
    const description = [...new Set(regions.map(row => row.label))].join('、')
    navigate(`/chat/${sage}`, { state: { scenePrompt: `我刚在「寻镜入诗」选了这些景物：${description}。相配的原诗是${poem.author}《${poem.title}》：“${poem.lines.join('')}”。请结合这些文字与我论诗，不要声称看过照片；区分实景描述和诗中联想。` } })
  }
  const highlightedLine = line => {
    const anchors = poem.anchors.filter(([word, tag]) => line.includes(word) && tags.has(tag))
    if (!anchors.length) return line
    const pieces = []; let offset = 0
    for (const [word, tag] of [...anchors].sort((a, b) => line.indexOf(a[0]) - line.indexOf(b[0]))) {
      const index = line.indexOf(word)
      if (index < offset) continue
      pieces.push(line.slice(offset, index), <button type='button' key={word} className='scene-scroll__anchor-btn' aria-label={`在照片中查看${SCENE_TAGS[tag]}`} aria-pressed={highlight === tag} onClick={() => { triggerHaptic(18); playInkDropSound(); setMode('regions'); setHighlight(value => value === tag ? '' : tag); Toast.show({ content: `🔍 已定位实景意象：【${SCENE_TAGS[tag] || tag}】`, duration: 1500 }); document.querySelector('.scene-scroll__picture')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}>{word}</button>)
      offset = index + word.length
    }
    pieces.push(line.slice(offset)); return pieces
  }
  return <div className='study-page scene-page scene-scroll-page'><InkWashBackground />
    <header className='study-page__header'><button type='button' className='study-page__back' aria-label={id === 'draft' ? '返回寻镜入诗' : '返回诗境画阁'} onClick={() => navigate(id === 'draft' ? '/scene-poetry' : '/mine/scenes', { replace: true })}><LeftOutline /></button><div><h1>我的诗境</h1><p>山水入镜 · 诗意入心</p></div><span className='study-page__seal'>留景</span></header>
    <main className='scene-main'>{error ? <section className='scene-panel'><p role='alert'>{error}</p><button type='button' className='scene-primary' onClick={() => navigate('/scene-poetry', { replace: true })}>重新摄景</button></section> : !scene ? <p role='status'>正在展开诗境…</p> : !poem ? <p role='alert'>这幅藏卷的诗句暂未找到，请重新选诗。</p> : <>
      <div className='scene-tabs' aria-label='诗境展示方式'>{[['poetry', '原景'], ['regions', '循诗观景'], ...(scene.analysis.depth ? [['depth', '山水层次']] : [])].map(([key, label]) => <button type='button' key={key} aria-pressed={mode === key} onClick={() => { setMode(key); setHighlight('') }}>{label}</button>)}</div>
      <article className='scene-panel scene-scroll'><ReferenceCorners /><div className='scene-scroll__picture'>{mode === 'regions' ? <ScenePicture scene={scene} selected={scene.selected} highlight={highlight} onToggle={regionId => { const region = scene.analysis.regions.find(row => row.id === regionId); setHighlight(previous => previous === region?.tag ? '' : region?.tag || '') }} /> : <SceneDepth scene={scene} active={mode === 'depth'} />}</div>
        <p className='scene-caption'>{mode === 'depth' ? '轻移指尖 · 以估计深度呈现轻微视差' : mode === 'regions' ? '点击诗句中有描线的字，查看对应景物' : scene.example ? '山水画示例' : '取自眼前 · 题以古诗'}</p>
        <div className='scene-grounding-banner'><span className='scene-grounding-banner__icon'>👆</span><span className='scene-grounding-banner__text'><b>循词观景交互</b>：点击诗句中带朱砂红线之字，画卷自动聚焦并标示实景对应物象</span></div>
        <div className='scene-scroll__poem'>{poem.lines.map(line => <p key={line}>{highlightedLine(line)}</p>)}</div><p className='scene-scroll__author'>{poem.dynasty} · {poem.author}</p><h2>《{poem.title}》</h2><button type='button' className='scene-scroll__stamp' aria-label={scene.saved ? '已藏，打开诗境画阁' : saving ? '正在收入诗境画阁' : '入诗，收入诗境画阁'} disabled={saving} onClick={scene.saved ? () => navigate('/mine/scenes') : save}><span>{saving ? '藏' : scene.saved ? '已' : '入'}</span><span>{saving ? '卷' : scene.saved ? '藏' : '诗'}</span></button>
      </article>
      <section className='scene-panel scene-interpretation'><ReferenceCorners /><span className='scene-eyebrow'>景有所见 · 诗有所思</span><h2>此景与此诗</h2><p>{poem.note}</p><div className='scene-motif-links'>{poem.anchors.map(([word, tag]) => <span key={`${word}-${tag}`} className={tags.has(tag) ? 'is-grounded' : ''}>{word} · {tags.has(tag) ? '有选景对应' : '诗中联想'}</span>)}</div><a className='scene-source-link' href={poem.sourceUrl} target='_blank' rel='noopener noreferrer'>原诗出处：{poem.source} · {poem.sourceVerified ? '查看核对版本' : '检索原文（版本待核）'}</a><p className='scene-muted'>{poem.sourceEdition}{poem.sourceCheckedAt ? ` · 核对日期：${poem.sourceCheckedAt}` : ''}。意象解读为应用编写，照片不能单独确定时节、声音与历史地点。</p></section>
      <div className='scene-actions'><button type='button' className='scene-primary' disabled={saving || scene.saved} onClick={save}><AddOutline />{scene.saved ? '已收入画阁' : saving ? '正在藏卷…' : '收入诗境画阁'}</button><button type='button' disabled={exporting} onClick={download}><DownloadOutline />{exporting ? '正在制笺…' : '保存高清长图'}</button><button type='button' disabled={exporting} onClick={share}>分享诗境</button></div>
      <p className='scene-privacy'>藏卷保存在当前浏览器与账号的本机画阁。换设备或清除浏览器数据后不会自动恢复，建议保存长图备份。</p>
      <section className='scene-panel scene-dialogue'><ReferenceCorners /><span className='scene-eyebrow'>对席先贤 · 诗境解惑</span><h2>携景，与先贤一席清谈</h2><p>将眼前景物与相配诗句带入知音对席，向先贤请教诗中意象与创作心境。</p><div className='scene-actions'>{matchedSageKey && <button type='button' className='scene-primary' onClick={() => discuss(matchedSageKey)}><MessageOutline />向原作者【{poem.author}】追问诗意</button>}<button type='button' onClick={() => discuss('sushi')}><MessageOutline />请教苏轼</button><button type='button' onClick={() => discuss('libai')}><MessageOutline />请教李白</button></div></section><button type='button' className='scene-text-button scene-library-link' onClick={() => navigate('/mine/scenes')}>展开诗境画阁 <RightOutline /></button>
    </>}</main></div>
}
export default function SceneScroll() { const scope = useScholarScope(); const { id } = useParams(); return <Scroll key={`${scope}:${id}`} scope={scope} /> }
