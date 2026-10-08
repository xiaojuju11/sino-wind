import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { List, Avatar, ActionSheet, ImageViewer, Toast, Popup, Button, Input } from 'antd-mobile'
import axios from '../http'
import '../styles/accountSetting.less'

const actions = [
  { text: '从相册选择', key: 'select' }
]

export default function AccountSetting() {
  const navigate = useNavigate()
  const [avatar, setAvatar] = useState('')
  const [nickname, setNickname] = useState('')
  const [account, setAccount] = useState('')

  const [visible, setVisible] = useState(false)
  const inputRef = useRef(null)
  const [visibleImage, setVisibleImage] = useState(false)
  const [previewAvatar, setPreviewAvatar] = useState('')
  const [visiblePopup, setVisiblePopup] = useState(false)
  const [newNickname, setNewNickname] = useState('')

  const [visiblePopupPassword, setVisiblePopupPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [oldPassword, setOldPassword] = useState('')

  useEffect(() => {
    // 从后端获取用户信息
    axios.get('/api/auth/info').then(res => {
      console.log(res.data)
      setAvatar(res.data.avatar)
      setNickname(res.data.nickname)
      setNewNickname(res.data.nickname)
      setAccount(res.data.phone)
    })
  }, [])

  // 预览 base64 图片
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    // 预览图片
    setVisibleImage(true)
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      setPreviewAvatar(reader.result)
    }

  }

  const uploadAvatar = async () => {
    try {
      // 限制上传图片大小为 1MB 
      if (previewAvatar.length > 1 * 1024 * 1024) {
        Toast.show({
          content: '图片大小不能超过 1MB',
          duration: 2000,
          icon: 'fail',
        })
        return
      }

      // 向后端上传图片
      const params = {
        avatar: previewAvatar
      }
      const res = await axios.post('/api/auth/updateAvatar', params)
      // console.log(res);

      Toast.show({
        content: res.data.message,
        duration: 2000,
        icon: 'success',
      })
      setVisibleImage(false)
      setAvatar(previewAvatar)  // 更新头像
      inputRef.current.value = ''  // 保证下一次上传同一张图也会触发onChange


    } catch (error) {
      // 上传失败提示
      Toast.show({
        content: error.message,
        duration: 2000,
        icon: 'fail',
      })
    }

  }

  const updateNickname = async () => {
    const res = await axios.post('/api/auth/updateNickname', {
      nickname: newNickname
    })
    console.log(res);
    Toast.show({
      content: res.data.message,
      duration: 1000,
      icon: 'success',
      afterClose: () => {
        setVisiblePopup(false)
        setNickname(newNickname)
      }
    })

  }

  const updatePassword = async () => {
    const res = await axios.post('/api/auth/updatePassword', {
      oldPassword,
      newPassword
    })
    Toast.show({
      content: res.data.message,
      duration: 1000,
      icon: 'success',
      afterClose: () => {
        setVisiblePopupPassword(false)
        setOldPassword('')
        setNewPassword('')
      }
    })
    
  }

  return (
    <div className='account-setting'>
      {/* 共用了 ai 识物组件的头部样式 */}
      <header className='image-capture-header'>
        <button className='image-capture-header__back' onClick={() => navigate(-1)}>
          <i className='iconfont icon-fanhui'></i>
        </button>
        <h1>账号设置</h1>
        <div className="image-capture-header__placeholder"></div>
      </header>

      <section className='account-setting__section'>
        <List>
          <List.Item extra={<Avatar style={{ '--border-radius': '50%' }} src={avatar} size={40} />} clickable onClick={() => setVisible(true)}>头像</List.Item>
          <List.Item extra={nickname} clickable onClick={() => setVisiblePopup(true)}>昵称</List.Item>
          <List.Item extra={account} clickable>账号</List.Item>
          <List.Item extra='修改密码' clickable onClick={() => {
            setVisiblePopupPassword(true)
            setOldPassword('')
            setNewPassword('')
          }}>密码</List.Item>
          
        </List>
      </section>

      <input type="file" ref={inputRef} style={{ display: 'none' }} onChange={handleAvatarChange} />

      <ActionSheet
        visible={visible}
        actions={actions}
        onClose={() => setVisible(false)}
        cancelText='取消'
        onAction={(action, index) => {
          if (action.key === 'select') {
            // 从相册选择
            setVisible(false)
            inputRef.current.click()
          }
        }}
      />

      <ImageViewer
        classNames={{
          mask: 'customize-mask',
          body: 'customize-body',
        }}
        image={previewAvatar}
        visible={visibleImage}
        onClose={() => {
          setVisibleImage(false)
        }}
        renderFooter={() => (
          <div className='footer'>
            <div className='footerButton' onClick={uploadAvatar}>
              确认上传
            </div>
          </div>
        )}
      />

      {/* 修改昵称弹窗 */}
      <Popup
        visible={visiblePopup}
        showCloseButton
        position='right'
        onClose={() => {
          setVisiblePopup(false)
        }}
        afterShow={() => {
          setNewNickname(nickname)
        }}
      >
        <div className="update-nickname">
          <div className="update-nickname__title">新昵称:</div>
          <div className="update-nickname__input-container">
            <Input
              placeholder='请输入内容'
              value={newNickname}
              onChange={val => {
                setNewNickname(val)
              }}
            />
          </div>
        </div>
        <Button type='primary' block className='update-nickname__confirm' onClick={updateNickname}>确认</Button>
      </Popup>

      {/* 修改密码弹窗 */}
      <Popup
        visible={visiblePopupPassword}
        showCloseButton
        position='right'
        onClose={() => {
          setVisiblePopupPassword(false)
        }}
      >
        <div className="update-nickname">
          <div className="update-nickname__title">旧密码:</div>
          <div className="update-nickname__input-container">
            <Input
              placeholder='请输入旧密码'
              value={oldPassword}
              onChange={val => {
                setOldPassword(val)
              }}
            />
          </div>
          <div className="update-nickname__title">新密码:</div>
          <div className="update-nickname__input-container">
            <Input
              placeholder='请输入新密码'
              value={newPassword}
              onChange={val => {
                setNewPassword(val)
              }}
            />
          </div>
        </div>
        <Button type='primary' block className='update-nickname__confirm' onClick={updatePassword}>确认</Button>
      </Popup>
    </div>
  )
}