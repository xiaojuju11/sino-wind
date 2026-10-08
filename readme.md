# 👨‍👩‍👧‍👦 童心智伴 (Tongxin AI · Parent-Kid Edu)

<p align="center">
  <strong>专注于 0-12 岁低龄家庭的移动端智能亲子教育与陪伴平台</strong>
</p>

<p align="center">
  <a href="https://react.dev/" target="_blank"><img src="https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react&logoColor=61DAFB" alt="React"></a>
  <a href="https://vitejs.dev/" target="_blank"><img src="https://img.shields.io/badge/Vite-7.2.4-646CFF?logo=vite&logoColor=646CFF" alt="Vite"></a>
  <a href="https://reactrouter.com/" target="_blank"><img src="https://img.shields.io/badge/React_Router-7.11.0-CA4245?logo=reactrouter&logoColor=CA4245" alt="React Router"></a>
  <a href="https://mobile.ant.design/" target="_blank"><img src="https://img.shields.io/badge/Ant_Design_Mobile-5.42.3-0170FE?logo=antdesign&logoColor=0170FE" alt="Ant Design Mobile"></a>
  <a href="https://koajs.com/" target="_blank"><img src="https://img.shields.io/badge/Koa-3.1.1-33333D?logo=koa&logoColor=33333D" alt="Koa"></a>
  <a href="https://www.mysql.com/" target="_blank"><img src="https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=4479A1" alt="MySQL"></a>
  <a href="https://jwt.io/" target="_blank"><img src="https://img.shields.io/badge/JWT-9.0.3-000000?logo=jsonwebtokens&logoColor=000000" alt="JWT"></a>
  <a href="https://axios-http.com/" target="_blank"><img src="https://img.shields.io/badge/Axios-1.13.2-5A29E4?logo=axios&logoColor=5A29E4" alt="Axios"></a>
  <a href="https://www.deepseek.com/" target="_blank"><img src="https://img.shields.io/badge/DeepSeek-V3-4E6EF2?logo=deepseek&logoColor=white" alt="DeepSeek"></a>
  <a href="https://www.coze.cn/" target="_blank"><img src="https://img.shields.io/badge/Coze-Workflow-FF6B00" alt="Coze"></a>
</p>

---

## 📖 项目简介

**童心智伴** 是一款面向 0-12 岁儿童及其家庭的移动端智能亲子教育平台。项目结合现代大语言模型与 AI 图像识别工作流，打造富有温度的科学陪伴体验。家长可快速完成账号注册与个性化配置，孩子可通过拍照识物探索世界、与 AI 智能助手互动问答，让科技真正成为家庭亲子启蒙与教育成长的得力助手。

---

## 🌟 核心功能特性

### 🔐 1. 安全可靠的用户认证体系
- **滑动切换设计**：登录与注册集成在同一交互卡片中，配备平滑的滑动切换动画。
- **SVG 图形验证码**：后端集成 `svg-captcha` 动态生成干扰线条图形验证码，附带 5 分钟有效生命周期与防刷校验机制。
- **Bcrypt 密码加盐哈希**：采用 `bcrypt`（saltRounds=10）对用户密码进行单向加盐哈希加密存储，杜绝明文风险。
- **JWT 身份认证机制**：用户登录签发 7 天有效期的 Token，前端 Axios 拦截器统一在 Request Header 中注入，后端 Koa 鉴权中间件全局校验。

### 📸 2. AI 智能拍照识物
- **双模输入采集**：同时支持移动设备摄像头**实时拍照**与本地相册**图片上传**。
- **图像 Base64 编码**：前端 Canvas 处理并编码后传输，后端 Koa 针对图像载荷定制配置 `jsonLimit: 30mb`，保证高画质传输不截断。
- **Coze 智能工作流驱动**：无缝对接 Coze 图像理解工作流，精准返回物品中文名、拼音、英文对照、详细认知描述与安全注意事项。
- **语音朗读合成（TTS）**：识别结果内置语音播报功能，辅助识字阶段的低龄儿童听音学习。

### 🤖 3. DeepSeek 亲子智能对话
- **大模型驱动**：基于 OpenAI SDK 协议对接 **DeepSeek 大语言模型**。
- **教育场景定制提示词**：内置 `你是一个专业的教育助手` 亲子引导角色设定，解答日常育儿疑问与儿童科普提问。
- **拟人化交互界面**：包含气泡对话流、发送加载指示器（DotLoading）、录音状态交互等多维度界面反馈。

### 👤 4. 个人中心与账户安全
- **个人信息管理**：直观展示用户头像、昵称、手机号及注册时间。
- **资料个性化修改**：支持自定义头像图片上传更新与个性化昵称变更。
- **安全改密流程**：提供原密码比对验证与新密码 Bcrypt 重哈希更新链路。
- **一键安全登出**：清理本地 Token 与登录态缓存，安全重定向至认证页。

### 📱 5. 移动端优先与精美交互
- **rem 动态响应式布局**：基于移动端视口宽度动态计算根字体尺寸（`1rem = 屏幕宽度 / 10`），高度还原视觉稿。
- **Ant Design Mobile**：深度集成轻量优雅的移动端组件库，提供 Toast 错误轻提示与组件化交互。
- **模块化 Less 样式**：采用 Less 预处理器构建现代、童趣温馨的卡通亲子视觉风格。

---

## 🛠️ 技术栈清单

### 前端技术栈 (Frontend)
| 技术 / 库 | 版本 | 说明 |
| :--- | :--- | :--- |
| **React** | `^19.2.0` | 核心 UI 框架（函数式组件 + Hooks） |
| **Vite** | `^7.2.4` | 新一代前端构建与开发工具 |
| **React Router** | `^7.11.0` | 单页面应用路由管理 |
| **Ant Design Mobile** | `^5.42.3` | 阿里巴巴移动端 UI 组件库 |
| **Axios** | `^1.13.2` | 统一 HTTP 客户端（请求/响应拦截与鉴权） |
| **Less** | `^4.5.1` | CSS 预处理器 |

### 后端技术栈 (Backend)
| 技术 / 库 | 版本 | 说明 |
| :--- | :--- | :--- |
| **Koa** | `^3.1.1` | 轻量高效的 Node.js Web 框架 |
| **Koa Router** | `^14.0.0` | 后端 RESTful 路由分发 |
| **koa-bodyparser** | `^4.4.1` | 请求体解析中间件（支持 30MB 大图传输） |
| **@koa/cors** | `^5.0.0` | 跨域资源共享中间件 |
| **MySQL2** | `^3.16.0` | 高性能 MySQL Promise 连接池 |
| **jsonwebtoken** | `^9.0.3` | JWT 鉴权与 Token 编解码 |
| **bcrypt** | `^6.0.0` | 密码单向加盐哈希加密 |
| **svg-captcha** | `^1.4.0` | 服务端彩色图形验证码生成 |
| **OpenAI SDK** | `^6.16.0` | 接入 DeepSeek 大语言模型接口 |
| **dotenv** | `^17.2.3` | 多环境配置与环境变量隔离 |

---

## 📂 项目目录结构

```plaintext
parent_kid_edu/
├── frontend/                        # 前端 React 项目
│   ├── public/                      # 静态资源目录
│   │   └── vite.svg
│   ├── src/
│   │   ├── components/              # 公共业务组件
│   │   │   ├── HomeCard.jsx         # 首页模块功能卡片
│   │   │   ├── imageCaptureAndProcess/ # 摄像头拍摄 / 相册上传组件
│   │   │   │   ├── index.jsx
│   │   │   │   └── index.less
│   │   │   └── recognitionResult/   # AI 识物结果展示与语音播报组件
│   │   │       ├── Index.jsx
│   │   │       └── index.less
│   │   ├── http/                    # 网络请求封装
│   │   │   └── index.js             # Axios 实例、Token 拦截与错误 Toast
│   │   ├── pages/                   # 核心页面
│   │   │   ├── AccountSetting.jsx   # 账号设置（改密/修改昵称/头像）
│   │   │   ├── AiChat.jsx           # DeepSeek 亲子智能对话助手
│   │   │   ├── AIPage.jsx           # AI 功能导航聚合页
│   │   │   ├── Home.jsx             # 平台首页
│   │   │   ├── Layout.jsx           # 移动端底部 Tab 导航外层布局
│   │   │   ├── Login.jsx            # 登录表单
│   │   │   ├── MinePage.jsx         # 个人中心
│   │   │   ├── Recognition.jsx      # AI 拍照识物页面
│   │   │   └── Register.jsx         # 注册表单（含图形验证码）
│   │   ├── styles/                  # 样式文件目录（Less）
│   │   │   ├── accountSetting.less
│   │   │   ├── aiChat.less
│   │   │   ├── aiPage.less
│   │   │   ├── app.less
│   │   │   ├── global.css
│   │   │   ├── home.less
│   │   │   ├── layout.less
│   │   │   ├── login.less
│   │   │   ├── minePage.less
│   │   │   └── register.less
│   │   ├── utils/                   # 工具类
│   │   │   └── rem.js               # 移动端动态 rem 视口自适应方案
│   │   ├── App.jsx                  # 根路由与 Auth 页面切换
│   │   └── main.jsx                 # 前端渲染挂载入口
│   ├── index.html                   # HTML 模板
│   ├── package.json
│   └── vite.config.js
│
├── backend/                         # 后端 Koa 项目
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                # MySQL2 Promise 连接池配置
│   │   ├── controllers/             # 业务逻辑控制器
│   │   │   ├── authController.js    # 登录/注册/验证码/用户资料/改密逻辑
│   │   │   ├── cozeController.js    # 调用 Coze 工作流进行图像识别
│   │   │   └── deepseekController.js# DeepSeek 大模型对话接口
│   │   ├── models/                  # 数据层
│   │   │   └── userModel.js         # 用户数据增删改查 SQL 操作
│   │   ├── routes/                  # RESTful API 路由层
│   │   │   ├── authRoutes.js        # 用户与认证路由 (/api/auth)
│   │   │   ├── coze-api.js          # Coze 图像能力路由 (/api/coze)
│   │   │   └── deepseek-api.js      # 对话能力路由 (/api/deepseek)
│   │   ├── utils/                   # 工具模块
│   │   │   ├── captcha.js           # SVG 图形验证码生成与有效校验
│   │   │   └── jwt.js               # JWT 鉴权中间件 verifyToken
│   │   └── index.js                 # 后端服务入口文件
│   └── package.json
│
└── README.md
```

---

## 🚀 本地快速启动指南

### 1. 环境准备
确保本机安装了以下基础运行环境：
- **Node.js**：`>= 18.0.0`
- **MySQL**：`>= 8.0`
- **npm** 或 **pnpm / yarn**

### 2. 克隆仓库
```bash
git clone https://github.com/xiaojuju11/parent_kid_edu.git
cd parent_kid_edu
```

### 3. 数据库初始化
登录 MySQL 客户端，创建数据库及 `users` 表结构：

```sql
CREATE DATABASE IF NOT EXISTS `parent_kid_education` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `parent_kid_education`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户主键ID',
  `phone` VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号（登录账号）',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Bcrypt 加密密码哈希',
  `nickname` VARCHAR(50) DEFAULT '新用户' COMMENT '用户昵称',
  `avatar` LONGTEXT DEFAULT NULL COMMENT '用户头像（URL 或 Base64）',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户基础信息表';
```

### 4. 后端环境配置与启动

进入 `backend` 目录，安装依赖：
```bash
cd backend
npm install
```

在 `backend` 根目录下创建 `.env.local` 环境变量配置文件：
```env
# 端口与服务
PORT=3000

# 数据库配置（根据实际情况填写）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=parent_kid_education

# Coze 工作流 API Key（用于图像识别）
VITE_COZE_IMAGE_TO_TEXT_AND_VOICE=your_coze_token

# DeepSeek API Key（用于智能对话）
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key
```

启动后端开发服务：
```bash
npm run dev
# 后端服务将默认运行在 http://localhost:3000
```

### 5. 前端安装与启动

新开一个终端窗口，进入 `frontend` 目录：
```bash
cd frontend
npm install
```

启动前端开发服务器：
```bash
npm run dev
# 前端 Vite 服务启动，在浏览器中打开提示地址（如 http://localhost:5173）
```

> 💡 **移动端调试提示**：建议在浏览器中按 `F12` 打开开发者工具，并切换至 **移动设备模拟模式**（如 iPhone 12 / 14 视图）体验最佳 rem 响应式效果。

---

## 💡 核心实现与代码解析

### 1. 移动端 rem 动态视口适配 (`frontend/src/utils/rem.js`)
以视口宽度为基准，将屏幕等分为 10 份，配合窗口 `resize` 事件动态更新根节点字体尺寸：
```javascript
(function(win, doc) {
  const docEl = doc.documentElement
  const width = docEl.clientWidth

  // 设置 html 根节点字体：1rem = width / 10
  docEl.style.fontSize = width / 10 + 'px'

  win.addEventListener('resize', () => {
    const newWidth = docEl.clientWidth
    docEl.style.fontSize = newWidth / 10 + 'px'
  })

  doc.body.style.fontSize = '16px'
})(window, document)
```

### 2. JWT 鉴权中间件 (`backend/src/utils/jwt.js`)
严格校验请求头中的 `Authorization` Token，验证通过后将 `userId` 挂载到 Koa 上下文供后续业务层使用：
```javascript
function verifyToken() {
  return async (ctx, next) => {
    const token = ctx.request.header.authorization
    if (!token) {
      ctx.status = 416
      ctx.body = { message: 'token 不存在', code: 0 }
      return
    }
    try {
      const decoded = jwt.verify(token, '666')
      if (decoded.id) {
        ctx.userId = decoded.id
        await next()
      }
    } catch (error) {
      ctx.status = 416
      ctx.body = { message: 'token 过期或无效', code: 0 }
    }
  }
}
```

### 3. SVG 验证码生成与有效校验 (`backend/src/utils/captcha.js`)
使用 `svg-captcha` 配合内存 `Map` 存储实现验证码生成、比对与自动过期回收：
```javascript
const captchaStore = new Map()
const CAPTCHA_EXPIRE_TIME = 5 * 60 * 1000 // 5 分钟有效

function generateCaptcha() {
  const captcha = svgCaptcha.create({
    size: 4,
    ignoreChars: '0o1il',
    noise: 2,
    color: true,
    background: '#f0f0f0'
  })
  const captchaId = `captcha_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  captchaStore.set(captchaId, {
    text: captcha.text.toLocaleLowerCase(),
    expireAt: Date.now() + CAPTCHA_EXPIRE_TIME
  })
  return { id: captchaId, svg: captcha.data }
}
```

### 4. 图像识别与 Coze 工作流对接 (`backend/src/controllers/cozeController.js`)
接收前端 Base64 图片，转发至 Coze 工作流服务：
```javascript
async function recognition(ctx) {
  const { img } = ctx.request.body
  const params = { image: img }
  const apiKey = process.env.COZE_IMAGE_TO_TEXT_AND_VOICE || process.env.VITE_COZE_IMAGE_TO_TEXT_AND_VOICE || ''

  const res = await axios({
    method: 'post',
    url: 'https://r85vf8qf77.coze.site/run',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    data: params
  })

  ctx.body = { code: 1, data: res.data }
}
```

### 5. DeepSeek 亲子大模型接入 (`backend/src/controllers/deepseekController.js`)
```javascript
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.VITE_DEEPSEEK_API_KEY,
})

async function deepseekChat(ctx) {
  const { message } = ctx.request.body
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: "你是一个专业的教育助手" },
      { role: "user", content: message },
    ],
    model: "deepseek-chat",
  })
  ctx.body = {
    code: 1,
    message: completion.choices[0].message.content
  }
}
```

---

## 📡 RESTful API 接口速查

| 模块 | 请求方式 | 路由路径 | 鉴权要求 | 说明 |
| :--- | :--- | :--- | :---: | :--- |
| **认证模块** | `GET` | `/api/auth/captcha` | 无 | 获取 SVG 图形验证码 |
| **认证模块** | `POST` | `/api/auth/register` | 无 | 用户注册（校验手机号、验证码、密码） |
| **认证模块** | `POST` | `/api/auth/login` | 无 | 用户账号密码登录，签发 JWT Token |
| **用户中心** | `GET` | `/api/auth/info` | 是 | 获取当前登录用户的详细信息 |
| **用户中心** | `POST` | `/api/auth/updateNickname` | 是 | 更新用户个性化昵称 |
| **用户中心** | `POST` | `/api/auth/updateAvatar` | 是 | 更新用户头像 |
| **用户中心** | `POST` | `/api/auth/updatePassword` | 是 | 验证旧密码并更新新密码 |
| **AI 识物** | `POST` | `/api/coze/recognition` | 是 | 传入图片 Base64，调用 Coze 工作流识物 |
| **AI 对话** | `POST` | `/api/deepseek/chat` | 是 | 发送用户消息，获取 DeepSeek 智能回答 |

---

## 📄 开源许可证

本项目基于 [MIT License](https://opensource.org/licenses/MIT) 开源。欢迎交流学习与二次开发！

⭐ 如果这个项目对你有帮助，欢迎在 GitHub 上点个 **Star** 支持一下！
