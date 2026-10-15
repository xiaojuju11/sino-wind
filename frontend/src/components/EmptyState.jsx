import React from 'react'
import './emptyState.less'

/**
 * 🏮 国风意境空状态组件（两宋文人留白美学）
 * @param {string} seal - 篆体朱批印章文字（如 '案虚'、'待题'、'留白'）
 * @param {string} title - 主标题（如 '案头尚虚 · 暂无墨迹'）
 * @param {string} desc - 说明意境（如 '何不移步雅集，探寻千古器物与诗笺？'）
 * @param {string} actionText - 操作按钮文字（如 '前往雅集'）
 * @param {function} onAction - 点击回调
 * @param {string} className - 外部类名
 */
export default function EmptyState({
  seal = '案虚',
  title = '案头尚虚 · 暂无墨迹',
  desc = '浮生半日，何不移步雅集，探寻千古器物与诗笺？',
  actionText,
  onAction,
  className = ''
}) {
  return (
    <div className={`empty-state-root ${className}`} role='status'>
      {/* 1. 水墨微澜光晕背底 */}
      <div className='empty-state__aura' aria-hidden='true'>
        <span className='empty-state__ripple ripple-1' />
        <span className='empty-state__ripple ripple-2' />
        <span className='empty-state__cloud' />
      </div>

      {/* 2. 两宋金石朱砂印章 */}
      <div className='empty-state__seal-wrap' aria-hidden='true'>
        <div className='empty-state__seal'>
          <span className='empty-state__seal-border-outer' />
          <span className='empty-state__seal-border-inner' />
          <span className='empty-state__seal-text'>{seal}</span>
        </div>
      </div>

      {/* 3. 诗意文辞 */}
      <h3 className='empty-state__title'>{title}</h3>
      <p className='empty-state__desc'>{desc}</p>

      {/* 4. 可选的国风行动按键 */}
      {actionText && (
        <button
          type='button'
          className='empty-state__action-btn'
          onClick={onAction}
        >
          <i className='iconfont icon-shuben empty-state__btn-icon' aria-hidden='true' />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  )
}
