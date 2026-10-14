import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { List, Avatar, ActionSheet, Toast, Popup, Button, Input } from 'antd-mobile'
import axios from '../http'
import { LeftOutline, CloseOutline } from 'antd-mobile-icons'
import { uploadFileChunks, DEFAULT_CHUNK_SIZE } from '../utils/chunkUpload'
import '../styles/accountSetting.less'

const actions = [
  { text: '从相册选择（支持超大图片）', key: 'select' }
]

// 辅助函数：格式化字节大小
function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function AccountSetting() {
  const navigate = useNavigate()
  const [avatar, setAvatar] = useState('')
  const [nickname, setNickname] = useState('')
  const [account, setAccount] = useState('')

  const [visibleActionSheet, setVisibleActionSheet] = useState(false)
  const inputRef = useRef(null)

  // 🎋 大文件切片上传状态
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [visibleUploadPopup, setVisibleUploadPopup] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({
    percent: 0,
    uploadedCount: 0,
    totalChunks: 0,
    stage: 'idle',
    stageText: '等待开启切片上传'
  })
  const abortControllerRef = useRef(null)

  // 修改昵称与修改密码弹窗状态
  const [visiblePopup, setVisiblePopup] = useState(false)
  const [newNickname, setNewNickname] = useState('')

  const [visiblePopupPassword, setVisiblePopupPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [oldPassword, setOldPassword] = useState('')

  // 初始化获取用户信息
  useEffect(() => {
    let active = true
    axios.get('/api/auth/info').then(({ data }) => {
      if (!active) return
      setAvatar(data.avatar || '')
      setNickname(data.nickname || '云山居士')
      setNewNickname(data.nickname || '')
      setAccount(data.phone || '暂未获取')
    }).catch(() => {
      if (!active) return
      setAvatar('')
      setNickname('云山居士')
      setAccount('暂未获取')
      Toast.show({ content: '雅士信息暂未获取，请稍后重试' })
    })
    return () => { active = false }
  }, [])

  // 清理临时 ObjectURL，防止内存泄漏
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [previewUrl])

  // 处理选择图片文件
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 释放之前的 ObjectURL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }

    const objectUrl = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreviewUrl(objectUrl)
    setUploadProgress({
      percent: 0,
      uploadedCount: 0,
      totalChunks: Math.ceil(file.size / DEFAULT_CHUNK_SIZE),
      stage: 'idle',
      stageText: '待开启分片并发传输'
    })
    setVisibleUploadPopup(true)
  }

  // 关闭上传弹窗处理
  const handleCloseUploadPopup = () => {
    if (uploading) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      Toast.show({ content: '已中止切片上传' })
    }
    setUploading(false)
    setVisibleUploadPopup(false)
    if (inputRef.current) {
      inputRef.current.value = '' // 允许重复选择同名文件
    }
  }

  // 触发大文件切片上传并与后端闭环
  const handleStartChunkUpload = async () => {
    if (!selectedFile) return
    setUploading(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      // 1. 调用切片上传工具（计算Hash -> 校验秒传与断点 -> 并发分片 -> 流式合并）
      const uploadRes = await uploadFileChunks({
        file: selectedFile,
        chunkSize: DEFAULT_CHUNK_SIZE,
        concurrency: 3,
        onProgress: (p) => {
          setUploadProgress(p)
        },
        signal: controller.signal
      })

      const finalAvatarUrl = uploadRes.url

      // 2. 将最终头像 URL 更新到后端数据库用户资料中
      setUploadProgress(prev => ({
        ...prev,
        stageText: '切片传输完成，正在更新雅士名帖...'
      }))

      const updateRes = await axios.post('/api/auth/updateAvatar', {
        avatar: finalAvatarUrl
      })

      if (updateRes.data?.code === 1 || updateRes.status === 200) {
        Toast.show({
          content: uploadRes.isInstant ? '秒传命中！雅士新颜已焕新' : '大文件切片上传成功！雅士新颜已焕新',
          duration: 2000,
          icon: 'success'
        })
        setAvatar(finalAvatarUrl) // 更新当前设置页头像
        // 触发全局广播，联动个人中心等页面实时刷新
        window.dispatchEvent(new CustomEvent('userInfoUpdated', { detail: { avatar: finalAvatarUrl } }))
        setVisibleUploadPopup(false)
      } else {
        throw new Error(updateRes.data?.message || '更新头像资料失败')
      }
    } catch (err) {
      if (controller.signal.aborted) {
        Toast.show({ content: '上传已中止', icon: 'fail' })
      } else {
        console.error('Avatar chunk upload error:', err)
        Toast.show({
          content: err.response?.data?.message || err.message || '切片上传失败，请重试',
          duration: 2500,
          icon: 'fail'
        })
      }
    } finally {
      setUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  // 取消正在进行的上传
  const handleCancelUploading = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setUploading(false)
    setUploadProgress(prev => ({
      ...prev,
      stage: 'idle',
      stageText: '已取消上传，可随时重新开启'
    }))
  }

  // 修改昵称
  const updateNickname = async () => {
    try {
      const res = await axios.post('/api/auth/updateNickname', {
        nickname: newNickname
      })
      Toast.show({
        content: res.data.message || '昵称修改成功',
        duration: 1000,
        icon: 'success',
        afterClose: () => {
          setVisiblePopup(false)
          setNickname(newNickname)
          window.dispatchEvent(new CustomEvent('userInfoUpdated', { detail: { nickname: newNickname } }))
        }
      })
    } catch (err) {
      Toast.show({ content: err.message || '修改昵称失败', icon: 'fail' })
    }
  }

  // 修改密码
  const updatePassword = async () => {
    try {
      const res = await axios.post('/api/auth/updatePassword', {
        oldPassword,
        newPassword
      })
      Toast.show({
        content: res.data.message || '密码修改成功',
        duration: 1000,
        icon: 'success',
        afterClose: () => {
          setVisiblePopupPassword(false)
          setOldPassword('')
          setNewPassword('')
        }
      })
    } catch (err) {
      Toast.show({ content: err.message || '修改密码失败', icon: 'fail' })
    }
  }

  // 计算展示切片总数
  const totalChunksCount = selectedFile ? Math.ceil(selectedFile.size / DEFAULT_CHUNK_SIZE) : 0

  return (
    <div className='account-setting'>
      {/* 头部导航
          说明：题头右侧原有的 ThemeToggle 已删除；下方「墨色雅意」列表项也一并移除，
          本页不再提供日月切换入口（书斋页仅保留「墨色雅意」一处）。 */}
      <header className='image-capture-header'>
        <button className='image-capture-header__back' aria-label='返回上一页' onClick={() => navigate(-1)}>
          <LeftOutline aria-hidden="true" />
        </button>
        <h1 className='image-capture-header__title'>账号设置</h1>
        {/* 占位：保持 header 的 space-between 布局，让标题稳定居中 */}
        <span className='image-capture-header__spacer' aria-hidden='true' />
      </header>

      {/* 账号配置列表 */}
      <section className='account-setting__section'>
        <List>
          <List.Item
            extra={<Avatar style={{ '--border-radius': '50%' }} src={avatar} size={40} />}
            clickable
            onClick={() => setVisibleActionSheet(true)}
          >
            头像
          </List.Item>
          <List.Item extra={nickname} clickable onClick={() => setVisiblePopup(true)}>
            昵称
          </List.Item>
          <List.Item extra={account} clickable>
            账号
          </List.Item>
          <List.Item
            extra='修改密码'
            clickable
            onClick={() => {
              setVisiblePopupPassword(true)
              setOldPassword('')
              setNewPassword('')
            }}
          >
            密码
          </List.Item>
        </List>
      </section>

      {/* 隐藏的真实文件选择框（支持各类格式与超大文件） */}
      <input
        type="file"
        ref={inputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarChange}
      />

      {/* 头像选取动作面板 */}
      <ActionSheet
        visible={visibleActionSheet}
        actions={actions}
        onClose={() => setVisibleActionSheet(false)}
        cancelText='取消'
        onAction={(action) => {
          if (action.key === 'select') {
            setVisibleActionSheet(false)
            inputRef.current?.click()
          }
        }}
      />

      {/* 🎋 大文件切片上传专属模态抽屉 */}
      <Popup
        visible={visibleUploadPopup}
        position='bottom'
        onClose={handleCloseUploadPopup}
        className='chunk-upload-popup'
        destroyOnClose={false}
      >
        <div className='chunk-upload-box'>
          <div className='chunk-upload-box__header'>
            <div className='chunk-upload-box__title'>
              <span>换新雅照</span>
              <span className='chunk-upload-box__seal'>分片加速</span>
            </div>
            <div className='chunk-upload-box__close' onClick={handleCloseUploadPopup}>
              <CloseOutline />
            </div>
          </div>

          {/* 头像预览 */}
          <div className='chunk-upload-box__preview-wrap'>
            <img
              src={previewUrl || avatar}
              alt='待上传头像'
              className='chunk-upload-box__preview-avatar'
            />
          </div>

          {/* 文件切片元信息卡片 */}
          {selectedFile && (
            <div className='chunk-upload-box__info-card'>
              <div className='chunk-upload-box__info-row'>
                <span>图片名称</span>
                <span className='val'>{selectedFile.name}</span>
              </div>
              <div className='chunk-upload-box__info-row'>
                <span>文件体积</span>
                <span className='val'>{formatFileSize(selectedFile.size)}</span>
              </div>
              <div className='chunk-upload-box__info-row'>
                <span>分片规格</span>
                <span className='val'>{formatFileSize(DEFAULT_CHUNK_SIZE)} / 片</span>
              </div>
              <div className='chunk-upload-box__info-row'>
                <span>传输机制</span>
                <span className='badge-fast'>
                  {totalChunksCount > 1 ? `已切为 ${totalChunksCount} 分片 · 并发传输` : '单片极速上传'}
                </span>
              </div>
            </div>
          )}

          {/* 上传进度区 */}
          <div className='chunk-upload-box__progress-section'>
            <div className='chunk-upload-box__progress-head'>
              <span className='stage-txt'>{uploadProgress.stageText}</span>
              <span className='percent-txt'>{uploadProgress.percent}%</span>
            </div>
            <div className='chunk-upload-box__progress-track'>
              <div
                className='chunk-upload-box__progress-bar'
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
            <p className='chunk-upload-box__tip'>
              {uploading
                ? '已开启多通道并发切片上传与秒传校验，请稍候...'
                : '系统自动计算文件特征指纹，支持断点续传与极速秒传。'}
            </p>
          </div>

          {/* 操作按钮组 */}
          <div className='chunk-upload-box__actions'>
            {!uploading ? (
              <>
                <Button
                  className='chunk-upload-box__btn-reselect'
                  onClick={() => inputRef.current?.click()}
                >
                  重选图片
                </Button>
                <Button
                  className='chunk-upload-box__btn-start'
                  onClick={handleStartChunkUpload}
                >
                  确认切片上传
                </Button>
              </>
            ) : (
              <Button
                className='chunk-upload-box__btn-cancel'
                onClick={handleCancelUploading}
              >
                中止上传
              </Button>
            )}
          </div>
        </div>
      </Popup>

      {/* 修改昵称弹窗 */}
      <Popup
        visible={visiblePopup}
        showCloseButton
        position='right'
        onClose={() => setVisiblePopup(false)}
        afterShow={() => setNewNickname(nickname)}
      >
        <div className="update-nickname">
          <div className="update-nickname__title">新昵称:</div>
          <div className="update-nickname__input-container">
            <Input
              placeholder='请输入内容'
              value={newNickname}
              onChange={val => setNewNickname(val)}
            />
          </div>
        </div>
        <Button type='primary' block className='update-nickname__confirm' onClick={updateNickname}>
          确认
        </Button>
      </Popup>

      {/* 修改密码弹窗 */}
      <Popup
        visible={visiblePopupPassword}
        showCloseButton
        position='right'
        onClose={() => setVisiblePopupPassword(false)}
      >
        <div className="update-nickname">
          <div className="update-nickname__title">旧密码:</div>
          <div className="update-nickname__input-container">
            <Input
              placeholder='请输入旧密码'
              type='password'
              value={oldPassword}
              onChange={val => setOldPassword(val)}
            />
          </div>
          <div className="update-nickname__title">新密码:</div>
          <div className="update-nickname__input-container">
            <Input
              placeholder='请输入新密码'
              type='password'
              value={newPassword}
              onChange={val => setNewPassword(val)}
            />
          </div>
        </div>
        <Button type='primary' block className='update-nickname__confirm' onClick={updatePassword}>
          确认
        </Button>
      </Popup>
    </div>
  )
}