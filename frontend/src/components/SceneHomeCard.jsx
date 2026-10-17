import { useNavigate } from 'react-router-dom'
import { CameraOutline, PictureOutline, RightOutline, CheckCircleOutline } from 'antd-mobile-icons'
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
      <img
        className="scene-home-card__art"
        src={`${import.meta.env.BASE_URL}images/scene/poetic-lake-v1.webp`}
        alt="山水诗境背景"
        aria-hidden="true"
      />
      <ReferenceCorners />

      {/* ── 核心主线标签与标题 ── */}
      <div className="home-section-header">
        <div className="home-section-title-wrap">
          <span className="scene-home-card__main-tag">
            <span className="scene-home-card__pulse-dot" />
            国赛主线体验 · 实景诗词交互研习
          </span>
          <h2 className="home-section-title">寻镜入诗</h2>
        </div>
        <span className="home-section-seal">主线</span>
      </div>

      <p className="home-section-sub">
        拍下眼前校园、湖山与街景，点选景物，循词观景，照见千年诗境。
      </p>

      {/* ── 5步交互研习闭环链路 ── */}
      <div className="scene-home-pipeline" aria-label="实景诗词研习闭环">
        <div className="scene-home-pipeline__step">
          <span className="step-num">1</span>
          <span className="step-name">拍眼前景</span>
        </div>
        <span className="step-arrow" aria-hidden="true">→</span>
        <div className="scene-home-pipeline__step">
          <span className="step-num">2</span>
          <span className="step-name">点选景物</span>
        </div>
        <span className="step-arrow" aria-hidden="true">→</span>
        <div className="scene-home-pipeline__step">
          <span className="step-num">3</span>
          <span className="step-name">循证配诗</span>
        </div>
        <span className="step-arrow" aria-hidden="true">→</span>
        <div className="scene-home-pipeline__step">
          <span className="step-num">4</span>
          <span className="step-name">循词观景</span>
        </div>
        <span className="step-arrow" aria-hidden="true">→</span>
        <div className="scene-home-pipeline__step">
          <span className="step-num">5</span>
          <span className="step-name">问席藏卷</span>
        </div>
      </div>

      {/* ── 诗境画卷微预览与反向观景演示 ── */}
      <div className="scene-home-card__showcase">
        <div className="scene-home-card__verse-box">
          <p className="scene-home-card__verse-highlight">
            “水光潋滟晴方好，山色空蒙雨亦奇。”
          </p>
          <div className="scene-home-card__reverse-hint">
            <CheckCircleOutline className="scene-home-card__hint-icon" />
            <span>循词观景：点击诗中「水」，照片自动高亮湖面；点「山」，标示远峰</span>
          </div>
        </div>

        <div className="scene-home-card__tags-preview">
          <span className="preview-tag">水 · 湖面</span>
          <span className="preview-tag">山 · 远峰</span>
          <span className="preview-tag">树 · 柳岸</span>
          <span className="preview-tag preview-tag--sage">💬 携此景请教苏轼</span>
        </div>
      </div>

      {/* ── 首页即刻交互行动栏 ── */}
      <div className="scene-home-card__actions">
        <button
          type="button"
          className="scene-home-btn scene-home-btn--primary"
          onClick={() => handleAction('camera')}
        >
          <CameraOutline className="scene-home-btn__icon" />
          <span>拍下眼前风景</span>
        </button>

        <button
          type="button"
          className="scene-home-btn"
          onClick={() => handleAction('upload')}
        >
          <PictureOutline className="scene-home-btn__icon" />
          <span>相册选取</span>
        </button>

        <button
          type="button"
          className="scene-home-btn scene-home-btn--ghost"
          onClick={() => handleAction('sample')}
        >
          <span>示例画卷体验</span>
        </button>
      </div>

      {/* ── 画阁快速入口 ── */}
      <div className="scene-home-card__footer">
        <button
          type="button"
          className="scene-home-card__archive-link"
          onClick={handleOpenArchive}
        >
          <span>已收录诗境 · 前往诗境画阁</span>
          <RightOutline className="scene-home-card__archive-arrow" />
        </button>
      </div>
    </section>
  )
}
