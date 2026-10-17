import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CameraOutline, PictureOutline, RightOutline, LeftOutline, RedoOutline, CloseOutline } from 'antd-mobile-icons'
import { Toast } from 'antd-mobile'
import axios from 'axios'
import InkWashBackground from '../components/InkWashBackground'
import ReferenceCorners from '../components/ReferenceCorners'
import ScenePicture from '../components/ScenePicture'
import SceneCamera from '../components/SceneCamera'
import { useScholarScope } from '../utils/useScholarScope'
import { scholarScope } from '../utils/scholarLetters'
import { getDraft, putDraft } from '../utils/sceneStorage'
import { readSceneImage } from '../utils/sceneImage'
import { SCENE_TAGS, matchScenePoems } from '../data/scenePoems'
import '../styles/studyPages.less'
import '../styles/scenePoetry.less'

const BASE = import.meta.env.BASE_URL
const sceneApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '', timeout: 95000 })
function SceneEditor({ scope }) {
  const navigate = useNavigate(), [searchParams] = useSearchParams()
  const fileRef = useRef(null), request = useRef(null), generation = useRef(0), handledActionRef = useRef(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const closeCamera = useCallback(() => setCameraOpen(false), [])
  const [scene, setScene] = useState(null), [selected, setSelected] = useState([]), [poemId, setPoemId] = useState('')
  const [busy, setBusy] = useState(false), [saving, setSaving] = useState(false), [notice, setNotice] = useState(''), [highlight, setHighlight] = useState('')
  const [manualTag, setManualTag] = useState('tree'), [drawing, setDrawing] = useState(false)
  useEffect(() => () => { generation.current++; request.current?.abort() }, [])
  useEffect(() => {
    let active = true
    const version = generation.current
    const action = searchParams.get('action')
    const reset = searchParams.get('reset')

    if (reset === '1') {
      setScene(null)
      setSelected([])
      setPoemId('')
      setHighlight('')
      return () => { active = false }
    }

    if (action && !handledActionRef.current) {
      handledActionRef.current = true
      if (action === 'sample') {
        example()
      } else if (action === 'camera') {
        setCameraOpen(true)
      } else if (action === 'upload') {
        setTimeout(() => fileRef.current?.click(), 150)
      }
      return () => { active = false }
    }

    if (!action) {
      getDraft(scope).then(draft => {
        if (active && version === generation.current && draft) {
          setScene(draft)
          setSelected(draft.selected || [])
          setPoemId(draft.poemId || '')
        }
      }).catch(() => {})
    }

    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, searchParams])
  const selectedRegions = useMemo(() => scene?.analysis.regions.filter(row => selected.includes(row.id)) || [], [scene, selected])
  const matches = useMemo(() => matchScenePoems(selectedRegions), [selectedRegions])
  const chosen = matches.find(row => row.id === poemId) || matches[0]
  const valid = version => version === generation.current && scope === scholarScope()
  const analyze = async (prepared, version) => {
    const controller = new AbortController(); request.current = controller
    setBusy(true); setNotice('正在细辨山水，首次展开稍需片刻…')
    try {
      const response = await sceneApi.post('/api/scene/analyze', { image: prepared.image }, { signal: controller.signal })
      if (response.data?.code !== 1 || !response.data.data?.regions) throw new Error('识景服务未返回完整结果，请重新识景。')
      if (!valid(version)) return
      const analysis = response.data.data
      setScene({ ...prepared, analysis }); setSelected(analysis.regions.map(row => row.id)); setPoemId(''); setHighlight('')
      setNotice(analysis.regions.length ? (analysis.depthNotice || '识景已成，可点选景物，寻一句相宜的诗。') : '暂未辨出适合的景物，可手动圈选后寻诗。')
    } catch (error) {
      if (valid(version)) setNotice(controller.signal.aborted ? '已停止识景，可手动圈选或重新识景。' : error.response?.data?.message || '识景服务暂未连通，请稍后点击「重新识景」，当前照片已保留。')
    } finally { if (valid(version)) { setBusy(false); request.current = null } }
  }
  const receive = async (file, example = false) => {
    if (!file) return
    request.current?.abort(); const version = ++generation.current
    setBusy(true); setNotice('正在展开照片…'); setDrawing(false)
    try {
      const image = await readSceneImage(file)
      if (!valid(version)) return
      const bitmap = new Image(); bitmap.src = image; await bitmap.decode()
      const ratio = bitmap.width / bitmap.height, width = ratio >= 1 ? 384 : Math.round(384 * ratio), height = ratio >= 1 ? Math.round(384 / ratio) : 384
      const prepared = { id: crypto.randomUUID(), image, createdAt: Date.now(), example, analysis: { width, height, regions: [], depth: null } }
      setScene(prepared); setSelected([]); setPoemId('')
      await analyze(prepared, version)
    } catch (error) { if (valid(version)) { setNotice(error.message); setBusy(false) } }
  }
  const example = async () => {
    const version = ++generation.current
    setBusy(true); setNotice('正在取出山水示例…')
    try {
      const response = await fetch(`${BASE}images/scene/poetic-lake-v1.webp`)
      if (!response.ok) throw new Error('示例图片暂未展开，请选择自己的照片。')
      const blob = await response.blob()
      if (valid(version)) await receive(new File([blob], '山水示例.webp', { type: 'image/webp' }), true)
    } catch (error) { if (valid(version)) { setNotice(error.message); setBusy(false) } }
  }
  const toggle = id => { setSelected(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]); setHighlight('') }
  const correct = (id, tag) => {
    setScene(previous => ({ ...previous, analysis: { ...previous.analysis, regions: previous.analysis.regions.map(row => row.id === id ? { ...row, tag, label: SCENE_TAGS[tag], source: 'corrected' } : row) } }))
    setHighlight('')
  }
  const addRegion = region => {
    setScene(previous => ({ ...previous, analysis: { ...previous.analysis, regions: [...previous.analysis.regions, region] } }))
    setSelected(previous => [...previous, region.id]); setDrawing(false); setHighlight('')
  }
  const unfold = async () => {
    if (!chosen || saving || scope !== scholarScope()) return
    setSaving(true)
    try {
      await putDraft(scope, { ...scene, selected, poemId: chosen.id })
      if (scope === scholarScope()) navigate('/scene-poetry/view/draft')
    } catch (error) { Toast.show({ content: error.message }) }
    finally { setSaving(false) }
  }
  return <div className='study-page scene-page'>
    <InkWashBackground />
    <header className='study-page__header'>
      <button type='button' className='study-page__back' aria-label='返回雅集' onClick={() => navigate('/home')}><LeftOutline /></button>
      <div><h1>寻镜入诗</h1><p>眼前的风景，也曾落在古人的诗里</p></div><span className='study-page__seal'>寻境</span>
    </header>
    <main className='scene-main'>
      <ol className='scene-steps' aria-label='寻诗步骤'><li className='is-current'><b>一</b>取景识境</li><li className={scene ? 'is-current' : ''}><b>二</b>指景寻诗</li><li className={chosen ? 'is-current' : ''}><b>三</b>展开诗境</li></ol>
      <input ref={fileRef} hidden type='file' accept='image/jpeg,image/png,image/webp' onChange={event => { receive(event.target.files?.[0]); event.target.value = '' }} />
      {!scene ? (
        busy ? (
          <section className='scene-panel scene-loading-panel'>
            <ReferenceCorners />
            <span className='scene-spinner' aria-hidden='true' />
            <h2>山水入镜 · 诗心徐展</h2>
            <p>{notice || '正在展开西湖山水画卷…'}</p>
          </section>
        ) : (
          <section className='scene-panel scene-intro'>
            <ReferenceCorners />
            <span className='scene-eyebrow'>把寻常一瞥，藏成山河一卷</span>
            <h2>此刻风景，何句相宜？</h2>
            <p>一池水，一行树，一座桥。<br />摄下所见，点选意象，与古诗相逢。</p>
            <div className='scene-actions'>
              <button type='button' className='scene-primary' disabled={busy} onClick={() => setCameraOpen(true)}>
                <CameraOutline />拍下眼前
              </button>
              <button type='button' disabled={busy} onClick={() => fileRef.current.click()}>
                <PictureOutline />从相册选取
              </button>
            </div>
            <button type='button' className='scene-text-button' disabled={busy} onClick={example}>
              先展一幅示例 <RightOutline />
            </button>
          </section>
        )
      ) : <section className='scene-panel scene-workspace'><ReferenceCorners />
        <div className='scene-section-title'><div><span className='scene-eyebrow'>第一折 · 取景识境</span><h2>细看眼前山水</h2></div><div className='scene-image-actions'><button type='button' disabled={busy} className='scene-text-button' onClick={() => setCameraOpen(true)}><CameraOutline />再拍一张</button><button type='button' disabled={busy} className='scene-text-button' onClick={() => fileRef.current?.click()}><PictureOutline />换一幅</button><button type='button' disabled={busy} className='scene-text-button' onClick={() => { setScene(null); setSelected([]); setPoemId(''); setHighlight('') }}><RedoOutline />重置</button></div></div>
        <ScenePicture scene={scene} selected={selected} highlight={highlight} onToggle={busy ? undefined : toggle} drawing={drawing ? manualTag : ''} onDraw={addRegion} />
        {scene.example && <p className='scene-caption'>山水画示例</p>}
        <div className='scene-actions scene-actions--small'><button type='button' disabled={busy} onClick={() => { const version = ++generation.current; setDrawing(false); analyze(scene, version) }}><RedoOutline />重新识景</button>{busy && <button type='button' onClick={() => request.current?.abort()}><CloseOutline />停止识景</button>}</div>
        {!busy && <><div className='scene-region-list'>{scene.analysis.regions.map(region => <div className='scene-region-row' key={region.id}><button type='button' aria-pressed={selected.includes(region.id)} onClick={() => toggle(region.id)}>{region.label}</button><select aria-label={`更正${region.label}的意象`} value={region.tag} onChange={event => correct(region.id, event.target.value)}>{Object.entries(SCENE_TAGS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>)}</div><div className='scene-manual'><label>补选意象 <select aria-label='要圈选的意象' value={manualTag} onChange={event => setManualTag(event.target.value)}>{Object.entries(SCENE_TAGS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button type='button' aria-pressed={drawing} onClick={() => setDrawing(value => !value)}>{drawing ? '取消圈选' : '在图中圈选'}</button></div></>}
      </section>}
      {notice && !(!scene && busy) && <p className='scene-notice' role='status' aria-live='polite'>{busy && <span className='scene-spinner' aria-hidden='true' />}{notice}</p>}
      {scene && !busy && <section className='scene-panel'><ReferenceCorners /><div className='scene-section-title'><div><span className='scene-eyebrow'>第二折 · 指景寻诗</span><h2>为此景，寻一句诗</h2></div><span className='scene-seal'>会心</span></div><p className='scene-muted'>按所选意象匹配原诗节选。点击下方意象词，可在照片中寻其所在。</p>
        {!matches.length && <p className='scene-empty'>先选一处景物，再寻诗中知音。</p>}
        <div className='scene-poem-list'>{matches.map(poem => <article key={poem.id} className={`scene-poem-option${chosen?.id === poem.id ? ' is-chosen' : ''}`}><label><input type='radio' name='scene-poem' checked={chosen?.id === poem.id} onChange={() => setPoemId(poem.id)} /><span>{poem.dynasty} · {poem.author}《{poem.title}》</span></label><blockquote>{poem.lines.map(line => <p key={line}>{line}</p>)}</blockquote><div className='scene-motif-links'>{poem.matched.map(([word, tag]) => <button type='button' key={`${word}-${tag}`} aria-pressed={highlight === tag} onClick={() => { setHighlight(previous => previous === tag ? '' : tag); document.querySelector('.scene-workspace')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }) }}>{word} · {SCENE_TAGS[tag]}</button>)}</div><p className='scene-muted'>配诗依据：选景与诗句中的{[...new Set(poem.matched.map(([, tag]) => SCENE_TAGS[tag]))].join('、')}相对应。{poem.note}</p><a className='scene-source-link' href={poem.sourceUrl} target='_blank' rel='noopener noreferrer'>{poem.sourceVerified ? '核对原诗版本' : '检索原文（版本待核）'}</a></article>)}</div>
        <button type='button' className='scene-primary scene-wide' disabled={!chosen || saving} onClick={unfold}>{saving ? '正在铺展…' : '展开我的诗境'}<RightOutline /></button>
      </section>}
    </main>
    {cameraOpen && <SceneCamera onClose={closeCamera} onCapture={file => { closeCamera(); receive(file) }} />}
  </div>
}
export default function ScenePoetry() { const scope = useScholarScope(); return <SceneEditor key={scope} scope={scope} /> }
