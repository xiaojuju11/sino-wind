import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LeftOutline, SearchOutline, FileOutline, RightOutline, CloseOutline } from 'antd-mobile-icons'
import { Toast, Modal } from 'antd-mobile'
import axios from '../http'
import EmptyState from '../components/EmptyState'
import '../styles/poemCollection.less'
import InkWashBackground from '../components/InkWashBackground'
import '../styles/referencePolish.less'
import { useScholarScope } from '../utils/useScholarScope'

function PoemCollectionSession({ scope }) {
  const navigate = useNavigate()
  const [sessionToken] = useState(() => localStorage.getItem('token'))
  const [poems, setPoems] = useState([])
  const [status, setStatus] = useState(scope.startsWith('user:') ? 'loading' : 'guest')
  const [reload, setReload] = useState(0)
  const [removingId, setRemovingId] = useState(null)
  const removeLock = useRef(false)
  const mounted = useRef(true)
  const [searchKey, setSearchKey] = useState('')
  const [activePoem, setActivePoem] = useState(null)

  // 仅服务端真实收藏；空数组、读取失败和游客各自呈现状态。
  useEffect(() => {
    let alive = true
    mounted.current = true
    const token = sessionToken
    const valid = () => alive && token === localStorage.getItem('token')
    const load = async () => {
      if (!token || token !== localStorage.getItem('token') || !scope.startsWith('user:')) {
        setPoems([])
        setStatus('guest')
        return
      }
      setStatus('loading')
      try {
        const res = await axios.get('/api/poem/my-list', { timeout: 10000 })
        if (!valid()) return
        if (res.data?.code !== 1 || !Array.isArray(res.data.data)) throw new Error('Invalid collection response')
        setPoems(res.data.data)
        setStatus('ready')
      } catch {
        if (valid()) setStatus('error')
      }
    }
    load()
    return () => { alive = false; mounted.current = false }
  }, [scope, reload, sessionToken])

  // 过滤搜索
  const filteredPoems = poems.filter(item => {
    if (!searchKey.trim()) return true
    const kw = searchKey.trim().toLowerCase()
    return (
      item.title?.toLowerCase().includes(kw) ||
      item.author?.toLowerCase().includes(kw) ||
      item.content?.toLowerCase().includes(kw)
    )
  })

  // 携诗入席论道
  const handleChatWithSage = (poem) => {
    let sageKey = 'sushi'
    const author = poem?.author || ''
    if (author.includes('李白')) sageKey = 'libai'
    else if (author.includes('李清照')) sageKey = 'liqingzhao'
    else if (author.includes('王阳明')) sageKey = 'wangyangming'
    else if (author.includes('苏轼')) sageKey = 'sushi'

    navigate(`/chat/${sageKey}`, {
      state: {
        poemContext: {
          title: poem.title,
          author: poem.author,
          dynasty: poem.dynasty,
          paragraphs: typeof poem.content === 'string' ? poem.content.split(/[，。！？；\n]+/).filter(Boolean) : poem.content
        }
      }
    })
  }

  // 移除诗笺操作（服务端数据库同步与修持计数核销）
  const handleRemovePoem = (e, poemId) => {
    e.stopPropagation()
    const token = sessionToken
    if (!token || token !== localStorage.getItem('token') || !scope.startsWith('user:')) {
      Toast.show({ content: '请先登录入席，再管理诗笺', icon: 'fail' })
      return
    }
    Modal.confirm({
      title: '退卷归架',
      content: '确定要将此诗笺从您的书斋珍藏中移出吗？',
      confirmText: '移出',
      cancelText: '保留',
      onConfirm: async () => {
        if (!mounted.current || removeLock.current) return
        if (token !== localStorage.getItem('token')) {
          Toast.show({ content: '入席身份已变更，请重新打开诗笺', icon: 'fail' })
          return
        }
        removeLock.current = true
        setRemovingId(poemId)
        try {
          const res = await axios.post('/api/poem/remove', { id: poemId }, { timeout: 10000 })
          if (token !== localStorage.getItem('token')) return
          // code:1 包括服务端确认已不存在（removed:false）的幂等成功。
          if (res.data?.code !== 1) throw new Error('Removal not confirmed')
          window.dispatchEvent(new Event('userInfoUpdated'))
          if (!mounted.current) return
          setPoems(prev => prev.filter(p => p.id !== poemId))
          setActivePoem(prev => prev?.id === poemId ? null : prev)
          Toast.show({ content: res.data?.message || '已成功退卷归架', icon: 'success' })
        } catch {
          if (mounted.current && token === localStorage.getItem('token')) {
            Toast.show({ content: '移出失败，诗笺已保留，请稍后重试', icon: 'fail' })
          }
        } finally {
          removeLock.current = false
          if (mounted.current) setRemovingId(null)
        }
      }
    })
  }

  return (
    <div className='poem-collection-root reference-polish'>
      <InkWashBackground />
      {/* 1. 顶部水墨意境题头 */}
      <header className='collection-header'>
        <button className='collection-header__back' onClick={() => navigate(-1)} aria-label='返回书斋'>
          <LeftOutline />
        </button>
        <div className='collection-header__title-box'>
          <h1 className='collection-header__title'>我的诗笺</h1>
          <span className='collection-header__seal'>墨隐珍藏</span>
        </div>
        <div className='collection-header__actions'>
          <span className='collection-header__count'>
            {status === 'ready' ? `共 ${poems.length} 卷` : status === 'loading' ? '载入中…' : status === 'error' ? '暂未获取' : '入席后查看'}
          </span>
        </div>
      </header>

      {/* 2. 检索栏 */}
      <div className='collection-search-wrap'>
        <div className='collection-search-box'>
          <SearchOutline className='collection-search-icon' />
          <input
            type='text'
            className='collection-search-input'
            placeholder='搜寻诗卷、先贤雅号或名句…'
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
          />
          {searchKey && (
            <button className='collection-search-clear' onClick={() => setSearchKey('')} aria-label='清空'>
              <CloseOutline />
            </button>
          )}
        </div>
      </div>

      {/* 3. 诗卷瀑布流列表 */}
      <main className='collection-list'>
        {status === 'loading' ? (
          <EmptyState seal='展卷' title='正在载入诗笺…' desc='正在读取您的珍藏，请稍候。' />
        ) : status === 'error' ? (
          <EmptyState seal='待续' title='诗笺暂未获取' desc='读取失败，请稍后重试。' actionText='重新载入 · 重试' onAction={() => setReload(value => value + 1)} />
        ) : status === 'guest' ? (
          <EmptyState seal='待席' title='登录入席后查看诗笺' desc='登录后即可查看与管理您的诗词珍藏。' actionText='前往入席' onAction={() => navigate('/login')} />
        ) : filteredPoems.length === 0 ? (
          <EmptyState
            seal={searchKey ? '未寻' : '案虚'}
            title={searchKey ? '未寻得匹配诗笺' : '案头尚虚 · 暂无诗笺'}
            desc={searchKey ? '换个关键字搜搜，如作者雅号、名句或词牌' : '浮生偷闲，何不移步古诗天地，展卷品读千古名作？'}
            actionText={searchKey ? '清空搜索词' : '前往展卷品读'}
            onAction={() => {
              if (searchKey) setSearchKey('')
              else navigate('/poem')
            }}
          />
        ) : (
          filteredPoems.map(poem => (
            <article
              key={poem.id}
              className='poem-card'
              onClick={() => setActivePoem(poem)}
            >
              <div className='poem-card__top'>
                <div className='poem-card__title-row'>
                  <h2 className='poem-card__title'>{poem.title}</h2>
                  <span className='poem-card__seal'>{poem.seal || '墨宝'}</span>
                </div>
                <div className='poem-card__author'>
                  〔{poem.dynasty || '唐宋'}〕{poem.author}
                </div>
              </div>

              <p className='poem-card__excerpt'>
                {poem.content}
              </p>

              <div className='poem-card__bottom'>
                <span className='poem-card__date'>摘录于 {poem.created_at || '甲辰年'}</span>
                <div className='poem-card__actions'>
                  <button
                    className='poem-card__del-btn'
                    disabled={removingId !== null}
                    onClick={(e) => handleRemovePoem(e, poem.id)}
                    title='移出珍藏'
                  >
                    {removingId === poem.id ? '移出中…' : '移出'}
                  </button>
                  <span className='poem-card__read-more'>
                    细品 <RightOutline />
                  </span>
                </div>
              </div>
            </article>
          ))
        )}
      </main>

      {/* 4. 细品诗卷展开弹窗 (高保真宣纸长卷) */}
      {activePoem && (
        <div className='poem-modal-mask' onClick={() => setActivePoem(null)}>
          <div className='poem-modal-paper' onClick={(e) => e.stopPropagation()}>
            <span className='poem-modal-roller top' />
            <div className='poem-modal-header'>
              <span className='poem-modal-seal'>{activePoem.dynasty} · {activePoem.seal || '精选'}</span>
              <h2 className='poem-modal-title'>{activePoem.title}</h2>
              <p className='poem-modal-author'>【{activePoem.dynasty}】{activePoem.author}</p>
            </div>

            <div className='poem-modal-content'>
              <p className='poem-modal-verse'>
                {activePoem.content}
              </p>
            </div>

            {activePoem.appreciation && (
              <div className='poem-modal-appreciation'>
                <div className='appreciation-tag'>
                  <FileOutline /> 先贤品鉴
                </div>
                <p className='appreciation-text'>{activePoem.appreciation}</p>
              </div>
            )}

            <div className='poem-modal-actions'>
              <button
                type='button'
                className='poem-modal-action-btn--sage'
                onClick={() => handleChatWithSage(activePoem)}
              >
                携诗入席 · 与{activePoem.author}论道 →
              </button>
              <button type='button' className='poem-modal-close-btn' onClick={() => setActivePoem(null)}>
                卷 轴 归 架
              </button>
            </div>
            <span className='poem-modal-roller bottom' />
          </div>
        </div>
      )}
    </div>
  )
}

export default function PoemCollection() {
  const scope = useScholarScope()
  return <PoemCollectionSession key={scope} scope={scope} />
}
