import '../styles/aiChat.less'
import { useState, useRef, useEffect } from 'react'
import { DotLoading } from 'antd-mobile'
import { LeftOutline, MoreOutline, SoundOutline, SendOutline } from 'antd-mobile-icons'
import axios from '../http'
import { useLocation, useNavigate } from 'react-router-dom'

// 🎋 四大先贤人设（与后端 /api/deepseek/chat 的 sageId 映射一致）
const SAGES = {
  libai: {
    name: '李白',
    title: '诗仙',
    welcome: '吾乃青莲居士李太白。人生得意须尽欢，莫使金樽空对月——君有何言，愿与吾共论？',
  },
  sushi: {
    name: '苏轼',
    title: '东坡居士',
    welcome: '老夫苏轼，字子瞻。一蓑烟雨任平生，人间有味是清欢。且与君共话千年风骨。',
  },
  wangyangming: {
    name: '王阳明',
    title: '心学大家',
    welcome: '知行合一，心外无物。吾乃王守仁，愿与君论道于心，共探良知本体。',
  },
  liqingzhao: {
    name: '李清照',
    title: '易安居士',
    welcome: '奴家李清照，易安居士是也。寻寻觅觅，冷冷清清——愿与君共赏词中婉约风骨。',
  },
}

const DEFAULT_SAGE = 'libai'

class HandleMessages {
  constructor(welcome) {
    this.messages = []
    this.welcome = welcome
  }
  createMessage = (id, role, content, timestamp) => {
    return { id, role, content, timestamp }
  }
  initMessages = () => {
    if (this.messages.length === 0) {
      this.messages.push(this.createMessage(Date.now(), 'ai', this.welcome, new Date().toLocaleString()))
    }
  }
  addMessage = (message) => {
    this.messages.push(message)
  }
  getMessages = () => this.messages
}

export default function AiChat() {
  const [flag, setFlag] = useState(0)
  const msg = useRef({})
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  // 阶段二：从观藏先贤画廊带入 sageId，动态显示先贤名号与古风欢迎语
  const sageId = location.state?.sageId || DEFAULT_SAGE
  const sage = SAGES[sageId] || SAGES[DEFAULT_SAGE]

  useEffect(() => {
    msg.current = new HandleMessages(sage.welcome)
    msg.current.initMessages()
    setFlag(flag + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sageId])

  const handleSendMessage = async () => {
    const content = textareaRef.current.value.trim()
    if (!content) return

    // 显示用户的输入
    const userMessage = msg.current.createMessage(Date.now(), 'user', content, new Date().toLocaleString())
    msg.current.addMessage(userMessage)
    setFlag(flag + 1)
    textareaRef.current.value = ''

    // 发请求（携带 sageId，后端按先贤人设注入性格）
    setIsLoading(true)
    try {
      const res = await axios.post('/api/deepseek/chat', {
        sageId,
        message: content,
      })
      const aiMessage = msg.current.createMessage(Date.now(), 'ai', res.data.message, new Date().toLocaleString())
      msg.current.addMessage(aiMessage)
    } catch {
      msg.current.addMessage(
        msg.current.createMessage(Date.now(), 'ai', '墨迹未干，请稍后再试……', new Date().toLocaleString())
      )
    } finally {
      setIsLoading(false)
      setFlag(flag + 1)
    }
  }

  return (
    <div className='ai-dialogue-root'>
      <header className='ai-dialogue-header'>
        <div className="ai-dialogue-header__back" onClick={() => navigate(-1)}>
          <LeftOutline />
        </div>
        <h1>{sage.name} · {sage.title}</h1>
        <div className="ai-dialogue-header__more">
          <MoreOutline />
        </div>
      </header>

      <div className='ai-dialogue-main'>
        <div className="ai-dialogue-messages">
          {/* 消息列表（首条即先贤古风欢迎语） */}
          {
            msg.current.getMessages?.().map(message => (
              <div className={`ai-dialogue-message ${message.role === 'user' ? 'user-message' : 'ai-message'}`} key={message.id}>
                <div className="ai-dialogue-message__content">
                  <div className="ai-dialogue-message__text">{message.content}</div>
                  <div className="ai-dialogue-message__time">{message.timestamp}</div>
                </div>
              </div>
            ))
          }

          {/* ai回复加载中 */}
          {
            isLoading && (
              <div className="ai-dialogue-message ai-message">
                <div className="ai-dialogue-message__content">
                  <span style={{ fontSize: 20 }}>
                    <DotLoading />
                  </span>
                </div>
              </div>
            )
          }

        </div>
      </div>

      <footer className='ai-dialogue-footer'>
        <div className="ai-dialogue-input-container">
          <textarea
            className='ai-dialogue-input'
            placeholder={`与${sage.name}论道……`}
            rows={1}
            ref={textareaRef}
          ></textarea>

          <div className="ai-dialogue-actions">
            <button className={`ai-dialogue-voice-btn ${isRecording ? 'recording' : ''}`} onClick={() => setIsRecording(!isRecording)}>
              <SoundOutline />
            </button>

            <button className="ai-dialogue-send-btn" onClick={handleSendMessage}>
              <SendOutline />
            </button>

          </div>

        </div>
        {
          isRecording && (
            <div className="ai-dialogue-recording-indicator">
              <p>正在录音...</p>
            </div>
          )
        }
      </footer>
    </div>
  )
}
