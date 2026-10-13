# 📣 第三阶段（TRD v3.0）成员 A 变更通报与全员待办

> **给谁看**：全体 4 人（B / C / D / 队长）。A 自己对自己的交接记录在 [`dev-A-auth.md`](./handovers/dev-A-auth.md)，AI 使用申报在 [`ai-log-xiaoxia-2026-10-12-phase3.md`](./handovers/ai-log-xiaoxia-2026-10-12-phase3.md)。
> **为什么要这份**：A 这一轮**动到了别人白名单里的文件**（经本人授权）、**新增了两个接口**、并**改变了一个既有接口的失败语义**——这些如果只写在 A 自己的交接里，B/C/D 不会知道，联调必然踩坑。
> **分支 / 提交**：`feat/phase2-recognition-core`（已推送到 `upstream` = github.com/xiaojuju11/sino-wind）；提交为 `1c7d08b` → `e4cfaf6` → `4df82a8` → `80e65b1` → `0e76a80`。
> **依据**：`TRD.md` v3.0、`docs/design/phase3/` 八张定稿。

---

## 一、A 这一轮改了什么（按文件 + 按归属）

| # | 提交 | 内容 | 文件 | 归属 |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `1c7d08b` | 拍照识器：FileReader 采集、2 秒预算内出结果、三卡片结果 + TTS 试听 + 答辩严谨声明、前端同构兜底库 | `frontend/src/pages/Recognition.jsx`、`components/imageCaptureAndProcess/*`、`components/recognitionResult/*` | A 白名单 |
| 1 | `1c7d08b` | Coze 识物网关：按 §3.1 ④ 补 `audio_url`；无 Token / 超时 / 上游异常一律落内置文博库兜底 | `backend/src/controllers/cozeController.js` | A 白名单 |
| 1 | `1c7d08b` | 后端 AI 统一网关：新增雅译 / 赋魂，对话支持自定人设；三接口统一离线兜底 | `backend/src/controllers/deepseekController.js`、`backend/src/routes/deepseek-api.js` | A（路由文件**待队长追认**） |
| 1 | `1c7d08b` | 日月主题底座：`data-theme` 驱动、`gufeng_theme` 持久化、`--gf-*` 双主题令牌、共享 `ThemeToggle` | `frontend/src/context/*`、`frontend/src/main.jsx` | A（`main.jsx` **待队长追认**） |
| 2 | `e4cfaf6` | D 的三个样式文件接入 `--gf-*` 主题令牌（64 处颜色；浅色逐像素不变）；新增 `--gf-accent-text`；在主题层覆盖 `.layout` / `.bottom-nav` 的深色表现 | `styles/poem.less`、`poemCollection.less`、`minePage.less`、`context/theme.less` | **D 的文件（经 D 授权）** |
| 3 | `4df82a8` | 书斋清规新增「墨色雅意 · 晓色晨宣 / 月下墨境切换」行，接共享 `ThemeToggle` | `frontend/src/pages/MinePage.jsx`、`styles/minePage.less` | **D 的文件（经 D 授权）** |
| 4 | `80e65b1` | **随机诗预取池**：消除进诗词页等上游的空白（`/api/poem/random` 从 2588ms 降到 1~111ms） | `backend/src/controllers/poemController.js` | A（第二阶段起由 A 维护） |
| 5 | `0e76a80` | 诗词页加载态改为与主卡同尺寸的宣纸灰骨架；顺带清掉该文件 3 处未使用 `catch (err)` | `frontend/src/pages/PoemPage.jsx`、`styles/poem.less` | **D 的文件（经 D 授权）** |

**红线文件一律未动**：`App.jsx`、`Layout.jsx`、`global.css`、`variables.less`、`app.less`、`layout.less`、`http/index.js`、`vite.config.js`、`index.html`、`package.json`、`backend/src/index.js`、`backend/src/config/db.js`。深色下对底栏/布局的覆盖写在 `context/theme.less`（主题层），**没有改 `layout.less` 源码**。

---

## 二、接口变更（B / C 必读）

### 2.1 新增：白话雅译 `POST /api/deepseek/yayan`（TRD §4.1）

```jsonc
// 请求（无需登录）
{ "text": "今天下班好累，想去吃火锅喝奶茶" }   // 1 ~ 100 字，对齐定稿输入框「0/100」
// 成功
{ "code": 1, "data": { "modern": "…原白话…", "ancient": "日暮倦归，思炙肉暖釜，兼啜酪饮以慰幽怀。",
                       "author": "苏轼（风骨化用）", "explanation": "…一句释义…" } }
// 降级（无 Key / 断网 / 上游异常，HTTP 仍 200）
{ "code": 1, "data": { …内置雅言库… }, "degraded": true, "source": "local-fallback", "notice": "…" }
```
- **B 要点**：拿到 `degraded === true` 时不要标成「AI 生成」，按兜底文案呈现；「摘录入卷」按 TRD §5 写 `localStorage.gufeng_yayan_list`（数据契约 `[{ id, modern, ancient, author, explanation }]`）。
- 参数不合法（空 / 超 100 字）返回 `400 + code:0`。

### 2.2 新增：一键考释赋魂 `POST /api/deepseek/soul`（TRD §4.2）

```jsonc
// 请求（无需登录）
{ "name": "辛弃疾", "dynasty": "宋" }        // name ≤30 字，dynasty ≤20 字
// 成功 / 降级同形，降级时多 degraded/source/notice
{ "code": 1, "data": { "name": "辛弃疾", "dynasty": "宋", "title": "稼轩居士",
  "prompt": "…人设提示词，可直接回传给 /chat 的 customPrompt…",
  "welcome": "醉里挑灯看剑，梦回吹角连营。来者何人，可愿与稼轩共谋天下之计？",
  "biography": "存词六百余首，词中金戈铁马，报国之志终身不渝。",
  "circle": ["陈亮（鹅湖之会）", "朱熹", "刘过"], "tags": ["豪放悲壮", "气吞万里", "醉里挑灯"] } }
```
- **C 要点（迎请抽屉）**：`circle` / `tags` 最多各 4 项；**降级时 `title` 可能为空串、`circle`/`tags` 可能为空数组**（内置库只收 §4.2 辛弃疾与四位既有先贤，其他名讳**不编造生平**），表单必须能接受空值并提示"离线，请手动补全"；`prompt` 可直接作为 `/chat` 的 `customPrompt` 使用。

### 2.3 行为变更 ⚠️：先贤对话 `POST /api/deepseek/chat`（TRD §4.3）

| 项 | 改动前 | 改动后 |
| :--- | :--- | :--- |
| 请求体 | `{ sageId, message }` | `{ sageId, message, customPrompt? }`（`customPrompt` ≤1000 字为**自定先贤人设**；带它时 `sageId` 不必是既有四位） |
| 失败语义 | `503/502 + code:0`（公共拦截器会弹**红色 Toast**，416 时还会跳登录） | **`code:1` + 兜底话术 + `degraded:true`**（页面不抛红、不白屏） |
| 鉴权 | `verifyToken()` 要求 Token | **未变**（仍要求 Token） |

- **C 要点**：收到 `degraded === true` 时，气泡里应显示后端给的「（离线兜底）…」文案，**不要伪装成先贤真言**；`sageId` 为自定先贤时，后端兜底会用「这位先贤」泛指。

### 2.4 行为变更：识物 `POST /api/coze/recognition`（TRD §3.1 / §4.4）

- 响应 `data` 固定为 `{ name, dynasty, description, score, audio_url }`（本轮新增 `audio_url`，仅 http(s) 直链，缺失为 `''`）。
- 无 Coze Token / 超时 / 上游异常时返回 **`code:1` + 内置文博库兜底 + `degraded:true`**（保温杯 ➔ 宋代执壶 / 汤瓶），识物计数**只在真实识别成功时**递增。
- 鉴权未变（要求 Token）。

### 2.5 未变但要知道

- `GET /api/poem/random`、`GET /api/poem/search`、`POST /api/poem/collect`、`GET /api/poem/my-list`、`GET /api/auth/info` 字段均未变；`/api/poem/random` 仅**新增** `prefetched`（来自预取池）/ `stale`（返回上一首）两个附加字段。
- 四个 AI 接口的**超时**都留在公共 Axios 的 5 秒预算内（雅译 3000ms / 赋魂 3000ms / 对话 4500ms / 识物上游 5000ms）。

---

## 三、按成员的行动清单（你要改什么）

### 🅱️ 成员 B（`Home.jsx` / `home.less`）

| 优先级 | 要做的事 | 怎么做 |
| :-- | :--- | :--- |
| 高 | 顶部题头接日月开关（TRD §3.2 第 1 项） | `import ThemeToggle from '../context/ThemeToggle.jsx'` → 放题头右侧 `<ThemeToggle className='home-hero__mode' />`；或自行写按钮并用 `const { theme, isDark, toggleTheme } = useTheme()`（来自 `../context/useTheme.js`） |
| 高 | 白话雅译接新接口（TRD §4.1） | 调 `POST /api/deepseek/yayan`（当前仓库里没有任何页面在调它）；处理 `degraded`；「摘录入卷」写 `localStorage.gufeng_yayan_list` |
| 中 | 深色适配（AC-B2：深色背景 `#0D1117`、文字玉帛象牙白） | 把 `home.less` 的颜色声明改成 `var(--gf-*, 原值)`（回退值=原值 ⇒ 浅色逐像素不变），页面压层改 `var(--gf-veil, fade(@color-bg, 14%))`；令牌见 `context/theme.less` |
| 低 | 今物寻古 4 组微胶囊直通 `/recognition`、飞花诗令直通 `/poem` | 路由已在 `App.jsx` 注册，无需改路由 |

> ⚠️ `home.less` 目前是编译期令牌 + 不透明纸本底图，**深色下整页仍偏亮**；A 未获授权不代改。需要 A 出手就明说。

### 🅲 成员 C（知音信札 / 迎请抽屉 / 沉浸对话）

| 优先级 | 要做的事 | 怎么做 |
| :-- | :--- | :--- |
| 高 | 迎请抽屉接 `POST /api/deepseek/soul` | 八字段见 §2.2；`circle`/`tags` 最多 4；**降级时字段可能为空**，表单要能编辑空值；`prompt` 回传给 `/chat` 的 `customPrompt` |
| 高 | 对话流适配**新的失败语义** | `/chat` 现在失败也返回 `code:1 + degraded:true`（不再是 503），气泡需识别 `degraded` 并标注兜底，不要当成先贤真言 |
| 中 | 自定先贤对话 | 带 `customPrompt` 调用时 `sageId` 可自定义（如 `custom_1`），无需改后端 |
| 中 | 深色适配 | `useTheme()` / `<ThemeToggle />` 可直接用；`aiPage.less` / `aiChat.less` 按 B 的同一套 `var(--gf-*)` 做法（未授权 A 不代改） |
| 低 | 信札未读角标、群聊复合头像 | 设计稿要求，前端实现，无接口依赖 |

### 🅳 成员 D（诗韵文府 / 墨隐书斋）

**A 在你的授权下动了你 4 个文件，请知悉并避免回退**：

| 文件 | A 改了什么 |
| :--- | :--- |
| `styles/poem.less`、`poemCollection.less`、`minePage.less` | 64 处整值型颜色接 `var(--gf-*, 原值)`（**浅色逐像素不变**，深色自动跟随）；12 处复合用法（`#fff` 象牙白、遮罩、`@color-divider` 分隔线、`rgba(0,0,0,.02)`）按原样保留 |
| `pages/MinePage.jsx` | 书斋清规新增「墨色雅意 · 晓色晨宣 / 月下墨境切换」行（TRD §3.5 / AC-D4 要求该入口），右侧是共享 `ThemeToggle`，已与首页开关双向同步 |
| `styles/poem.less` | 新增 `.poem-scroll__skeleton` + `.poem-skeleton__bar*` 与 `@keyframes poem-skeleton-shimmer` |
| `pages/PoemPage.jsx` | 加载态文字占位 → 同尺寸宣纸灰骨架；清理 3 处未使用 `catch (err)`（ESLint 3 error → 0） |

**请继续遵守的三条**：① 新增/修改颜色继续用 `var(--gf-*)`，深色才能跟随；② 强调**文字**用 `--gf-accent-text`（深色自动转泥金，写死朱砂会在夜色上不可读）；③ 骨架节奏要调就改 `.poem-scroll__skeleton`，别退回文字占位。
**尚未覆盖**：`PoemCollection.jsx` / `MinePage.jsx` 里若还有硬编码墨色或象牙白，深色下可能偏亮（A 只处理了整值型声明）。

### 👑 队长 / 评审人

1. **待追认（越界文件）**：`backend/src/routes/deepseek-api.js`（§2.6 只列了 `coze-api.js`）、`frontend/src/main.jsx`（挂载 `ThemeProvider`，不挂则主题无法全局生效，而 `App.jsx` 属禁改）。
2. **待裁定（口径）**：AC-C2 写死「1.5 秒内完整回填」，真实模型实测 **2457ms**（雅译 1165ms 在 2 秒内）；可选：放宽到 3 秒 / 前端先出骨架到达即回填 / 换模型。
3. **待裁定（配色）**：深色下 `--gf-seal` / `--gf-bamboo` 保留 TRD 明示的 `#8A2B2B` / `#2D5A3F`（定稿按钮取样为 `#701010` / `#31392E`）；新增的 `--gf-accent-text`（深色取定稿泥金 `#CEA559`）是否认可。
4. **运维（阻塞线上联调）**：云端 `120.26.186.48:3000` **缺** `/api/poem/random`（404）与新增的 `/api/deepseek/yayan|soul`（404）→ 需重新部署后端；公共 Axios 的 baseURL 写死云端且属 §2.6 红线，**部署前 B/C 的新接口只能在本地联调**。
5. **素材**：iconfont 两个库与 `antd-mobile-icons` **都没有日/月图标**，`ThemeToggle` 暂用内联线性 SVG，请上传 `icon-ri` / `icon-yue`（替换成本两行）；识物页缺一张器物插图（§1.2 禁 AI 生图）。
6. **合并顺序**：A 的分支**硬依赖**设计分支的 v3 令牌提交（`2f44f08` 带来的 `@color-bg-sunk` / `@color-divider` / `@radius-sheet` / `@shadow-card`，`upstream/main` 里没有）→ **先合设计 PR，再合 A 的分支**，否则 A 的 PR 会连带显示 5 个设计提交（当前 PR diff 为 10 commits / 50 files）。
7. **密钥**：A 联调用的 DeepSeek Key 只写在被忽略的 `backend/.env.local`（`git log -p --all` 全历史零命中），但已在会话中出现明文，**建议轮换一次**。

---

## 四、本地联调怎么跑（含一个环境坑的绕法）

```bash
# 后端（读 backend/.env.local；该文件被 gitignore）
cd backend && npm ci && node src/index.js          # http://localhost:3000

# 前端
cd frontend && npm run dev                          # http://localhost:5173
```

**环境坑**：公共 Axios 的 baseURL 写死 `http://120.26.186.48:3000`（`src/http/index.js` 属 §2.6 红线，不能改），而云端缺接口。A 的做法是**在仓库外**放一份临时 Vite 配置，在 dev 转译阶段替换该字符串（磁盘文件零改动、仓库零新增文件）。下面这份是**实测可用**的原样（放在仓库外任意路径，例如 `C:\temp\vite.local-api.config.mjs`，用 `cd frontend && npx vite --config <该文件>` 启动，端口 5174）：

```js
// 仅本地演示用；不要在仓库里提交它
import { createRequire } from 'node:module'

const ROOT = 'F:/<你的仓库>/frontend'      // 改成自己的绝对路径
const CLOUD = 'http://120.26.186.48:3000'
const LOCAL = 'http://localhost:3000'

const require = createRequire(ROOT + '/package.json')
const reactPlugin = require('@vitejs/plugin-react')
const react = reactPlugin.default ?? reactPlugin

export default {
  root: ROOT,
  base: '/',
  cacheDir: 'C:/temp/vite-cache',            // 与 5173 那个 dev 服分开缓存，避免预构建互相干扰
  plugins: [
    react(),
    {
      name: 'local-api-override',
      apply: 'serve',
      transform(code, id) {
        if (id.replace(/\\/g, '/').endsWith('/src/http/index.js') && code.includes(CLOUD)) {
          return { code: code.split(CLOUD).join(LOCAL) }
        }
      }
    }
  ],
  server: { host: '0.0.0.0', port: 5174, strictPort: true,
            proxy: { '/api': { target: LOCAL, changeOrigin: true } } }
}
```
> 校验替换是否生效：浏览器打开 `http://localhost:5174/src/http/index.js`，应看到 `baseURL = 'http://localhost:3000'`。

**看深色**：任意页面控制台执行 `localStorage.setItem('gufeng_theme','dark'); location.reload()`；或登录后进书斋 → 书斋清规 → 点「墨色雅意」的月亮。
**看真实 AI**：`curl -X POST localhost:3000/api/deepseek/yayan -H 'Content-Type: application/json' -d '{"text":"今天下班好累，想去吃火锅喝奶茶"}'`。

---

## 五、验证证据（提交时全绿）

| 项 | 结果 |
| :--- | :--- |
| 后端语法 `node --check` × 5 文件 | exit 0 |
| 改动文件 ESLint | exit 0（`PoemPage.jsx` 原有 3 处报错已清） |
| `npm run build` | 1021 模块，0 报错 |
| 兜底与入参校验 | **23/23** |
| AI 分支（OpenAI SDK 替身，真实调用 0 次） | **22/22** |
| 随机诗预取池最坏情况（axios 替身，外网 0 次） | **8/8** |
| 渲染层断言（`react-dom/server`，不依赖浏览器） | **40/40** |
| 真实 DeepSeek 联调（A 提供 Key） | **15/15**：雅译 1165ms、赋魂 2457ms、李白对话 866ms、自定先贤 1408ms、识物无 Token 3ms 兜底 |
| 浅色保真（D 页面接入令牌那一次） | 构建产物去深色规则 + 还原 var 回退值 + 颜色记法归一后**逐字节一致 PASS** |
| 令牌对比度（WCAG） | 浅色主文字 13.23:1、深色主文字 11.30:1、深色强调文字 7.34:1，全部达标 |
| 产物禁用配色 | `#667eea`/`#764ba2`/`#4a90e2`/`#ff7a45`/`#e6f7ff`/`#f9fbff` 均 0 次 |

---

## 六、已知限制（不要当成已完成）

1. **真实 Coze 工作流与 TTS 未验证**（无 `COZE_IMAGE_TO_TEXT_AND_VOICE`）：不能宣称真实图像识别与语音讲解可用；`audio_url` 兜底态恒为空。
2. **深色只覆盖**：全站基底 + 识物页 + D 的诗词/书斋页；**B/C 的页面仍偏亮**，AC-D4「切换后全站生效」在全站接完前不能宣称达成。
3. **诗词「换一首」连点**可能拿到同一首（预取池被抽空、上游约 2.6s/首未补齐）；此刻仍为真实作品、不空白。
4. **识物页缺器物插图**（DESIGN.md §2.5 第 4 要素），仓库无素材且禁 AI 生图。
5. **`ThemeToggle` 未在任何 B/C 页面实例化**（只落地在 D 的书斋清规），因此它不进前端 bundle。

---

*维护：A 的每次跨文件改动都应追加到本文第一节与第三节对应成员行，并在 `dev-A-auth.md` 留详细验证记录。*
