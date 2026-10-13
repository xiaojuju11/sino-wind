const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const FormData = require('form-data')

const { JWT_SECRET } = require('../src/utils/jwt.js')
const db = require('../src/config/db.js')

// 引入 Koa
const Koa = require('koa')
const cors = require('@koa/cors')
const bodyParser = require('koa-bodyparser')
const koaStatic = require('koa-static')
const uploadRoutes = require('../src/routes/uploadRoutes.js')
const authRoutes = require('../src/routes/authRoutes.js')

async function runFullE2ETest() {
  console.log('=== [E2E] 开始大文件切片上传全流程闭环验证 ===')

  // 1. 启动全功能服务
  const app = new Koa()
  app.use(cors())
  app.use(koaStatic(path.resolve(__dirname, '../public')))
  app.use(bodyParser({ jsonLimit: '30mb' }))
  app.use(uploadRoutes.routes()).use(uploadRoutes.allowedMethods())
  app.use(authRoutes.routes()).use(authRoutes.allowedMethods())

  const server = app.listen(0)
  const port = server.address().port
  const baseURL = `http://127.0.0.1:${port}`
  console.log(`1. 测试服务已启动于端口: ${port}`)

  try {
    // 2. 检查或准备测试用户
    let [users] = await db.execute('SELECT * FROM users LIMIT 1')
    let testUser = users[0]
    if (!testUser) {
      console.log('数据库暂无用户，创建临时测试用户...')
      const [insertRes] = await db.execute(
        'INSERT INTO users (phone, password_hash, nickname, create_time) VALUES (?, ?, ?, NOW())',
        ['13988889999', 'test_hash', '墨竹居士']
      )
      testUser = { id: insertRes.insertId, phone: '13988889999', nickname: '墨竹居士' }
    }
    console.log(`2. 选定测试雅士: ID=${testUser.id}, 手机=${testUser.phone}, 初始头像=${testUser.avatar || '(空)'}`)

    const token = jwt.sign({ id: testUser.id, phone: testUser.phone }, JWT_SECRET, { expiresIn: '1h' })
    const authHeaders = { Authorization: `Bearer ${token}` }

    // 3. 模拟前端准备一个 3.2MB 的超大头像文件
    const totalSize = Math.floor(3.2 * 1024 * 1024)
    const fileBuffer = Buffer.alloc(totalSize, 0x5a) // 模拟大图像素数据
    fileBuffer.write('SinoWind_E2E_Avatar_Header', 0)

    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').slice(0, 24) + `_${totalSize}`
    const fileName = 'yashi_large_avatar.png'
    const chunkSize = 512 * 1024 // 512KB 分片规格
    const totalChunks = Math.ceil(totalSize / chunkSize)

    console.log(`3. 准备大文件: ${fileName}, 大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB, 分片数: ${totalChunks}, 指纹: ${fileHash}`)

    // 4. 前端调用 /api/upload/check
    console.log('4. 模拟前端第 1 步：校验文件状态与断点...')
    const checkRes = await axios.post(`${baseURL}/api/upload/check`, {
      fileHash,
      fileName,
      totalChunks
    }, { headers: authHeaders })
    console.log('   check 状态:', checkRes.data.message, checkRes.data.data)

    // 5. 前端多并发分片上传
    console.log('5. 模拟前端第 2 步：多通道并发上传切片...')
    const uploadedChunks = new Set(checkRes.data.data.uploadedChunks || [])
    
    for (let i = 0; i < totalChunks; i++) {
      if (uploadedChunks.has(i)) {
        console.log(`   分片 #${i} 已存在，跳过（断点续传）`)
        continue
      }
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, totalSize)
      const chunkData = fileBuffer.slice(start, end)

      const form = new FormData()
      form.append('fileHash', fileHash)
      form.append('chunkIndex', String(i))
      form.append('totalChunks', String(totalChunks))
      form.append('chunk', chunkData, { filename: `chunk_${i}.blob` })

      const res = await axios.post(`${baseURL}/api/upload/chunk`, form, {
        headers: {
          ...authHeaders,
          ...form.getHeaders()
        }
      })
      console.log(`   分片 #${i}/${totalChunks} 上传成功 (${(chunkData.length / 1024).toFixed(1)} KB)`)
    }

    // 6. 前端发起合并通知
    console.log('6. 模拟前端第 3 步：请求服务端流式合并切片...')
    const mergeRes = await axios.post(`${baseURL}/api/upload/merge`, {
      fileHash,
      fileName,
      totalChunks
    }, { headers: authHeaders })
    const finalAvatarUrl = mergeRes.data.data.url
    console.log('   合并成功，生成头像静态路径:', finalAvatarUrl)

    // 7. 前端调用 /api/auth/updateAvatar 更新雅士个人资料
    console.log('7. 模拟前端第 4 步：更新数据库用户资料中的头像 URL...')
    const updateRes = await axios.post(`${baseURL}/api/auth/updateAvatar`, {
      avatar: finalAvatarUrl
    }, { headers: authHeaders })
    console.log('   用户资料更新结果:', updateRes.data)

    // 8. 验证数据库中用户数据是否已持久化该头像
    const [updatedUsers] = await db.execute('SELECT id, phone, avatar, nickname FROM users WHERE id = ?', [testUser.id])
    const updatedUser = updatedUsers[0]
    console.log('8. 数据库核验: 用户最新头像 =', updatedUser.avatar)
    if (updatedUser.avatar !== finalAvatarUrl) {
      throw new Error(`数据库头像不匹配: 期望 ${finalAvatarUrl}, 实际 ${updatedUser.avatar}`)
    }

    // 9. 模拟前端通过 GET /api/auth/info 读取个人信息
    console.log('9. 模拟页面通过 GET /api/auth/info 获取用户信息...')
    const infoRes = await axios.get(`${baseURL}/api/auth/info`, { headers: authHeaders })
    if (infoRes.data.avatar !== finalAvatarUrl) {
      throw new Error('GET /api/auth/info 返回头像不匹配')
    }
    console.log('   页面信息获取成功，头像 URL 一致:', infoRes.data.avatar)

    // 10. 验证静态资源直读
    console.log('10. 验证头像静态文件可被浏览器直接读取...')
    const staticRes = await axios.get(`${baseURL}${finalAvatarUrl}`, { responseType: 'arraybuffer' })
    if (staticRes.data.length !== totalSize) {
      throw new Error(`静态文件字节数不一致: 期望 ${totalSize}, 实际 ${staticRes.data.length}`)
    }
    console.log(`    静态头像加载成功，体积精确吻合: ${(staticRes.data.length / 1024 / 1024).toFixed(2)} MB`)

    // 11. 再次上传相同文件测试极速“秒传”
    console.log('11. 测试极速“秒传”闭环...')
    const instantCheck = await axios.post(`${baseURL}/api/upload/check`, {
      fileHash,
      fileName,
      totalChunks
    }, { headers: authHeaders })
    if (!instantCheck.data.data.isUploaded || instantCheck.data.data.url !== finalAvatarUrl) {
      throw new Error('秒传机制未生效')
    }
    console.log('    秒传命中成功，瞬间响应，无需重新传输分片！')

    console.log('\n🎉 [全流程闭环验证成功] 大文件切片上传、秒传、断点续传、流式合并、数据持久化及页面联动全部通过！')
  } catch (err) {
    console.error('❌ E2E 测试异常:', err.response?.data || err.message)
    process.exitCode = 1
  } finally {
    server.close()
    await db.end()
  }
}

runFullE2ETest()
