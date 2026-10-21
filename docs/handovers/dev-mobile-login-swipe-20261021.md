# 📱 真机两个体验问题：边缘滑动退出站点 / 二次访问仍要重输密码

- **日期**：2026-10-21
- **范围**：`frontend`（会话持久化 + 全局边缘手势），未动后端协议与数据库
- **验收**：`node proof/verify-auth-and-swipe.mjs` → **11/11 通过**，截图见 `proof/mobile-*.png`

## 一、左右滑动直接退出项目 → 现在滑动 = 返回上一级

### 根因

`position: fixed` 与路由都管不了「手势」：Android Chrome / WebView / 微信会把屏幕边缘的横滑解释成**浏览器历史的前进/后退**。当页面正好停在历史第一层（直接打开链接、从微信会话进来），后退没有站内目标，就直接退出站点。应用侧此前没有任何手势接管。

### 方案

| 层次 | 做法 | 文件 |
| :--- | :--- | :--- |
| 浏览器 | `html, body { overscroll-behavior-x: none }`，关掉侧滑前进后退 | `styles/global.css` |
| 页面 | 捕获阶段监听 touch：**从左右边缘 26px 内起手、向内划 ≥64px、明显横向、700ms 内** → 站内返回 | `components/SwipeBack.jsx` |
| 目标 | `history.state.idx > 0` 就 `navigate(-1)`；站内无历史（分享链接直达二级页）时按 `parentRouteOf()` 退到上级（如 `/poem → /home`、`/chat/:id → /letters`、`/mine/* → /mine`） | `utils/swipeBack.js` |
| 避让 | 输入框、抽屉遮罩、题头水墨区不接管；竖滑立刻交还页面滚动；正文中部横滑不触发 | `SwipeBack.jsx` |

**为什么只认边缘**：正文里的横向滚动（信札头像条、诗卷、词云）都在屏幕中部起手，边缘起手 + 内划方向把误触降到最低；同时与浏览器原生手势的位置一致，用户不用重新学。

**踩坑记录**：antd-mobile 即使弹层关着也会在 DOM 里留一个 `.adm-mask`，最初用 `document.querySelector('.adm-mask')` 判断「是否有弹层」导致所有手势被吞。现改为只在触点本身落在遮罩/弹层上时才避让。

## 二、第二次访问还要手动输密码 → 现在自动入席

### 根因

后端签发的是 **7 天 JWT**，登录后已写入 `localStorage.token`；但 `/login` 页面**从不检查已有会话**——微信/浏览器把用户带回 `/login`（或用户从收藏、会话记录进入）时，页面照旧展示登录表单，看起来就像「没记住登录」。

### 方案

| 做法 | 说明 |
| :--- | :--- |
| `/login` 自动入席 | `AuthPage` 挂载时 `resolveAuthEntry()`：会话有效直接 `<Navigate to="/home" replace />` |
| 过期即清理 | 读 JWT 的 `exp`（不验签），提前 30s 判过期；过期/损坏的 token 当场清掉，避免先进首页再被 416 踢回 | 
| 根路径同规则 | `RootRedirect`、`Layout` 都改用同一判定，过期不再渲染受保护页面 |
| 记住账号 | 登录成功记下手机号/邮箱（`gufeng_last_account`），被迫重新登录时只补密押；**永不存密码** |
| 文案 | 登录按钮下方一行：「本机会记住登录状态，七日内再次打开将直接入席」 |

**为什么不缓存密码**：口令一旦写进 localStorage，同源脚本、XSS、共用设备都能直接读走，且无法远程吊销；JWT 由服务端验签、修改密码后旧 token 自动失效，安全性高一个量级。

### 边界

- token 7 天到期、或用户改密（`auth_version` 变化）、或服务端换了 `JWT_SECRET` 时，仍会回到登录页，但账号已预填。想要「永不掉线」需要后端加 refresh token/静默续签，超出本次范围。
- 微信清理缓存会清掉 localStorage，属于系统行为。

## 三、改动清单

| 文件 | 说明 |
| :--- | :--- |
| `src/utils/session.js` | 新增：token 过期判定、账号记忆、落地判定（纯函数） |
| `src/utils/swipeBack.js` | 新增：手势判定、上级路由表、历史序号（纯函数） |
| `src/components/SwipeBack.jsx` | 新增：全局边缘滑动返回 |
| `src/App.jsx` | 挂载 `SwipeBack`；`RootRedirect` 改用会话判定 |
| `src/pages/AuthPage.jsx` | `/login` 有有效会话直接入席 |
| `src/pages/Login.jsx` | 预填上次账号、登录成功记住账号、持久化提示 |
| `src/pages/Layout.jsx` | 失效 token 直接回登录页 |
| `src/styles/global.css` | `overscroll-behavior-x: none` |
| `src/styles/login.less` | 提示行样式 |
| `tests/session.test.js` / `tests/swipeBack.test.js` | 新增 11 条单测 |
| `proof/verify-auth-and-swipe.mjs` | 新增：无头 Chrome 端到端验收（11 项断言 + 3 张截图） |

## 四、已知遗留（与本次无关）

- `npx eslint src tests` 仍有 3 处既有告警/错误（`utils/customSages.js` 的空语句块等），本次未触碰。
- `tests/chunkUpload.test.js` 仍因 `src/http/index.js` 顶层读 `localStorage` 而失败，属工作区既有未提交改动。
