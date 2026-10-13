const Router = require('koa-router')
const { random, search, collect, collection, myList } = require('../controllers/poemController')
const { appreciatePoem } = require('../controllers/deepseekController')
const { verifyToken, optionalToken } = require('../utils/jwt')
const router = new Router({ prefix: '/api/poem' })
router.get('/random', random)
router.get('/search', search)
router.post('/collect', verifyToken(), collect)
router.get('/collection', verifyToken(), collection)
router.get('/my-list', verifyToken(), myList)
router.post('/appreciate', optionalToken(), appreciatePoem)
module.exports = router

