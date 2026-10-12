import './index.less'
import { useEffect, useRef, useState } from 'react'
import { SoundOutline } from 'antd-mobile-icons'

// 🏺 博古识器 · 识别结果（文博品鉴话术，图标统一 antd-mobile-icons）
export default function Index({ recognitionResult }) {
  const data = recognitionResult?.data || {}
  const audioElement = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    setIsPlaying(false)
  }, [recognitionResult])

  const handleVoicePlay = () => {
    if (isPlaying) {
      audioElement.current?.pause()
      setIsPlaying(false)
    } else {
      audioElement.current?.play()
      setIsPlaying(true)
    }
  }

  return <div>
    {
      (
        <div className="object-recognition-result result-container">
          <div className="object-recognition-result__header">
            <h2>金石鉴赏</h2>
            <div className='object-recognition-result__voice' onClick={handleVoicePlay}>
              <SoundOutline
                className='object-recognition-result__voice-icon'
                style={{ color: isPlaying ? '#9E2A2B' : '#515151' }}
              />
            </div>
          </div>
          <div className="object-recognition-result__content">
            <div className='object-recognition-result__description'>
              <h4>器物考释 {data?.name ? `· ${data.name}` : ''} {data?.dynasty ? `（${data.dynasty}）` : ''}</h4>
              <p>{data?.image_description || data?.description || '暂无考释'}</p>
            </div>
            <div className='object-recognition-result__safety'>
              <h4>文人品鉴心得 {data?.score ? `【品位鉴值：${data.score} 分】` : ''}</h4>
              <p>{data?.safety || (data?.score ? `金石大家赞曰：此物形制典雅，颇具${data.dynasty || '唐宋'}风骨。` : '暂无品鉴心得')}</p>
            </div>
          </div>
          <audio src={data?.audio_url || null} ref={audioElement}></audio>
        </div>
      )
    }
  </div>
}
