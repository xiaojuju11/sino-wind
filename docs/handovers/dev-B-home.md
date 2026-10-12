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
