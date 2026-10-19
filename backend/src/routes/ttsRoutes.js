const Router = require('koa-router')
const { handleTTS } = require('../controllers/ttsController')

const router = new Router({ prefix: '/api/tts' })

router.all('/synthesize', handleTTS)
router.all('/', handleTTS)

module.exports = router
