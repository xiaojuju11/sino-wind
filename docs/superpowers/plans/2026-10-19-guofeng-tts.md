# 云山竹简国风语音 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为识别讲解、诗词赏析和先贤对话提供可在手机浏览器播放的微软国风 MP3 语音，并保留浏览器朗读降级。

**Architecture:** 后端新增受限的 TTS 接口，使用 Edge TTS 生成并缓存 MP3，通过 Koa 静态目录返回；前端新增共享语音工具，优先请求后端音频，失败时回退 `speechSynthesis`。三处页面只负责提供文本、音色和播放状态。

**Tech Stack:** Koa、Node.js、现有静态资源托管、Edge TTS、React、浏览器 Audio/Web Speech API、Node test runner。

## Global Constraints

- 音色只允许 `zh-CN-YunxiNeural`、`zh-CN-YunjianNeural`、`zh-CN-XiaoxiaoNeural`。
- 文本长度限制为 500 个 Unicode 字符。
- 播放必须由用户点击触发；页面隐藏或卸载时停止。
- 后端失败不阻塞正文展示，前端必须提供浏览器语音降级。
- 不把密钥、远程 URL 或用户输入写入仓库。

---

### Task 1: 后端 TTS 核心与接口

**Files:**
- Create: `backend/src/services/ttsService.js`
- Create: `backend/src/controllers/ttsController.js`
- Create: `backend/src/routes/ttsRoutes.js`
- Modify: `backend/src/index.js`
- Test: `backend/tests/ttsService.test.cjs`

**Interfaces:**
- `synthesizeSpeech({ text, voice, rate }) -> Promise<{ audioUrl, cacheKey }>`
- `POST /api/tts/synthesize` body `{ text, voice, rate }`, success `{ code: 1, data: { audioUrl, cacheKey } }`.

- [ ] **Step 1: Write failing tests** for voice whitelist, empty/overlong text rejection, deterministic cache key, and controller 400/503 responses.
- [ ] **Step 2: Run `npm test -- tests/ttsService.test.cjs`** and confirm the new cases fail because the service and route do not exist.
- [ ] **Step 3: Implement `ttsService.js`** with whitelist validation, SHA-256 cache keys, per-key cache files under `backend/public/tts-cache`, and a single Edge TTS generation adapter that can be replaced by the existing Python helper when needed.
- [ ] **Step 4: Implement controller and route**, return 400 for invalid input, 503 for synthesis failures, and mount the route in `backend/src/index.js`.
- [ ] **Step 5: Run the focused test and backend test suite**, expecting all tests to pass.

### Task 2: Shared frontend voice player

**Files:**
- Create: `frontend/src/utils/guofengSpeech.js`
- Test: `frontend/tests/guofengSpeech.test.js`

**Interfaces:**
- `VOICE_BY_SAGE`
- `speakGuofeng({ text, voice, rate, signal, fallback }) -> Promise<void>`
- `stopGuofengSpeech() -> void`

- [ ] **Step 1: Write failing tests** for voice mapping and fallback invocation when the TTS request rejects.
- [ ] **Step 2: Run `npm test -- tests/guofengSpeech.test.js`** and confirm failure.
- [ ] **Step 3: Implement the helper** using the existing Axios instance, `new Audio(audioUrl)`, user-gesture-compatible playback, AbortController cancellation, and a browser speech fallback.
- [ ] **Step 4: Run the focused test and frontend build**.

### Task 3: Integrate recognition, poem and scholar chat

**Files:**
- Modify: `frontend/src/components/recognitionResult/Index.jsx`
- Modify: `frontend/src/pages/PoemPage.jsx`
- Modify: `frontend/src/pages/ScholarChat.jsx`
- Modify: related styles only if status copy or controls need alignment.

- [ ] **Step 1: Replace duplicated direct speech calls** with `speakGuofeng` and `stopGuofengSpeech`, selecting Yunxi/Yunjian/Xiaoxiao by content and sage.
- [ ] **Step 2: Preserve the current click controls and loading/playing states**, and stop audio on pagehide, visibility change and route cleanup.
- [ ] **Step 3: Run frontend tests, `npm run lint`, and `npm run build`**.

### Task 4: Mobile deployment verification

**Files:**
- Modify: `docs/交付物/README.md` or the existing deployment note only if the mobile URL instructions are absent.

- [ ] **Step 1: Start backend and frontend with `0.0.0.0` bindings** and verify `/api/tts/synthesize` and `/api/test` from the deployed base URL.
- [ ] **Step 2: Verify the play action from a mobile-sized browser viewport**, including stop, route change cleanup, and TTS failure fallback.
- [ ] **Step 3: Record the final verification commands and known requirement that Edge TTS needs network access on the server.**
