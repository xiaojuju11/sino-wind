import React from 'react'

export default function DesktopStageWings() {
  return (
    <aside className="desktop-stage-wings" aria-hidden="true">
      {/* 左翼看板：天象时令与九州经纬 */}
      <div className="desktop-stage-wing desktop-stage-wing--left">
        <div className="stage-panel">
          <div className="stage-panel__header">
            <span className="stage-seal">华风</span>
            <div>
              <h2 className="stage-title">云山竹简 · 华风雅集</h2>
              <span className="stage-subtitle">第17届全国大学生计算机设计大赛 (CMIT) · 数字媒体类</span>
            </div>
          </div>

          <div className="stage-card">
            <h3 className="stage-card__heading">〔天象时令与九州经纬〕</h3>
            <div className="stage-card__row">
              <span className="stage-label">天象时辰</span>
              <span className="stage-val">两宋十二时辰映照 · 实时日晷推演</span>
            </div>
            <div className="stage-card__row">
              <span className="stage-label">城邑文脉</span>
              <span className="stage-val">全国 359 座历史名城风华谱系</span>
            </div>
            <div className="stage-card__row">
              <span className="stage-label">算法底座</span>
              <span className="stage-val stage-val--gold">自研平水韵 106 部 · 8988 韵字确定性推导</span>
            </div>
          </div>

          <div className="stage-card">
            <h3 className="stage-card__heading">〔水墨流体粒子物理引擎〕</h3>
            <p className="stage-card__text">
              Canvas 原生物理仿真：融合表面张力系数、宣纸毛细管扩散效应与惯性阻尼衰减三力模型，毫秒级水墨绽放。
            </p>
          </div>
        </div>
      </div>

      {/* 右翼看板：千古先贤与安全壁垒 */}
      <div className="desktop-stage-wing desktop-stage-wing--right">
        <div className="stage-panel">
          <div className="stage-panel__header">
            <span className="stage-seal">风骨</span>
            <div>
              <h2 className="stage-title">千古先贤 · 墨隐修持</h2>
              <span className="stage-subtitle">跨朝代文人雅士空间与安全防御护栏</span>
            </div>
          </div>

          <div className="stage-card">
            <h3 className="stage-card__heading">〔先贤人格锚定矩阵〕</h3>
            <div className="sage-pills">
              <span className="sage-pill">李白 · 盛唐谪仙</span>
              <span className="sage-pill">李清照 · 婉约清词</span>
              <span className="sage-pill">苏轼 · 豪放旷达</span>
              <span className="sage-pill">王阳明 · 心学校勘</span>
            </div>
          </div>

          <div className="stage-card">
            <h3 className="stage-card__heading">〔反出戏攻防证据体系〕</h3>
            <div className="stage-card__row">
              <span className="stage-label">攻防拦截</span>
              <span className="stage-val stage-val--green">70 组越狱与现代指令拦截 · 0 出戏</span>
            </div>
            <div className="stage-card__row">
              <span className="stage-label">视听生态</span>
              <span className="stage-val stage-val--green">Web Audio 算法五音合成 · 零版权侵权</span>
            </div>
            <div className="stage-card__row">
              <span className="stage-label">高可用容灾</span>
              <span className="stage-val">文博典范双轨秒级回退 · 答辩断网保障</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
