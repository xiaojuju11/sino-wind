# -*- coding: utf-8 -*-
"""
打包「素材来源包」供转发：
· 图片按来源类别分文件夹（前缀 A/B/C… 保证顺序）
· 附：说明、登记表、清单 CSV、自包含 HTML（缩略图内嵌，换机也能看）
· 截图另打一包（体积大且与版权审查无关）
"""
import io, json, os, shutil, csv, base64, zipfile
from PIL import Image

ROOT = r"D:\sino-wind-taskB"
OUT = os.path.join(ROOT, "docs", "素材来源包")
PKG = os.path.join(OUT, "云山竹简-素材来源包-20261017")
SHOTS = os.path.join(OUT, "云山竹简-界面截图-20261017")

inv = json.loads(io.open(os.path.join(ROOT, "proof", "_img-inventory.json"), encoding="utf-8").read())
usage = {u["rel"]: u for u in json.loads(io.open(os.path.join(ROOT, "proof", "_img-usage.json"), encoding="utf-8").read())}

# ── 与 _gen.py 一致的归类规则 ──
RULES = [
    ("frontend/public/assets/scholar-scenes/", "A", "AI生成-团队自有", "内置 ImageGen（含逐图提示词）"),
    ("frontend/public/images/decor/recovery-xuan-paper-v1.jpg", "A", "AI生成-团队自有", "image_gen（含提示词）"),
    ("frontend/public/assets/guancang/", "B", "AI生成-人工精修", "Midjourney v6 → 人工去噪/抠图/羽化/压缩"),
    ("frontend/public/assets/shuzhai/", "B", "AI生成-人工精修", "Midjourney v6 → 人工精修"),
    ("frontend/public/assets/home/", "A", "AI生成-团队自有", "AI 生成后人工切图"),
    ("frontend/public/logo.svg", "C", "团队自制", "手写 SVG（宣纸渐变 + 印章）"),
    ("docs/design/cankao/", "D", "第三方参考稿-不进产品", "队长提供的审美基准（原始名：微信图片_*.png）"),
    ("docs/design/phase3/", "E", "AI设计稿-不进产品", "Google Stitch 导出 / 含古画类素材"),
    ("proof/", "Z", "界面截图", "CDP 脚本截图"),
    ("docs/handovers/img/", "Z", "界面截图", "手动截图"),
]


def classify(rel):
    for prefix, order, folder, tool in RULES:
        if rel.startswith(prefix):
            return order, folder, tool
    return "Y", "待确认", "未记录"


# ── 清理并建立目录 ──
if os.path.exists(PKG):
    shutil.rmtree(PKG)
os.makedirs(PKG)
os.makedirs(SHOTS)

rows = []
for it in inv:
    rel = it["rel"]
    order, folder, tool = classify(rel)
    src = os.path.join(ROOT, rel)
    if not os.path.exists(src):
        continue
    u = usage.get(rel, {})
    kind = u.get("kind", "doc")
    usage_txt = {"exact": "静态引用 %d 处" % len(u.get("hits", [])),
                 "dynamic": "动态引用（按诗人 key 拼路径）",
                 "unused": "零引用",
                 "doc": "文档/证据"}.get(kind, "-")
    rows.append(dict(rel=rel, kb=it["kb"], order=order, folder=folder,
                     tool=tool, usage=usage_txt, kind=kind))

# 排序：素材包按 A→E，截图归另一包
material = [r for r in rows if r["order"] != "Z"]
shots = [r for r in rows if r["order"] == "Z"]

# ── 复制素材（保留类别子目录结构）──
copied = []
for r in material:
    src = os.path.join(ROOT, r["rel"])
    # 在类别文件夹内还原原始子路径（如 assets/guancang/xxx.png）
    sub = r["rel"].replace("frontend/public/", "").replace("docs/design/", "")
    sub = sub.replace(":", "_")
    dst = os.path.join(PKG, "素材", "%s-%s" % (r["order"], r["folder"]), sub)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    r["dst"] = os.path.relpath(dst, PKG).replace("\\", "/")
    copied.append(r)

for r in shots:
    src = os.path.join(ROOT, r["rel"])
    dst = os.path.join(SHOTS, os.path.basename(r["rel"]))
    shutil.copy2(src, dst)

print("  素材 %d 张，截图 %d 张" % (len(copied), len(shots)))

# ── CSV 清单 ──
csv_path = os.path.join(PKG, "图片来源清单.csv")
with io.open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["序号", "来源类别", "生成/来源工具", "文件名", "原始路径", "体积KB", "引用状态", "包内路径"])
    for i, r in enumerate(sorted(copied, key=lambda x: (x["order"], x["rel"])), 1):
        w.writerow([i, r["folder"], r["tool"], os.path.basename(r["rel"]),
                    r["rel"], r["kb"], r["usage"], r["dst"]])
print("  ✅ 图片来源清单.csv")

# ── 自包含 HTML（缩略图内嵌 base64，换机可看）──
def thumb_b64(path, max_side=460, quality=72):
    """生成内嵌缩略图 data URI。
    ⚠️ SVG 不能用 Pillow 转 JPEG（会直接失败，缩略图为空）——单独按原始 SVG 内嵌。
    """
    if path.lower().endswith(".svg"):
        try:
            raw = io.open(path, "rb").read()
            return "data:image/svg+xml;base64," + base64.b64encode(raw).decode()
        except Exception:
            return ""
    try:
        im = Image.open(path).convert("RGB")
        im.thumbnail((max_side, max_side), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=quality, optimize=True)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        print("     ⚠️ 缩略图生成失败:", os.path.basename(path), e)
        return ""


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


FOLDERS = {}
for r in copied:
    # ⚠️ 只按「类别」分组。若把 tool 也作为键，同一类别会因工具不同被拆成多段
    #    （曾出现 A-AI生成 被拆成 3 段的问题）
    FOLDERS.setdefault((r["order"], r["folder"]), []).append(r)

h = ["<!doctype html><html lang='zh-CN'><head><meta charset='utf-8'>",
     "<title>云山竹简 · 素材来源包</title><style>"]
h.append("""
*{box-sizing:border-box}body{margin:0;padding:26px 20px 60px;background:#F7F4EB;color:#2B2B2B;
font-family:"Songti SC","SimSun",serif;line-height:1.65}
h1{font-size:25px;color:#8A2B2B;margin:0 0 4px}
.sub{color:#6B675B;font-size:13px;margin-bottom:16px}
.stats{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 20px}
.stat{background:#fff;border:1px solid rgba(197,155,39,.5);border-radius:10px;padding:9px 15px}
.stat b{display:block;font-size:19px;color:#8A2B2B}.stat span{font-size:12px;color:#6B675B}
h2{font-size:16px;color:#2D5A3F;margin:30px 0 10px;padding-bottom:6px;border-bottom:2px solid rgba(197,155,39,.45)}
table{border-collapse:collapse;width:100%;font-size:12.5px;background:#fff;margin-bottom:14px}
th{background:#8A2B2B;color:#fff;padding:7px 10px;text-align:left}
td{border:1px solid #E9DEDB;padding:6px 10px;vertical-align:top}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.card{background:#fff;border:1px solid rgba(197,155,39,.42);border-radius:11px;overflow:hidden;
box-shadow:0 2px 7px rgba(90,44,30,.07);display:flex;flex-direction:column}
.thumb{height:150px;background:#EFEBE1 center/contain no-repeat;border-bottom:1px solid rgba(197,155,39,.22)}
.body{padding:8px 10px 10px;font-size:11.5px}
.path{font-family:Consolas,monospace;font-size:10.5px;word-break:break-all;color:#2B2B2B}
.meta{color:#6B675B;font-size:10.5px;margin-top:3px}
.use{margin-top:4px;color:#2D5A3F}.use.none{color:#B4701A;font-weight:bold}
.notice{background:#FDF6E3;border-left:4px solid #C59B27;padding:11px 15px;border-radius:6px;font-size:13px;margin:14px 0}
""")
h.append("</style></head><body>")
h.append("<h1>云山竹简 · 华风雅集 —— 素材来源包</h1>")
h.append("<div class='sub'>按来源类别归档 · 本页图片已内嵌，可脱离原始工程单独打开</div>")

h.append("<div class='stats'>")
h.append("<div class='stat'><b>%d</b><span>素材张数</span></div>" % len(copied))
h.append("<div class='stat'><b>%.1f MB</b><span>素材体积</span></div>" % (sum(r["kb"] for r in copied) / 1024))
h.append("<div class='stat'><b>%d</b><span>来源类别</span></div>" % len(FOLDERS))
h.append("<div class='stat'><b>%d</b><span>界面截图（另包）</span></div>" % len(shots))
h.append("</div>")

h.append("<div class='notice'><b>本包结论（2026-10-17 团队确认）</b><br>"
         "① 阿里 Iconfont 双库图标 = 团队自行上传，授权归团队<br>"
         "② assets/home 底图与四雅插画 = <b>AI 生成</b>（此前「用户提供底图」口径作废）<br>"
         "③ assets/guancang、assets/shuzhai 插画 = <b>AI 插画</b>（AI 生成 + 人工精修，非古画扫描件）<br>"
         "④ 字体全部为操作系统自带，无字体文件；音频为零（配乐为 Web Audio 代码合成）</div>")

for (order, folder), items in sorted(FOLDERS.items()):
    tools = sorted({x["tool"] for x in items})
    h.append("<h2>%s-%s · %d 张</h2>" % (order, esc(folder), len(items)))
    h.append("<table><tr><th style='width:96px'>生成/来源工具</th><td>%s</td></tr></table>"
             % esc("；".join(tools)))
    h.append("<div class='grid'>")
    for r in sorted(items, key=lambda x: x["rel"]):
        b64 = thumb_b64(os.path.join(ROOT, r["rel"]))
        bg = "background-image:url('%s')" % b64 if b64 else ""
        h.append("<div class='card'>")
        h.append("<div class='thumb' style=\"%s\"></div>" % bg)
        h.append("<div class='body'>")
        h.append("<div class='path'>%s</div>" % esc(r["rel"].replace("frontend/public/", "").replace("docs/", "")))
        h.append("<div class='meta'>%dKB · %s</div>" % (r["kb"], esc(r["usage"])))
        h.append("<div class='use%s'>%s</div>" % (" none" if r["kind"] == "unused" else "", esc(r["usage"])))
        h.append("</div></div>")
    h.append("</div>")

h.append("</body></html>")
html_path = os.path.join(PKG, "素材来源存档-可独立打开.html")
io.open(html_path, "w", encoding="utf-8").write("\n".join(h))
print("  ✅ 素材来源存档-可独立打开.html  (%.1f MB)" % (os.path.getsize(html_path) / 1048576))

# ── 00-先看这里.md ──
cnt = {}
for r in copied:
    cnt[r["folder"]] = cnt.get(r["folder"], 0) + 1
readme = io.open(os.path.join(ROOT, "docs", "素材来源包", "_readme.tpl.md"), encoding="utf-8").read()
readme = readme.replace("{{DATE}}", "2026-10-17")
readme = readme.replace("{{TOTAL}}", str(len(copied)))
readme = readme.replace("{{SIZE}}", "%.1f" % (sum(r["kb"] for r in copied) / 1024))
readme = readme.replace("{{SHOTS}}", str(len(shots)))
tbl = "\n".join("| %s | %d | %s |" % (k, v, next(x["tool"] for x in copied if x["folder"] == k)) for k, v in sorted(cnt.items()))
readme = readme.replace("{{TABLE}}", tbl)
io.open(os.path.join(PKG, "00-先看这里.md"), "w", encoding="utf-8").write(readme)
print("  ✅ 00-先看这里.md")
