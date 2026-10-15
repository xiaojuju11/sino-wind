import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LeftOutline } from 'antd-mobile-icons'
import InkWashBackground from '../components/InkWashBackground'
import EmptyState from '../components/EmptyState'
import '../styles/notFound.less'

/**
 * 🏮 404 迷津问渡路由兜底页（两宋水墨意境）
 */
export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className='not-found-page'>
      <InkWashBackground />

      <header className='not-found-header'>
        <button
          type='button'
          className='not-found-header__back'
          onClick={() => navigate('/home')}
          aria-label='返回雅集'
          title='返回雅集'
        >
          <LeftOutline />
        </button>
        <span className='not-found-header__seal'>云山竹简</span>
        <span style={{ width: 38 }} aria-hidden='true' />
      </header>

      <main className='not-found-body'>
        <div className='not-found-code-badge'>肆零肆 · 迷津</div>

        <EmptyState
          seal='迷津'
          title='误入藕花深处 · 迷津问渡'
          desc='山重水复，烟波浩渺，阁下所涉之径似未通幽。何不沿青石古道，重返雅集？'
          actionText='重返雅集'
          onAction={() => navigate('/home')}
        />

        <div className='not-found-footer-couplet'>
          <span>溪回松石暗</span>
          <span className='couplet-dot'>·</span>
          <span>幽迳不知迷</span>
        </div>
      </main>
    </div>
  )
}
