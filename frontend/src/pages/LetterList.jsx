import React, { useState, useEffect } from 'react'
import '../styles/letterList.less'
import { useNavigate } from 'react-router-dom'
import { AddOutline } from 'antd-mobile-icons'
import InviteDrawer from '../components/InviteDrawer'

const BASE = import.meta.env.BASE_URL

// 经典预置先贤与信札
const PRESET_CONVERSATIONS = [
  {
    id: 'libai',
    name: '李白',
    title: '谪仙人',
    dynasty: '唐',
    avatar: `${BASE}assets/guancang/sage_libai.png`,
    lastMsg: '仰天大笑出门去，我辈岂是蓬蒿人！今日且共饮三百杯，不醉不归。',
    time: '申时三刻',
    unread: 1,
    status: '把酒对月中'
  },
  {
    id: 'group_zhulin',
    name: '竹林雅集 · 群聊',
    title: '魏晋名士',
    dynasty: '群',
    avatar: `${BASE}assets/guancang/scroll_changhe.png`,
    lastMsg: '嵇康：广陵散绝矣，诸君且听此一曲。山涛：神交已久，且赋新诗！',
    time: '申时初刻',
    unread: 2,
    status: '雅士齐聚'
  },
  {
    id: 'sushi',
    name: '苏轼',
    title: '东坡居士',
    dynasty: '宋',
    avatar: `${BASE}assets/guancang/sage_sushi.png`,
    lastMsg: '人生如逆旅，我亦是行人。今日吾又作东坡肉，君欲尝否？',
    time: '午时二刻',
    unread: 0,
    status: '烹茶赋词'
  },
  {
    id: 'liqingzhao',
    name: '李清照',
    title: '易安居士',
    dynasty: '宋',
    avatar: `${BASE}assets/guancang/sage_liqingzhao.png`,
    lastMsg: '昨夜雨疏风骤，浓睡不消残酒。新词已就，且寄君阅。',
    time: '巳时末刻',
    unread: 0,
    status: '倚栏校词'
  },
  {
    id: 'dufu',
    name: '杜甫',
    title: '少陵野老',
    dynasty: '唐',
    avatar: `${BASE}assets/guancang/sage_wangyangming.png`,
    lastMsg: '安得广厦千万间，大庇天下寒士俱欢颜！念君远行，平安为盼。',
    time: '辰时三刻',
    unread: 0,
    status: '掩卷沉思'
  },
  {
    id: 'xinqiji',
    name: '辛弃疾',
    title: '稼轩居士',
    dynasty: '宋',
    avatar: `${BASE}assets/guancang/sage_libai.png`,
    lastMsg: '醉里挑灯看剑，梦回吹角连营。天下英雄，谁敌手？',
    time: '昨日',
    unread: 0,
    status: '挑灯看剑'
  }
]

export default function LetterList() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState(PRESET_CONVERSATIONS)
  const [drawerVisible, setDrawerVisible] = useState(false)

  // 读取本地迎请的自定义知己
  useEffect(() => {
    try {
      const customList = JSON.parse(localStorage.getItem('gufeng_custom_sages') || '[]')
      if (customList.length > 0) {
        const mapped = customList.map((item) => ({
          ...item,
          avatar: `${BASE}assets/guancang/sage_wangyangming.png`,
          status: '神游相候'
        }))
        setConversations([...mapped, ...PRESET_CONVERSATIONS])
      }
    } catch {
      // 降级使用预置列表
    }
  }, [])

  // 迎请新友成功回调
  const handleInviteSuccess = (newSage) => {
    const formatted = {
      ...newSage,
      avatar: `${BASE}assets/guancang/sage_wangyangming.png`,
      status: '新交对席'
    }
    setConversations((prev) => [formatted, ...prev])
  }

  // 点击知己进入沉浸对话
  const handleGoChat = (item) => {
    navigate(`/chat/${item.id}`, { state: { sage: item } })
  }

  return (
    <div className="letter-root">
      {/* 1. 顶部水墨意境题头 */}
      <header className="letter-header">
        <div className="letter-header__title-wrap">
          <h1 className="letter-header__title">知音信札</h1>
          <span className="letter-header__seal">鸿雁</span>
        </div>
        <p className="letter-header__subtitle">云笺素字 · 与千载知音烹茶对坐</p>
      </header>

      {/* 2. 顶部水平知己画卷（横向滑动 + 迎请新友按钮） */}
      <section className="letter-gallery-section">
        <div className="letter-gallery-scroll">
          {conversations.map((item) => (
            <div
              key={item.id}
              className="letter-gallery-item"
              onClick={() => handleGoChat(item)}
            >
              <div className="letter-gallery-avatar-box">
                <img src={item.avatar} alt={item.name} className="letter-gallery-avatar" />
                {item.unread > 0 && (
                  <span className="letter-unread-dot" />
                )}
              </div>
              <span className="letter-gallery-name">{item.name.split('·')[0]}</span>
            </div>
          ))}

          {/* 迎请新友 (+) 按钮 */}
          <div
            className="letter-gallery-item letter-gallery-item--invite"
            onClick={() => setDrawerVisible(true)}
          >
            <div className="letter-gallery-avatar-box letter-gallery-avatar-box--add">
              <AddOutline className="letter-add-icon" />
            </div>
            <span className="letter-gallery-name">迎请新友</span>
          </div>
        </div>
      </section>

      {/* 3. 信札往还列表 */}
      <section className="letter-list-section">
        <div className="letter-list-header">
          <span className="letter-list-title">尺素往来（{conversations.length} 席）</span>
          <span className="letter-list-tip">点击展开长谈</span>
        </div>

        <div className="letter-list">
          {conversations.map((item) => (
            <div
              key={item.id}
              className="letter-card"
              onClick={() => handleGoChat(item)}
            >
              <div className="letter-card__avatar-wrap">
                <img src={item.avatar} alt={item.name} className="letter-card__avatar" />
                <span className="letter-card__dynasty">{item.dynasty}</span>
              </div>

              <div className="letter-card__body">
                <div className="letter-card__top">
                  <div className="letter-card__names">
                    <span className="letter-card__name">{item.name}</span>
                    <span className="letter-card__title">【{item.title}】</span>
                  </div>
                  <span className="letter-card__time">{item.time}</span>
                </div>

                <div className="letter-card__bottom">
                  <p className="letter-card__snippet">{item.lastMsg}</p>
                  {item.unread > 0 && (
                    <span className="letter-card__badge">{item.unread}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 迎请新友抽屉 */}
      <InviteDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onInviteSuccess={handleInviteSuccess}
      />
    </div>
  )
}
