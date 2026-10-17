import { useNavigate } from 'react-router-dom'
import { CameraOutline, PictureOutline, RightOutline } from 'antd-mobile-icons'
import ReferenceCorners from './ReferenceCorners'
import { playInkDropSound, triggerHaptic } from '../utils/guofengAudio'
import '../styles/scenePoetry.less'

export default function SceneHomeCard() {
  const navigate = useNavigate()

  const handleAction = (action) => {
    triggerHaptic(18)
    playInkDropSound()
    navigate(`/scene-poetry?action=${action}`)
  }

  const handleOpenArchive = (e) => {
    e.stopPropagation()
    triggerHaptic(15)
    playInkDropSound()
    navigate('/mine/scenes')
  }

  return (
    <section className="home-card-scroll scene-home-card is-primary-storyline">
      <ReferenceCorners />

      {/* ── 标题与传统雅致印章 ── */}
      <div className="home-section-header">
        <div className="home-section-title-wrap">
          <span className="scene-home-card__tag">山水入镜 · 照见千古诗心</span>
          <h2 className="home-section-title">寻镜入诗</h2>
        </div>
        <span className="home-section-seal">寻境</span>
      </div>

      <p className="home-section-sub">
        摄下眼前风景，点选草木山石，与千载诗心相逢。
      </p>

      {/* ── 诗境画卷展台（宋代水墨卷轴画框）── */}
      <div
        className="scene-home-stage"
        role="button"
        tabIndex={0}
        onClick={() => handleAction('sample')}
        title="点击展看西湖山水画卷示例"
      >
        <img
          className="scene-home-stage__art"
          src={`${import.meta.env.BASE_URL}images/scene/poetic-lake-v1.webp`}
          alt="西湖初晴山水画卷"
          loading="lazy"
        />
        <div className="scene-home-stage__scrim" />
        <div className="scene-home-stage__content">
          <div className="scene-home-stage__couplet">
            <p className="couplet-line">水光潋滟晴方好</p>
            <p className="couplet-line">山色空蒙雨亦奇</p>
            <span className="couplet-author">苏轼 · 饮湖上初晴后雨</span>
          </div>

          <div className="scene-home-stage__footer-row">
            <div className="scene-home-stage__pills">
              <span className="stage-pill">✦ 湖光</span>
              <span className="stage-pill">✦ 远峰</span>
              <span className="stage-pill">✦ 烟雨</span>
            </div>
            <div className="scene-home-stage__hint">
              <span>试赏画卷</span>
              <RightOutline className="hint-arrow" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 雅致行动按钮组 ── */}
      <div className="scene-home-card__actions">
        <button
          type="button"
          className="scene-home-btn scene-home-btn--primary"
          onClick={() => handleAction('camera')}
        >
          <CameraOutline className="scene-home-btn__icon" />
          <span>拍眼前景</span>
        </button>

        <button
          type="button"
          className="scene-home-btn scene-home-btn--secondary"
          onClick={() => handleAction('upload')}
        >
          <PictureOutline className="scene-home-btn__icon" />
          <span>相册选景</span>
        </button>
      </div>

      {/* ── 画阁快速入口 ── */}
      <div className="scene-home-card__footer">
        <button
          type="button"
          className="scene-home-card__archive-link"
          onClick={handleOpenArchive}
        >
          <span>已藏画卷 · 前往诗境画阁</span>
          <RightOutline className="scene-home-card__archive-arrow" />
        </button>
      </div>
    </section>
  )
}
