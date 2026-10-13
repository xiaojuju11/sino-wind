const path = require('path')
const fs = require('fs')

// 基础目录配置
const PUBLIC_DIR = path.resolve(__dirname, '../../public')
const AVATAR_DIR = path.join(PUBLIC_DIR, 'uploads/avatars')
const CHUNKS_DIR = path.resolve(__dirname, '../../uploads_temp/chunks')

// 确保必要目录存在
function ensureDirs() {
  if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true })
  }
  if (!fs.existsSync(CHUNKS_DIR)) {
    fs.mkdirSync(CHUNKS_DIR, { recursive: true })
  }
}
ensureDirs()

/**
 * 获取文件扩展名，做安全过滤
 */
function getSafeExt(fileName = '') {
  const ext = path.extname(fileName).toLowerCase()
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  return allowed.includes(ext) ? ext : '.png'
}

/**
 * 1. 检查文件是否已存在（秒传）以及获取已上传的分片索引（断点续传）
 */
async function checkFile(ctx) {
  try {
    const { fileHash, fileName } = ctx.request.body || {}
    if (!fileHash) {
      ctx.status = 400
      ctx.body = { code: 0, message: '缺少 fileHash 参数' }
      return
    }

    const ext = getSafeExt(fileName)
    const targetFilePath = path.join(AVATAR_DIR, `${fileHash}${ext}`)

    // 检查最终目标文件是否存在（秒传）
    if (fs.existsSync(targetFilePath)) {
      const stats = fs.statSync(targetFilePath)
      if (stats.size > 0) {
        ctx.body = {
          code: 1,
          message: '秒传成功',
          data: {
            isUploaded: true,
            url: `/uploads/avatars/${fileHash}${ext}`
          }
        }
        return
      }
    }

    // 检查分片临时目录，收集已上传的分片索引
    const chunkDir = path.join(CHUNKS_DIR, fileHash)
    let uploadedChunks = []
    if (fs.existsSync(chunkDir)) {
      const files = fs.readdirSync(chunkDir)
      uploadedChunks = files
        .map(name => parseInt(name, 10))
        .filter(n => !isNaN(n))
    }

    ctx.body = {
      code: 1,
      message: '查询切片状态成功',
      data: {
        isUploaded: false,
        uploadedChunks
      }
    }
  } catch (error) {
    console.error('Check file error:', error)
    ctx.status = 500
    ctx.body = { code: 0, message: '检查文件失败: ' + error.message }
  }
}

/**
 * 2. 接收单个切片
 */
async function uploadChunk(ctx) {
  try {
    const body = (ctx.request && ctx.request.body) || (ctx.req && ctx.req.body) || {}
    const { fileHash, chunkIndex } = body
    const file = ctx.file || (ctx.req && ctx.req.file)

    if (!fileHash || chunkIndex === undefined || !file) {
      ctx.status = 400
      ctx.body = { code: 0, message: '分片参数不完整' }
      return
    }

    const chunkDir = path.join(CHUNKS_DIR, fileHash)
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true })
    }

    const chunkPath = path.join(chunkDir, String(chunkIndex))
    // 将上传的 Buffer 写入分片文件
    await fs.promises.writeFile(chunkPath, file.buffer)

    ctx.body = {
      code: 1,
      message: `分片 ${chunkIndex} 上传成功`,
      data: {
        chunkIndex: Number(chunkIndex)
      }
    }
  } catch (error) {
    console.error('Upload chunk error:', error)
    ctx.status = 500
    ctx.body = { code: 0, message: '分片上传失败: ' + error.message }
  }
}

/**
 * 3. 合并所有切片并生成最终头像文件
 */
async function mergeChunks(ctx) {
  try {
    const { fileHash, fileName, totalChunks } = ctx.request.body || {}
    const total = Number(totalChunks)

    if (!fileHash || !total || total <= 0) {
      ctx.status = 400
      ctx.body = { code: 0, message: '合并参数不正确' }
      return
    }

    const ext = getSafeExt(fileName)
    const targetFilePath = path.join(AVATAR_DIR, `${fileHash}${ext}`)
    const chunkDir = path.join(CHUNKS_DIR, fileHash)

    if (!fs.existsSync(chunkDir)) {
      ctx.status = 400
      ctx.body = { code: 0, message: '切片目录不存在，请先上传切片' }
      return
    }

    // 检查所有切片是否齐全
    for (let i = 0; i < total; i++) {
      const chunkPath = path.join(chunkDir, String(i))
      if (!fs.existsSync(chunkPath)) {
        ctx.status = 400
        ctx.body = { code: 0, message: `缺少分片 #${i}，无法合并` }
        return
      }
    }

    // 流式顺序合并切片，保证高效率和低内存占用
    const writeStream = fs.createWriteStream(targetFilePath)

    for (let i = 0; i < total; i++) {
      const chunkPath = path.join(chunkDir, String(i))
      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath)
        readStream.on('error', reject)
        readStream.on('end', resolve)
        readStream.pipe(writeStream, { end: false })
      })
    }

    // 关闭写流
    await new Promise((resolve) => {
      writeStream.end(resolve)
    })

    // 合并完成，异步清理临时切片目录
    try {
      fs.rmSync(chunkDir, { recursive: true, force: true })
    } catch (cleanupErr) {
      console.warn('Clean temp chunks error:', cleanupErr.message)
    }

    const avatarUrl = `/uploads/avatars/${fileHash}${ext}`

    ctx.body = {
      code: 1,
      message: '切片合并成功',
      data: {
        url: avatarUrl
      }
    }
  } catch (error) {
    console.error('Merge chunks error:', error)
    ctx.status = 500
    ctx.body = { code: 0, message: '合并切片失败: ' + error.message }
  }
}

module.exports = {
  checkFile,
  uploadChunk,
  mergeChunks
}
