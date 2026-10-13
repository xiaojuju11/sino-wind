const path = require('path')
const dotenv = require('dotenv')
dotenv.config({ path: path.resolve(__dirname, '../.env') })
if (require('fs').existsSync(path.resolve(__dirname, '../.env.local'))) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true })
}

const Koa = require('koa')
const Router = require('koa-router')
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser')
const koaStatic = require('koa-static')
const authRoutes = require('./routes/authRoutes.js')
const poemRoutes = require('./routes/poemRoutes.js')
const cozeRoutes = require('./routes/coze-api.js')
const deepseekRoutes = require('./routes/deepseek-api.js')
const uploadRoutes = require('./routes/uploadRoutes.js')

const app = new Koa()
app.use(cors());
// 托管 public 目录下的静态资源（如头像等）
app.use(koaStatic(path.resolve(__dirname, '../public')));

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
  .use(poemRoutes.routes(), poemRoutes.allowedMethods())
  .use(cozeRoutes.routes(), cozeRoutes.allowedMethods())
  .use(deepseekRoutes.routes(), deepseekRoutes.allowedMethods())
  .use(uploadRoutes.routes(), uploadRoutes.allowedMethods())
  

app.listen(process.env.PORT || 3000, () => {
  console.log(`服务运行在 ${process.env.PORT || 3000} 端口`);
})