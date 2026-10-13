# 前端启动与联调验证报告（基础环境准备 · 任务 B）

> 执行人：成员 B（陈思卉）｜ 日期：2026-10-13 ｜ 环境：Windows + PowerShell
> 实际工作副本：`D:\sino-wind-taskB`（任务书写的 `D:\SinoWind\sino-wind` 在本机不存在，已核实）

## 一、 环境与前置检查

| 项 | 结果 |
| :--- | :--- |
| 前端目录 | `frontend/`（依赖已安装，`npm run dev` 可直接起） |
| 前端端口 | **5173**（任务书指定）✅ 启动成功 |
| 后端端口 | **3000** ⚠️ 任务书写"默认 3001"，实际硬编码在 `backend/src/index.js:38` 的 `app.listen(3000)` |
| MySQL | 3306 ✅；库 `parent_kid_education` |
| `.gitignore` | ✅ 已排除 `.env` / `.env.local` / `.env.*.local` / `frontend/.env.local` / `backend/.env` / `backend/.env.local`（第 16–23 行） |
| `backend/.env.example` | ✅ 已入库（含 PORT / DB_* / VITE_DEEPSEEK_API_KEY / VITE_COZE_IMAGE_TO_TEXT_AND_VOICE 占位） |
| `backend/.env` | ⚠️ **本地不存在**（仅有 example）。本次后端以显式环境变量启动；建议 A 按任务书补一份本地 `.env` |

## 二、 前端启动验证（产出①）

```
cd D:\sino-wind-taskB\frontend
npm run dev -- --port 5173 --strictPort
→ HTTP 200（index.html 979 B）
```
真机视口（CDP 390×844, dpr=2）实测页面：
```json
{"url":"http://localhost:5173/home","title":"云山竹简 · 华风雅集",
 "rootChildren":1,"heroTitle":"云山竹简","bodyLen":417}
```
**启动成功截图**：`docs/handovers/img/front-5173.jpg`（390 视口真机模拟）

## 三、 接口联调验证（产出②）

### 3.1 健康检查（与任务书预期完全一致，含原文拼写 `mesaage`）
```
curl -i http://localhost:3000/api/test
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
{"status":"ok","mesaage":"Koa backend is running"}
```

### 3.2 登录
任务书示例账号 `13800000000 / 123456` **在库中不存在**（首次调用返回 `400 {"message":"账号不存在"}`）。
`/api/auth/register` 需要**图形验证码**（`GET /api/auth/captcha`），不便脚本化，故按测试需要**新增**了一个测试账号（`INSERT`，未改动既有账号 `13900000002`）：

```sql
-- 密码哈希由后端自带 bcrypt 生成：node -e "console.log(require('bcrypt').hashSync('123456',10))"
INSERT INTO users (phone,password_hash,nickname,...) VALUES ('13800000000','$2b$10$…','环宝',...);
```
登录成功响应（原始 JSON）：
```json
{"message":"登录成功",
 "token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwicGhvbmUiOiIxMzgwMDAwMDAwMCIsImlhdCI6MTc5MTg3OTA4OSwiZXhwIjoxNzkyNDgzODg5fQ.HIOht-QFl…",
 "user":{"id":2,"phone":"13800000000"…},
 "code":1}
```
> token 长度 167 字符；payload `{id:2, phone:"13800000000", iat, exp(7d)}`。

### 3.3 受保护接口 + Token 链路
| 场景 | 结果 |
| :--- | :--- |
| `Authorization: Bearer <token>` → `GET /api/auth/info` | **HTTP 200** `{"code":1,"id":2,"phone":"13800000000","nickname":"环宝",…}` ✅ |
| `Authorization: <token>`（**裸 token**，即前端 `http/index.js` 的写法） | **HTTP 200** ✅（后端 `utils/jwt.js` 会剥离可选 `Bearer ` 前缀） |
| 不带 token | **HTTP 416** `{"code":0,"message":"请重新登录"}` ✅ 正确拒绝 |
| 错误/失效 token | **HTTP 416** `{"code":0,"message":"token失效"}` ✅ |

### 3.4 CORS 验证
```
预检：OPTIONS /api/auth/info  Origin: http://localhost:5173  Access-Control-Request-Headers: authorization
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,HEAD,PUT,POST,DELETE,PATCH
Access-Control-Allow-Headers: authorization      ← ✅ 允许携带 Authorization 跨域
```
简单请求同样返回 `Access-Control-Allow-Origin: *` + `Vary: Origin` ✅

### 3.5 前端 Token 注入链路（读代码验证，未改红线文件）
`frontend/src/http/index.js`：
1. 请求拦截器从 `localStorage.getItem('token')` 取 token，写入 `request.headers.Authorization`；
2. 响应拦截器判断 `data.code !== 1` 时弹 Toast；程序性错误 `status === 416` 时 2 秒后跳 `/login`。
→ 与后端"无 token 返回 416"的约定**一致** ✅；裸 token 已被后端兼容 ✅

## 四、 发现的问题与风险（建议同步给队长/A）

| # | 问题 | 影响 | 建议 |
| :--- | :--- | :--- | :--- |
| 1 | `frontend/src/http/index.js` 的 `baseURL` 写死为 **远程** `http://120.26.186.48:3000` | 前端本地跑起来后请求的是远程服务器，**无法直接联调本地后端**；且远程未同步新接口 | 属红线文件，需队长决定：改本地 `/api`+Vite 代理，或用 `import.meta.env.VITE_API_BASE` 注入 |
| 2 | 任务书写"后端默认端口 **3001**"，实际 **3000**（硬编码） | 照文档操作会连不上 | 统一口径（改文档或改代码，属 A 的范围） |
| 3 | `backend/.env` 缺失（仅 example） | 新成员无法按文档一键起后端 | A 按任务书补齐（`.env` 已在 .gitignore 中，不会误提交） |
| 4 | 注册需图形验证码，示例账号在库中不存在 | 照文档的登录示例会直接 400 | 文档补充"先注册"或提供种子账号脚本 |
| 5 | 鉴权失败用 **416**（非 401/403） | 与通用约定不一致，新人易误判 | 前端已适配 416；建议文档标注该约定 |

## 五、 复现命令（原样可跑）
```powershell
# 前端
cd D:\sino-wind-taskB\frontend
npm install
npm run dev -- --port 5173 --strictPort     # → http://localhost:5173

# 后端（无 .env 时的显式启动方式）
cd D:\sino-wind-taskB\backend
$env:DB_HOST='localhost'; $env:DB_USER='root'; $env:DB_PASSWORD='<你的密码>'; $env:DB_NAME='parent_kid_education'
node src/index.js                            # → 服务运行在 3000 端口

# 接口
curl -i http://localhost:3000/api/test
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{\"phone\":\"13800000000\",\"password\":\"123456\"}'
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/info
```
