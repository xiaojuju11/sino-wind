# 📋 研发提交与 AI 使用情况填报表（成员 A · 第三阶段：物溯识器 / Coze 网关 / 后端 AI 统一网关 / 日月主题底座）

> 按 `docs/handovers/AI_USAGE_TEMPLATE.md` 填报，依据 `TRD.md` v3.0（2026-10-12 收官版）。
> ⚠️ 标注 `[待本人补充]` 的字段需提交人本人填写；本表未提交、未推送，改动留在本地工作区。

---

## 一、 提交基本信息

| 字段 | 填报内容 |
| :--- | :--- |
| **填报人姓名** | 刘霞（成员 A） |
| **所属团队角色** | 成员 A（全栈底座与物溯古今：拍照识器 / Coze 工作流对接 / 后端 AI 统一网关 / 全局主题底座） |
| **提交日期** | 2026年10月12日 |
| **Git 分支名称** | 当前工作区位于 `feat/design-phase3-tokens`；TRD §2.1 指定成员 A 的分支为 `feat/phase2-recognition-core`。**本次未创建分支、未提交、未推送**，按本人要求留待本人验收后自行提交 |
| **关联 Commit / PR** | 暂未提交（本地工作区改动）；工作区同时存在他人未提交的设计稿改动与删除记录，未做任何 Git 操作 |
| **本次交付的模块/页面** | ① 物溯古今 · 拍照识器（`/recognition`）② Coze 智能工作流识物网关 ③ 后端大模型统一网关（白话雅译 / AI 一键考释赋魂 / 多先贤对话）④ 晓色晨宣 · 月下墨境 日月主题底座 |

---

## 二、 人工智能（AI）工具与模型使用清单

| 序号 | 使用环节 | 使用的具体工具/模型名称及版本号 | 输入素材与主要 Prompt 指令摘要 | 生成的原始产出物说明 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | 代码辅助（前端 / 后端控制器 / Less） | DeepSeek Harness 智能体（`deepseek-flash`） | 输入：`TRD.md` v3.0 全文（§1.2 图标铁律、§2.2 / §2.6 成员 A 分工与红线、§3.1 识物工作流、§4.1~§4.4 接口契约、§5 本地存储字典、§10 三级容灾）、`docs/design/phase3/` 八张定稿、仓库现有 `Recognition.jsx` / `cozeController.js` / `deepseekController.js` / `variables.less`、两个 Iconfont CDN 实际类名清单；指令：严格按 TRD 落地成员 A 交付物，不得自行发明字段与色值 | 后端三接口与兜底实现草案、识物页三卡片结构与 Less、主题令牌层与 `ThemeContext`、兜底文案 |
| 2 | 取证核对（不产出设计） | DeepSeek Harness 智能体 + 内置 Pillow 12.3.0 取样脚本 | 输入：`docs/design/phase3/1aa18cbbe...png`（唯一深色定稿，853×1844）；指令：取样深色页面底、卡片内面、按钮、描金线与文字色，用于 `--gf-*` 深色令牌 | 深色令牌取值证据（`#171E23` / `#142029` / `#CEA559` / `#E8D0B0` 等）与取样记录 |
| 3 | 真实模型联调（非生成代码，仅验证） | DeepSeek-V3（`deepseek-chat`，经本项目 `backend` 网关调用） | 输入：本人提供的 API Key 与 4 条测试问句（白话雅译「今天下班好累，想去吃火锅喝奶茶」、赋魂「纳兰性德 / 清」、李白对话「太白兄，何以解忧？」、自定先贤纳兰性德人设对话）；指令：验证真实模型路径是否符合 TRD §4.1~§4.3 契约并实测时延 | 真实雅句、先贤档案（雅号「楞伽山人」等）、先贤回复共 4 条；实测时延 1165ms / 2457ms / 866ms / 1408ms |
| 4 | 图标来源 | **未使用任何 AI 绘图** | 只用 `frontend/index.html` 已注入的团队 Iconfont 库（`font_5104647` 基础库 + `font_5241957` 国风库），并抓取两份 CDN CSS 核对真实类名 | 页面使用 `icon-fanhui` / `icon-close` / `icon-image` / `icon-xiangji` / `icon-shangchuan` / `icon-yinliang-F` / `icon-zhanpin` / `icon-shuben` / `icon-zhinan` |

> 本次**未使用** Midjourney / Stitch / GPT-Image 等绘图模型；未生成任何位图图标或插图。

---

## 三、 人工筛选、修改、重构与二次创作过程

> 本节如实说明：**AI 负责起草与取证，本人负责口径裁定与边界决策**。

### 1. 人工筛选与内容把关（本人的口径裁定）

- **识物字段口径（本人裁定）**：TRD §3.1 ④ 写 `{ name, dynasty, description, score, audio_url }`，§4.4 示例却是 `{ image_description, safety }` 且 `code:0`；本人裁定沿用仓库现有四字段并新增 `audio_url`，前端按此渲染。
- **主题底座落位（本人裁定）**：TRD §2.2 要求 A 在 `frontend/src/styles/global.css` 锁定 `--gf-*` 变量，§2.6 又把 `global.css` 列为全员严禁触碰；本人裁定「做 ThemeContext、不碰 `global.css`」，变量层改落 `frontend/src/context/theme.less`。
- **兜底文案边界（本人要求）**：断网 / 无 Key 时要有兜底推演（AC-A2），但**不得编造**生平、诗句与评价分数；兜底条目只取 TRD §4.2 / §4.4 已有原文，档案库外的名讳一律留空并标注待补。
- **边界与 Git（本人要求）**：只改文件、不动 Git（不建分支、不 commit、不 push），提交与 PR 由本人验收后执行。
- `[待本人补充：本轮你在评审中额外推翻或调整了 AI 的哪些结论]`

### 2. 视觉素材的人工二次加工

- 本次**未新增任何切图**：背景沿用仓库既有 `frontend/public/assets/common/bg_guofeng.jpg`，图标全部为 Iconfont 字体图标，印章为纯 CSS 方章。
- 深色令牌不是「凭感觉调色」，而是由本人指定「以 phase3 唯一深色定稿为准」后，用取样脚本从定稿像素取证所得（浅色令牌沿用 `variables.less` 既有取值）。
- `[待本人补充：是否需要对识物页补一张器物插图（DESIGN.md §2.5 第 4 要素）]`

### 3. 代码与系统的手工重构与编写（核心）

- AI 输出的是草案：识物结果组件原本读的是 `data.image_description` / `data.safety`（与后端实际返回的四字段不匹配，页面永远显示「暂无考释」），本次按本人裁定的四字段重写三大卡片，并补上前端兜底库。
- 本人要求把「加载转圈」改为骨架占位、把两个 Less 文件的顶格规则收敛进根类名、把 `antd-mobile-icons` 换成 Iconfont 真实类名，均逐条核对后才落码。
- 兜底策略的工程口径由本人确认：**2 秒内必须出结果**（先上屏内置文博库兜底，真实工作流回来再替换），而非把真实识别等待拉长。
- `[待本人补充：你在定稿时手工调整了哪些取值或文件]`

**提交前建议本人逐条核验（约 10 分钟）**：

1. `TRD.md §4.1` 的雅译示例句、`§4.2` 的辛弃疾档案是否与 `deepseekController.js` 内置库逐字一致；
2. `theme.less` 深色令牌是否与 `docs/design/phase3/1aa18cbbe...png` 观感一致（尤其 `--gf-seal` / `--gf-bamboo` 未随稿压色，是否接受）；
3. 无 Key 状态下真机跑一遍：上传 → 2 秒内出兜底三卡片 → 不掉红、不白屏；
4. 决定 `main.jsx` 挂载 `ThemeProvider` 这一处是否由本人保留；
5. 替换本表中 `[待本人补充]` 字段。

---

## 四、 本人本次提交的实质性技术贡献

### 1. 核心自主内容（按 TRD 条款逐项落地）

| TRD 依据 | 交付内容 | 文件 |
| :--- | :--- | :--- |
| §2.2 第 3 项、§4.1 / §4.2 / §4.3 | 后端大模型统一网关：`translateYayan`（白话雅译）、`soulScholar`（AI 一键考释赋魂）、`deepseekChat` 支持 `customPrompt` 自定先贤；三接口统一离线兜底（`code:1` + 内置库 + `degraded:true`，页面不抛红） | `backend/src/controllers/deepseekController.js` |
| §4.1 / §4.2 | 路由挂载 `/api/deepseek/yayan`、`/api/deepseek/soul`（契约未要求鉴权；`/chat` 既有鉴权未动） | `backend/src/routes/deepseek-api.js` |
| §3.1、§4.4 | Coze 工作流网关：输出按 §3.1 ④ 补 `audio_url`（只收 http(s) 直链，缺失不伪造）；无 Token / 超时 / 网络异常 / 上游不可解析一律落到内置文博库兜底（保温杯 ➔ 宋代执壶 / 汤瓶） | `backend/src/controllers/cozeController.js` |
| §2.2 第 2 项、AC-A1 / AC-A3 | 拍照识器页：FileReader 转 Base64、统一走公共 Axios、2 秒预算内必出结果、请求序号防旧响应覆盖 | `frontend/src/pages/Recognition.jsx` |
| §2.2 第 2 项、§3.1 展示层 | 结果组件：金石鉴赏 / 器物考释 / 文人品鉴心得三卡片 + TTS 语音试听 + §3.1 答辩严谨声明；兜底时品位鉴值显「待考」，不编造评分 | `frontend/src/components/recognitionResult/Index.jsx`、`index.less` |
| §10 第二级容灾 | 前端同构兜底库（服务端与前端均置入，断网秒级出结果） | `frontend/src/components/recognitionResult/localFallback.js` |
| §2.2 第 2 项 | 图片采集器：FileReader 编码、超限 / 非 JPEG·PNG·WebP 自动重编码、摄像头失败走温和提示、骨架占位加载 | `frontend/src/components/imageCaptureAndProcess/index.jsx`、`index.less` |
| §2.2 第 1 项、§3.2 第 1 项、§5 | 日月主题底座：`data-theme` 驱动、`gufeng_theme` 本地持久化、`--gf-*` 令牌层（浅色沿用 v3 令牌，深色取自 phase3 定稿取样 + AC-B2 的 `#0D1117`） | `frontend/src/context/ThemeContext.jsx`、`theme.less`、`useTheme.js` |
| §3.2 第 1 项（队长裁定共享组件） | 日 / 月药丸开关组件，供成员 B 首页题头与成员 D 书斋清规直接引用（`<ThemeToggle />`），无障碍名称与激活态齐备 | `frontend/src/context/ThemeToggle.jsx`、`themeToggle.less` |
| §1.2 图标铁律 | 全量改用项目内置 Iconfont 真实类名，禁用位图 / emoji / 字符箭头 | 上述 JSX / Less |
| 团队协作文档 | 应本人要求新增**跨成员**变更通报：改了什么（按文件+归属）、接口变更（含失败语义变化）、B/C/D/队长各自待办、环境坑绕法、验证证据、已知限制 | `docs/PHASE3_CHANGES_AND_TEAM_ACTIONS.md` |

### 2. 解决的关键工程问题

| 问题 | 处理方式 |
| :--- | :--- |
| 前端结果组件读的字段（`image_description` / `safety`）与后端实际返回（`name` / `dynasty` / `description` / `score`）不一致，页面永远显示「暂无考释」 | 按本人裁定的四字段 + `audio_url` 重写结果组件，并把 `description` 中既有的 `【流变考略】` 标记拆成「器物考释」与「文人品鉴心得」两卡 |
| AC-A1 要求 2 秒内出结果，但真实视觉工作流（视觉+推演+TTS）通常更慢 | 前端 2 秒预算：到点先上屏内置文博库兜底并标注「仍在等待真实工作流」，真实响应回来再替换，既不空转也不丢弃真实结果 |
| 公共 Axios 的 `axios.timeout = 5000` 实际写在实例属性上、`defaults.timeout` 仍为 0，断网时请求会长时间悬挂 | 识物请求显式传 `timeout`，网络层整体由前端兜底兜住（未改公共拦截器，遵守 §2.6） |
| 手机原图常超过服务端 10MB 上限、iPhone 可能给到非 JPEG/PNG/WebP 的 Base64 | 采集时判体积与 MIME，必要时经 canvas 等比压缩重编码为 JPEG（长边 ≤ 1600） |
| 图标库无日 / 月图标（两套 Iconfont 库与 `antd-mobile-icons` 均无，已逐项核对） | 不违反铁律自制位图、也不用 emoji 充当图标，改用内联线性矢量 SVG 兜底并隔离成两个 Glyph；同时把「上传 `icon-ri`/`icon-yue`」列为待队长处理项，替换成本为两行 |
| 无 Key / 断网时接口返回 `code:0` 会让公共拦截器弹红色错误 Toast | 三个 AI 接口与识物接口在降级时统一返回 `code:1` + `degraded:true` + `notice`，把「失败」表达为「兜底」，满足 §10「绝不向 UI 抛出红色崩溃 Toast」 |

### 验证证据（机器核对，非人工目测）

| 验证项 | 结果 |
| :--- | :--- |
| 后端语法 `node --check` × 3 | exit 0 |
| ESLint（含 React Hooks 规则）× 7 个改动文件 | exit 0 |
| `npm run build` | 1019 模块，0 报错 |
| 真实 Koa 起服 HTTP 实测（无 Key 状态） | `/api/deepseek/yayan` 回 §4.1 原句；`/api/deepseek/soul` 回 §4.2 辛弃疾全字段；空文本 400；识物无 Token 416（既有鉴权） |
| 控制器级用例 | **23/23 通过**（参数校验 + 三接口兜底 + 识物五字段 + 未收录名讳不编造 + 兜底不编造评分） |
| AI 分支用例（OpenAI SDK 替身拦截） | **22/22 通过**（模型/端点/超时/JSON 输出约束/反编造约束注入/列表截断/自定人设替换/四类异常降级），**真实 DeepSeek 调用 0 次** |
| 真实 DeepSeek 联调（本人提供 Key） | **15/15 通过**：雅译 1165ms 真实成句、赋魂 2457ms 真实档案、李白对话 866ms、自定先贤 1408ms；识物无 Coze Token 时 3ms 秒级兜底。**结论：AC-C2 的 1.5 秒口径真实模型达不到（2457ms），已列入待裁定项** |
| 密钥安全复核 | `backend/.env.local` 命中 `backend/.gitignore:2`；`git grep` 在已跟踪文件中零命中；不出现在待提交列表 |
| 渲染层断言（esbuild + `react-dom/server`，不依赖浏览器、不新增依赖） | **36/36 通过**（三卡片 / 朝代印 / 待考口径 / 答辩声明 / 播放器禁用态 / 骨架占位 / ThemeProvider 默认 light / 存储键 `gufeng_theme` / ThemeToggle 双侧与激活态与线性 SVG 图标） |
| 令牌对比度（WCAG） | 浅色主文字 13.23:1、浅色次文字 5.28:1、朱砂按钮 7.98:1、深色主文字/#0D1117 12.69:1、深色主文字/卡片底 11.30:1、深色次文字 5.12:1，全部达标 |
| 产物禁用配色排查 | `#667eea` / `#764ba2` / `#4a90e2` / `#ff7a45` / `#e6f7ff` / `#f9fbff` 均为 0 次 |
| 兼容性 | `ImageCaptureAndProcess` 全仓仅 `Recognition.jsx` 一处调用，移除其未使用的 `theme` 入参无兼容风险 |

> 以上脚本均为**只读核对**，保存在本次 AI 输出目录，未加入仓库；未产生任何真实 DeepSeek / Coze 调用。

### 3. 工作量自主占比估算

- 本人纯人工工程工作量占比：`[待本人补充]`
- AI 工具辅助占比：`[待本人补充]`

---

## 五、 版权、数据安全与伦理合规自查

- [x] **第三方版权**：本次未引入任何外部素材；背景图为仓库既有 `assets/common/bg_guofeng.jpg`，图标为团队 Iconfont CDN 字体，印章为纯 CSS 绘制，未使用绘图模型产出物。
- [x] **数据与隐私**：本次提交内容不含任何 API Key / Token / 数据库口令 —— 真实联调用的 DeepSeek Key 只写入被 `.gitignore` 忽略的 `backend/.env.local`，已用 `git check-ignore` 与 `git grep` 复核「已跟踪文件中零命中」；上传图片只在前端内存与请求体中出现，服务端未落盘、未打印图片内容。
- [x] **AIGC 标识**：识物结果与先贤对话的兜底文案均显式标注「离线兜底 / AI 模拟」，并在结果卡底部常驻「本功能为国风趣味科普推演与文脉流变研习，非严谨考古鉴定工具」（TRD §3.1 答辩严谨声明）。
- [ ] **真实性保证**：本人承诺以上使用情况如实申报（待本人签署确认）。

---

*填报人签名：`刘霞`（待本人最终确认）*
*日期：`2026-10-12`*
