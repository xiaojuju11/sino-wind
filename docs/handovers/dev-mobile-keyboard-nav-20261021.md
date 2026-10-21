# ⌨️ 移动端底部 Tab 被软键盘顶起：根因与修复

- **日期**：2026-10-21
- **范围**：`frontend`（`Layout` 底栏 + 视口工具），未动后端与路由
- **现象**：真机（微信 / Android WebView）点开首页「白话雅译」输入框后，底栏 `[雅集 | 知音 | 书斋]` 被顶到键盘上方，悬在「古今时令与天象」卡片中间遮住正文（见 `proof/keyboard-nav-3-keyboard-open-before-fix.png`）。

## 一、根因

`.bottom-nav` 是 `position: fixed; bottom: 0`。固定定位相对的是 **layout viewport**，而软键盘在不同内核对它的处理不同：

| 环境 | 键盘行为 | 固定底栏表现 |
| :--- | :--- | :--- |
| Android Chrome / 微信 / QQ（`interactive-widget=resizes-content`，Chrome 108+ 默认） | 压缩 layout viewport | 底栏跟着 layout viewport 上移，**浮在键盘上方**并挡住正文 |
| iOS Safari / 微信 iOS | layout viewport 不变，键盘盖在 visual viewport 上 | 底栏原地不动，**整条被键盘盖住** |

两端表现不同，但都不是「打字时该看到底栏」的时机。此前没有任何键盘态判定，所以 Android 上就出现了「底栏被键盘顶起来」的经典问题。

## 二、方案取舍

| 方案 | 结论 |
| :--- | :--- |
| 把底栏钉在 visual viewport 底部（跟随键盘上浮） | ✗ 与截图里的缺陷现象相同：键盘态下底栏占掉 60px 可视区，仍遮正文；iOS 上还会来回跳 |
| `interactive-widget=overlays-content`，让键盘盖住一切 | ✗ 布局视口不压缩，聚焦的输入框可能被键盘盖住，需要另写滚动补偿 |
| **键盘弹起时收起底栏，落键盘后复原** | ✓ 与微信等原生 App 一致；不改变底栏几何与液态玻璃质感，只加位移 + 淡出 |

## 三、实现

| 文件 | 作用 |
| :--- | :--- |
| `frontend/src/utils/keyboardViewport.js` | 纯逻辑：`isEditableElement()`、`resolveKeyboardOpen()`、`createKeyboardWatcher()`；只依赖注入的 `win/doc`，可在 node:test 里完整跑监听链路 |
| `frontend/src/utils/useKeyboardOpen.js` | React 绑定：返回 `keyboardOpen`，同步 `<html class="is-keyboard-open">`，卸载自动清理 |
| `frontend/src/pages/Layout.jsx` | 键盘态给底栏加 `is-keyboard-hidden`，并补 `inert` / `aria-hidden`（隐藏后不再被读屏与 Tab 键命中） |
| `frontend/src/styles/layout.less` | `.bottom-nav.is-keyboard-hidden`：`opacity: 0` + `translateY(120%)` + `pointer-events: none`，沿用底栏原有 0.3s 过渡 |
| `frontend/index.html` | viewport 显式声明 `interactive-widget=resizes-content`，把「输入框留在键盘上方」的行为固定下来 |

### 判定规则（不猜 UA）

```
键盘弹起 = 焦点在文本输入控件内
        且（基线高度 − innerHeight ≥ 120px          // Android/微信：布局视口被压缩
            或 innerHeight − visualViewport.height ≥ 120px）  // iOS：键盘盖住可视视口
```

- 基线取「无键盘时的最高可视高度」，只增不减，焦点离开与横竖屏切换（宽度变化 > 60px）时重置，避免地址栏收起、旋转被误判成键盘。
- 只认 `textarea`、文本类 `input`、`contenteditable`；`button` / 复选框 / `select` / 只读禁用控件不算，避免误收起。
- 焦点离开延迟 90ms 复算，输入框之间切换不会导致底栏闪一下。
- `pageshow` 时重算，bfcache 回退不会残留隐藏态。

## 四、验收

1. **单测**：`frontend/tests/keyboardViewport.test.js`（7 条，`node --test` 全绿）——覆盖 Android 压缩、iOS 覆盖、小抖动不误判、非输入控件不触发、`stop()` 清理、横竖屏基线重置。
2. **构建**：`npm run build` 通过（0 错误）。
3. **浏览器验收**：`node proof/verify-keyboard-nav.mjs`（无头 Chrome + CDP，把视口 844 → 524 等价模拟 320px 键盘），**7/7 通过**，产出四张对照图：
   - `proof/keyboard-nav-1-keyboard-closed.png`：常态底栏可见（`opacity=1`，`top=784`，视口 844）
   - `proof/keyboard-nav-2-keyboard-open-fixed.png`：键盘态底栏收起（`opacity=0`、`inert`、`top=536 > 视口 524`）
   - `proof/keyboard-nav-3-keyboard-open-before-fix.png`：强制还原旧样式复现缺陷（`top=464`、`bottom=524`，正好悬在键盘上方）
   - `proof/keyboard-nav-4-keyboard-closed-again.png`：落键盘后底栏复原（`opacity=1`、类名清空）

## 五、已知边界

- 自动化用 CDP 缩放视口模拟键盘，**真机（微信内浏览器 / QQ / Capacitor APK）仍需一次实机点按确认**；判定阈值 120px 是两者共用值，若个别机型键盘过矮或浏览器工具栏异常，只需调 `KEYBOARD_INSET_THRESHOLD`。
- 横屏 + 键盘同时操作属罕见路径：旋屏会重置基线，此时按真实视口重新判定，可能提前一帧收起/复原。
- 本次只处理 Layout 的底部 Tab。`ScholarChat` 等全屏页的输入栏本就应「贴着键盘上浮」，不在本次范围；若 iOS 上出现输入栏被键盘盖住，可复用 `keyboardViewport.js` 的判定再单独处理。
- 与本次无关的既有失败：`frontend/tests/chunkUpload.test.js` 在全量测试中报 `localStorage is not defined`（`src/http/index.js` 在模块顶层读取 `localStorage`）。该文件本次未改动，属工作区里未提交的既有改动，需要其作者在测试环境补 stub。
