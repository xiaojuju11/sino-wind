const Koa = require('koa')
const Router = require('koa-router')
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser')
const authRoutes = require('./routes/authRoutes.js')
const cozeRoutes = require('./routes/coze-api.js')
const deepseekRoutes = require('./routes/deepseek-api.js')
const dotenv = require('dotenv')

dotenv.config({
  path: ['.env.local', '.env']
})

const app = new Koa()
app.use(cors());

// 测试接口
const router = new Router({
  prefix: '/api'  // 路由前缀
})
router.get('/test', (ctx) => {
  ctx.body = {
    status: 'ok',
    mesaage: 'Koa backend is running'
  }
})

app
  .use(bodyParser({ jsonLimit: '30mb' }))  // 先让 koa 拥有解析参数的能力，设置 JSON 最大为 30MB
  .use(router.routes(), router.allowedMethods())
  .use(authRoutes.routes(), authRoutes.allowedMethods())
  .use(cozeRoutes.routes(), cozeRoutes.allowedMethods())
  .use(deepseekRoutes.routes(), deepseekRoutes.allowedMethods())
  

app.listen(3000, () => {
  console.log('服务运行在 3000 端口');
})