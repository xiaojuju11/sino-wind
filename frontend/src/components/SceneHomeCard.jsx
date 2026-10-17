import { useNavigate } from 'react-router-dom'
import { RightOutline } from 'antd-mobile-icons'
import ReferenceCorners from './ReferenceCorners'
import '../styles/scenePoetry.less'

export default function SceneHomeCard() {
  const navigate = useNavigate()
  return <section className='home-card-scroll scene-home-card'>
    <img className='scene-home-card__art' src={`${import.meta.env.BASE_URL}images/scene/poetic-lake-v1.webp`} alt='' aria-hidden='true' />
    <ReferenceCorners />
    <div className='home-section-header'><h2 className='home-section-title'>寻镜入诗</h2><span className='home-section-seal'>境</span></div>
    <p className='home-section-sub'>摄眼前山水，寻千年诗意。</p>
    <div className='scene-home-card__verse'><p>眼前皆有景，</p><p>心上自成诗。</p></div>
    <p className='scene-home-card__steps'>取景 · 识境 · 寻诗 · 藏卷</p>
    <button type='button' className='home-poem-more' onClick={() => navigate('/scene-poetry')}><span className='home-poem-more__text'>摄景寻诗</span><RightOutline className='home-poem-more__icon' aria-hidden='true' /></button>
  </section>
}
