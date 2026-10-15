import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LeftOutline, SearchOutline, FileOutline, RightOutline, HeartOutline, CloseOutline } from 'antd-mobile-icons'
import { Toast, Modal } from 'antd-mobile'
import axios from '../http'
import EmptyState from '../components/EmptyState'
import '../styles/poemCollection.less'
import InkWashBackground from '../components/InkWashBackground'
import '../styles/referencePolish.less'

// 古典兜底名篇（若后端未连接或新用户暂无收藏时展示）
const defaultPoems = [
  {
    id: 1,
    title: '水调歌头·明月几时有',
    author: '苏轼',
    dynasty: '宋代',
    seal: '东坡',
    content: '明月几时有？把酒问青天。不知天上宫阙，今夕是何年。我欲乘风归去，又恐琼楼玉宇，高处不胜寒。起舞弄清影，何似在人间。',
    appreciation: '丙辰中秋，欢饮达旦，大醉，作此篇，兼怀子由。东坡借明月抒发对人间生活的无限热爱与豁达心境。',
    created_at: '2026-10-11'
  },
  {
    id: 2,
    title: '将进酒',
    author: '李白',
    dynasty: '唐代',
    seal: '太白',
    content: '君不见黄河之水天上来，奔流到海不复回。君不见高堂明镜悲白发，朝如青丝暮成雪。人生得意须尽欢，莫使金樽空对月。天生我材必有用，千金散尽还复来。',
    appreciation: '全诗极具浪漫主义豪情，笔势雄奇，音节起伏跌宕，将诗仙李白狂放不羁与高绝自信展现得淋漓尽致。',
    created_at: '2026-10-11'
  },
  {
    id: 3,
    title: '定风波·莫听穿林打叶声',
    author: '苏轼',
    dynasty: '宋代',
    seal: '雪堂',
    content: '莫听穿林打叶声，何妨吟啸且徐行。竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。料峭春风吹酒醒，微冷，山头斜照却相迎。回首向来萧瑟处，归去，也无风雨也无晴。',
    appreciation: '通过途中遇雨的生活小事，表达苏轼在人生逆境中从容超脱、随遇而安的豁达风骨。',
    created_at: '2026-10-10'
  },
  {
    id: 4,
    title: '如梦令·常记溪亭日暮',
    author: '李清照',
    dynasty: '宋代',
    seal: '易安',
    content: '常记溪亭日暮，沉醉不知归路。兴尽晚回舟，误入藕花深处。争渡，争渡，惊起一滩鸥鹭。',
    appreciation: '易安居士早年词作代表，词风活泼清新，生动展现少女时代泛舟嬉游的纯真与烂漫。',
    created_at: '2026-10-09'
  }
]

export default function PoemCollection() {
  const navigate = useNavigate()
  const [poems, setPoems] = useState(defaultPoems)
  const [searchKey, setSearchKey] = useState('')
  const [activePoem, setActivePoem] = useState(null)

  // 1. 获取用户收藏的诗笺列表
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.get('/api/poem/my-list').then(res => {
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setPoems(res.data.data)
        }
      }).catch(() => {
        // 后端接口未就绪时保留设计稿经典诗卷兜底
      })
    }
  }, [])

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
    Modal.confirm({
      title: '退卷归架',
      content: '确定要将此诗笺从您的书斋珍藏中移出吗？',
      confirmText: '移出',
      cancelText: '保留',
      onConfirm: async () => {
        try {
          const res = await axios.post('/api/poem/remove', { id: poemId })
          setPoems(prev => prev.filter(p => p.id !== poemId))
          Toast.show({ content: res.data?.message || '已成功退卷归架', icon: 'success' })
        } catch {
          setPoems(prev => prev.filter(p => p.id !== poemId))
          Toast.show({ content: '已移出诗笺', icon: 'success' })
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
          <span className='collection-header__count'>共 {poems.length} 卷</span>
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
        {filteredPoems.length === 0 ? (
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
                    onClick={(e) => handleRemovePoem(e, poem.id)}
                    title='移出珍藏'
                  >
                    移出
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
