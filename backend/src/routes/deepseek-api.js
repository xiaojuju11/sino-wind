const Router = require('koa-router')
const { deepseekChat, translateYayan, soulScholar } = require('../controllers/deepseekController.js')
const { verifyToken } = require('../utils/jwt.js')


const router = new Router({
  prefix: '/api/deepseek'
})

router.post('/chat', verifyToken(), deepseekChat)

// 白话雅译（TRD §4.1）：无鉴权要求，未入席也可试用首页雅译
router.post('/yayan', translateYayan)

// AI 一键考释赋魂（TRD §4.2）：无鉴权要求，迎请抽屉可直接调用
router.post('/soul', soulScholar)

module.exports = router
