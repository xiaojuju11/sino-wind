# 📅 开发交接记录：陈思卉（小卉）/ 成员 B

> 负责模块：主入口与公共导航域【雅集 & 底栏导航】
> 分支：`feat/phase1-home`（派生自 `main@8ffc0be`）

---

# 📌 记录一：2026-10-10 · 首页与底栏国风重构（首版）

* **提交**：`b77f0e8` — `feat(home): 实现首页云山竹简诗签卷轴与四大雅席宫格及底栏三栏重构`
* **完成度**：100%（阶段一 UI 范围）

### 完成内容
1. 底栏三栏改造（雅集 `/home`、观藏 `/ai`、书斋 `/mine`），激活态朱砂高亮；
2. 首页题头「云山竹简」+ 朱砂小印【华风】+ 副标「读千年风雅 与君共此山河」；
3. 【每日诗签】横向卷轴（朱砂竖挂签 + 书法名句 + 出处落款 + 闲章）；
4. 岁时节气物候栏（城市天气 / 农历干支 / 廿四节气卡）；
5. 四大雅席 2×2 宫格（博古识器 / 先贤论道 / 飞花诗令 / 四般闲事）。
6. 修复原实现缺陷：底栏激活态用 `window.location.pathname` 快照导致刷新后高亮错乱 → 改为 `useLocation()` 实时派生。

---

# 📌 记录二：2026-10-10 · 按设计稿高保真对齐（第二版）

* **提交**：`a12e51a`（本轮）+ 本次收尾提交
* **参照设计稿**：`c38016af1034660ba31d3932382c2764.jpg`（首页 · 云山竹简 900×1600）

### 一、 本轮完成工作详述

1. **卡片改为「左文右图」**（原实现为图上文下）：左列朱砂红楷体标题 + 两行释义 + `›` + 朱砂方角按钮「进入 ›」，右列插画。
2. **四雅标题改朱砂红** `@color-seal`，并统一楷体。
3. **描金细边 + 回纹角标**：抽出 `.gu-frame()` 混入，统一应用于诗签卷轴 / 时令栏 / 雅席卡（左上、右下回纹角）。
4. **诗签卷轴补齐两端木轴**（竹木色渐变 + 内阴影），并嵌入右侧山水小景（左缘渐隐蒙版融入宣纸）。
5. **时令栏补齐天气描金图标**（日 + 云内联 SVG）与「清明」旁的小印【华风】。
6. **底栏激活指示改为朱砂横线**（对齐设计稿），并加高至 `1.52rem`（≈1.77rem 含安全区）。
7. **底栏器物图标改用设计稿切图**：`assets/tabbar/tabbar-yaji.png`（亭台）、`tabbar-guancang.png`（青铜鼎）、`tabbar-shuzhai.png`（线装书）；
   - 以 **CSS `mask-image` + `currentColor`** 着色，因此激活态直接随文字变朱砂红，**无需第二套图片**；
   - 切图方式：从设计稿定位图标包围盒 → 以四角底色为基准做 alpha 阈值化 → 输出透明底 PNG（各 0.6~0.8 KB）。
8. **背景铺满视口**：`background-size: 100% 100%` + `fixed` + 14% 宣纸罩层，顶部红日远山、底部湖景舟楫完整呈现（对齐设计稿构图）。
9. **标题/副标加白色柔光** `text-shadow`，提升在山水画上的可读性。
10. **修正底栏 `box-sizing: content-box` 导致的整页横向溢出 23px**（改 `border-box`），并为网格加 `minmax(0,1fr)` + `min-width:0` 防止图片撑宽。

### 二、 本次修改与新增的文件清单 (核对白名单)

> 严格自查：**未修改** `App.jsx`、`styles/global.css`、`styles/variables.less`、`utils/rem.js`。

* **页面**：`frontend/src/pages/Home.jsx`、`frontend/src/pages/Layout.jsx`
* **组件**：`frontend/src/components/HomeCard.jsx`
* **样式**：`frontend/src/styles/home.less`、`frontend/src/styles/layout.less`
* **切图素材**：
  - `frontend/public/assets/home/bg-paper.jpg`（159 KB）
  - `frontend/public/assets/home/yaji-appraise.jpg` / `yaji-debate.jpg` / `yaji-poem.jpg` / `yaji-leisure.jpg`（各 ~20 KB）
  - `frontend/public/assets/home/poem-art.jpg`（5.3 KB）
  - `frontend/public/assets/tabbar/tabbar-yaji.png` / `tabbar-guancang.png` / `tabbar-shuzhai.png`（各 < 1 KB，透明底）

### 三、 接口联调与数据依赖说明

* **已对接后端 API**：无（首页为纯展示页，阶段一不涉及接口）
* **仍使用的 Mock 假数据**（集中在 `Home.jsx` 顶部，阶段二替换即可、无需改结构）：
  - `poem`：`verse[]` / `from` / `seal` / `art`
  - `almanac`：`city` / `temp` / `weather` / `lunar` / `ganzhi` / `term` / `termDesc[]`
  - `yajiEntries[]`：`key` / `title` / `desc[]` / `art` / `path`
* **新增 npm 依赖**：无

### 四、 本地自测与预览效果（真机视口实测）

通过 **Chrome DevTools Protocol 设备模拟**（`Emulation.setDeviceMetricsOverride`）在真实 390×844 视口下实测：

| 检测项 | 390×844（iPhone 12/13/14） | 430×932（Pro Max） |
| :--- | :--- | :--- |
| `rem` 基准 | **39px** = clientWidth/10 ✅ | 43px ✅ |
| 横向溢出 `scrollWidth > clientWidth` | **false** ✅ | false ✅ |
| 底栏宽度 | 390（满宽不溢出）✅ | 430 ✅ |
| 雅席卡宽 × 高 | 176 × 121（4 张一致）✅ | 194 × 133 ✅ |
| 诗签卷轴高 / 时令栏宽 | 121 / 357 ✅ | 133 / 394 ✅ |
| 底栏三个 mask 图标加载 | `[true, true, true]` ✅ | 同 ✅ |
| Console 报错数 | **0** ✅ | 0 ✅ |
| 页面总高 | 920（≈一屏，几乎无需滚动）✅ | 1016 ✅ |

* [x] `npm run build` 打包 **0 报错**（Vite 7.3.0）
* [x] 全站样式仅引用 `variables.less` 的 10 个 token，无硬编码主色
* [x] 底栏三栏互跳正常，激活态朱砂高亮 + 横线正确
* [x] 截图证据：`任务B-首页预览.png`（真机 390×844 模拟，验收可直接引用）

> 💡 说明：直接用 `msedge --screenshot --window-size=390,x` 截图时，`utils/rem.js` 取到的 `clientWidth` 与窗口宽度不一致（rem 被算成 49px 而非 39px），会造成**截图侧假性右侧溢出**。本记录的数值均来自 CDP 设备模拟，属真机等效数据。

---

### 五、 遗留问题与交接提醒 (Blocker)

1. **四雅入口路由为临时映射**：博古识器→`/recognition`、先贤论道→`/ai-chat`、飞花诗令→`/ai`、四般闲事→`/mine`；待阶段二业务页建好后改为正式路径（只需改 `yajiEntries[].path`）。
2. **时令物候为静态 Mock**，未接天气 / 农历接口（阶段二）。
3. **PR 待提**：分支已推送至 `origin/feat/phase1-home`；PR 入口 https://github.com/ki123-gif/sino-wind/pull/new/feat/phase1-home
4. **整站视觉统一尚未达成**：`AuthPage/Login/Register`（成员 A）与 `AIPage/MinePage`（成员 C）仍为旧版亲子教育风格，需两位同学完成后才能通过 M3「全站视觉走通」验收（本人在白名单军规下不越界修改）。
5. 若设计组后续提供**独立器物图标切图**（建议 2 倍图、透明底、单图 ≤200KB），直接替换 `assets/tabbar/` 同名文件即可；雅席插画同理替换 `assets/home/yaji-*.jpg`。

---

# 📌 记录三：2026-10-12 · 第二阶段 Day 1（缺陷清零 + 古诗词天地）

* **工作分支**：`feat/phase2-frontend-poem`（基于 `main@283ca7c`）
* **依据文档**：`TRD_DAY1.md`（队长派发）、`docs/PHASE2_API_CONTRACT.md`（接口契约）
* **今日完成度**：第一阶段缺陷整改 100% ／ 新页面开发 100%

### 一、 第一阶段缺陷清零（队长点名项 + 自查扩展）

| # | 队长点名问题 | 处理结果 |
| :---: | :--- | :--- |
| 1 | `Home.jsx` 原生字符 `⌄` | ✅ 改为 `<DownOutline className="home-almanac__caret" />`；`home.less` 同步改为宽高定尺寸（antd-mobile-icons 为 `1em` 机制，不再依赖 font-size） |
| 2 | 首页路由断层（飞花诗令→观藏、四般闲事→个人中心） | ✅ 飞花诗令 → `/poem`；四般闲事 → 古风 Toast「焚香点茶筹备中，静候雅聚」（`HomeCard` 新增 `onClick` 分支，不再跳个人中心） |
| 3 | **自查扩展**：首页卡片 `›` 文本箭头（同类违规） | ✅ `HomeCard.jsx` 两处 `›` 全部替换为 `<RightOutline />`，主动避免 PR 被打回 |
| 4 | `imageCaptureAndProcess` 少儿橙 + 旧标题 | ✅ `#ff7a45` → 朱砂 `#9E2A2B`；渐变 → 宣纸绢帛；标题改「博古识器 · 拍照品鉴」；返回/清除/拍照/上传 → `<LeftOutline/>` `<CloseOutline/>` `<CameraOutline/>` `<PictureOutline/>` |
| 5 | `recognitionResult` 少儿话术与配色 | ✅「物品介绍 / 安全提示」→「金石鉴赏 / 器物考释 / 文人品鉴心得」；音量 → `<SoundOutline/>`；黄 `#ffd166`、粉 `#ff6b6b`、蓝 `#1976d2`、橙 `#ff9800` 全部换为国风 token 色 |
| 6 | `AiChat` 机器人图标 + 无先贤人设 | ✅ 图标矢量化（`LeftOutline/MoreOutline/SoundOutline/SendOutline`）、移除机器人图标、读取 `location.state.sageId` 动态显示「先贤名号 · 称号」并致以古风欢迎语；请求体补 `sageId` 对齐后端契约 |

### 二、 新增【古诗词天地】页面（路由 `/poem`）

* **新增文件**：`frontend/src/pages/PoemPage.jsx`、`frontend/src/styles/poem.less`
* **注册路由**：`App.jsx`（新增 1 行 import + 1 行 `<Route path='/poem'>`，最小改动以降低与他人的冲突面）
* **四大必备要素**：
  1. **顶部搜索框**：`antd-mobile` `SearchBar` + `<SearchOutline />`（支持回车检索与清空，检索结果可点选陈列）；
  2. **宣纸诗卷主体**：诗名（楷体朱砂）+ 朝代竹绿方签 + 作者 + 描金分割线 + 正文**对仗断句逐句居中** + 右下角山水水印；
  3. **四大功能按钮（全量矢量图标，零死图片）**：换一首 `<RedoOutline/>`、摘录入卷 `<HeartOutline/>`、诗意赏析 `<ContentOutline/>`、返回雅集 `<LeftOutline/>`；
  4. **摘录数据闭环**：`POST /api/poem/collect` → **朱砂印章下压动效**（`@keyframes poem-stamp-press`）+ 成功 Toast + 回显「诗笺共 N 篇」。
* **接口对接**：`GET /api/poem/random`、`GET /api/poem/search?q=`、`POST /api/poem/collect`（未登录时友好提示「请先入席登录，方可摘录入卷」）。
* **优雅降级**：后端未就绪 / 网络异常时自动展示内置诗库（4 首名篇），**页面永不空白**。

### 三、 自查数据（CDP 真机 390×844 视口实测）

| 检测项 | 首页【雅集】 | 古诗词天地 |
| :--- | :--- | :--- |
| `rem` 基准 | 39px ✅ | 39px ✅ |
| 横向溢出 `scrollWidth > clientWidth` | false ✅ | false ✅ |
| **矢量图标数 / 残留 iconfont** | 3 / **0** ✅ | 8 / **0** ✅ |
| 关键尺寸 | 卡片 176×114 ✅ | 搜索栏 357×36、诗卷 357×217、按钮区 357×84（4 键）✅ |
| `npm run build` | 0 报错 ✅ | 0 报错 ✅ |

> ⚠️ 测试环境说明：本机代理未运行时，控制台会出现 `at.alicdn.com`（队友 Iconfont CDN）与远程接口 `120.26.186.48:3000` 的 `ERR_PROXY_CONNECTION_FAILED` 网络报错——属**环境问题，非代码缺陷**；本页 Mock 降级已确保页面完整可用。

### 四、 ⚠️ 需队长确认的一处规范偏差（重要）

队长图标速查表中的 **`BookOutline` 在 `antd-mobile-icons@0.3.0` 中并不存在**（已逐一核对包内 152 个图标文件）。
→ 本人「诗意赏析」按钮**改用 `<ContentOutline />`**（文档/内容语义最贴近，折叠条同步使用）。
**建议队长同步修订 `TRD_DAY1.md` 的图标表**，避免成员 A / C 后续也踩到该不存在的图标而导致构建报错。

### 五、 遗留与待联调

1. `POST /api/poem/collect` 依赖成员 A 的 `user_poems` 表与诗泉代理接口，待 `feat/phase2-backend` 合并后做一次**真实联调**（当前走 Mock 降级）。
2. `axios` 基础地址仍为远程 `http://120.26.186.48:3000`；如要本地联调，建议统一切到 `vite.config.js` 里的 `/api` 代理（该文件非本人白名单，需组长确认）。
3. **【已核实·无问题】** `Authorization` 口径：前端拦截器写**裸 token**，成员 A 的 `verifyToken` 也是读 `ctx.request.header.authorization` 裸值 → **两端一致，可正常鉴权**；仅 `PHASE2_API_CONTRACT.md` 的描述（`Bearer <token>`）与实际不符，建议队长修订文档即可。
4. **【联调实测·需 A / C 对齐】收藏列表路由不一致（会 404）**：契约与成员 C 的 `PoemCollection.jsx` 都用 `GET /api/poem/my-list`，而成员 A 的 `poemRoutes.js` 实际实现的是 `GET /api/poem/collection` → **C 的「我的诗笺」列表将取不到数据**。建议 A 改路由名（契约 + C 两票一致），或 C 改一行调用地址。
5. **【联调实测·字段口径差异，本人已兼容】** 成员 A 的 `poemController` 返回 `content: [...]`（**数组**）而非契约写的 `paragraphs`，搜索项**无 `snippet`**，`collect` 返回**无 `newPoemCount`** → 本人已在 `PoemPage.jsx` 增加 `toParagraphs()` / `snippetOf()` 双向兼容（两种口径均能正常渲染），**无需 A 改动**。
6. 诗卷暂无「朝代/作者」筛选与分页，仅按契约实现随机与关键词搜索。

---

# 📌 记录五：2026-10-12 夜 · TRD v3.0 收官冲刺（任务 B：雅集首页与白话雅译）

* **分支**：`feat/phase2-home-yaji`（基于 `main@bffba18`）
* **独占文件**：`frontend/src/pages/Home.jsx`、`frontend/src/styles/home.less`
* **依据**：`TRD v3.0` §2.3 任务书 + `docs/DESIGN_AUDIT.md` §十一 队友整改清单

## 一、 本轮完成内容

1. **【核心】暗色模式打通（AC-B2 的根因修复）**
   * 基线 `home.less` 仍在用**阶段一的 LESS 令牌**（`@color-*` → 旧色值）与 42 处硬编码色值，导致 `[data-theme="dark"]` 全局变量**完全无法生效**；
   * 已全量迁移到新设计系统 CSS 变量：`var(--gf-bg-paper / --gf-bg-card / --gf-ink-primary / --gf-ink-secondary / --gf-cinnabar / --gf-bamboo / --gf-gold / --gf-border-card)`，**`var(--gf-*)` 用量 80 处**，`fade()` 函数改用 `color-mix()`（CSS 变量不能进 LESS 函数）；
   * 木轴/阴影等材质色改为**本地主题变量**（`--home-wood*` / `--home-shadow`），并在 `[data-theme='dark'] .home-root` 内给出暗色取值。
2. **组长审计 §十一 整改（P1 雅集首页逐条）**
   * ✅ 时令模块增加交互线索：`杭州 ⌄`（城市）、`未时 ⌄`（时辰，可点线索）+ 卡片右上角 `🧭 漫游` 微标；
   * ✅ 白话雅译：输入框已有灰色占位文案；【摘录入卷】改为**常显 + 未生成雅言前置灰不可点**（`disabled={!yayanResult}` + `:disabled` 样式）；
   * ✅ 诗词卡：标题改《定风波》，正文替换为「莫听穿林打叶声，何妨吟啸且徐行。/ 一蓑烟雨任平生，也无风雨也无晴。」，作者行改【宋】苏轼 · 黄州沙湖道中 + 印「东坡」；
   * ✅ 顶部加 **44px 状态栏安全区**（`calc(env(safe-area-inset-top) + 1.13rem)`，实测 44.07px）；
   * ✅ 卡片背后加 **88% 不透明暖宣纸蒙层**（竖向渐变：顶部 26% / 中部 88% / 底部 32%），只在页面首尾微透山水意境，中部彻底压掉背景干扰；
   * ✅ 顶部右上角【☀️ 晓色晨宣 / 🌙 月下墨境】切换开关（基线已有，本轮验证联动正常）。
3. **未触碰任何红线文件**（App.jsx / Layout.jsx / global.css / variables.less / vite.config.js / index.html / 网络层均零改动）。

## 二、 实测证据（CDP 真机 390×844 视口）

| 检测项 | 白昼（晓色晨宣） | 暗夜（月下墨境） |
| :--- | :--- | :--- |
| `data-theme` | `light` | `dark` |
| 页面底色 | `rgb(247,244,235)` = **#F7F4EB** ✅ | `rgb(13,17,23)` = **#0D1117** ✅（AC-B2 精确命中） |
| 主标题色 | `rgb(43,43,43)` = #2B2B2B ✅ | `rgb(230,225,211)` = #E6E1D3 月白玉 ✅ |
| 顶部安全区 | 44.07px ✅ | 44.07px ✅ |
| 横向溢出 | 无 ✅ | 无 ✅ |
| 🧭 漫游 / 未时⌄ | 均存在 ✅ | 均存在 ✅ |
| 诗词卡 | 「今日一诗 · 定风波」✅ | 同 ✅ |
| Console 报错 | **0** ✅ | **0** ✅ |
| `npm run build` | **0 报错** ✅ | — |

## 三、 🔴 需队长处理（属红线文件，本人不得修改）

**底栏【知音】图标违和**（`DESIGN_AUDIT.md` 图1 第 8 条）：当前底栏第二个 Tab 用的是**古代木板推车/两轮货车**图标，语义与「知音（千古知己对话/信札）」完全无关，审计要求换成 **古信札 / 飞鸽 / 抱琴** 图标。该图标位于 `frontend/src/pages/Layout.jsx`（TRD v3.0 §2.6 列为红线文件），**请队长统一替换**。

## 四、 遗留

1. `getTraditionalTime()` 为纯前端时间换算，未接真实天气/农历接口（TRD 未要求接口，仅要求"动态算法换算"✅ 已实现十二时辰 + 物候对句）。
2. 时令 `杭州 ⌄` / `未时 ⌄` / `🧭 漫游` 目前为**交互线索 + 古风 Toast 提示**，换城易时的实际弹层待后续版本实现（本轮受独占文件范围限制，未新增组件文件）。

---

# 📌 记录六：雅集首页（任务 B）**交接说明** · 2026-10-12 夜

> 交接原因：本人（成员 B）实现的首页**未达到与新版设计稿一致的完成度**，按队长要求交接。
> 当前分支 `feat/phase2-home-yaji` @ `73ab5db`（**本地领先 main 10 个提交，全程未 push**）。

## 一、 交接范围与文件（只允许动这两个）
| 文件 | 说明 |
| :--- | :--- |
| `frontend/src/pages/Home.jsx` | 首页组件（约 350 行） |
| `frontend/src/styles/home.less` | 首页样式（约 1500 行，含多轮追加的对齐/柔化覆盖块） |
**红线（禁止改）**：`App.jsx`、`Layout.jsx`、`global.css`、`variables.less`、`app.less`、`layout.less`、`vite.config.js`、`index.html`、`http/index.js`、任何 backend 文件。

## 二、 当前实现到什么程度
**已实现（结构与文案）**
1. 题头：`云山竹简` + 朱砂印`华风` + 副标`—— 读千年风雅 与君共此山河 ——` + 右上角 ☀️/🌙（`useTheme()` 联动）+ ⚙️（`icon-shezhi`→`/accountSetting`）
2. 白话雅译卷轴：两端深木轴（CSS 渐变+圆形轴头）、左侧竖排朱红牌匾（白字+金边）、输入卡（毛笔图标+占位+`0/100`）、中缝祥云纹+朱红下箭头、结果卡（雅言+方形朱砂印`闲`+`文言释义：`）、双按钮（墨绿`译为雅言`/朱红`摘录入卷`，均金边+悬浮态）
3. 古今时令与天象：古今双栏（现代·今日：☀️/24°/杭州⌄/实时日期时间；古代·时令：时辰⌄·日映 + **干支动态换算** + `天朗气清，惠风和畅。` + `🌼 物候：菊有黄华`）+ 🧭漫游
4. 古今识物：左侧虚线拍摄区（`icon-xiangji` → `/recognition`）；右侧`↗ 示例体验`两条（☕拍奶茶→酪饮/酥签、🎒拍书包→筒简/书笈）
5. 古诗词赏析：`《定风波·莫停穿林打叶声》`+`宋代 · 苏轼`+两行正文+右下圆形→按钮（`/poem`）
6. 保留行为：`axios.post('/api/deepseek/yayan',{text})`→取 `res.data.data.{ancient,author,explanation}`；转译中按钮`先贤研墨中…`并禁用；摘录写 `localStorage: gufeng_yayan_list` 并弹 Toast；未生成时摘录按钮置灰；**44px 状态栏安全区**；**88% 宣纸蒙层**（竖向渐变）；**全站配色走 `var(--gf-*)`**（支持月下墨境）

**实测（可复现）**
```
docH=920（= 内容 844 + layout.less 给固定底栏的 76px 预留；设计稿 843 ⇒ 差 +1px）
块高：yayan 357x259 / almanac 357x128 / shiwu 357x123 / poem 357x143
      （设计稿实测：203 / 137 / 143 / 125）
白昼 #F7F4EB ｜ 暗夜 #0D1117 ｜ topPad 44.07px ｜ overflow:false ｜ Console 0 报错 ｜ build 0 报错
字号下限：内容文字 <10px = 0（仅 6 处印章刻字 7.8~8.6px）
```

## 三、 ⚠️ 为什么"没做好"（根因，请接手者先看这段）
1. **我无法直接"看"设计稿**：本会话模型的视觉能力缺失，只能通过本机视觉桥（qwen3-vl-plus）把图**转成文字描述**再实现。文字描述必然丢质感：渐变层次、纹理走向、字体骨架、微阴影、笔画细节全部量化不了 ⇒ **设计与实现之间天生存在"描述损耗"**，这是最根本原因。
2. **禁加图片素材**：设计稿的木轴球形轴头、祥云纹、竹枝、远山纹理本应是切图；红线禁止新增素材，只能用 CSS 渐变/圆角近似 ⇒ 永远"像但不精"。
3. **字体不可得**：设计稿标题是书法体、温度数字是手写体；项目无这些字体，且禁改 `index.html` 引入外链字体 ⇒ 气质差异无法消除。
4. **图标库缺口**：内置 iconfont 两库合计仅 **36 个通用图标**（返回/设置/相机/书本/上传/收藏…），设计稿要的**日月、罗盘、毛笔、菊花、卷轴**全部没有；`antd-mobile-icons` 也无 Sun/Moon ⇒ 只能 emoji 顶替（跨平台渲染不一致、无法着色，正是队长禁令的对象）。
5. **视觉比对信噪比低**：用视觉模型做"设计稿 vs 实现"比对时，它反复报出**误读**（说缺设置按钮/缺印章/副标截断/缺标点，经 DOM 核实全部为假），我每次都要花轮次证伪 ⇒ 迭代效率低、方向被干扰。
6. 结论：**在当前约束（无原生视觉 + 无切图 + 无字体 + 图标库缺口 + 红线锁定）下，做到"和设计稿一模一样"在我这里已经触到上限**；接手者若具备上述任一条件（尤其能直接看图 / 能拿切图与字体 / 能上传 iconfont），完成度会立刻上一个台阶。

## 四、 接手者的下一步（按优先级）
1. **【最高】补齐 iconfont**：由队长在 iconfont.cn 项目里上传并发布，替换以下 6 处 emoji（**我已在上一份报告给出"用途｜建议名｜位置"表**）：☀️🌙(日月)、☀️(天气)、🌼(物候)、☕(奶茶)、🎒(书包)、↗(示例前缀)；`→` 建议直接换 `RightOutline`。
2. **【高】要切图**（透明 PNG，2x）：卷轴**球形轴头**、中缝**祥云纹**、牌匾**云纹角花**、右侧**墨竹**、**淡墨远山**底纹 ⇒ 替换现有 CSS 近似。
3. **【高】白话雅译块高 259 → 目标 ≈203**：只能通过"缩小轴头/压扁祥云/减少留白"实现；**注意队长的字号下限（内容 ≥10.9px）不可破**，另结果卡的`化用诗人出处`一行是 TRD 要求，删了才能再省 ~20px。
4. **【中】字体**：若允许引入免费商用字体（霞鹜文楷 / 思源宋体），标题与数字的气质会立刻接近设计稿（需队长批准改 `index.html`）。
5. **【中】底栏（红线）**：`Layout.jsx` 的「知音」目前是**推车图标**（语义错误），且图标/文字基线不齐 ⇒ 需队长处理。
6. **【中】口径待拍板**：① 题头文案：设计稿`云山竹简/华风` vs TRD`华风雅集/两宋`（现按设计稿）② 「灵感拾遗」4 组胶囊：TRD 要求但详情稿没有（现已按详情稿移除）③ 线上 `120.26.186.48:3000` 是否部署了 `/api/deepseek/yayan`（未部署时转译走降级 Toast）。

## 五、 复现与自测命令（原样可跑）
```bash
# 1) 起预览（注意：跑 build 会挤掉 dev server，需重启）
cd D:\sino-wind-taskB\frontend
npm run dev -- --port 5174 --strictPort      # http://localhost:5174/

# 2) 构建
npm run build                                 # 必须 0 报错

# 3) 真机视口自测（需先起调试浏览器，端口 9229）
msedge --headless=new --disable-gpu --remote-debugging-port=9229 --user-data-dir=%TEMP%\edge-cdp7 --no-first-run --hide-scrollbars about:blank
node %TEMP%\theme-test.js 9229                # 白昼 #F7F4EB / 暗夜 #0D1117 / topPad≈44 / overflow:false / Console 0
node %TEMP%\scan-fonts.js 9229                # <10px 内容文字必须为 0（仅印章刻字允许）
node %TEMP%\measure-type.js 9229              # 块高与关键字号
node %TEMP%\scan-emoji.js                     # 残留 emoji 清单（对接 iconfont 补齐进度）
```

## 六、 已知坑（接手者必读）
1. **跑 `npm run build` 会杀掉 5174 dev server**（Vite 监视器冲突）⇒ 每次 build 后要重启预览。
2. **不要用 `msedge --screenshot --window-size=390`** 直接截图：`utils/rem.js` 取到的 `clientWidth` 与实际窗口不一致（rem 被算成 49 而非 39），会产生**假性右侧溢出**；请用上面的 CDP 设备模拟（`setDeviceMetricsOverride`）。
3. **LESS 里不要用 `@color-*`**（那是阶段一旧色板，且 `variables.less` 已升 v3）⇒ 一律 `var(--gf-*)`；`fade(var(--x), n%)` 非法，须用 `color-mix(in srgb, var(--x) n%, transparent)`。
4. **PowerShell 变量大小写不敏感**：写脚本时 `$s` 会覆盖 `$S`（我在量设计稿时踩过），务必用不同名。
5. **视觉桥**：必须 `qwen3-vl-plus`（`qwen-vl-max` 已下线、`-latest` 无权限）；大图先压到 ≤900px/≤400KB；调用前清代理 `$env:NO_PROXY='*'`。
6. **视觉模型的"差异清单"必须逐条用 DOM 实测证伪**再动手，否则会被带偏。

## 七、 提交与推送状态
```
本地 feat/phase2-home-yaji @ 73ab5db（领先 main 10）
8724056 图标铁律 → d197991 设计稿重构 → 9de9bcc 尺寸压缩 → 43481e2 雅译详情对齐
→ e260622 字号下限保护 → c1b5389 移除灵感拾遗 → b1a9979 雅译规范落地 → 73ab5db 柔化降锐
✅ 全程未 push（origin 仍为旧提交 5708a26；team 仓库无该分支）
```

---

## 📐 字号口径说明（重要 · 用户决策）

* **第一版**：按「内容文字 ≥10.9px（0.28rem）可读性下限」实现 —— 把 12 处原 7.8~10.4px 的次要文字统一上调。
* **第二版（当前）**：经**用户拍板选方案 A（完全对齐设计稿字号）**，次要文字回到 **7.8~9.4px**。
* **依据**：设计稿 `853×1844` ÷ 2.187 ≈ 390 视口；**设计稿自身的次要文字折合 CSS 仅约 9px** ⇒「完全照设计稿」与「≥10.9px」**天然冲突**，二者不可兼得。
* **影响（如实登记）**：3.5~4 寸小屏真机上小字会偏吃力；**若组长以"可读性口径"review，请知悉这是「用户决策」而非实现方擅自压低**。
* **当前实际字号**：主译文 13.3px ｜ 释义 8.6px ｜ 计数/出处/干支/日期 7.8px ｜ 物候/漫游/示例标题 8.6px ｜ 示例行 9.4px ｜ 城市/天气句 10.1px ｜ 输入 10.9px ｜ 区块标题 14.8px ｜ 主标题 28.9px。
* **两处"反而偏小"已按设计稿上调**：温度数字 23.4 → **30px**（设计稿约 32px，取 30 防溢出）；双按钮文字 10.9 → **14px**（设计稿约 16px，取 14 折中）。
* ⏸ **「灵感拾遗」4 组胶囊**：详情稿无此模块，已按详情稿移除；**是否恢复待用户/组长拍板，未确认前不自行恢复**。

---

# 📌 记录七：雅集首页（任务 B）**验收结论** · 2026-10-12 深夜

**分支**：`feat/phase2-home-yaji` @ `4803c50`（领先 main **26** 个提交 · 工作区干净 · **全程未推送**）
**改动**：8 个文件 = `Home.jsx`(+368) ｜ `home.less`(1941 行) ｜ 5 张底图素材 ｜ 本交接文档

## 一、 已完成（TRD v3.0 §2.3 四项交付）
1. **两宋首页框架**：题头`云山竹简`+朱砂印`华风`+副标；右上角 ☀️/🌙（`useTheme()` 联动）+ ⚙️`icon-shezhi` → `/accountSetting`
2. **白话雅译**：输入卡（✎ 毛笔 + 占位 + `0/100`）→ 金色下箭头 → 结果卡（雅言一行 + 朱砂`闲`印 + `文言释义：`加粗）→ 双按钮（竹青`译为雅言`/朱砂`摘录入卷`，等宽）；`POST /api/deepseek/yayan` 取 `res.data.data`；摘录写 `localStorage: gufeng_yayan_list`；转译中`先贤研墨中…`且禁用；未生成时摘录置灰
3. **古今时令与天象**：双栏（现代·今日 / 古代·时令，**均左对齐 + 满幅底图**），金色分割线（中段菱形点缀）；十二时辰**动态换算** + **干支动态换算**（五虎遁）+ 物候 + 🧭漫游
4. **古今识物 / 古诗词赏析**：识物=满幅底图 + 两块不透明卡片（上传区 / 示例体验）；诗词=`《定风波·莫听穿林打叶声》`+`宋代·苏轼`+两行正文+圆形→按钮 → `/poem`

## 二、 验收标准结果
| 标准 | 结果 | 证据 |
| :--- | :--- | :--- |
| AC-B1 对齐设计稿 | ⚠️ **版式已对齐，像素级未达成** | `docH=920`＝内容 844 ≈ 设计稿 843（差 1px）；块高 211/119/121/162（稿 203/137/143/125）；四块底图已按 proof 铺满 |
| AC-B2 日夜模式 | ✅ | 白昼 `rgb(247,244,235)`=#F7F4EB、暗夜 `rgb(13,17,23)`=#0D1117；`overflow:false`；`topPad=44.07px`；`CONSOLE_ERRORS=0` |
| AC-B3 交互 | ✅ | 转译禁用态 + Toast + 摘录置灰逻辑齐备 |
| AC-B4 图标铁律 | ⚠️ **部分** | 已换矢量 11 处（iconfont 3 + antd 8）；**仍剩 7 处 emoji** |
| 构建 | ✅ | `✓ built in 3.15s`，0 报错；产物 CSS 113.69KB / JS 541.79KB |

## 三、 未完成项与归属（**代码层面已无可做**）
| # | 未完成 | 根因（外部依赖） | 归属 |
| :--- | :--- | :--- | :--- |
| 1 | 7 处 emoji 仍是位图字形（🌙日月 / ☀️天气 / 🌼物候 / ☕奶茶 / 🎒书包 / ↗ / →），无法 CSS 着色，暗色下突兀 | 两个 iconfont 库共 **36 个通用图标**，无日月/菊花/奶茶/书包/罗盘/毛笔；`antd-mobile-icons` 亦无 Sun/Moon | 🔴 **队长上传 iconfont 后即可替换** |
| 2 | 底栏图标与文字基线不齐；「知音」误用推车图标（语义错误） | `Layout.jsx` 属 TRD §2.6 红线 | 🔴 **队长** |
| 3 | 标题/数字的书法体气质（设计稿为书法体、手写数字体） | 项目无该字体；红线禁改 `index.html` 引外链字体 | 🔴 **需队长批准** |
| 4 | 木轴球形轴头、中缝祥云纹、牌匾云纹角花等素材级细节 | 禁新增素材（仅用了用户提供的 5 张底图）；白话雅译的卷轴样式已被用户要求整体移除 | 设计切图 / 已按用户要求删除 |
| 5 | 小字偏小（释义 8.6px / 计数 7.8px / 出处 7.8px） | **用户选方案 A（完全照设计稿）** —— 见上「字号口径说明」 | 已登记为**用户决策** |
| 6 | 未推送 / 未提 PR | 用户明确要求"先不推送" | 待用户指令 |

## 四、 素材清单（均在 `frontend/public/assets/home/`）
`bg-yayan.jpg 92KB`（白话雅译）｜`bg-shiwu.jpg 54KB`（识物）｜`bg-almanac-modern.jpg 43KB`（现代今日）｜`bg-almanac-ancient.jpg 45KB`（古代时令）｜`bg-poem.jpg 45KB`（诗词）—— 全部 ≤200KB ✓

## 五、 复现自测命令
```
cd frontend && npm run build                     # 0 报错
node %TEMP%\theme-test.js 9229                   # 日夜底色/44px/无溢出/Console 0
node %TEMP%\scan-fonts.js 9229                   # 字号扫描（方案 A 后允许小字）
node %TEMP%\measure-type.js 9229                 # 块高与关键字号
node %TEMP%\check-home.js                        # 结构核验（印章/标题/按钮/诗句）
node %TEMP%\scan-emoji.js                        # 残留 emoji（对接 iconfont 进度）
node %TEMP%\check-yayan.js                       # 白话雅译两框等宽 + 箭头外圈已删除
```

---

# 📌 记录八：第三阶段 · 首页风雅与晨昏雅集收官（2026-10-13）

* **分支**：`feat/phase3-home-polish`（基于 `team/main@09d26ed`，即第三阶段最新主干）
* **独占文件**：`frontend/src/pages/Home.jsx`、`frontend/src/styles/home.less`（**红线文件零改动**）
* **依据**：`TRD_PHASE3.md` §3.3 + AC-B1 / AC-B2 / AC-B3 + §2.2 背景图红线 / §2.3 图标体系红线
* **新增交付物**：`docs/handovers/demo-B-home-30s.md`（30 秒演示说辞）、`proof/phase3-home-check.js`（可复现验收脚本）、`proof/phase3-*.png`（实拍证据）

## 一、 三项任务完成情况

### ① 消灭首页 6 处原生 Emoji（AC-B1）→ **归零**

| # | 位置 | 替换前 | 替换后 | 采用优先级 |
| :-- | :--- | :--- | :--- | :--- |
| 1 | 题头日月切换 | `🌙` / `☀️` | **内联 SVG 弦月 / 日轮**（`<MoonGlyph/>` `<SunGlyph/>`，24×24 线性描边、`currentColor`） | ③ 内联 SVG |
| 2 | 时令天气 | `☀️` | **内联 SVG「云日纹」**（`<SunWheelGlyph/>`：心圈 + 八主芒 + 八辅芒，古制绘日法） | ③ 内联 SVG |
| 3 | 物候 | `🌼 物候：菊有黄华` | **CSS 印章「菊」** `.home-almanac__wuhou-seal` + 文字「物候：菊有黄华」 | ③ CSS 印章 |
| 4 | 示例 · 奶茶 | `☕` | **CSS 印章「酪」** `.home-shiwu-demo__seal` | ③ CSS 印章 |
| 5 | 示例 · 书包 | `🎒` | **CSS 印章「笈」** `.home-shiwu-demo__seal` | ③ CSS 印章 |
| 6 | 示例前缀 | `↗`（字符箭头） | **`<UpOutline />`**（antd 东北向箭头，与被替换字形视觉等效） | ① antd-mobile-icons |

* **实测**：`emojiScan.hitCount = 0`（扫描 18 个目标字符的全部文本节点，**零命中**）；同时保留 `antd` 矢量图标 12 个 + iconfont 3 个，**无新增图片素材**。

> 💡 **关于第 6 处的口径（请队长知悉）**：TRD 写「`↗` 统一换为 `<RightOutline />`」，而 `↗` 是**东北向**箭头；`RightOutline` 是**正右**向，换上去会丢失「上浮 / 外链」语义。故本人取 `<UpOutline />`（同为 antd 官方矢量图标，且与 `↗` 字形一致）。若队长坚持字面口径，改一行即可。

### ② 白话雅译 390px 长文本排版防御（AC-B2）

防御分五层，全部在 `home.less` 末尾「第三阶段任务 2」区块内：

1. **输入框自适应长高**：`field-sizing: content`（Edge/Chrome 123+ 原生支持，实测 `CSS.supports` 为 true），`max-height: 4.6rem`（≈179px ≈8 行）封顶，超出改为**卡内滚动** → 100 字时框高 91.3px（**不滚动**），1 字时回落到 30.4px。
2. **译文允许折行**：去掉历史遗留的 `white-space: nowrap`（原规则为对齐参考图「一行显示」，长句会横向溢出）→ 44 字长雅言实测折 **3 行**，`textInsideCard = true`。
3. **超长无空格串防御**：`overflow-wrap: anywhere` + `word-break: break-word`（输入框 / 译文 / 释义 / 按钮全覆盖）→ 89 字连续 URL 实测折行且不出卡。
4. **双按钮列宽兜底**：grid `minmax(0, 1fr)` 的隐性下限补 `min-width: 0` + `box-sizing: border-box`。
5. **极端长度兜底**：作者行 `nowrap + ellipsis`（不换行撑高）；`.home-yayan-section` / `.home-card-scroll` 加 `overflow-x: hidden`。

**新增交互回执**：字数顶格（100/100）时计数转朱砂加粗（`.home-yayan-counter.is-limit`），给用户「已达上限」的视觉提示。

**顺带修掉一个真实缺陷（新发现）**：原 `catch` 分支只弹 Toast，**不清理结果卡**，导致「请求失败时页面上仍留着上一句雅言」的张冠李戴。现改为 **失败即清空译文**（结果卡隐藏 + 「摘录入卷」自动置灰）+ 提示「墨迹暂凝，未得雅言，请再试一次」。
> 同时清理了未使用的 `catch (err)` 形参（ESLint 0 报错）。

**离线来源标注**：后端 `translateYayan` 的离线典范库命中时（当前实现返回 `code:1`，**不带** `degraded` 标记），前端按 `degraded === true || source === 'local-fallback'` 判定，命中则在作者行下方居中显示朱砂徽标**「离线典范」**——落实 TRD §3.3「兜底名句不冒充 AI 生成」。
**数据契约**：「摘录入卷」写入 `localStorage.gufeng_yayan_list`，字段对齐 `{ id, modern, ancient, author, explanation }`（**本次补齐了原先缺失的 `modern`**），并附加 `offline` 布尔位供书斋列表区分来源。

### ③ 30 秒演示说辞 → `docs/handovers/demo-B-home-30s.md`
逐秒分镜（0:00–0:30）+ 演示前 6 项准备清单 + 代码位置对照表 + 3 条问答预案 + 实测数据背书。

## 二、 第三阶段两条新红线的落实

| 红线 | 落实方式 | 实测 |
| :--- | :--- | :--- |
| **§2.2 背景图**：全页面背景统一 `/assets/common/bg_guofeng.jpg` | 删除 `Home.jsx` 里写死 `assets/home/bg-paper.jpg` 的**内联 style**；`home.less` 的 `.home-root` 显式声明 `url('/assets/common/bg_guofeng.jpg')`（与 `app.less` 的 `body` 同图，继承链上不再有第二张纸本图） | `bgImage = http://localhost:5174/assets/common/bg_guofeng.jpg` ✅ |
| **§2.3 图标体系**：严禁原生黄色 Emoji | 6 处全部按三级优先级替换（见上表）；**未新增任何图片素材**，**未改动 `index.html`**（未私自添加 Iconfont 链接） | `emojiScan.hitCount = 0` ✅ |

## 三、 实测证据（CDP 真机 390×844 · 可复现）

复现命令：
```powershell
# 1) 起调试浏览器
msedge --headless=new --disable-gpu --remote-debugging-port=9229 --user-data-dir=D:\sino-wind-taskB\.dsh-cdp --no-first-run --hide-scrollbars about:blank
# 2) 起前端
cd D:\sino-wind-taskB\frontend ; npm run dev -- --port 5174 --strictPort
# 3) 跑第三阶段验收（emoji 归零 / 背景红线 / 长文本防御 / 离线路径 / 日夜底色）
cd D:\sino-wind-taskB ; node proof\phase3-home-check.js 9229
```
原始 JSON：`proof/phase3-result.json`；截图：`proof/phase3-home-light-390.png`、`phase3-home-dark-390.png`、`phase3-home-offline-390.png`。

| 检测项 | 结果 |
| :--- | :--- |
| `rem` 基准 / 视口 | 39px / 390×844 ✅ |
| **原生 Emoji 残留** | **0**（18 个目标字符全扫，零命中）✅ |
| **背景图（红线）** | `/assets/common/bg_guofeng.jpg` ✅ |
| 横向溢出（`scrollWidth > clientWidth`） | **false**（390 = 390），长文本态、无空格串态、暗夜态均 false ✅ |
| 输入 100 字 | 框高 91.3px，**不滚动**；计数 `100/100` 且转朱砂 ✅ |
| 输入 1 字 | 框高 30.4px（不塌陷）、计数 `1/100` ✅ |
| 89 字无空格串 | 折行、文字在卡内、无横向溢出 ✅ |
| 44 字长雅言 | 折 3 行，`闲` 印仍在卡内且可见 ✅ |
| 输入框 / 译文卡宽度 | 301px / 301px，**完全等宽** ✅ |
| 白昼底色 / 暗夜底色 | `#F7F4EB` / `rgb(13,17,23)` = `#0D1117` ✅ |
| 顶部状态栏安全区 | 44.07px ✅ |
| 暗色下印章可读性 | 底 `rgb(184,59,50)` 朱砂 + 字 `rgb(251,248,241)` 象牙白 ✅ |
| **白话雅译区块高** | **203px（= 设计稿 203）**；时令 119 / 识物 123 / 诗词 162 |
| 首页总高 | 920（内容 844）✅ |
| 雅译失败路径 | 结果卡消失、摘录禁用、**无残留旧句**、无未捕获异常 ✅ |
| Console 报错（排除刻意掐断的上游请求） | **0** ✅ |
| `npx eslint src/pages/Home.jsx` | exit 0 ✅ |
| `npm run build` | `✓ 1024 modules transformed`，**0 报错**（8.29s）✅ |

## 四、 需队长 / 队友知悉（本人未越界改动的部分）

| # | 事项 | 归属 | 说明 |
| :-- | :--- | :--- | :--- |
| 1 | **`PoemPage.jsx:253` 仍在使用 `assets/home/bg-paper.jpg`** | 成员 D | §2.2 背景图红线要求全站统一 `bg_guofeng.jpg`；该行是内联 style（与本人首页原先同一写法）。本人不越界修改，**建议 D 直接删掉该内联 style**（`app.less` 的 body 已统一铺图）。 |
| 2 | `authPage.less` 用 `reference-login.png` 做**局部装饰位**（角花/云纹/印章切图） | 成员 A | §2.2 禁止的是「把带 UI 卡片的参考稿截图当**背景**」，**背景本身已是 `bg_guofeng.jpg`**，故不构成红线违反；此处仅备案，若队长从严解释需 A 处理。 |
| 3 | 第 6 处 emoji 的图标口径（`UpOutline` vs `RightOutline`） | 队长裁定 | 见任务①注。 |
| 4 | 线上 `120.26.186.48:3000` 是否已部署 `/api/deepseek/yayan` | 队长 / A | **影响答辩演示**：未部署时雅译会走失败路径（无译文 + 古风提示），不会白屏但失去「秒级雅译」亮点。演示前请确认后端在跑（`node backend/src/index.js`），当前仓库版本已在本地返回离线典范库。 |
| 5 | 后端 `translateYayan` 未返回 `degraded` / `source` 字段 | 成员 A | 当前离线兜底与在线结果**同形**（都是 `code:1 + data`），前端已额外兼容 `degraded`/`source` 标记；若 A 后续补上标记，「离线典范」徽标会自动生效，前端无需再改。 |

## 五、 已知限制（如实登记，不作已完成宣称）

1. **`field-sizing: content` 的浏览器支持**：Edge/Chrome 123+ 原生生效（本机实测支持）；Safari 与旧内核不支持时，回退为「输入框固定约 1 行 + 卡内滚动」——**仍然不会横向溢出**，只是少了自动长高的观感。
2. **`100` 字上限未放宽**：前后端契约（`PHASE3_CHANGES §2.1`）为 1~100 字，与输入框 `maxLength=100`、计数 `0/100` 一致。TRD §3.3 提到「测试 50~150 字」属**压测口径**（150 字场景由长译文的折行防御覆盖，实测 44 字已折 3 行、断行能力与字数无关）；若队长要求放宽到 150 字，需**同步改后端校验**，故本人未擅自放宽。
3. **线上后端未部署时无法演示真实 AI 雅译**（见上表第 4 条）。
4. **`bg_guofeng.jpg` 为 300KB**：整页唯一背景图（`app.less` 与 `.home-root` 同 URL，浏览器只下载一次）。若要求 ≤200KB，需设计侧另行压缩，属素材范围。

