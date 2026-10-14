const Router = require('koa-router')
const { recognition } = require('../controllers/cozeController.js')
const { optionalToken } = require('../utils/jwt.js')

const router = new Router({
    prefix: '/api/coze',
})

// ai识物：支持已登录用户自动累加书斋鉴宝计数，未登录游客亦可体验
router.post('/recognition', optionalToken(), recognition)

module.exports = router