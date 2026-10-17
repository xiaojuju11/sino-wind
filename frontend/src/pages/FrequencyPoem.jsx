import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FrequencyFrame, Highlight, ResourceNotice } from './PoetryFrequency'
import { useFrequencyResource } from '../utils/useFrequencyResource'
import ReferenceCorners from '../components/ReferenceCorners'

export default function FrequencyPoem() {
  const { id } = useParams(), [params] = useSearchParams(), navigate = useNavigate(), location = useLocation()
  const resource = useFrequencyResource(`poems/${encodeURIComponent(id)}`), [original, setOriginal] = useState(false)
  const poem = resource.data
  return <FrequencyFrame title='循字读诗' subtitle='一字入眼，满卷生香' onBack={() => navigate(`/poetry-frequency${location.state?.returnQuery ? '?' + location.state.returnQuery : ''}`)}><ResourceNotice resource={resource} />{poem && <article className='frequency-panel frequency-poem'><ReferenceCorners /><p className='frequency-eyebrow'>{poem.corpus === 'tang' ? '唐诗' : '宋词'} · {poem.author}</p><h2>{poem.title}</h2><div className='frequency-version'><button type='button' aria-pressed={!original} onClick={() => setOriginal(false)}>简体展读</button><button type='button' aria-pressed={original} onClick={() => setOriginal(true)}>语料原文</button></div><div className='frequency-poem__lines'>{(original ? poem.original : poem.paragraphs).map((line, i) => <p key={i}><Highlight text={line} term={original ? '' : params.get('term')} /></p>)}</div></article>}</FrequencyFrame>
}
