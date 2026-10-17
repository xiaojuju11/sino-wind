# -*- coding: utf-8 -*-
"""同步 portrait_libai_welcome 扩展名修正到文档生成脚本"""
import io, os

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EDITS = [
    # ① 图片来源存档生成器：规则里的工具描述
    (r"docs\素材来源存档\_gen.py",
     '"Google Stitch 导出；portrait_libai_welcome.jpg 被评审为「古画原作裁圆」"',
     '"Google Stitch 导出；portrait_libai_welcome.png 被评审为「古画原作裁圆」"'),
    # ② 图片来源存档生成器：新发现表第 5 条 —— 已修复，改为已解决
    (r"docs\素材来源存档\_gen.py",
     'md.append("| 5 | **portrait_libai_welcome.jpg 扩展名与实际格式不符** | 声明 .jpg，实际为 PNG（1024x1024）；本次审计读取时即报错 | 部分工具会读取失败 | 改名或重新编码 |")',
     'md.append("| 5 | ~~portrait_libai_welcome 扩展名不符~~ **已修复** | 原声明 .jpg，文件头为 PNG 签名（89 50 4E 47）；REVIEW.md 曾误判「实为 JPEG」 | 部分工具读取失败 | ✅ 已恢复为 .png 并加勘误说明 |")'),
    # ③ 素材来源包说明模板
    (r"docs\素材来源包\_readme.tpl.md",
     "且 `portrait_libai_welcome.jpg` 被评审判为「古画原作裁圆」但有疑义 —— 该图实为 1024×1024 的 PNG（扩展名标为 .jpg 与实际格式不符），尺寸与构图更接近 AI 生成，定性需确认。",
     "且 `portrait_libai_welcome.png` 被评审判为「古画原作裁圆」但有疑义 —— 该图实为 1024×1024 的 PNG，尺寸与构图更接近 AI 生成，定性需确认。"),
    # ④ 合规清单生成器
    (r"docs\交付物\gen3_素材与版权.py",
     '"assets/portrait_libai_welcome.jpg 被设计评审判为「写实古画原作裁圆」，但该图实为 1024×1024 的 PNG"',
     '"assets/portrait_libai_welcome.png 被设计评审判为「写实古画原作裁圆」，但该图实为 1024×1024 的 PNG"'),
    (r"docs\交付物\gen3_素材与版权.py",
     '"（扩展名标为 .jpg 与实际格式不符），尺寸与构图特征更接近 AI 生成，定性需团队确认。",',
     '"（尺寸与构图特征更接近 AI 生成，与「古画原作」的判断存在出入），定性需团队确认。"\n    "（附注：该文件此前因评审误判「实为 JPEG」被改名为 .jpg，已于 2026-10-17 核验文件头为 PNG 签名后恢复为 .png。）",'),
]

for rel, old, new in EDITS:
    p = os.path.join(D, rel)
    t = io.open(p, encoding="utf-8").read()
    if old in t:
        t = t.replace(old, new, 1)
        io.open(p, "w", encoding="utf-8").write(t)
        print("  ✅ " + rel + " : 已替换")
    else:
        print("  ⚠️ " + rel + " : 未匹配 → " + old[:60].replace("\n", "⏎"))
