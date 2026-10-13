const Router = require('koa-router')
const multer = require('@koa/multer')
const { checkFile, uploadChunk, mergeChunks } = require('../controllers/uploadController.js')
const { verifyToken } = require('../utils/jwt.js')

const router = new Router({
  prefix: '/api/upload'
})

// 单个分片大小限制为 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
})

// 检查文件（秒传 / 断点续传查询）
router.post('/check', verifyToken(), checkFile)

// 分片上传
router.post('/chunk', verifyToken(), upload.single('chunk'), uploadChunk)

// 分片合并
router.post('/merge', verifyToken(), mergeChunks)

module.exports = router
