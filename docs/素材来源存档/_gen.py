# -*- coding: utf-8 -*-
"""
生成《图片来源登记表》(md) 与可视化《图片来源存档》(html)
数据：proof/_img-inventory.json（文件清单）+ proof/_img-usage.json（精确引用判定，实测）
来源判定：各 handover 文档原文，逐条给出行号
"""
import io, json, os
from PIL import Image

ROOT = r"D:\sino-wind-taskB"
OUT = os.path.join(ROOT, "docs", "素材来源存档")
os.makedirs(OUT, exist_ok=True)

inv = json.loads(io.open(os.path.join(ROOT, "proof", "_img-inventory.json"), encoding="utf-8").read())
usage = json.loads(io.open(os.path.join(ROOT, "proof", "_img-usage.json"), encoding="utf-8").read())
umap = {u["rel"]: u for u in usage}


def dims(rel):
    try:
        im = Image.open(os.path.join(ROOT, rel))
        return "%dx%d" % im.size
    except Exception:
        return "-"


# ══════════════ 来源归类（依据实测证据）══════════════
# (前缀, 类别, 工具, 证据, 版权判定, 待办)
RULES = [
    ("frontend/public/assets/scholar-scenes/", "AI 生成（团队自有）", "内置 ImageGen",
     "frontend/public/assets/scholar-scenes/README.md:3（含逐图提示词）；docs/handovers/ai-log-liuxia-2026-10-14-visual-polish.md:15",
     "无第三方版权（文生图，未以第三方图片作输入）；需按 AIGC 规范标注", "界面落 AIGC 标识"),

    ("frontend/public/images/decor/recovery-xuan-paper-v1.jpg", "AI 生成（团队自有）", "image_gen",
     "docs/handovers/ai-log-liuxia-2026-10-16-visual-refine.md:19（含提示词与压缩参数）",
     "无第三方版权（文生图）；需按 AIGC 规范标注", "界面落 AIGC 标识"),

    ("frontend/public/assets/guancang/", "AI 生成 + 人工精修", "Midjourney v6 → 人工去噪/抠图/羽化/压缩",
     "docs/handovers/ai-log-C-literati.md:28（Midjourney v6 提示词）、:40（对 AI 原生生成素材去噪羽化）、:42（工程化裁剪）；"
     "2026-10-17 团队书面确认定性为「AI 插画」",
     "无第三方版权（AI 生成 + 人工加工）；需按 AIGC 规范标注",
     "界面落 AIGC 标识"),

    ("frontend/public/assets/shuzhai/", "AI 生成 + 人工精修", "Midjourney v6 → 人工精修",
     "docs/handovers/ai-log-C-literati.md:28,40,42（与 guancang 同批产出）；2026-10-17 团队确认同为 AI 生成",
     "无第三方版权；需按 AIGC 规范标注", "核实 Midjourney 订阅层级"),

    ("frontend/public/assets/home/", "AI 生成（团队自有）", "AI 生成后人工切图",
     "2026-10-17 团队书面确认：五张底图与四雅插画均为 AI 生成（此前的「用户提供底图」与「团队 AI 设计稿切图」两种口径已统一为 AI 生成）",
     "无第三方版权（文生图）；需按 AIGC 规范标注",
     "界面落 AIGC 标识；核实生成时使用的模型与订阅层级"),

    ("frontend/public/assets/auth/", "团队/用户提供画稿", "未记录生成工具",
     "docs/handovers/dev-A-auth.md:67（改用用户提供的登录、注册画稿）；同文自述「原作者、生成工具及使用授权仍需团队确认」",
     "⚠️ 授权未书面确认；且实测这两张图在产品代码中零引用", "确认授权；建议直接从交付包移除（4.2MB）"),

    ("frontend/public/assets/common/bg_guofeng.jpg", "待确认（且已停用）", "未记录",
     "全仓无来源声明；⚠️ 实测产品代码零引用——全站背景已改为纯 CSS 渐变（frontend/src/styles/app.less:6-9），文档中「全站统一背景」的说法已过期",
     "⚠️ 来源不明。因已停用，移除即可消除该风险", "建议删除该文件并更正文档"),

    ("frontend/public/logo.svg", "团队自制", "手写 SVG（宣纸渐变 + 印章图形）",
     "内容为手写 SVG 结构，无第三方图形库痕迹；被 index.html:9,10 与 manifest.json:16 引用",
     "团队自有", "无"),

    ("frontend/public/vite.svg", "团队自制（疑似复制残留）", "手写 SVG，与 logo.svg 仅差 2 字节",
     "与 logo.svg 结构一致（5420 vs 5422 字节）；实测产品代码零引用",
     "团队自有，但为未使用文件", "建议删除（避免被误认为 Vite 官方 logo）"),

    ("docs/design/cankao/", "第三方 / 队长提供（不进产品）", "未记录；原始文件名为「微信图片_2026-10-12_*.png」",
     "docs/design/cankao/README.md:1-12（队长提供的审美基准参考图，仅作出图对齐）",
     "⚠️ 原始来源与授权未书面确认；文档已禁止放入 frontend/public/", "补授权说明；确认不进交付包"),

    ("docs/design/phase3/", "AI 设计稿 / 含古画素材（不进产品）", "Google Stitch 导出；portrait_libai_welcome.png 被评审判为「古画原作裁圆」",
     "docs/design/phase3/REVIEW.md（判定先贤头像为写实古画原作裁圆、立绘为彩色古画，要求替换为团队自有写意水墨）",
     "⚠️ 古画类若确为扫描件属公有领域（宋画逾千年）但须标出处；Stitch 导出稿含 fonts.googleapis.com 外链",
     "确认不进交付包，或清理外链并标注古画出处"),

    ("proof/", "团队自摄截图（自动化）", "Chrome DevTools Protocol 脚本截图",
     "由 proof/ 下脚本在本地构建产物上截取；内容为本项目界面",
     "无第三方版权", "无"),

    ("docs/handovers/img/", "团队自摄截图（手动）", "手动截图", "docs/FRONTEND_VERIFICATION.md 引用",
     "无第三方版权", "无"),

    ("ChatGPT 图像", "ChatGPT 生成（误落入仓库，与项目无关）",
     "ChatGPT（OpenAI 图像生成）",
     "文件名为 ChatGPT 默认导出命名；创建时间 2026-10-17 16:01:57；全仓零代码引用；"
     "内容为卡通花苞角色，与项目宋韵国风视觉体系无关",
     "⚠️ 非项目素材。若不慎提交将把无关的第三方 AI 生成物带入交付物",
     "确认用途；若无用途请从仓库根目录移除，并加入 .gitignore 规则防误提交"),
]


# 本次已执行的处置清单（删除记录）
DISPOSED = [
    ('frontend/public/assets/auth/reference-login.png', '授权未书面确认，且产品代码零引用（阶段一画稿已被替换）', 2193),
    ('frontend/public/assets/auth/reference-register.png', '同上', 2092),
    ('frontend/public/assets/common/bg_guofeng.jpg', '全站背景已改为纯 CSS 三层渐变，该图零引用，文档说法过期', 293),
    ('frontend/public/assets/guancang/guancang_header_bg.png', '零引用，且文档无启用计划', 441),
    ('frontend/public/assets/guancang/sage-libai-full-v2.png', '为叠加场景生成但始终未接线，零引用（全站最大单图）', 2390),
    ('frontend/public/assets/guancang/scroll_lundao.png', '零引用；同名 .jpg 已在 AIPage 使用，PNG 为重复', 420),
    ('frontend/public/assets/guancang/scroll_tingyin.png', '同上', 391),
    ('frontend/public/assets/home/bg-paper.jpg', '阶段一切图素材，背景改纯 CSS 后零引用', 159),
    ('frontend/public/assets/home/poem-art.jpg', '阶段一切图素材，零引用', 2),
    ('frontend/public/assets/home/yaji-appraise.jpg', '阶段一四雅插画，当前首页改用 CSS 与 Iconfont，零引用', 19),
    ('frontend/public/assets/home/yaji-debate.jpg', '同上', 23),
    ('frontend/public/assets/home/yaji-leisure.jpg', '同上', 23),
    ('frontend/public/assets/home/yaji-poem.jpg', '同上', 25),
    ('frontend/public/vite.svg', '非 Vite 官方 logo（与 logo.svg 近乎相同），零引用且易误解来源', 5),
    ('ChatGPT 图像 2026年10月17日 16_01_50.jpg', 'ChatGPT 误落仓库根目录，与项目视觉体系无关，零引用', 64),
]


def classify(rel):
    for prefix, cat, tool, evi, right, todo in RULES:
        if rel.startswith(prefix):
            return dict(cat=cat, tool=tool, evi=evi, right=right, todo=todo)
    return dict(cat="待确认", tool="未记录", evi="未找到来源声明", right="⚠️ 来源不明", todo="补充来源")


rows = []
for it in inv:
    rel = it["rel"]
    c = classify(rel)
    u = umap.get(rel, {"hits": [], "dyn": [], "kind": ""})
    kind = u.get("kind", "")
    if not kind:
        # proof / docs 截图不在 usage 表内，标为文档引用
        kind = "doc"
    rows.append(dict(rel=rel, kb=it["kb"], dims=dims(rel),
                     kind=kind, hits=u.get("hits", []), dyn=u.get("dyn", []), **c))

KIND_LABEL = {"exact": "静态引用", "dynamic": "动态引用", "unused": "零引用", "doc": "文档/证据"}
unused = [r for r in rows if r["kind"] == "unused"]
prod = [r for r in rows if r["rel"].startswith("frontend/public")]

# ══════════════ Markdown ══════════════
md = []
md.append("# 项目图片来源登记表\n")
md.append("> 引用关系由 `proof/diag-image-inventory.mjs` 与 `proof/diag-image-usage.mjs` 实测得出；")
md.append("> 来源判定逐条附证据文档与行号。凡证据不足者标「待确认」，不作推断。\n")

md.append("## 统计概览\n")
md.append("| 项 | 数值 |")
md.append("| :--- | ---: |")
md.append("| 图片总数 | %d 张 |" % len(rows))
md.append("| 总占用 | %.1f MB |" % (sum(r["kb"] for r in rows) / 1024))
md.append("| 产品素材（frontend/public） | %d 张 / %.1f MB |" % (len(prod), sum(r["kb"] for r in prod) / 1024))
md.append("| **其中零引用（可删）** | **%d 张 / %.1f MB** |" % (len(unused), sum(r["kb"] for r in unused) / 1024))
md.append("")

md.append("\n## 一、按来源类别总览\n")
md.append("| 来源类别 | 数量 | 生成/来源工具 | 版权判定 | 待办 |")
md.append("| :--- | ---: | :--- | :--- | :--- |")
seen = set()
for r in rows:
    if r["cat"] in seen:
        continue
    seen.add(r["cat"])
    n = sum(1 for x in rows if x["cat"] == r["cat"])
    md.append("| %s | %d | %s | %s | %s |" % (r["cat"], n, r["tool"], r["right"], r["todo"]))
md.append("")

md.append("\n## 二、零引用台账\n")
if unused:
    md.append("以下 %d 张图在产品代码中**无任何引用**，合计 %.1f MB。\n"
              % (len(unused), sum(r["kb"] for r in unused) / 1024))
else:
    md.append("**当前为零**：产品素材 %d 张全部在代码中有效引用（静态 %d 张 + 动态 %d 张），无冗余文件。\n"
              % (len([r for r in prod if r["kind"] in ("exact", "dynamic")]),
                 len([r for r in prod if r["kind"] == "exact"]),
                 len([r for r in prod if r["kind"] == "dynamic"])))
    md.append("> 本次审计开始时曾有 14 张零引用（8.3MB），已在第六节记录并全部删除。\n")
md.append("| 文件 | 体积 | 来源 | 建议 |")
md.append("| :--- | ---: | :--- | :--- |")
SUGGEST = {
    "reference-login": "删除（授权未确认且已停用）",
    "reference-register": "删除（授权未确认且已停用）",
    "bg_guofeng": "删除（来源不明且已改纯 CSS 背景）",
    "vite.svg": "删除（非 Vite 官方 logo，易误解）",
    "sage-libai-full-v2": "确认是否被动态引用；否则删除（2.4MB，最大单图）",
    "scroll_lundao.png": "删除（同名 .jpg 已在用，PNG 为重复）",
    "scroll_tingyin.png": "删除（同名 .jpg 已在用，PNG 为重复）",
    "guancang_header_bg": "确认是否计划使用；否则删除",
    "bg-paper": "删除（背景已改纯 CSS 渐变）",
    "poem-art": "删除（2KB 未被引用）",
    "yaji-": "确认四雅插画是否计划启用；否则删除",
}
for r in unused:
    sug = "确认后处置"
    for k, v in SUGGEST.items():
        if k in r["rel"]:
            sug = v
            break
    md.append("| `%s` | %dKB | %s | %s |" % (r["rel"], r["kb"], r["cat"], sug))
md.append("")

md.append("\n## 三、逐张明细\n")
md.append("| # | 文件 | 尺寸 | 体积 | 引用 | 来源 | 版权状态 |")
md.append("| ---: | :--- | :--- | ---: | :--- | :--- | :--- |")
for i, r in enumerate(rows, 1):
    ref = KIND_LABEL.get(r["kind"], r["kind"])
    if r["kind"] == "exact":
        ref = "静态 %d 处" % len(r["hits"])
    md.append("| %d | `%s` | %s | %dKB | %s | %s | %s |"
              % (i, r["rel"], r["dims"], r["kb"], ref, r["cat"], r["right"]))
md.append("")

md.append("\n## 四、证据链（每组来源的原文出处）\n")
for prefix, cat, tool, evi, right, todo in RULES:
    n = sum(1 for x in rows if x["rel"].startswith(prefix))
    if not n:
        continue
    md.append("\n### %s（%d 张）\n" % (prefix.rstrip('/'), n))
    md.append("- **来源类别**：%s" % cat)
    md.append("- **生成/来源工具**：%s" % tool)
    md.append("- **证据**：%s" % evi)
    md.append("- **版权判定**：%s" % right)
    md.append("- **待办**：%s" % todo)

md.append("\n## 五、本次审计新发现（须团队处置）\n")
md.append("| # | 发现 | 证据 | 影响 | 建议 |")
md.append("| ---: | :--- | :--- | :--- | :--- |")
md.append("| 1 | **14 张图 / 8.3MB 在产品代码中零引用** | proof/diag-image-usage.mjs 实测 | 体积浪费；其中含授权存疑素材 | 按第二节台账处置 |")
md.append("| 2 | **全站背景已改为纯 CSS 渐变**，文档仍称「全站统一使用 bg_guofeng.jpg」 | frontend/src/styles/app.less:6-9 为三层 gradient，无图片引用 | 文档过期；该图 293KB 亦零引用 | 删图并更正文档 |")
md.append("| 3 | **guancang 立绘同时存在 .jpg 与 .png 两份** | AIPage.jsx 用 .jpg；InviteDrawer/LetterList/ScholarChat 用 .png；scroll_lundao.png 与 scroll_tingyin.png 零引用 | 冗余 811KB | 删除零引用的两份 PNG |")
md.append("| 4 | **同一作者两份文档对 guancang 定性矛盾** | ai-log-C-literati.md:28,40 称 Midjourney 生成；dev-C-literati.md:18,23 称「高清真迹立绘」「真迹画卷」 | 申报口径不一致 | 统一为「AI 生成 + 人工精修」，删除「真迹」措辞 |")
md.append("| 5 | ~~portrait_libai_welcome 扩展名不符~~ **已修复** | 原声明 .jpg，文件头为 PNG 签名（89 50 4E 47）；REVIEW.md 曾误判「实为 JPEG」 | 部分工具读取失败 | ✅ 已恢复为 .png 并加勘误说明 |")
md.append("| 6 | **该图被评审判为「古画原作裁圆」，视觉判断更可能是 AI 生成** | REVIEW.md 记载 vs 图片为 1024x1024 标准生成尺寸、构图干净、含书法与印章 | 若确为古画需标出处；若为 AI 需标 AIGC | 团队确认后统一口径 |")
md.append("| 7 | **产品内先贤立绘经目视确认为数字插画** | 抽查 guancang/sage_libai.png：均匀线宽、干净数字绘线、含「李白」铭牌，非古画扫描 | 支持「AI 生成」定性 | 按 AI 生成申报并加 AIGC 标识 |")
md.append("")

md.append("\n## 六、处置记录（本次审计后已执行）\n")
md.append("审计发现 14 张零引用图片与 1 张误落文件（合计 15 个、%.1f MB），经确认后已全部删除。"
          "所有文件均保留在 Git 历史中，如需恢复可执行 `git checkout <提交> -- <路径>`。\n"
          % (sum(d[2] for d in DISPOSED) / 1024))
md.append("| # | 文件 | 体积 | 删除理由 |")
md.append("| ---: | :--- | ---: | :--- |")
for i, (rel, reason, kb) in enumerate(DISPOSED, 1):
    md.append("| %d | `%s` | %dKB | %s |" % (i, rel, kb, reason))
md.append("")
md.append("**删除后的验证**：生产构建通过（0 报错）；`dist` 内图片由 40 个降至 29 个且全部为在用素材；"
          "对 5 个主要页面（雅集/知音/书斋/识器/诗词）做运行时检查，破损图片 0、HTTP 失败请求 0、运行时异常 0。\n")
md.append("**另加防误提交规则**：`.gitignore` 新增 `ChatGPT 图像*`、`ChatGPT Image*`、`DALL·E*`、`Midjourney_*` 四条，"
          "避免 AI 出图工具的默认导出文件再次误落仓库根目录。\n")

md.append("\n## 七、关于生成式 AI 素材的商用条款（需团队核实）\n")
md.append("本作品用到的生成式图像工具包括 Midjourney v6、GPT Image、内置 ImageGen/image_gen、Google Stitch。"
          "这些工具的产出物能否商用、归属如何，取决于使用时账号的订阅层级与当期服务条款。\n")
md.append("- 本项目为**参赛与教学演示**用途，非商业发行。\n")
md.append("- **仍需团队核实并留档**：① 生成时使用的 Midjourney 账号是否为付费订阅（免费试用版产出通常不允许商用）；"
          "② GPT Image / ImageGen 由哪个平台账号生成、该平台的产出归属条款；③ 若后续对外发布，需复核全部条款。\n")
md.append("- 本次审计**未能**访问 Midjourney 与 OpenAI 官方条款页（网络策略拦截），故此处不给结论，只列需核实项。\n")

io.open(os.path.join(OUT, "图片来源登记表.md"), "w", encoding="utf-8").write("\n".join(md))
print("  ✅ 图片来源登记表.md")

# ══════════════ HTML 存档 ══════════════
def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;"))

BADGE = {"AI 生成（团队自有）": "b-ai", "AI 生成 + 人工精修": "b-ai",
         "AI 生成（团队自有）": "b-ai", "团队/用户提供画稿": "b-team",
         "待确认": "b-warn", "待确认（且已停用）": "b-warn",
         "团队自制": "b-own", "团队自制（疑似复制残留）": "b-own",
         "第三方 / 队长提供（不进产品）": "b-ref", "AI 设计稿 / 含古画素材（不进产品）": "b-ref",
         "团队自摄截图（自动化）": "b-shot", "团队自摄截图（手动）": "b-shot",
         "ChatGPT 生成（误落入仓库，与项目无关）": "b-warn"}

h = ["<!doctype html><html lang='zh-CN'><head><meta charset='utf-8'>",
     "<title>项目图片来源存档 · 云山竹简</title><style>"]
h.append("""
*{box-sizing:border-box}
body{margin:0;padding:28px 22px 60px;background:#F7F4EB;color:#2B2B2B;
     font-family:"Songti SC","SimSun",serif;line-height:1.65}
h1{font-size:26px;color:#8A2B2B;margin:0 0 6px;letter-spacing:.04em}
.sub{color:#6B675B;font-size:13px;margin-bottom:16px}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 22px}
.stat{background:#fff;border:1px solid rgba(197,155,39,.5);border-radius:10px;
      padding:10px 16px;box-shadow:0 1px 3px rgba(90,44,30,.08);min-width:110px}
.stat b{display:block;font-size:20px;color:#8A2B2B}
.stat span{font-size:12px;color:#6B675B}
.stat.warn b{color:#B4701A}
h2{font-size:17px;color:#2D5A3F;margin:34px 0 12px;padding-bottom:6px;
   border-bottom:2px solid rgba(197,155,39,.45)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(236px,1fr));gap:16px}
.card{background:#fff;border:1px solid rgba(197,155,39,.42);border-radius:12px;overflow:hidden;
      box-shadow:0 2px 8px rgba(90,44,30,.07);display:flex;flex-direction:column}
.card.unused{border-color:rgba(180,112,26,.75);box-shadow:0 0 0 2px rgba(180,112,26,.14)}
.thumb{height:168px;background:#EFEBE1 center/contain no-repeat;border-bottom:1px solid rgba(197,155,39,.25)}
.card.unused .thumb{background-color:#FBF0DE}
.body{padding:10px 12px 12px;font-size:12px;display:flex;flex-direction:column;gap:5px;flex:1}
.path{font-family:Consolas,monospace;font-size:11px;word-break:break-all}
.meta{color:#6B675B;font-size:11px}
.badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;color:#fff;align-self:flex-start}
.b-ai{background:#8A2B2B}.b-team{background:#2D5A3F}.b-warn{background:#B4701A}
.b-own{background:#203A4C}.b-ref{background:#6B675B}.b-shot{background:#4A7C59}
.use{font-size:11px;color:#2D5A3F}
.use.none{color:#B4701A;font-weight:bold}
.right{font-size:11px;color:#6B675B;border-top:1px dashed rgba(138,43,43,.18);padding-top:6px;margin-top:auto}
.notice{background:#FDF6E3;border-left:4px solid #C59B27;padding:12px 16px;border-radius:6px;font-size:13px;margin:16px 0}
table{border-collapse:collapse;width:100%;font-size:12.5px;margin:10px 0 6px;background:#fff}
th{background:#8A2B2B;color:#fff;padding:8px 10px;text-align:left;font-weight:600}
td{border:1px solid #E9DEDB;padding:7px 10px;vertical-align:top}
tr:nth-child(even) td{background:#FCFAF5}
""")
h.append("</style></head><body>")
h.append("<h1>项目图片来源存档</h1>")
h.append("<div class='sub'>《云山竹简 · 华风雅集》 · 逐张标注来源、引用状态与版权判定 · 依据实测审计生成</div>")

h.append("<div class='stats'>")
h.append("<div class='stat'><b>%d</b><span>图片总数</span></div>" % len(rows))
h.append("<div class='stat'><b>%.1f MB</b><span>总占用</span></div>" % (sum(r["kb"] for r in rows) / 1024))
h.append("<div class='stat'><b>%d</b><span>产品素材</span></div>" % len(prod))
h.append("<div class='stat warn'><b>%d</b><span>零引用（可删）</span></div>" % len(unused))
h.append("<div class='stat warn'><b>%.1f MB</b><span>零引用占用</span></div>" % (sum(r["kb"] for r in unused) / 1024))
h.append("<div class='stat'><b>%d</b><span>来源类别</span></div>" % len(seen))
h.append("</div>")

h.append("<div class='notice'><b>两个关键结论</b><br>"
         "① <b>%d 张 / %.1f MB 的图片在产品代码中零引用</b>，其中包含授权未确认的两张登录注册画稿（约 4.2MB）；"
         "删除即可同时消除版权不确定与体积浪费。<br>"
         "② <b>全站背景已改为纯 CSS 渐变</b>（app.less:6-9），文档中「全站统一使用 bg_guofeng.jpg」的说法已过期，该文件亦零引用。"
         "</div>" % (len(unused), sum(r["kb"] for r in unused) / 1024))

# 零引用专区
if unused:
    h.append("<h2>★ 零引用台账 · %d 张 / %.1f MB</h2>" % (len(unused), sum(r["kb"] for r in unused) / 1024))
    h.append("<table><tr><th>文件</th><th style='width:78px'>体积</th><th style='width:150px'>建议处置</th></tr>")
    for r in unused:
        sug = "确认后处置"
        for k, v in SUGGEST.items():
            if k in r["rel"]:
                sug = v
                break
        h.append("<tr><td><code>%s</code></td><td>%dKB</td><td>%s</td></tr>" % (esc(r["rel"]), r["kb"], esc(sug)))
    h.append("</table>")

ORDER = ["AI 生成（团队自有）", "AI 生成 + 人工精修",
         "团队/用户提供画稿", "待确认", "待确认（且已停用）", "团队自制",
         "团队自制（疑似复制残留）", "第三方 / 队长提供（不进产品）",
         "AI 设计稿 / 含古画素材（不进产品）",
         "团队自摄截图（自动化）", "团队自摄截图（手动）",
         "ChatGPT 生成（误落入仓库，与项目无关）"]
# ⚠️ ORDER 必须覆盖 classify() 可能产出的全部类别名，否则该组卡片不会被渲染
#    （曾因改名后未同步 ORDER，导致 26 张截图静默丢失）
_missing = [r for r in rows if r["cat"] not in ORDER]
if _missing:
    raise SystemExit("ORDER 缺少类别: %s" % sorted({r["cat"] for r in _missing}))
for cat in ORDER:
    group = [r for r in rows if r["cat"] == cat]
    if not group:
        continue
    h.append("<h2>%s · %d 张</h2>" % (esc(cat), len(group)))
    r0 = group[0]
    h.append("<table><tr><th style='width:96px'>生成/来源工具</th><td>%s</td></tr>"
             "<tr><th>证据出处</th><td>%s</td></tr>"
             "<tr><th>版权判定</th><td>%s</td></tr>"
             "<tr><th>待办</th><td>%s</td></tr></table>"
             % (esc(r0["tool"]), esc(r0["evi"]), esc(r0["right"]), esc(r0["todo"])))
    h.append("<div class='grid'>")
    for r in group:
        rel_from_html = os.path.relpath(os.path.join(ROOT, r["rel"]), OUT).replace("\\", "/")
        cls = "card unused" if r["kind"] == "unused" else "card"
        h.append("<div class='%s'>" % cls)
        h.append("<div class='thumb' style=\"background-image:url('%s')\"></div>" % esc(rel_from_html))
        h.append("<div class='body'>")
        h.append("<span class='badge %s'>%s</span>" % (BADGE.get(r["cat"], "b-ref"), esc(r["cat"])))
        h.append("<div class='path'>%s</div>" % esc(r["rel"]))
        h.append("<div class='meta'>%s · %dKB</div>" % (r["dims"], r["kb"]))
        if r["kind"] == "unused":
            h.append("<div class='use none'>⚠ 零引用（产品代码未使用）</div>")
        elif r["kind"] == "dynamic":
            h.append("<div class='use'>动态引用（按诗人 key 拼路径）</div>")
        elif r["kind"] == "exact":
            h.append("<div class='use'>静态引用 %d 处</div>" % len(r["hits"]))
        else:
            h.append("<div class='use'>文档/证据引用</div>")
        h.append("<div class='right'>%s</div>" % esc(r["right"]))
        h.append("</div></div>")
    h.append("</div>")

h.append("</body></html>")
io.open(os.path.join(OUT, "图片来源存档.html"), "w", encoding="utf-8").write("\n".join(h))
print("  ✅ 图片来源存档.html")
print("  零引用: %d 张 / %.1f MB" % (len(unused), sum(r["kb"] for r in unused) / 1024))
