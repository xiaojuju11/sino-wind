# 🧭 任务 B 上下文简报（清空对话后请看这份）

> 用途：DSH 会话上下文清理/新开会话后，凭这份文件即可无缝接续工作，无需重读历史。
> 生成时间：2026-10-13 ｜ 生成者：AI 助手（为 陈思卉 / 成员 B）
> **最后更新：2026-10-13（第三阶段三项任务已完成，见「九、第三阶段收官」）**

---

## 一、 项目当前状态（刚核对）

| 项 | 值 |
| :--- | :--- |
| 项目 | 《云山竹简 · 华风雅集》（SinoWind） |
| 团队仓库 | `git@github.com:xiaojuju11/sino-wind.git`（远端名 `team`） |
| 自己的仓库 | `git@github.com:ki123-gif/sino-wind.git`（远端名 `origin`） |
| 团队 main | **`09d26ed`**（含我的任务 B 全部提交 + `TRD_PHASE3.md`） |
| 当前阶段 | **第三阶段**（终期验收 + 答辩演示冲刺），依据 `TRD_PHASE3.md`（**已在 `team/main` 上，本地原来没有**） |
| 我的分支 | `feat/phase3-home-polish` @ `4935cc7`（基于 `team/main@09d26ed`，**工作区干净**） |
| 上一阶段分支 | `feat/phase2-home-yaji`（已并入 main） |
| 本地工作副本 | `D:\sino-wind-taskB`（主分支 main 在另一副本 `D:\sino-wind`） |

## 二、 我的身份与分工（成员 B / 陈思卉）

**第三阶段任务（`TRD_PHASE3.md` §3.3「首页风雅与晨昏雅集」）**
1. 消灭首页剩余 **6 处原生 Emoji**，统一为国风矢量
2. 夯实**白话雅译在 iPhone 390px 视口下的长文本排版防御**
3. 准备 **30 秒演示说辞**

**独占文件**：`frontend/src/pages/Home.jsx`、`frontend/src/styles/home.less`
**红线禁改**：`App.jsx`、`Layout.jsx`、`global.css`、`variables.less`、`app.less`、`layout.less`、`vite.config.js`、`index.html`、`http/index.js`、backend

## 三、 第三阶段新红线（影响我的两条）

1. **背景图红线**：全页面背景统一用 **`/assets/common/bg_guofeng.jpg`**（我首页现在用 `assets/home/bg-paper.jpg`，**需更换**；新文件已存在）
2. **图标红线**：严禁原生黄色 Emoji（点名 ☀️🌙🌼☕🎒）。三级优先级：
   - ① 首选 `antd-mobile-icons`（已核对 152 个：有 `UpOutline/RightOutline/CompassOutline/EditSOutline/CheckCircleOutline/DownCircleOutline/MailOpenOutline`，**没有 Sun/Moon/Weather**）
   - ② 队长在 iconfont.cn 统一上传的团队图标
   - ③ **CSS 印章（如 `<span className="gf-seal">茶</span>`）或内联 SVG** ← 第三级就能解决日月/天气/物候

**6 处 emoji 的替换方案（已定，无需等队长）**
| 位置 | 现在 | 换成 |
| :--- | :--- | :--- |
| 题头日月切换 | `🌙/☀️` | 内联 SVG 日/月（三级） |
| 时令天气 | `☀️` | 内联 SVG 日轮（三级） |
| 物候 | `🌼 物候：菊有黄华` | CSS 印章「菊」 |
| 示例两条 | `☕` `🎒` | CSS 印章「酪」「笈」 |
| 示例前缀 | `↗` | antd `UpOutline` |

## 四、 已完成（无需重做）

- **任务 B 首页全部交付**：题头（云山竹简 + 朱砂「华风」印 + 副标 + 日月切换 + 设置）/ 白话雅译（输入+毛笔+字数+箭头+结果+朱砂「闲」印+释义+双按钮+摘录 localStorage）/ 古今时令与天象（十二时辰+干支动态+物候+漫游+金色分割线）/ 古今识物（上传区+示例体验）/ 古诗词赏析（定风波+圆钮）
- **日夜模式**：`home.less` 全量迁移到 `var(--gf-*)`（80 处）+ `color-mix`；白昼 `#F7F4EB` / 暗夜 `#0D1117` 实测命中
- **5 张设计底图**已接入（bg-yayan / bg-shiwu / bg-almanac-modern / bg-almanac-ancient / bg-poem，43~92 KB）
- **工程加固**：44px 状态栏安全区、88% 宣纸蒙层、`overflow-x` 防护
- **交接文档**：`docs/handovers/dev-B-home.md`（含记录六「字号口径说明」+ 记录七「验收结论」）、`PR-home-yaji.md`、`TO-LEADER-actions.md`、`FRONTEND_VERIFICATION.md`

## 五、 待办 / 待决

| # | 事项 | 归属 |
| :--- | :--- | :--- |
| 1 | 第三阶段三项任务（emoji / 长文本防御 / 演示说辞） | **我（B）** |
| 2 | 首页背景换为 `bg_guofeng.jpg` | **我（B）** |
| 3 | 6 个国风图标上传 iconfont（若走第二优先级） | 队长 |
| 4 | 同步 main（我的分支落后 5 个提交） | ✅ **已完成**（2026-10-13 fast-forward 到 `09d26ed`） |

---

## 九、 第三阶段收官（2026-10-13 · 已完成）

**分支**：`feat/phase3-home-polish` @ `4935cc7` ｜ **独占文件**：`Home.jsx`、`home.less`（红线文件零改动）
**交付**：`docs/handovers/dev-B-home.md` 记录八（交接与验收）、`docs/handovers/demo-B-home-30s.md`（30 秒演示说辞）、`proof/`（可复现验收脚本 + 3 张 390px 实拍图）

### 三项任务结果（全部通过）

| 任务 | 标准 | 结果 |
| :--- | :--- | :--- |
| ① 消灭 6 处原生 Emoji | AC-B1 | ✅ **DOM 实测残留 0**。日月/天气＝内联 SVG；物候/示例＝CSS 印章「菊」「酪」「笈」；`↗`＝antd `<UpOutline />` |
| ② 390px 长文本防御 | AC-B2 | ✅ 输入框自适应长高（100 字 91.3px，上限 179.4px 转卡内滚动）；译文去掉 `nowrap` 折行；无空格长串强制断行；**横向溢出 0** |
| ③ 30 秒演示说辞 | AC-B3 | ✅ `demo-B-home-30s.md`（逐秒分镜 + 准备清单 + 问答预案 + 数据背书） |
| 附：背景图红线（§2.2） | — | ✅ 改为 `/assets/common/bg_guofeng.jpg`，删掉写死 `bg-paper.jpg` 的内联 style |

**顺带修掉一个真实缺陷**：雅译请求失败时原先**不清理结果卡**，页面会留着上一句雅言（张冠李戴）；现改为失败即清空译文 + 摘录置灰 + 古风提示。另补齐 `gufeng_yayan_list` 缺失的 `modern` 字段，并对离线兜底结果标注朱砂徽标「离线典范」。

### ✅ 演示环境（2026-10-13 已实测跑通，非阻塞）

1. **前端代理已通，无需配任何 `.env`**：团队主线已把 `http/index.js` 改为 `VITE_API_BASE_URL || ''`（相对路径），`vite.config.js` 有 `/api → http://127.0.0.1:3000` 代理 → **本机演示走本地真实 AI**。
   ✅ 实测：`POST http://localhost:5174/api/deepseek/yayan` → **200 / 1.1~2.1s**，真实语句（非兜底）、无「离线典范」徽标；`proof/demo-dryrun-yayan.js` 可一键彩排。
2. **`backend/.env.local` 已就位**：从 `D:\sino-wind\backend\.env.local` 复制过来（含本地 MySQL 口令 + DeepSeek Key，**已被 gitignore，不进仓库**）。后端已在 3000 端口跑通。
3. **答辩当天只需两个服务**：`cd backend && node src/index.js`（→3000）＋ `cd frontend && npm run dev -- --port 5174 --strictPort`（→5174）。
4. ⚠️ **仅“部署到公网”才会出问题**：云端 `120.26.186.48:3000` 实测 **404**（未部署 `/api/deepseek/yayan`）→ 需队长 / A 重新部署后端。**本机演示不受影响。**

### 口径待队长裁定

* `↗` 我换成了 `<UpOutline />`（东北向，与被替换字形视觉等效）；TRD 字面写 `<RightOutline />`（正右向，会丢语义）。
* `PoemPage.jsx:253` 仍用 `assets/home/bg-paper.jpg`（成员 D 文件，我未越界改）。
* 全站仍有零星 Emoji 在**别人文件**里：`MinePage.jsx:173`、`PoemPage.jsx:372`、`ScholarChat.jsx:323/330`。

## 六、 关键操作命令（复用过的、验证有效的）

### 视觉读图（本机 AI 看不到图，必须走这条 qwen 视觉桥）
```powershell
$env:HTTP_PROXY=''; $env:HTTPS_PROXY=''; $env:NO_PROXY='*'
$cfg = Get-Content 'C:\Users\2869\.claude\settings.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$env:DASHSCOPE_API_KEY=$cfg.env.DASHSCOPE_API_KEY; $env:VISION_PROVIDER='qwen'; $env:QWEN_MODEL='qwen3-vl-plus'; $env:VISION_MAX_TOKENS='3000'
python 'C:\Users\2869\.claude\skills\vision\vision.py' --provider qwen '<图片路径>' '<提示词>'
```
> 模型名必须是 `qwen3-vl-plus`（`qwen-vl-max` 已下线、`-latest` 无权限）；大图先压到 ≤900px / ≤400KB。

### 真机视口体检（CDP，脚本都在 `%TEMP%`）
```powershell
# 启动调试浏览器
msedge --headless=new --disable-gpu --remote-debugging-port=9229 --user-data-dir=%TEMP%\edge-cdp7 --no-first-run --hide-scrollbars about:blank
node %TEMP%\theme-test.js 9229      # 日夜底色 / 44px / 无溢出 / Console 报错
node %TEMP%\scan-fonts.js 9229      # <10px 文字清单
node %TEMP%\measure-type.js 9229    # 块高与关键字号
```

### 预览与构建
```powershell
cd D:\sino-wind-taskB\frontend
npm run dev -- --port 5174 --strictPort     # http://localhost:5174/
npm run build                                # ⚠️ 会杀掉 5174 dev server，之后要重启
```

### Git（代理不通时走直连）
```powershell
$env:GIT_SSH_COMMAND='ssh -o ProxyCommand=none'
git fetch team main ; git merge team/main
```

### 第三阶段验收（我新加的，可复现）
```powershell
# 1) 调试浏览器（注意：user-data-dir 别放仓库里，否则会污染 git status）
msedge --headless=new --disable-gpu --remote-debugging-port=9229 --user-data-dir=C:\temp\edge-cdp-p3 --no-first-run --hide-scrollbars about:blank
# 2) 前端
cd D:\sino-wind-taskB\frontend ; npm run dev -- --port 5174 --strictPort
# 3) 一键验收：emoji 归零 / 背景红线 / 长文本防御 / 离线路径 / 日夜底色 / Console
cd D:\sino-wind-taskB ; node proof\phase3-home-check.js 9229
# 4) 只查图标与印章的最终尺寸及来源规则
node proof\diag-glyph-size.js 9229
```

## 七、 已知坑（踩过的）

1. **跑 `npm run build` 会杀掉 5174 dev server**（Vite 监视冲突）→ build 后必须重启预览
2. **不要用 `msedge --screenshot --window-size=390` 截图**：`rem.js` 取的 `clientWidth` 与窗口不一致（rem 会算成 49 而非 39）→ 假性溢出；必须用 CDP `setDeviceMetricsOverride`
3. `home.less` **不要用 `@color-*`**（阶段一旧色板）→ 一律 `var(--gf-*)`；`fade(var(--x), n%)` 非法 → 用 `color-mix(in srgb, var(--x) n%, transparent)`
4. **PowerShell 变量大小写不敏感**（`$s` 会覆盖 `$S`）
5. **视觉模型的差异清单必须逐条 DOM 实测证伪**再动手（本会话它误报过：缺设置按钮/缺印章/截断/缺标点/双栏丢失/底栏无高亮，全部证伪）
6. 网络：本机 Clash 代理（7897）常不在运行；直连 GitHub 也常超时 → 推送前先确认网络
7. **会话历史文件**：`C:\Users\2869\.dsh\sessions\--C-Users--\session-0fa46222-…\`（v3 = 10-10 前，v4 = 当前）
8. **`edit` 工具会写崩 Vite dev server**（Windows 特有）：它用「临时目录 + 原子替换」落盘，Vite 的 watcher 会去 watch 那个临时目录并抛 `EBUSY ... .home.less.<pid>.<uuid>.tmpdir\home.less.tmp` 直接**进程退出**。对策：**编辑时不要求 dev server 活着**；改完清理 `frontend\src` 下的 `.*tmpdir*` 残留目录，再重启 5174。
9. **DSH 工作区不能是 `C:\Users`**：临时目录 `C:\Users\2869\AppData\Local\Temp` 会落在工作区内，`pwsh` 工具直接报 `Windows ACL temp root must be outside the workspace` 而**完全无法执行命令**。解决：把会话工作区设为 `D:\sino-wind-taskB`，或把文件策略切到 `danger-full-access`。
10. **`msedge --headless=new` 的 `--user-data-dir` 不要放仓库内**（我曾用 `D:\sino-wind-taskB\.dsh-cdp`，会在 `git status` 里多出一个上千文件的未跟踪目录）。

## 八、 服务与环境

```
MySQL     3306  本机 root（口令见下）
后端 Koa  3000  cd D:\sino-wind-taskB\backend && node src/index.js（需环境变量）
前端 dev  5174（开发）/ 5173（任务书端口）
DB 名：parent_kid_education ｜ 建表脚本：backend/scripts/init-day1.js
```
> 数据库口令等敏感信息**未写入本文件**；本地部署说明见 `D:\sino-wind\启动说明.md` 与 `backend/.env.local`（gitignored）。

---

**新会话第一句话可以直接说**：「读 `D:\sino-wind-taskB\docs\handovers\CONTEXT-BRIEF.md`，继续做第三阶段首页任务」。
