import axios from 'axios'
import { Toast } from 'antd-mobile'//轻提示组件，请求出错时自动弹出错误消息

axios.timeout = 15000  // 请求超时时间：15 秒，适配大模型与长文交互
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || ''  // 优先读取环境变量，本地开发走相对路径代理
axios.defaults.headers.post['Content-Type'] = 'application/json'// POST 请求默认发送 JSON 格式数据  所有 POST 自动告诉后端：我发的是 JSON


// 请求拦截
// 登录成功后，把 token 存在 localStorage
// 每次发请求都会自动带上 token
// 后端就能识别你是谁、是否登录
axios.interceptors.request.use(request => {
  const token = localStorage.getItem('token')// 从本地缓存拿 token（登录后后端返回的令牌）
  if (token) {
    request.headers.Authorization = token // 如果有 token，就自动加到请求头里
  }
  return request // 放行请求
})

// 响应拦截
axios.interceptors.response.use(
  (response) => {
    if (response.data && response.data.code !== 1) {
      Toast.show({
        icon: 'fail',
        content: response.data.message || '操作未完成'
      })
      return Promise.reject(response)
    }
    return response
  },
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message || '服务响应异常'

    Toast.show({
      icon: 'fail',
      content: message
    })

    if (status === 416 || status === 401) {
      localStorage.removeItem('token')
      setTimeout(() => {
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }, 1500)
    }

    return Promise.reject(error)
  }
)

export default axios