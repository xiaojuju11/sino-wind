# 👨‍👩‍👧‍👦 童心智伴 (SinoWind / Tongxin AI Edu)

<p align="center">
  <strong>面向 0-12 岁低龄家庭的移动端智能亲子教育与陪伴平台</strong>
  <br />
  <i>✨ 本文档专为团队伙伴编写，涵盖项目从 0 到 1 初始部署、本地联调、核心架构全景及二次改造开发指南 ✨</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Vite-7.2.4-646CFF?logo=vite&logoColor=646CFF" alt="Vite">
  <img src="https://img.shields.io/badge/React_Router-7.11.0-CA4245?logo=reactrouter&logoColor=CA4245" alt="React Router">
  <img src="https://img.shields.io/badge/Ant_Design_Mobile-5.42.3-0170FE?logo=antdesign&logoColor=0170FE" alt="Ant Design Mobile">
  <img src="https://img.shields.io/badge/Koa-3.1.1-33333D?logo=koa&logoColor=33333D" alt="Koa">
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=4479A1" alt="MySQL">
  <img src="https://img.shields.io/badge/DeepSeek-V3-4E6EF2?logo=deepseek&logoColor=white" alt="DeepSeek">
  <img src="https://img.shields.io/badge/Coze-Workflow-FF6B00" alt="Coze">
</p>

---

## 📌 目录导航

- [📖 1. 项目背景与全景](#-1-项目背景与全景)
- [🛠️ 2. 技术栈清单](#️-2-技术栈清单)
- [📂 3. 项目目录结构与代码导览](#-3-项目目录结构与代码导览)
- [🚀 4. 本地环境初始化与启动（必读）](#-4-本地环境初始化与启动必读)
  - [4.1 前置运行依赖](#41-前置运行依赖)
  - [4.2 克隆项目代码](#42-克隆项目代码)
  - [4.3 数据库初始化（MySQL）](#43-数据库初始化mysql)
  - [4.4 后端配置与启动 (`backend`)](#44-后端配置与启动-backend)
  - [4.5 前端配置与启动 (`frontend`)](#45-前端配置与启动-frontend)
- [📡 5. 核心 API 接口清单](#-5-核心-api-接口清单)
- [🔨 6. 开发者须知与改造指南](#-6-开发者须知与改造指南)
  - [6.1 本地联调 vs 线上环境切换](#61-本地联调-vs-线上环境切换)
  - [6.2 新功能扩展规范](#62-新功能扩展规范)
  - [6.3 数据库迭代建议](#63-数据库迭代建议)
- [⚠️ 7. 常见避坑指南 (FAQ)](#️-7-常见避坑指南-faq)
- [🤝 8. Git 分支与协作规范](#-8-git-分支与协作规范)

---

## 📖 1. 项目背景与全景

**童心智伴（SinoWind）** 是一个针对移动端视口打造的亲子伴学与智能交互 Web 应用。

### 🌟 核心业务模块
1. **用户认证与安全体系**：
   - 滑动平滑切换的登录/注册卡片
   - 服务端 SVG 图形验证码防刷机制（有效时长 5 分钟）
   - 密码 Bcrypt 单向加盐哈希存储
   - 基于 JWT 的无状态身份认证中间件
2. **AI 拍照识物与语音播报**：
   - 移动端原生拍照 / 相册选图与 Canvas 预处理
   - 接入 Coze 图像理解与多模态工作流，结构化输出物品中文、拼音、英语、认知百科
   - 浏览器原生语音合成（TTS）朗读功能
3. **DeepSeek 亲子伴学智能对话**：
   - 接入 DeepSeek 大模型对话接口
   - 专业教育伴学角色提示词定制，实时解答育儿与儿童启蒙科普问题
4. **个人中心与账户维护**：
   - 用户头像、昵称修改与原密码校验重置

---

## 🛠️ 2. 技术栈清单

### 前端 (`frontend`)
| 技术 / 库 | 版本 | 作用说明 |
| :--- | :--- | :--- |
| **React** | `^19.2.0` | 现代化 UI 框架（Hooks + 函数式组件） |
| **Vite** | `^7.2.4` | 极速前端构建与热更新工具 |
| **React Router** | `^7.11.0` | 单页 SPA 路由系统 |
| **Ant Design Mobile** | `^5.42.3` | 精品移动端组件库（Toast、Loading 等） |
| **Axios** | `^1.13.2` | 网络请求（统一拦截 Token、状态码提示） |
| **Less** | `^4.5.1` | CSS 预处理器与童趣化主题样式定制 |
| **动态 rem** | 自研脚本 | 屏幕视口动态等比缩放方案 (`rem.js`) |

### 后端 (`backend`)
| 技术 / 库 | 版本 | 作用说明 |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` | JavaScript 运行时环境 |
| **Koa** | `^3.1.1` | 洋葱模型轻量级 Node 服务框架 |
| **koa-router** | `^14.0.0` | RESTful 路由分发 |
| **koa-bodyparser** | `^4.4.1` | 请求体解析（已配置 `jsonLimit: 30mb` 支持识物大图上传） |
| **@koa/cors** | `^5.0.0` | 跨域资源访问支持 |
| **MySQL2** | `^3.16.0` | 高性能 MySQL Promise 连接池 |
| **jsonwebtoken** | `^9.0.3` | JWT 签发与全局鉴权中间件 |
| **bcrypt** | `^6.0.0` | 密码加盐 Hash 安全存储 |
| **svg-captcha** | `^1.4.0` | 图形验证码生成与有效校验 |
| **OpenAI SDK** | `^6.16.0` | 对接 DeepSeek-V3 大模型接口 |

---

## 📂 3. 项目目录结构与代码导览

```text
sino-wind/
├── backend/                             # 【后端工程】Koa 服务端
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                    # MySQL 数据库连接池配置
│   │   ├── controllers/                 # 业务逻辑控制器
│   │   │   ├── authController.js        # 用户注册、登录、信息修改、改密
│   │   │   ├── cozeController.js        # 调用 Coze 图像识别工作流
│   │   │   └── deepseekController.js    # 对接 DeepSeek 大模型对话
│   │   ├── models/                      # 数据库模型层（SQL 执行）
│   │   │   └── userModel.js             # 用户表增删改查 SQL 操作
│   │   ├── routes/                      # 路由接口定义
│   │   │   ├── authRoutes.js            # 认证相关路由 (/api/auth)
│   │   │   ├── coze-api.js              # Coze 识物路由 (/api/coze)
│   │   │   └── deepseek-api.js          # DeepSeek 对话路由 (/api/deepseek)
│   │   ├── utils/                       # 后端工具类
│   │   │   ├── captcha.js               # 内存防刷图形验证码生成与校验
│   │   │   └── jwt.js                   # JWT Token 拦截校验中间件
│   │   └── index.js                     # 后端服务主入口（中间件挂载与启动）
│   ├── .env.example                     # 环境变量示例模板（复制为 .env.local）
│   └── package.json                     # 后端依赖配置
│
├── frontend/                            # 【前端工程】React 移动端单页
│   ├── public/                          # 静态文件
│   ├── src/
│   │   ├── components/                  # 公共组件
│   │   │   ├── HomeCard.jsx             # 首页功能卡片
│   │   │   ├── imageCaptureAndProcess/  # 拍照/相册选图采集组件
│   │   │   └── recognitionResult/       # 识物结果与 TTS 语音播报组件
│   │   ├── http/
│   │   │   └── index.js                 # Axios 实例（接口 baseUrl、Token 拦截器）
│   │   ├── pages/                       # 业务主页面
│   │   │   ├── App.jsx                  # 根路由、全局路由分发、登录注册卡片
│   │   │   ├── Home.jsx                 # 首页
│   │   │   ├── AIPage.jsx               # AI 综合能力聚合入口
│   │   │   ├── Recognition.jsx          # 拍照识物互动页
│   │   │   ├── AiChat.jsx               # DeepSeek 亲子伴学对话页
│   │   │   ├── MinePage.jsx             # 个人中心页
│   │   │   ├── AccountSetting.jsx       # 账号设置页（改密、资料更新）
│   │   │   ├── Layout.jsx               # 移动端底部 Tab 栏公共容器
│   │   │   ├── Login.jsx                # 登录表单卡片
│   │   │   └── Register.jsx             # 注册表单卡片
│   │   ├── styles/                      # Less 模块化样式文件
│   │   ├── utils/
│   │   │   └── rem.js                   # 移动端 10 等分自适应计算脚本
│   │   └── main.jsx                     # 前端入口渲染文件
│   ├── index.html                       # HTML 根模板
│   ├── vite.config.js                   # Vite 构建配置
│   └── package.json                     # 前端依赖配置
│
└── readme.md                            # 项目开发与协作说明文档
```

---

## 🚀 4. 本地环境初始化与启动（必读）

请按照以下顺序完成本地开发环境搭建：

### 4.1 前置运行依赖
请确保你的电脑已安装好：
- **Node.js**：`v18.x` 或 `v20.x`（建议 LTS 版本）
- **npm**：`>= 9.0`（或 pnpm / yarn）
- **MySQL**：`8.0+`（确保本地 3306 端口正常启动）
- **Git**：已配置好 SSH 或 HTTPS 权限

### 4.2 克隆项目代码
```bash
git clone git@github.com:xiaojuju11/sino-wind.git
cd sino-wind
```

---

### 4.3 数据库初始化（MySQL）

1. 打开 Navicat / DataGrip / DBeaver 或 MySQL 命令行：
2. 执行以下建库与建表脚本：

```sql
-- 1. 创建数据库
CREATE DATABASE IF NOT EXISTS `parent_kid_education` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `parent_kid_education`;

-- 2. 创建用户基础数据表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户主键ID',
  `phone` VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号（登录账号）',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Bcrypt 加密密码哈希',
  `nickname` VARCHAR(50) DEFAULT '新用户' COMMENT '用户昵称',
  `avatar` LONGTEXT DEFAULT NULL COMMENT '用户头像（Base64 或远程 URL）',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户基础信息表';
```

---

### 4.4 后端配置与启动 (`backend`)

1. **进入后端目录并安装依赖**：
   ```bash
   cd backend
   npm install
   ```

2. **配置环境变量与数据库密码**：
   - 复制模板文件生成本地环境变量：
     ```bash
     # Windows PowerShell
     copy .env.example .env.local
     # 或 Linux/macOS
     cp .env.example .env.local
     ```
   - 编辑 `backend/.env.local` 填写你的大模型 Key（如有自备 Key 填入；若暂未申请可先体验账号体系功能）：
     ```env
     PORT=3000
     VITE_DEEPSEEK_API_KEY=你的DeepSeek_API_KEY
     VITE_COZE_IMAGE_TO_TEXT_AND_VOICE=你的Coze工作流Token
     ```
   - **核对数据库连接 (`backend/src/config/db.js`)**：
     检查连接池中的密码是否与你本地 MySQL 密码一致：
     ```javascript
     const pool = mysql.createPool({
       host: 'localhost',
       user: 'root',
       password: 'your_mysql_password', // 💡 改为你本地 root 的实际密码
       database: 'parent_kid_education',
       port: 3306,
       waitForConnections: true,
       connectionLimit: 10
     });
     ```

3. **启动后端服务**：
   ```bash
   npm run dev
   ```
   控制台输出 `服务运行在 3000 端口` 即表示后端启动成功！
   可以浏览器访问 `http://localhost:3000/api/test` 测试连通性。

---

### 4.5 前端配置与启动 (`frontend`)

1. **进入前端目录并安装依赖**：
   新开一个终端窗口：
   ```bash
   cd frontend
   npm install
   ```

2. **注意后端 API 地址切换（开发联调关键步骤）**：
   打开 `frontend/src/http/index.js`：
   - 本地全栈开发联调时，请确保 `baseURL` 指向本地：
     ```javascript
     // 本地开发请设为：
     axios.defaults.baseURL = 'http://localhost:3000'

     // 部署服务器时才切换为线上 IP（如：http://120.26.186.48:3000）
     ```

3. **启动前端开发服务**：
   ```bash
   npm run dev
   ```
   根据终端输出的地址访问（通常为 `http://localhost:5173/dist/`）。

4. **📱 调试技巧**：
   本项目以**移动端体验**优先设计，打开浏览器后请按 `F12` 进入开发者工具，点击右上角的 **“移动设备切换图标”（Toggle device toolbar）**，选择 `iPhone 12/14/XR` 等尺寸进行查看与调试，即可呈现原生的 rem 动态适配效果。

---

## 📡 5. 核心 API 接口清单

| 业务分类 | 请求方式 | 接口路由 | 需携带 Token | 功能说明 |
| :--- | :---: | :--- | :---: | :--- |
| **基础测试** | `GET` | `/api/test` | 否 | 测试 Koa 后端健康状态 |
| **图形验证码** | `GET` | `/api/auth/captcha` | 否 | 获取带有干扰线的 SVG 验证码及临时 ID |
| **用户注册** | `POST` | `/api/auth/register` | 否 | 手机号 + 验证码 + 密码注册 |
| **用户登录** | `POST` | `/api/auth/login` | 否 | 手机号密码登录，成功返回 7 天有效 JWT |
| **获取用户信息** | `GET` | `/api/auth/info` | **是** | 传入 Bearer Token 获取个人信息详情 |
| **修改昵称** | `POST` | `/api/auth/updateNickname` | **是** | 更新当前登录用户的昵称 |
| **修改头像** | `POST` | `/api/auth/updateAvatar` | **是** | 上传 Base64/图片链接更新用户头像 |
| **修改密码** | `POST` | `/api/auth/updatePassword` | **是** | 验证旧密码无误后重哈希存储新密码 |
| **AI 识物** | `POST` | `/api/coze/recognition` | **是** | 传入图片 Base64，调用 Coze 工作流识别 |
| **AI 对话** | `POST` | `/api/deepseek/chat` | **是** | 发送对话消息，获取 DeepSeek 伴学回答 |

---

## 🔨 6. 开发者须知与改造指南

当前项目准备进入二次改造与功能升级阶段，建议在开发过程中遵循以下分层约定：

### 6.1 本地联调 vs 线上环境切换
- **后端端口**：默认为 `3000`。
- **前端网络请求**：业务请求全部通过 `frontend/src/http/index.js` 导出，包含：
  - **请求拦截器**：自动从 `localStorage.getItem('token')` 取出并附带在 Headers。
  - **响应拦截器**：业务错误统一使用 AntD `Toast.show` 弹出；若捕获到 `416`（Token 失效或未登录），会自动清理并跳转登录页。

### 6.2 新功能扩展规范
1. **新增后端业务模块时**：
   - 在 `backend/src/routes/` 下新增对应路由文件（如 `story-api.js`）。
   - 在 `backend/src/controllers/` 下编写对应业务逻辑与入参校验。
   - 若涉及数据库交互，将 SQL 统一收拢在 `backend/src/models/`，避免在 Controller 中手写散落的 SQL。
   - 在 `backend/src/index.js` 中引入并 `app.use(...)` 挂载路由。
2. **新增前端页面时**：
   - 页面代码放入 `frontend/src/pages/`。
   - 在 `frontend/src/styles/` 下新建对应页面 Less。
   - 在 `frontend/src/App.jsx` 中注册 Route 路由。如果需要底部 TabBar，嵌套在 `Layout` 子路由中；若是全屏独立页，直接作为一级路由挂载。

### 6.3 数据库迭代建议
- 后续如果新增数据表（例如：`ai_chat_history` 聊天记录表、`growth_records` 儿童成长记录表），请统一在项目中新建 `sql/` 目录或在更新日志中同步增量 SQL 脚本，方便团队伙伴一键执行同步。

---

## ⚠️ 7. 常见避坑指南 (FAQ)

### Q1: `git push` 时报错 `Permission denied (publickey)` 或提示中文路径乱码？
* **原因**：Windows 用户名为中文（如 `郑小君`）时，Git 自带的 MSYS2 ssh 工具无法正确解析中文家目录路径。
* **解决办法**：在 PowerShell 中执行以下命令，全局切换为 Windows 原生 OpenSSH：
  ```powershell
  git config --global core.sshCommand "C:/Windows/System32/OpenSSH/ssh.exe"
  ```

### Q2: 后端提示 `Access denied for user 'root'@'localhost'` 或 `ECONNREFUSED`？
* 检查 MySQL 8.0 服务是否已启动（在 Windows 服务管理或通过终端检查）。
* 检查 `backend/src/config/db.js` 中的 `user` 和 `password` 是否与本地 MySQL 密码一致。

### Q3: 前端登录或请求一直提示超时或网络错误？
* 请检查 `frontend/src/http/index.js` 中的 `axios.defaults.baseURL`。如果是本地开发，必须写 `http://localhost:3000`，不要指向远端暂未开放的服务器 IP。

### Q4: 接口返回 416 状态码？
* `416` 是后端针对“Token 过期或未携带 Token”自定义的拦截响应码。此时前端会自动触发登出机制，重新登录获取新 Token 即可。

---

## 🤝 8. Git 分支与协作规范

为保证代码整洁与多人开发不发生严重冲突，请遵循以下简单规范：

1. **主分支保持稳定**：
   - `main` 分支保持随时可部署状态。
2. **功能改造创建分支**：
   ```bash
   # 1. 确保拉取最新 main 分支
   git checkout main
   git pull origin main

   # 2. 从 main 切出你的特性分支
   git checkout -b feature/改造模块名

   # 3. 开发完成后提交
   git add .
   git commit -m "feat: 完成XX模块重构改造"

   # 4. 推送到远端
   git push origin feature/改造模块名
   ```
3. **提交信息规范建议**：
   - `feat:` 新增功能
   - `fix:` 修复 Bug
   - `refactor:` 代码重构/架构调整
   - `style:` 样式美化与微调
   - `docs:` 文档变更

---

🎉 **祝开发愉快！有任何配置问题随时在团队中同步交流。**
