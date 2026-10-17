import { useNavigate } from 'react-router-dom'
import { RightOutline } from 'antd-mobile-icons'
import ReferenceCorners from './ReferenceCorners'
import '../styles/poetryFrequency.less'

export default function FrequencyHomeCard() {
  const navigate = useNavigate()
  return <section className='home-card-scroll frequency-home-card'>
    <img className='frequency-home-card__art' src={`${import.meta.env.BASE_URL}images/frequency/poetry-desk-v1.webp`} alt='' aria-hidden='true' loading='lazy' />
    <ReferenceCorners />
    <div className='home-section-header'><h2 className='home-section-title'>诗海字衡</h2><span className='home-section-seal'>衡</span></div>
    <p className='home-section-sub'>数一字千回，见万卷风华。</p>
    <div className='frequency-home-card__verse'><p>字里有山河，</p><p>诗中见万象。</p></div>
    <p className='frequency-home-card__steps'>选集 · 观频 · 寻句 · 读诗</p>
    <button type='button' className='home-poem-more' onClick={() => navigate('/poetry-frequency')}><span className='home-poem-more__text'>入卷观字</span><RightOutline className='home-poem-more__icon' aria-hidden='true' /></button>
  </section>
}
