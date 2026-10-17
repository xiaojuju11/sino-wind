# -*- coding: utf-8 -*-
"""修正 TRD 中过期的技术版本号（与实际 package.json 对齐）"""
import io, os

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs")
p = os.path.join(D, "TRD_GUFENG_OVERHAUL.md")
t = io.open(p, encoding="utf-8").read()
orig = t

PAIRS = [
    ("【后端服务层 Server (Koa 2)】", "【后端服务层 Server (Koa 3)】"),
    ("| **前端框架** | React | `v19.0.0` |", "| **前端框架** | React | `v19.2.0` |"),
    ("| **UI 组件库**| Ant Design Mobile | `v5.39.0` |", "| **UI 组件库**| Ant Design Mobile | `v5.42.3` |"),
    ("| **样式预处理**| Less | `v4.2.0` |", "| **样式预处理**| Less | `v4.5.1` |"),
    ("| **后端框架** | Koa 2 | `v2.15.0` |", "| **后端框架** | Koa | `v3.1.1` |"),
    ("1. **启动后端服务 (Koa 2)**：", "1. **启动后端服务 (Koa 3)**："),
]

n = 0
for old, new in PAIRS:
    if old in t:
        t = t.replace(old, new, 1)
        n += 1
    else:
        print("  ⚠️ 未匹配:", old[:60])

# 在版本表后加一条勘误说明
anchor = "| **后端框架** | Koa | `v3.1.1` |"
addition = (anchor + "\n\n"
            "> **版本勘误（2026-10-17）**：本表此前记录的 `React v19.0.0`、`Ant Design Mobile v5.39.0`、"
            "`Less v4.2.0`、`Koa 2 / v2.15.0` 为立项初期的规划版本，实际落地版本为 "
            "React 19.2、Ant Design Mobile 5.42.3、Less 4.5.1、Koa 3.1.1（Vite 7.2.4）。"
            "已按 `package.json` 实际安装版本更正；后续如再升级请同步本表。")
if anchor in t and "版本勘误（2026-10-17）" not in t:
    t = t.replace(anchor, addition, 1)

io.open(p, "w", encoding="utf-8").write(t)
print("  已修正 %d 处版本号，文件长度 %d → %d" % (n, len(orig), len(t)))
