# 📜 《云山竹简 · 华风雅集》 (SinoWind)

<p align="center">
  <img src="https://img.shields.io/badge/云山竹简-华风雅集-8A2B2B?style=for-the-badge&logoColor=white" alt="云山竹简">
  <br />
  <strong>基于大语言模型与多智能体协同的宋韵文人数字生活与千古知音对席平台</strong>
  <br />
  <i>“读千年风雅，与君共此山河。观照古今时空，神交千古知己。”</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2.0-2D5A3F?logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Vite-7.3.0-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Ant_Design_Mobile-5.42.3-0170FE?logo=antdesign&logoColor=white" alt="Ant Design Mobile">
  <img src="https://img.shields.io/badge/Iconfont-阿里矢量图库-8A2B2B?logo=alibabacloud&logoColor=white" alt="Iconfont">
  <img src="https://img.shields.io/badge/Koa-3.1.1-33333D?logo=koa&logoColor=white" alt="Koa">
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/DeepSeek-V3-4E6EF2?logo=deepseek&logoColor=white" alt="DeepSeek">
  <img src="https://img.shields.io/badge/License-MIT-C59B27" alt="License">
</p>

---

## 📌 目录导航

- [📖 1. 项目背景与产品愿景](#-1-项目背景与产品愿景)
- [✨ 2. 核心特色业务矩阵](#-2-核心特色业务矩阵)
  - [2.1 🏮【雅集】· 古今映照生活指南](#21-雅集-古今映照生活指南)
  - [2.2 💬【知音】· 微信式文人会话与神仙群聊](#22-知音-微信式文人会话与神仙群聊)
  - [2.3 📜【书斋】· 个人修持与资产沉淀池](#23-书斋-个人修持与资产沉淀池)
- [🛠️ 3. 技术架构与选型](#️-3-技术架构与选型)
- [📂 4. 项目目录结构导览](#-4-项目目录结构导览)
- [🚀 5. 本地环境初始化与启动运行](#-5-本地环境初始化与启动运行)
  - [5.1 前置运行环境](#51-前置运行环境)
  - [5.2 数据库初始化 (MySQL)](#52-数据库初始化-mysql)
  - [5.3 后端服务启动 (`backend`)](#53-后端服务启动-backend)
  - [5.4 前端工程启动 (`frontend`)](#54-前端工程启动-frontend)
- [📡 6. 核心 API 接口契约](#-6-核心-api-接口契约)
- [🎨 7. 宋韵视觉系统规范 (Design Tokens)](#-7-宋韵视觉系统规范-design-tokens)
- [🤝 8. 团队协作与敏捷规范](#-8-团队协作与敏捷规范)

---

## 📖 1. 项目背景与产品愿景

**《云山竹简 · 华风雅集》** 是一套面向移动端沉浸体验的现代文人生活与传统文化活化平台。

传统的文化类应用常陷入“死板背诗、单向输出、界面割裂”的窠臼。本项目以**两宋文人雅致美学**为基底，融合**大语言模型角色扮演（Role-Playing）、多智能体协同（Multi-Agent Group Chat）、古籍检索增强**等前沿 AI 技术，打通现代都市青年的日常生活与千年前先贤风骨的心灵连接：
- **见物识器**：既能鉴赏传世金石，亦能用古人雅称趣味反观现代日常物象；
- **言语入卷**：输入大白话，瞬间转化为出口成章的典雅诗词文言，赋予社交表达新美感；
- **神交古人**：像刷微信一样与李白、苏轼、李清照促膝长谈，甚至把多位先贤拉入“神仙群聊”同台唱和，更支持自定义迎请知己并由 AI 自动考释赋魂。

---

## ✨ 2. 核心特色业务矩阵

### 2.1 🏮【雅集】· 古今映照生活指南 (`/home`)
> *文人晨起与日常总览，在古今时空折叠中感知传统文化之美。*

1. **古今时令与天象对照**：
   - 自动换算现代时间气象为古代**十二时辰**（未时 · 日昳）、**干支纪历**、**二十四节气与七十二候**；
   - 呈现古人眼中的气象雅语（如晴朗微风 ➔ *“天朗气清，惠风和畅”*；细雨 ➔ *“沾衣欲湿杏花雨”*）。
2. **白话雅译 · 言语入卷（核心文化爆点）**：
   - 用户输入现代日常普通话（如*“今天心情很好，去公园走走放松一下”*）；
   - AI 瞬时转化为名篇化用（*“偷得浮生半日闲，竹杖芒鞋轻胜马”*）与文言释义；
   - 支持一键【📥 摘录入卷】，盖印沉淀入个人书斋。
3. **古今识物（博古品鉴与物象互通）**：
   - 移动端镜头拍照/相册上传，双向考释；
   - 拍文物识窑口、形制与年代；拍现代物品（如奶茶 ➔ 酪饮/酥签）探寻古代对应雅称。
4. **古诗词天地入口**：
   - 仿古线装书微展卷，一键直通 `/poem` 沉浸研读页，提供全幅宣纸大卷轴、实时检索、名作换一首与诗意赏析。

---

### 2.2 💬【知音】· 微信式文人会话与神仙群聊 (`/ai`)
> *打破时空界限，以现代即时通讯习惯与千古知己畅聊。*

1. **知己信札列表（微信 IM 风格交互）**：
   - 顶部先贤横滑圆形立绘头像条（李白、苏轼、李清照、杜甫、`[+] 迎请新友`）；
   - 竖向消息列表展示最新古风信札与朱砂红未读角标。
2. **🏮【竹林雅集 · 先贤群聊】（多智能体协同 Multi-Agent）**：
   - 李白、杜甫、高适等文人共聚一堂；用户发出一问，李白举杯对诗，杜甫随声附和，生动再现兰亭雅集、齐鲁同游的文坛胜景！
3. **沉浸式对话详情视窗 (`/ai-chat`)**：
   - 诗人立绘大光晕欢迎卡，提供 **4 大灵感话题胶囊**（论诗酒、同作七绝、问人生坎坷、白话雅译），解决提问冷启动；
   - 宣纸水墨气泡，支持语音输入与即时流式畅论。
4. **✨【自定知音 · 迎请故友】（高自由度捏人体系）**：
   - **AI 考释赋魂（极简模式）**：输入诗人名（如“辛弃疾”、“纳兰性德”），AI 自动检索生成生平纪略、存诗量估算、历史知己圈与专属性格 Prompt；
   - **自由自拟（捏人模式）**：支持自定义名号、朝代、性格标签、第一句开场信札，迎请后即刻入驻通讯录！

---

### 2.3 📜【书斋】· 个人修持与资产沉淀池 (`/mine`)
> *一卷诗书藏风雅，半窗山水养心性。文人修持的数字化资产中枢。*

1. **四维修持看板**：
   - 动态汇聚鉴宝藏器、论道问策、诗签摘录、自定知友 4 大维度，展现文风品阶（玖阶品位）。
2. **五大文人资产沉淀通道**：
   - **📜 我的诗笺** (`/poem-collection`)：双端木轴展开弹窗、宣纸瀑布流、实时检索（已完工落地）；
   - **🎴 雅言锦囊**：沉淀“白话雅译”中生成并摘录的高雅名句；
   - **👥 知己名录**：沉淀用户自主迎请的自定义诗人档案库；
   - **🏺 鉴物图谱**：古今器物考释记录与拍照品鉴图谱；
   - **🖌️ 论道札记**：与先贤单聊与群聊中的名言警句剪辑。

---

## 🛠️ 3. 技术架构与选型

### 前端技术栈 (`frontend`)
| 技术 / 库 | 版本 | 核心职责 |
| :--- | :--- | :--- |
| **React** | `^19.2.0` | 现代化声明式 UI 框架（React 19 Hooks + 状态驱动） |
| **Vite** | `^7.3.0` | 极速前端构建与热更新编译工具（10s 内全量打包） |
| **React Router** | `^7.11.0` | 单页 SPA 客户端路由调度与参数传递 |
| **Ant Design Mobile** | `^5.42.3` | 精品移动端交互组件（Toast、ActionSheet、Modal 等） |
| **Iconfont 阿里矢量库** | 官方 CDN | 全局基础图标 (`font_5104647`) + 国风定制图标 (`font_5241957`) |
| **Less** | `^4.5.1` | 模块化 CSS 预处理器，管理宋韵 Tokens 与微质感动效 |
| **动态 rem** | 自研 `rem.js` | 基于 390px 视口 clientWidth/10 动态等比缩放方案 |
| **Axios** | `^1.13.2` | 统一 HTTP 客户端，拦截 Bearer Token 与全局异常处理 |

### 后端技术栈 (`backend`)
| 技术 / 库 | 版本 | 核心职责 |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` | 服务端 JavaScript 运行时 |
| **Koa** | `^3.1.1` | 轻量级洋葱模型 Web 框架 |
| **koa-router** | `^14.0.0` | 模块化 RESTful 路由调度 |
| **MySQL2** | `^3.16.0` | 高性能 MySQL Promise 连接池（事务与悲观锁支持） |
| **DeepSeek-V3 (OpenAI SDK)** | `^6.16.0` | 接入 DeepSeek 大模型，驱动文人角色扮演与白话雅译 |
| **jsonwebtoken** | `^9.0.3` | JWT 签发与无状态权限拦截校验 |
| **bcrypt** | `^6.0.0` | 用户密押加盐 Hash 安全存储 |
| **svg-captcha** | `^1.4.0` | 防刷图形验真码动态绘制 |

---

## 📂 4. 项目目录结构导览

```text
sino-wind/
├── backend/                             # 【后端工程】Koa 服务端
│   ├── scripts/                         # 数据库结构增量迁移脚本 (init-day1.js)
│   ├── src/
│   │   ├── config/                      # 数据库连接池与环境配置 (db.js)
│   │   ├── controllers/                 # 业务控制器
│   │   │   ├── authController.js        # 用户认证、修持数据统计
│   │   │   ├── deepseekController.js    # DeepSeek 诗人人设与论道对话
│   │   │   └── poemController.js        # 诗词随机/检索/事务收藏/分页
│   │   ├── routes/                      # 接口路由分发 (auth / poem / deepseek)
│   │   ├── utils/                       # JWT 校验、密码加盐工具
│   │   └── index.js                     # 服务端启动主入口
│   └── package.json
├── frontend/                            # 【前端工程】React 19 客户端
│   ├── public/assets/                   # 高清背景、先贤立绘、印章切图
│   ├── src/
│   │   ├── components/                  # 通用业务组件 (HomeCard, 拍照识别)
│   │   ├── http/                        # Axios 实例与请求响应拦截器
│   │   ├── pages/                       # 核心业务页面
│   │   │   ├── Home.jsx                 # Tab 1【雅集】
│   │   │   ├── AIPage.jsx               # Tab 2【知音】(消息信札主页)
│   │   │   ├── MinePage.jsx             # Tab 3【书斋】(个人中心)
│   │   │   ├── PoemPage.jsx             # 【古诗词天地】二级研读页
│   │   │   ├── PoemCollection.jsx       # 【我的诗笺】二级收录瀑布流
│   │   │   ├── AiChat.jsx               # 【对席论道 / 群聊详情】视窗
│   │   │   └── AuthPage.jsx             # 【入席 / 缔约】身份认证
│   │   ├── styles/                      # Less 模块化样式文件 (宋韵 Tokens)
│   │   ├── utils/                       # rem 动态缩放脚本
│   │   ├── App.jsx                      # 全局路由树配置
│   │   └── main.jsx                     # 前端挂载入口
│   ├── index.html                       # 注入阿里 Iconfont 图标库
│   └── package.json
├── docs/                                # 工程交接与参赛合规归档
│   ├── handovers/                       # 成员 A/B/C 开发日志与 AI 使用填报表
│   └── PHASE2_API_CONTRACT.md           # 第二阶段全栈接口契约规范
├── DESIGN.md                            # UI/UX 设计师专属纯视觉出图指南
└── README.md                            # 项目全景说明书（本文档）
```

---

## 🚀 5. 本地环境初始化与启动运行

### 5.1 前置运行环境
- **Node.js**：`>= 18.0.0`
- **npm**：`>= 9.0.0`
- **MySQL**：`8.0+`
- **DeepSeek API Key**：前往 DeepSeek 开放平台获取

### 5.2 数据库初始化 (MySQL)
1. 启动本地 MySQL 服务，创建数据库：
   ```sql
   CREATE DATABASE IF NOT EXISTS parent_kid_education DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. 进入 `backend/` 目录，配置环境变量 `.env`：
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=你的数据库密码
   DB_NAME=parent_kid_education
   VITE_DEEPSEEK_API_KEY=你的DeepSeek_API_Key
   ```
3. 执行增量数据结构迁移脚本：
   ```bash
   cd backend
   node scripts/init-day1.js
   ```
   *(终端输出 `Day 1 数据库结构初始化完成` 即表示用户修持字段与 `user_poems` 表构建成功)*

### 5.3 后端服务启动 (`backend`)

启动前在 `backend/.env.local` 配置数据库、AI 服务和必填的 `JWT_SECRET`。JWT 密钥须为至少32字符的独立随机值，不能使用旧版公开默认值；配置缺失或不安全时服务将拒绝启动。可在 `backend` 目录运行下列命令生成密钥，再写入被 Git 忽略的 `.env.local`；生产环境请通过部署平台独立配置，勿提交密钥：

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

```bash
cd backend
npm install
node src/index.js
```
默认服务将在 `http://localhost:3000` 启动监听。

### 5.4 前端工程启动 (`frontend`)
```bash
cd frontend
npm install
npm run dev
```
打开浏览器访问 `http://localhost:5173`，推荐使用 Chrome 开发者工具切换为 **iPhone 12/13/14 (390×844)** 移动端视口以获得最佳宋韵美学体验。

执行生产构建：
```bash
npm run build
```
*(全站 1015+ 模块极速转换，编译零警告错误)*

本地回归：在 `frontend` 目录执行 `npm test`、`npm run lint`、`npm run build`；在 `backend` 目录执行 `npm test`。默认后端测试使用隔离文件与模拟 AI/数据库，不会修改业务数据库；需要真实数据库的历史联调脚本仍在 `backend/scripts/`，按各脚本说明单独执行。

---

## 📡 6. 核心 API 接口契约

后端共 **46 条**接口，按 **7 个**路由模块挂载（`auth` / `poem` / `coze` / `deepseek` / `upload` / `scene` / `poetry-frequency`）。下表列出核心接口；完整清单见 `backend/src/routes/` 或运行 `node proof/gen-api-list.mjs` 生成。

**鉴权约定**：需鉴权的接口在 `Authorization` 头携带 Token。Token 缺失或过期时统一返回 **HTTP 416**（前端据此跳转登录页）；标记「可选」的接口允许游客访问，登录后自动关联账号数据。

| 接口路径 | 方法 | 鉴权 | 功能描述 |
| :--- | :---: | :---: | :--- |
| `/api/auth/login` | POST | 否 | 手机/邮箱密押登录，返回 Token |
| `/api/auth/register` | POST | 否 | 雅士缔约注册，防重验真 |
| `/api/auth/captcha` | GET | 否 | 图形验证码（svg-captcha） |
| `/api/auth/info` | GET | 是 | 雅士档案与修持统计 |
| `/api/poem/random` | GET | 否 | 随机经典诗词（三级降级 + 缓存） |
| `/api/poem/search` | GET | 否 | 关键词检索诗篇 |
| `/api/poem/collect` | POST | 是 | 诗卷摘录入卷（行锁 + 防重事务） |
| `/api/poem/collection` | GET | 是 | 分页查询「我的诗笺」 |
| `/api/deepseek/chat` | POST | 可选 | 携 `sageId` 人设的先贤单聊/群聊对话 |
| `/api/deepseek/chat/stream` | POST | 可选 | 同上，SSE 流式返回 |
| `/api/deepseek/soul` | POST | 是 | 输入诗人名，AI 考释赋魂生成生平与交游圈 |
| `/api/deepseek/yayan` | POST | 否 | 现代白话转写文言雅语（含离线兜底） |
| `/api/deepseek/appreciate` | POST | 否 | 古诗词分级赏析（含离线兜底） |
| `/api/deepseek/feihua/rules` | GET | 否 | 飞花令令字白名单与规则 |
| `/api/deepseek/feihua/start` | POST | 可选 | 开局（平水韵校验 + 本地计分） |
| `/api/deepseek/feihua/turn` | POST | 可选 | 出句校验与应答 |
| `/api/deepseek/scholar/summary` | GET | 是 | 修持四维统计（鉴宝/论道/诗签/雅言） |
| `/api/deepseek/scholar/letters` | GET | 是 | 先贤信札列表 |
| `/api/scene/status` | GET | 否 | 寻镜入诗本地场景推理能力探测 |
| `/api/scene/analyze` | POST | 否 | 上传图像做 CPU 山水意境分割与诗句匹配 |
| `/api/poetry-frequency/meta` | GET | 否 | 诗海字衡元数据（语料规模、可用朝代） |
| `/api/poetry-frequency/stats` | GET | 否 | 字频/词频统计结果 |
| `/api/poetry-frequency/contexts` | GET | 否 | 指定字词的诗句上下文 |
| `/api/coze/recognition` | POST | 否 | 拍照识器（多模态识别，上游不可用时返回明确错误码） |
| `/api/upload/check` `/chunk` `/merge` | POST | 是 | 头像分片上传 |

**已移除的接口**（早期文档曾列出，现已不存在）：`/api/almanac/dual`（古今时令改由前端 `utils/almanac.js` 计算）、`/api/translation/classical`（更名 `/api/deepseek/yayan`）、`/api/sage/generate-profile`（更名 `/api/deepseek/soul`）。

---

## 🎨 7. 宋韵视觉系统规范 (Design Tokens)

为确保视觉的严谨与高贵，全站统一度量与调色基准：
- **暖宣纸底色 (`#F7F4EB`)**：全屏基调，还原宋代澄心堂纸温润肌理；
- **绢帛卡片白 (`#FFFFFF`)**：卡片与对话气泡，承托文字易读性；
- **竹青雅色 (`#2D5A3F`)**：君子风骨，主色高亮与用户气泡；
- **朱砂印泥红 (`#8A2B2B`)**：印鉴点睛、未读角标与主操作按钮；
- **泥金描边 (`#C59B27`)**：卷轴包边、荣誉勋章与微浮雕装饰；
- **图标铁律**：全量使用团队定制阿里巴巴 Iconfont 矢量库（`<i className="iconfont icon-xxx"></i>`），严禁使用未经优化的重型图片图标破坏加载性能。

---

## 🤝 8. 团队协作与敏捷规范

- **分支管理**：
  - `main`：生产主干，要求随时可构建、随时可路演演示；
  - `feat/phase2-backend`：成员 A 负责的认证重构与 AI/数据接口；
  - `feat/phase2-frontend-poem`：成员 B 负责的雅集与诗卷研读；
  - `feat/phase2-literati-c`：成员 C（队长）负责的知音信札、书斋闭环与全栈集成。
- **竞赛合规铁律**：
  - 团队成员每次代码提交，必须在 `docs/handovers/` 同步更新《开发交接记录》与《AI 工具使用与团队实质性贡献填报表》，严守竞赛官方诚信自律要求。

---

<p align="center">
  <strong>© 2026 《云山竹简 · 华风雅集》 研发团队 · 倾心匠造</strong>
  <br />
  <i>千载风雅，今朝入卷。</i>
</p>
