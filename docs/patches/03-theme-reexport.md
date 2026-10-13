# 补丁 03：主题模块向后兼容导出（请 A 在合并前应用）

## 背景
A 的分支 `feat/phase2-recognition-core` 把 `useTheme` 拆到 `frontend/src/context/useTheme.js`，
新的 `ThemeContext.jsx` **只导出 `ThemeProvider`**，不再导出 `useTheme`。
而全站仍有两处旧写法（`Home.jsx:6`、`MinePage.jsx:6`）：

```js
import { useTheme } from '../context/ThemeContext'
```

→ 该分支合并后，**首页日月切换会失效**（`useTheme is not a function`）。

## 修法（一行，向后兼容，旧代码全免改）
在 A 分支的 `frontend/src/context/ThemeContext.jsx` 末尾追加：

```js
// 向后兼容：保留旧的导入路径（页面仍可 import { useTheme } from '../context/ThemeContext'）
export { useTheme } from './useTheme.js'
```

## 验证
```bash
cd frontend && npm run build      # 0 报错
node %TEMP%\theme-test.js 9229    # LIGHT #F7F4EB / DARK #0D1117 / CONSOLE_ERRORS=0
```
且首页顶部 ☀️/🌙 点击后 `document.documentElement[data-theme]` 能在 light/dark 间切换。

## 备选（若不改 A 的分支）
合并完成后，由成员 B 把两处导入改为：
```js
import { useTheme } from '../context/useTheme'
```
（代价：需同步改动 Home.jsx 与 MinePage.jsx 两个文件；MinePage.jsx 非 B 的独占文件，需相应成员配合。）
