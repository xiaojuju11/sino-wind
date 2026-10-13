# 📣 待队长 / A 处理事项（成员 B 汇总）

> 汇总人：成员 B（陈思卉）｜ 日期：2026-10-13 ｜ 分支 `feat/phase2-home-yaji` @ `da8e9f2`
> 每条均附证据与修法，可直接执行。

## 一、 请队长合并分支（影响验收）
`feat/phase2-home-yaji` @ `da8e9f2` 已推送 origin + team；`team/main` 仍为 `8e85f8c`，**领先 10 个提交未进 main**。
含：首页暗夜模式修复 + 4 张设计底图接入 + 基础环境验证报告。

* PR：https://github.com/xiaojuju11/sino-wind/pull/new/feat/phase2-home-yaji
* PR 说明：`docs/handovers/PR-home-yaji.md`

## 二、 🔴 联调阻塞（红线文件，需队长拍板）
`frontend/src/http/index.js` 的 baseURL **写死为远程**：
```js
axios.defaults.baseURL = 'http://120.26.186.48:3000'
```
**后果**：前端本地起在 5173，请求却打到远程服务器 → 无法联调本地后端（实测本地 `/api/test` = 200，远程未同步新接口）。
**建议二选一**（属红线，成员 B 未改动）：
1. 改 `baseURL: '/api'` + `vite.config.js` 配 proxy 到 `http://localhost:3000`；
2. `axios.defaults.baseURL = import.meta.env.VITE_API_BASE || 'http://120.26.186.48:3000'`，本地用 `.env.local` 覆盖为 localhost。

## 三、 🔴 图标铁律收尾（需队长上传 iconfont）
首页仍有 **7 处 emoji 当图标**：🌙日月切换、☀️天气、🌼物候、☕奶茶、🎒书包、↗示例前缀、→流程箭头（`→` 可直接换 `RightOutline`，免上传）。

**原因**：项目内置两个 iconfont 库合计仅 **36 个通用图标**（返回/设置/相机/书本/上传/收藏/账号/通知…），**没有**日月/菊花/奶茶/书包/罗盘/毛笔；`antd-mobile-icons` 亦无 Sun/Moon。
已换矢量的 11 处（iconfont 3 + antd 8）见 `docs/handovers/dev-B-home.md`。

另：`Layout.jsx` 底栏「知音」现用**古代推车图标**（语义错误），应换古信札/飞鸽 —— 该文件为红线，请队长处理。

## 四、 请 A 处理 3 项
### 1) 【高】主题模块兼容（否则合并后首页日月切换失效）
A 的分支把 `useTheme` 拆到 `useTheme.js`，新 `ThemeContext.jsx` **不再导出 `useTheme`**，而以下文件仍是旧写法：
```js
// frontend/src/pages/Home.jsx:6
// frontend/src/pages/MinePage.jsx:6
import { useTheme } from '../context/ThemeContext'
```
→ A 的分支合并后，**首页日月切换会直接失效**（`useTheme is not a function`）。
**修法（一行，向后兼容，全队旧代码免改）** —— 在 `ThemeContext.jsx` 补：
```js
export { useTheme } from './useTheme.js'
```

### 2) `backend/.env` 缺失
仅有 `.env.example` → 新成员无法按文档一键起后端。请补一份本地 `.env`（已确认被 `.gitignore` 第 16–23 行排除，不会误提交）。

### 3) 端口与鉴权口径
* 文档写"后端默认 **3001**"，实际 `backend/src/index.js:38` 为 `app.listen(3000)` → 请统一（改文档或改代码）；
* 鉴权失败返回 **416**（非 401/403），建议在文档标注（前端 `http/index.js` 已按 416 适配）。

## 五、 成员 B 完成情况（供验收对照）
| 任务 | 状态 | 产出 |
| :--- | :--- | :--- |
| 任务B（雅集首页与白话雅译） | 已并入 main（PR #12）；后续 9 个暗夜/底图精修待合并 | `Home.jsx` / `home.less` / 5 张底图 / 交接文档 |
| 任务B（基础环境准备·前端联调） | ✅ 完成 | 前端 5173 启动成功 + 健康检查/登录/Token/CORS 全链路实测通过；报告 `docs/FRONTEND_VERIFICATION.md`（含截图与原始 JSON 响应） |
