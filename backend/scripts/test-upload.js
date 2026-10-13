const http = require('http')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const FormData = require('form-data')

const { JWT_SECRET } = require('../src/utils/jwt.js')

// 引入主应用
const Koa = require('koa')
const Router = require('koa-router')
const cors = require('@koa/cors')
const bodyParser = require('koa-bodyparser')
const koaStatic = require('koa-static')
const uploadRoutes = require('../src/routes/uploadRoutes.js')

async function runTest() {
  console.log('=== 开始测试大文件切片上传后端逻辑 ===')
  
  const app = new Koa()
  app.use(cors())
  app.use(koaStatic(path.resolve(__dirname, '../public')))
  app.use(bodyParser({ jsonLimit: '30mb' }))
  app.use(uploadRoutes.routes()).use(uploadRoutes.allowedMethods())

  const server = app.listen(0)
  const port = server.address().port
  const baseURL = `http://127.0.0.1:${port}`
  console.log(`测试服务已就绪，端口: ${port}`)

  const token = jwt.sign({ id: 1, phone: '13800000000' }, JWT_SECRET, { expiresIn: '1h' })
  const authHeaders = { Authorization: `Bearer ${token}` }

  try {
    // 1. 模拟一个 1.5MB 的图片大文件
    const totalSize = 1.5 * 1024 * 1024
    const fileBuffer = Buffer.alloc(totalSize, 'A')
    fileBuffer.write('SinoWind_Avatar_Test_Content_2026', 0)
    
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').slice(0, 24) + `_${totalSize}`
    const fileName = 'test_avatar.png'
    const chunkSize = 512 * 1024
    const totalChunks = Math.ceil(totalSize / chunkSize)

    console.log(`模拟文件: ${fileName}, 大小: ${totalSize} 字节, 分片大小: ${chunkSize}, 总分片数: ${totalChunks}, Hash: ${fileHash}`)

    // 2. 检查秒传
    console.log('\n[步骤 1] 调用 /api/upload/check 检查文件状态...')
    const check1 = await axios.post(`${baseURL}/api/upload/check`, {
      fileHash,
      fileName,
      totalChunks
    }, { headers: authHeaders })
    console.log('check1 响应:', check1.data)
    if (check1.data.data.isUploaded) {
      console.log('已存在旧文件，清理以便重新测试完整切片流程')
      const targetPath = path.resolve(__dirname, `../public/uploads/avatars/${fileHash}.png`)
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath)
    }

    // 3. 上传所有分片
    console.log('\n[步骤 2] 开始并发分片上传 /api/upload/chunk...')
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, totalSize)
      const chunkBuf = fileBuffer.slice(start, end)

      const form = new FormData()
      form.append('fileHash', fileHash)
      form.append('chunkIndex', String(i))
      form.append('totalChunks', String(totalChunks))
      form.append('chunk', chunkBuf, { filename: `chunk_${i}.blob` })

      const chunkRes = await axios.post(`${baseURL}/api/upload/chunk`, form, {
        headers: {
          ...authHeaders,
          ...form.getHeaders()
        }
      })
      console.log(`分片 #${i} 上传成功:`, chunkRes.data.message)
    }

    // 4. 合并分片
    console.log('\n[步骤 3] 调用 /api/upload/merge 合并分片...')
    const mergeRes = await axios.post(`${baseURL}/api/upload/merge`, {
      fileHash,
      fileName,
      totalChunks
    }, { headers: authHeaders })
    console.log('merge 响应:', mergeRes.data)

    const finalUrl = mergeRes.data.data.url
    if (!finalUrl.includes(fileHash)) {
      throw new Error('合并后返回的 URL 不匹配')
    }

    // 5. 验证静态资源能否访问
    console.log('\n[步骤 4] 验证生成的静态文件...')
    const getFileRes = await axios.get(`${baseURL}${finalUrl}`, { responseType: 'arraybuffer' })
    if (getFileRes.data.length !== totalSize) {
      throw new Error(`文件大小不一致: 期望 ${totalSize}, 实际 ${getFileRes.data.length}`)
    }
    console.log('静态文件直接读取成功，字节大小完全一致！')

    // 6. 再次调用 check 验证秒传
    console.log('\n[步骤 5] 验证秒传逻辑...')
    const check2 = await axios.post(`${baseURL}/api/upload/check`, {
      fileHash,
      fileName,
      totalChunks
    }, { headers: authHeaders })
    console.log('check2 响应:', check2.data)
    if (!check2.data.data.isUploaded || check2.data.data.url !== finalUrl) {
      throw new Error('秒传校验失败')
    }
    console.log('秒传校验完美通过！')

    console.log('\n✅ 大文件切片上传后端所有环节测试全部通过！')
  } catch (err) {
    console.error('❌ 测试失败:', err.response?.data || err.message)
    process.exitCode = 1
  } finally {
    server.close()
  }
}

runTest()
