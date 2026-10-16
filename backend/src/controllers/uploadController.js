const path = require('path')
const fs = require('fs')
const { Readable } = require('node:stream')
const { pipeline } = require('node:stream/promises')
const { randomUUID } = require('node:crypto')

// 基础目录配置
const PUBLIC_DIR = path.resolve(__dirname, '../../public')
const AVATAR_DIR = path.join(PUBLIC_DIR, 'uploads/avatars')
const CHUNKS_DIR = path.resolve(__dirname, '../../uploads_temp/chunks')
const MAX_CHUNKS = 4096
const validHash = value => typeof value === 'string' && /^(?:[a-f0-9]{24}_[1-9]\d{0,9}|[a-f0-9]{32}|[a-f0-9]{64})$/i.test(value)
const validIndex = value => (typeof value === 'number' || typeof value === 'string') && /^(?:0|[1-9]\d*)$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) < MAX_CHUNKS
// Every write and recursive cleanup must remain below its fixed upload root.
function inside(root, ...parts) {
  const target = path.resolve(root, ...parts), relative = path.relative(root, target)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('上传路径无效')
  return target
}
const merging = new Set()

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
    if (!validHash(fileHash) || typeof fileName !== 'string') {
      ctx.status = 400
      ctx.body = { code: 0, message: '文件指纹或文件名无效' }
      return
    }

    const ext = getSafeExt(fileName)
    const targetFilePath = inside(AVATAR_DIR, `${fileHash}${ext}`)

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
    const chunkDir = inside(CHUNKS_DIR, fileHash)
    let uploadedChunks = []
    if (fs.existsSync(chunkDir)) {
      const files = fs.readdirSync(chunkDir)
      uploadedChunks = files
        .filter(validIndex).map(Number)
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

    if (!validHash(fileHash) || !validIndex(chunkIndex) || !Buffer.isBuffer(file?.buffer)) {
      ctx.status = 400
      ctx.body = { code: 0, message: '分片参数不完整' }
      return
    }
    if (merging.has(fileHash)) { ctx.status = 409; ctx.body = { code: 0, message: '文件正在合并，请稍后重试' }; return }

    const chunkDir = inside(CHUNKS_DIR, fileHash)
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true })
    }

    const chunkPath = inside(chunkDir, String(chunkIndex))
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
  let lockedHash, partialPath
  try {
    const { fileHash, fileName, totalChunks } = ctx.request.body || {}
    const total = Number(totalChunks)

    if (!validHash(fileHash) || typeof fileName !== 'string' || !Number.isSafeInteger(total) || total <= 0 || total > MAX_CHUNKS) {
      ctx.status = 400
      ctx.body = { code: 0, message: '合并参数不正确' }
      return
    }

    const ext = getSafeExt(fileName)
    const targetFilePath = inside(AVATAR_DIR, `${fileHash}${ext}`)
    const chunkDir = inside(CHUNKS_DIR, fileHash)
    if (merging.has(fileHash)) { ctx.status = 409; ctx.body = { code: 0, message: '文件正在合并，请稍后重试' }; return }
    merging.add(fileHash); lockedHash = fileHash

    if (!fs.existsSync(chunkDir)) {
      ctx.status = 400
      ctx.body = { code: 0, message: '切片目录不存在，请先上传切片' }
      return
    }

    // 检查所有切片是否齐全
    for (let i = 0; i < total; i++) {
      const chunkPath = inside(chunkDir, String(i))
      if (!fs.existsSync(chunkPath)) {
        ctx.status = 400
        ctx.body = { code: 0, message: `缺少分片 #${i}，无法合并` }
        return
      }
    }

    // 流式顺序合并切片，保证高效率和低内存占用
    partialPath = inside(AVATAR_DIR, `${fileHash}.${randomUUID()}.part`)
    async function* chunks() {
      for (let i = 0; i < total; i++) yield* fs.createReadStream(inside(chunkDir, String(i)))
    }
    await pipeline(Readable.from(chunks()), fs.createWriteStream(partialPath, { flags: 'wx' }))
    await fs.promises.rename(partialPath, targetFilePath)
    partialPath = null

    // 合并完成，异步清理临时切片目录
    try {
      fs.rmSync(inside(CHUNKS_DIR, fileHash), { recursive: true, force: true })
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
  } finally {
    if (partialPath) await fs.promises.unlink(partialPath).catch(() => {})
    if (lockedHash) merging.delete(lockedHash)
  }
}

module.exports = {
  checkFile,
  uploadChunk,
  mergeChunks
}
