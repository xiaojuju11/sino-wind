const Router = require('koa-router')
const { deepseekChatStream, deepseekChat, translateYayan, soulScholar, appreciatePoem } = require('../controllers/deepseekController.js')
const { optionalToken, verifyToken } = require('../utils/jwt.js')

const router = new Router({
  prefix: '/api/deepseek'
})

// 1. 先贤对话畅论（附可选鉴权，登录用户自动累计 debate_count 论道修持）
router.post('/chat', optionalToken(), deepseekChat)
router.post('/chat/stream', optionalToken(), deepseekChatStream)

// 2. 白话雅译接口（附可选鉴权，登录用户自动累计 yayan_count 雅言修持）
router.post('/yayan', optionalToken(), translateYayan)

// 3. AI 一键考释赋魂 (输入历史诗人 -> 生成生平纪略、朋友圈、文风标签)
router.post('/soul', soulScholar)

// 4. 古诗词深度雅析与先贤亲解
router.post('/appreciate', optionalToken(), appreciatePoem)

const feihua = require('../controllers/feihuaController')
router.get('/feihua/rules', feihua.rules)
router.post('/feihua/start', optionalToken(), feihua.start)
router.post('/feihua/turn', optionalToken(), feihua.turn)
router.get('/feihua/records', verifyToken(), feihua.records)
router.get('/feihua/records/:id', verifyToken(), feihua.record)

module.exports = router