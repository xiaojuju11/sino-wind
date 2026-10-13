# PR：第三阶段 · 首页风雅与晨昏雅集收官（成员 B）

> 分支 `feat/phase3-home-polish` @ `532c9fb` ｜ 基于 `team/main@09d26ed` ｜ **可快进合并（fast-forward）**
>
> * PR 入口（团队仓库）：https://github.com/xiaojuju11/sino-wind/pull/new/feat/phase3-home-polish
> * PR 入口（个人仓库）：https://github.com/ki123-gif/sino-wind/pull/new/feat/phase3-home-polish
> * 提交：`4935cc7`（三阶段交付）＋ `532c9fb`（接续简报）

## 一、交付内容（TRD_PHASE3.md §3.3 任务 B）

### ① 消灭 6 处原生 Emoji（AC-B1）→ DOM 实测残留 **0**

| # | 位置 | 替换前 | 替换后 | 优先级 |
| :-- | :--- | :--- | :--- | :--- |
| 1 | 题头日月切换 | `🌙` / `☀️` | 内联 SVG 弦月 / 日轮（24×24 描边、`currentColor`） | ③ 内联 SVG |
| 2 | 时令天气 | `☀️` | 内联 SVG「云日纹」（心圈 + 八主芒 + 八辅芒） | ③ 内联 SVG |
| 3 | 物候 | `🌼 物候：菊有黄华` | 朱砂小印「菊」+ 文字「物候：菊有黄华」 | ③ CSS 印章 |
| 4 | 示例 · 奶茶 | `☕` | 朱砂小印「酪」 | ③ CSS 印章 |
| 5 | 示例 · 书包 | `🎒` | 朱砂小印「笈」 | ③ CSS 印章 |
| 6 | 示例前缀 | `↗` | `<UpOutline />` | ① antd-mobile-icons |

**未新增任何图片素材、未改 `index.html`**（未私自添加 Iconfont 链接，符合 §2.3 单一信源铁律）。

### ② 全站统一国风背景（§2.2 背景图红线）
删除 `Home.jsx` 中写死 `assets/home/bg-paper.jpg` 的内联 style；`.home-root` 显式声明 `url('/assets/common/bg_guofeng.jpg')`，与 `app.less` 的 `body` 同图（浏览器只下载一次）。

### ③ 白话雅译 390px 长文本排版防御（AC-B2）
`home.less` 新增「第三阶段任务 2」区块，五层防御：
1. 输入框 `field-sizing: content` 自适应长高，`max-height: 4.6rem` 封顶后转**卡内滚动**；
2. 译文去掉历史遗留 `white-space: nowrap`，允许折行；
3. `overflow-wrap: anywhere` + `word-break: break-word`，超长无空格串强制断行；
4. 双按钮补 `min-width: 0`（grid `minmax(0,1fr)` 的下限兜底）；
5. 作者行 `nowrap + ellipsis` + 卡片 `overflow-x: hidden` 兜底；字数顶格（100/100）时计数转朱砂。

### ④ 顺带修复一个真实缺陷 + 数据契约补齐
* **失败路径张冠李戴**：雅译请求失败时原先**不清理结果卡**，页面会留着上一句雅言 → 改为**失败即清空译文**（结果卡隐藏、摘录按钮自动置灰）+ 古风提示；
* **数据契约**：`localStorage.gufeng_yayan_list` 补齐缺失的 `modern` 字段，对齐 `{ id, modern, ancient, author, explanation }`，并附 `offline` 布尔位；
* **兜底标注**：后端离线典范库命中时，界面显示朱砂徽标**「离线典范」**，落实「兜底名句不冒充 AI 生成」。

### ⑤ 30 秒演示说辞
`docs/handovers/demo-B-home-30s.md`：逐秒分镜（0:00–0:30）+ 演示前 6 项准备 + 代码位置对照 + 3 条问答预案 + 实测数据背书。

## 二、验收自测（可复现）

```powershell
# 起调试浏览器（user-data-dir 请放仓库外）
msedge --headless=new --disable-gpu --remote-debugging-port=9229 --user-data-dir=C:\temp\edge-cdp-p3 --no-first-run --hide-scrollbars about:blank
# 起前端（vite.config.js 已有 /api → 127.0.0.1:3000 代理）
cd frontend ; npm run dev -- --port 5174 --strictPort
# 一键验收
node proof\phase3-home-check.js 9229
# 真实 AI 链路彩排（需后端在 3000）
node proof\demo-dryrun-yayan.js 9229
```

| 检测项 | 结果 |
| :--- | :--- |
| 原生 Emoji 残留 | **0** ✅ |
| 背景图（红线） | `/assets/common/bg_guofeng.jpg` ✅ |
| 横向溢出（白昼/暗夜/长文本/无空格串） | **全部 false**（390 = 390）✅ |
| 输入 100 字 / 1 字 | 框高 91.3px 不滚动 / 30.4px 不塌陷 ✅ |
| 44 字长雅言 | 折 3 行，印章仍在卡内 ✅ |
| 输入框与译文卡等宽 | 301px = 301px ✅ |
| 白昼 / 暗夜底色 | `#F7F4EB` / `#0D1117` ✅ |
| 雅译区块高 | **203px（= 设计稿）** ✅ |
| 真实 AI 雅译（端到端） | 200 / **1.5s** 出结果，无「离线典范」徽标 ✅ |
| 摘录入卷 | `gufeng_yayan_list` 字段齐全 ✅ |
| Console 报错 / ESLint / build | 0 / exit 0 / 1024 模块 0 报错 ✅ |

证据：`proof/phase3-result.json`、`proof/phase3-home-{light,dark,longtext,offline,real-ai}-390.png`

## 三、需队长裁定 / 队友知悉（本人未越界改动）

| # | 事项 | 归属 |
| :-- | :--- | :--- |
| 1 | 第 6 处 emoji 口径：我用 `<UpOutline />`（东北向，与被替换的 `↗` 字形一致）；TRD 字面写 `<RightOutline />`（正右向，会丢「上浮/外链」语义） | **队长裁定** |
| 2 | `PoemPage.jsx:253` 仍用 `assets/home/bg-paper.jpg`（§2.2 要求全站统一） | 成员 D |
| 3 | 别人文件仍有零星 Emoji：`MinePage.jsx:173`、`PoemPage.jsx:372`、`ScholarChat.jsx:323/330` | 成员 A / C / D |
| 4 | `backend/.env` 缺失（只有 `.env.example`），新成员无法一键起后端 | 队长 / A（已在 `TO-LEADER-actions.md` 记录） |

## 四、说明

* **红线文件零改动**：`App.jsx`、`Layout.jsx`、`global.css`、`variables.less`、`app.less`、`layout.less`、`vite.config.js`、`index.html`、`http/index.js`、backend 全部未动。
* 本次**未改任何接口契约**，`POST /api/deepseek/yayan` 的请求/响应字段沿用现状，仅前端做了兼容性增强。
* 字号口径沿用第二阶段记录六的**「用户决策 · 方案 A（完全对齐设计稿）」**，本次未改动字号体系。
