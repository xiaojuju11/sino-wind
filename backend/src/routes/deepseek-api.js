const Router = require('koa-router')
const { deepseekChat, translateYayan, soulScholar } = require('../controllers/deepseekController.js')

const router = new Router({
  prefix: '/api/deepseek'
})

// 1. 先贤对话畅论
router.post('/chat', deepseekChat)

// 2. 白话雅译接口 (日常大白话 -> 诗句名言与释义)
router.post('/yayan', translateYayan)

// 3. AI 一键考释赋魂 (输入历史诗人 -> 生成生平纪略、朋友圈、文风标签)
router.post('/soul', soulScholar)

module.exports = router