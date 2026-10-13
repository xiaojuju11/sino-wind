# PR：雅集首页按新版设计稿重构（任务 B）

> 分支 `feat/phase2-home-yaji` ｜ 已并入 main（PR #12）｜ 本文档供后续 PR / review 复用

## 一、交付内容（TRD v3.0 §2.3 任务 B：雅集首页与白话雅译）
| 区块 | 内容 |
| :--- | :--- |
| 题头 | 「云山竹简」+ 朱砂印「华风」+ 副标；右上角 ☀️/🌙 日月切换（`useTheme()`）+ ⚙️ `icon-shezhi` → `/accountSetting` |
| 白话雅译 | 输入卡（✎ 毛笔 + 占位 + `0/100`）→ 金色下箭头 → 结果卡（雅言一行 + 朱砂「闲」印 + **加粗**「文言释义：」）→ 双按钮（竹青/朱砂，等宽，金边） |
| 古今时令与天象 | 古今双栏（**均左对齐** + **满幅底图**）+ 金色分割线（菱形点缀）；十二时辰与**干支动态换算**（五虎遁）+ 物候 + 🧭 漫游 |
| 古今识物 | 满幅底图 + 两块不透明卡片（上传拍摄区 / 示例体验，示例行改分隔线式） |
| 古诗词赏析 | 《定风波·莫听穿林打叶声》· 宋代 · 苏轼 + 圆形展卷按钮 → `/poem` |

**保留行为**：`POST /api/deepseek/yayan`（取 `res.data.data.{ancient,author,explanation}`）｜转译中「先贤研墨中…」禁用｜摘录写 `localStorage: gufeng_yayan_list` + Toast｜未生成时摘录置灰｜44px 状态栏安全区｜88% 宣纸蒙层｜全站 `var(--gf-*)` 支持月下墨境。

## 二、验收自测（可复现）
```
npm run build                → ✓ 0 报错（CSS 113.69KB / JS 541.79KB）
node %TEMP%\theme-test.js 9229
  LIGHT: bg=rgb(247,244,235)=#F7F4EB ｜ overflow=false ｜ topPad=44.07px
  DARK : bg=rgb(13,17,23)=#0D1117    ｜ overflow=false ｜ topPad=44.07px
  CONSOLE_ERRORS=0
node %TEMP%\measure-type.js 9229 → docH=920（内容 844 ≈ 设计稿 843）｜块高 211/119/121/162
node %TEMP%\check-home.js       → 印章[简,时,物,词]｜双按钮等宽｜诗句完整｜无横向溢出
```

## 三、新增素材（`frontend/public/assets/home/`，均 ≤200KB）
`bg-yayan.jpg 92KB`｜`bg-shiwu.jpg 54KB`｜`bg-almanac-ancient.jpg 45KB`｜`bg-almanac-modern.jpg 43KB`｜`bg-poem.jpg 45KB`

## 四、⚠️ 需队长处理的 3 项（代码层已无可做）
1. **上传 iconfont**：日月/天气/菊花/奶茶/书包/↗ 共 7 处仍是 emoji（两个 iconfont 库合计仅 36 个通用图标，缺失上述国风图标；`antd-mobile-icons` 亦无 Sun/Moon）
2. **`Layout.jsx`（红线）**：「知音」误用推车图标（语义错误）+ 底栏图标与文字基线不齐
3. **字体**：设计稿为书法体/手写数字体，项目无该字体且红线禁改 `index.html` 引外链

## 五、说明
- 字号按**用户决策「方案 A：完全对齐设计稿」**，次要文字 7.8~9.4px；已记入 `docs/handovers/dev-B-home.md` 记录六（含"用户决策"字样与影响说明）
- 「灵感拾遗」4 组胶囊：详情稿无此模块，经确认后移除；如需恢复请告知
- 验收结论与未完成项归属见 `docs/handovers/dev-B-home.md` 记录七
