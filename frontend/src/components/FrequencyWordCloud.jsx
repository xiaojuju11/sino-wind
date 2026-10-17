import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { layoutWordCloud } from '../utils/wordCloudLayout'

const font = 'STKaiti, KaiTi, serif'
export default function FrequencyWordCloud({ terms, selected, onSelect }) {
  const [fontsReady, setFontsReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const viewportRef = useRef(null)
  useEffect(() => {
    let active = true
    document.fonts.ready.then(() => { if (active) setFontsReady(true) })
    return () => { active = false }
  }, [])
  const cloud = useMemo(() => {
    if (!fontsReady) return null
    const context = document.createElement('canvas').getContext('2d')
    return layoutWordCloud(terms, (text, size) => { if (!context) return size * [...text].length; context.font = `${size}px ${font}`; return context.measureText(text).width })
  }, [terms, fontsReady])
  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2
  }, [zoom, cloud])
  return <div className='frequency-wordcloud'>
    <div className='frequency-wordcloud__toolbar'><span>一卷词云</span><button type='button' aria-pressed={zoom > 1} onClick={() => setZoom(value => value === 1 ? 2 : 1)}>{zoom === 1 ? '放大细看' : '收回全景'}</button></div>
    <div ref={viewportRef} className='frequency-wordcloud__viewport' tabIndex={zoom > 1 ? 0 : undefined} aria-label={zoom > 1 ? '放大的词云，可滑动查看' : '词云'}>
      {cloud ? <svg style={{ width: `${zoom * 100}%` }} viewBox={`0 0 ${cloud.width} ${cloud.height}`} className='frequency-wordcloud__svg' aria-label='检索结果词云，字号随词频变化，点击字词查看原诗' role='group'>
        {cloud.words.map(word => <g key={word.term} transform={`translate(${word.x},${word.y}) rotate(${word.angle})`} className={`frequency-wordcloud__word frequency-wordcloud__word--${word.color}`} role='button' tabIndex='0' aria-label={`${word.term}，${word.count}次，见于${word.poems}篇`} aria-pressed={selected === word.term} onClick={() => onSelect(word.term)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(word.term) } }}>
          <title>{word.term} · {word.count} 次 · {word.poems} 篇</title>
          <rect x={-(word.angle ? word.box.h : word.box.w) / 2} y={-(word.angle ? word.box.w : word.box.h) / 2} width={word.angle ? word.box.h : word.box.w} height={word.angle ? word.box.w : word.box.h} rx='3' />
          <text textAnchor='middle' dominantBaseline='central' fontFamily={font} fontSize={word.size}>{word.term}</text>
        </g>)}
      </svg> : <p role='status'>正在铺陈词云…</p>}
    </div>
  </div>
}
