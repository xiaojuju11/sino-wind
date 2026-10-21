import { useEffect, useState } from 'react'
import { createKeyboardWatcher } from './keyboardViewport'

/**
 * 软键盘是否弹起。弹起时 <html> 会带 `is-keyboard-open` 类名，
 * 供全局样式（底部 Tab 收起等）使用；返回值用于给控件补 aria / inert。
 * 必须在浏览器环境调用（Layout 等页面级组件内），卸载时自动清理监听与类名。
 */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false)

  useEffect(() => createKeyboardWatcher({ win: window, doc: document, onChange: setOpen }), [])

  return open
}

export default useKeyboardOpen
