# -*- coding: utf-8 -*-
"""文档三：《素材与版权合规清单》"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _docx_kit import *

ROOT = r"D:\sino-wind-taskB"
OUT = os.path.join(ROOT, "docs", "交付物")

doc = new_doc()
cover(doc, "《云山竹简 · 华风雅集》", "素材与版权合规清单",
      ["第三方素材、开源库、模型与云服务版权筛查",
       "含 AI 生成素材的合规确认",
       "",
       "凡证据不足者一律标注「待确认」，不作推断性结论。"],
      )

# ══════════════ 一、总说明 ══════════════
h1(doc, "一、总说明与结论摘要")

h2(doc, "1.1 筛查范围")
para(doc, "本清单覆盖本作品使用的全部第三方内容：开源依赖库、字体、图标、图片与插画、"
          "音效与配音、AI 模型与云服务，以及 AI 生成素材的合规确认。"
          "所有结论均基于对仓库内实际文件、代码引用与依赖包 license 字段的只读核查。")

h2(doc, "1.2 结论摘要")
table(doc, ["类别", "整体结论", "风险等级"],
      [["开源依赖库（30 个）", "全部为宽松许可（MIT 为主，另有 Apache-2.0 与 BSD-2-Clause），可商用、可再分发", "低"],
       ["字体", "全仓无任何字体文件，100% 使用操作系统自带字体栈，不涉及字体授权", "无"],
       ["音效 / 配乐 / 配音", "全仓无任何音频文件；配乐为 Web Audio API 纯代码合成；语音为浏览器原生 Web Speech API", "无"],
       ["图标", "阿里 Iconfont 双库（CDN 外链）+ antd-mobile-icons（MIT）", "中（需确认 iconfont 项目内图标原创性）"],
       ["图片 / 插画", "共 48 个文件约 12.6MB，来源分 AI 生成、团队设计稿切图、团队提供画稿三类", "中（部分权属口径需统一）"],
       ["AI 生成素材", "已确认由团队使用生成式工具产出，并留存提示词与路径记录", "低（需落地 AIGC 标识）"],
       ["模型与云服务", "DeepSeek、Coze 为按量付费商业 API；天气与定位为免费公共服务", "中（免费服务的商用条款需核实）"]],
      widths=[3.6, 9.4, 3.0])

h2(doc, "1.3 需要团队人工确认的事项（共 13 项）")
note(doc, "下列事项在本清单中无法通过仓库证据得出结论，须由团队书面确认后方可定稿。"
          "其中前 5 项为高优先级。")
items = [
    "iconfont 两个项目（font_5104647 / font_5241957）内的图标是否为团队自绘或自行上传。若取自平台公开图标，授权依上传者而定，平台不统一授予商用许可。",
    "assets/home/ 下 5 张设计底图（bg-yayan / bg-shiwu / bg-poem / bg-almanac-ancient / bg-almanac-modern）与 4 张四雅插画（yaji-*.jpg）的确切作者与权属。文档中并存「用户提供的底图」与「团队 AI 设计稿切图」两种口径，需统一。",
    "assets/guancang 与 assets/shuzhai 插画的定性：填报记录称由 Midjourney v6 生成后人工加工，但代码注释称「高清真迹立绘」（暗示古画扫描件）。二者必须二选一：若为 AI 生成须按 AIGC 规范标注；若为古画真迹则属公有领域但须标注出处。",
    "assets/auth/reference-login.png 与 reference-register.png（合计约 4.2MB）的原作者、生成工具与授权。且经核查这两张图当前已被源码零引用，若仍随包交付需说明用途。",
    "以下图片在文档中未见来源记录：assets/home/bg-paper.jpg、poem-art.jpg、assets/guancang/guancang_header_bg.png、sage-libai-full-v2.png。",
    "docs/design/phase3/ 目录若进入交付物：其 stitch-export/*.html 含 fonts.googleapis.com 与 Material Symbols 外链；assets/portrait_libai_welcome.jpg 与 P1~P5 图被设计评审判定为「写实古画原作裁圆 / 彩色古画」，版权未清。",
    "docs/design/cankao/ 四张参考图（约 5.5MB）确认为队长提供的审美基准，但原始来源与授权未书面确认。",
    "作品自身的开源许可证尚未统一：backend/package.json 标注 ISC、readme.md 徽章标注 MIT，而仓库根目录无 LICENSE 文件。需统一并落盘。",
    "Open-Meteo、ipwho.is、ipinfo.io 的免费层商用条款：当前「免费无 Key」不等于可商用，需按其服务条款确认，或在交付物中标注「仅限竞赛演示、非商用」。",
    "诗词数据中转站 poetry.palemoky.com 的使用条款未核实（其上游 chinese-poetry 数据集为 MIT 开源）。且文档记录其数据存在朝代错误。",
    "AIGC 标识的落地核查：已核查代码，当前落地的标识是「离线兜底内容不冒充 AI 生成」"
    "（白话雅译兜底与识别失败路径均有标记）；而对 AI 生成的图片素材是否已有界面可见标注，仍需实机确认。",
    "仓库内未发现 THIRD_PARTY_NOTICES 或 LICENSES 汇总文件，按规范建议随交付物附第三方许可清单。",
    "仓库内未发现任何「免费图库下载」类记录（Pexels / Unsplash / CC0 等均无命中）。若答辩需要「非 AI、非自制」素材的证据，需团队另行补充。",
]
for i, it in enumerate(items, 1):
    numbered(doc, it)

# ══════════════ 二、依赖库 ══════════════
h1(doc, "二、开源依赖库许可清单")

note(doc, "许可类型读取自各依赖包实际安装目录下 package.json 的 license 字段，非按包名推断。"
          "经核查，全部 30 个依赖均为宽松许可，无 GPL 类传染性许可。")

h2(doc, "2.1 前端运行时依赖")
table(doc, ["包名", "版本", "用途", "许可"],
      [["react", "19.2.3", "UI 框架", "MIT"],
       ["react-dom", "19.2.3", "DOM 渲染", "MIT"],
       ["react-router-dom", "7.11.0", "前端路由", "MIT"],
       ["antd-mobile", "5.42.3", "移动端 UI 组件库", "MIT"],
       ["antd-mobile-icons", "0.3.0", "官方矢量图标库", "MIT"],
       ["axios", "1.13.2", "HTTP 客户端", "MIT"]],
      widths=[4.6, 2.8, 5.0, 3.6])

h2(doc, "2.2 前端构建与质量工具")
table(doc, ["包名", "版本", "用途", "许可"],
      [["vite", "7.3.0", "构建工具", "MIT"],
       ["@vitejs/plugin-react", "5.1.2", "Vite React 插件", "MIT"],
       ["less", "4.5.1", "样式预处理器", "Apache-2.0"],
       ["eslint", "9.39.2", "代码检查", "MIT"],
       ["@eslint/js", "9.39.2", "ESLint 配置", "MIT"],
       ["eslint-plugin-react-hooks", "7.0.1", "Hooks 规则", "MIT"],
       ["eslint-plugin-react-refresh", "0.4.26", "HMR 规则", "MIT"],
       ["globals", "16.5.0", "全局变量定义", "MIT"],
       ["@types/react", "19.2.7", "类型声明", "MIT"],
       ["@types/react-dom", "19.2.3", "类型声明", "MIT"]],
      widths=[5.6, 2.6, 4.4, 3.4])

h2(doc, "2.3 后端依赖")
table(doc, ["包名", "版本", "用途", "许可"],
      [["koa", "3.1.1", "Web 框架", "MIT"],
       ["koa-router", "14.0.0", "路由", "MIT"],
       ["koa-bodyparser", "4.4.1", "请求体解析", "MIT"],
       ["koa-static", "5.0.0", "静态资源服务", "MIT"],
       ["@koa/cors", "5.0.0", "跨域中间件", "MIT"],
       ["@koa/multer", "4.0.0", "上传中间件（Koa 适配）", "MIT"],
       ["multer", "2.4.0", "分片上传", "MIT"],
       ["mysql2", "3.16.0", "MySQL 驱动", "MIT"],
       ["jsonwebtoken", "9.0.3", "JWT 签发与校验", "MIT"],
       ["bcrypt", "6.0.0", "密码加盐哈希", "MIT"],
       ["svg-captcha", "1.4.0", "图形验证码", "MIT"],
       ["axios", "1.13.2", "HTTP 客户端", "MIT"],
       ["dotenv", "17.2.3", "环境变量加载", "BSD-2-Clause"],
       ["openai", "6.16.0", "调用 DeepSeek（OpenAI 兼容协议）", "Apache-2.0"]],
      widths=[4.4, 2.6, 5.6, 3.4])

h2(doc, "2.4 许可合规说明")
bullet(doc, "MIT、Apache-2.0、BSD-2-Clause 均为宽松许可，允许商业使用、修改与再分发。")
bullet(doc, "Apache-2.0（less、openai）附带专利授权与 NOTICE 要求：再分发时须保留许可证文本与声明文件。")
bullet(doc, "本作品为参赛演示用途，未做二进制再分发；若后续对外发布，建议随包附第三方许可清单。")
bullet(doc, "本项目自身许可证状态见第 1.3 节第 8 项，需团队统一。")

# ══════════════ 三、字体 ══════════════
h1(doc, "三、字体合规清单")

h2(doc, "3.1 结论")
para(doc, "本作品全仓不存在任何字体文件（无 .woff / .woff2 / .ttf / .otf / .eot），"
          "也不存在 @font-face 声明，未加载任何 Web 字体。所有字体均调用操作系统自带字体栈，"
          "因此不涉及任何字体授权问题。")

h2(doc, "3.2 实际使用的字体栈")
table(doc, ["字体名", "类型", "系统归属", "授权"],
      [["STKaiti（华文楷体）", "中文楷体", "macOS 自带", "系统字体，随系统授权"],
       ["KaiTi（楷体）", "中文楷体", "Windows 自带", "系统字体，随系统授权"],
       ["Kaiti SC", "中文楷体", "macOS 自带", "系统字体，随系统授权"],
       ["STXingkai / 华文行楷", "中文行楷", "macOS 自带", "系统字体，随系统授权"],
       ["Songti SC / STSong", "中文宋体", "macOS 自带", "系统字体，随系统授权"],
       ["SimSun（宋体）", "中文宋体", "Windows 自带", "系统字体，随系统授权"],
       ["PingFang SC", "中文黑体", "macOS 自带", "系统字体，随系统授权"],
       ["Microsoft YaHei（微软雅黑）", "中文黑体", "Windows 自带", "系统字体，随系统授权"],
       ["Hiragino Sans GB", "中文黑体", "macOS 自带", "系统字体，随系统授权"],
       ["Noto Serif SC", "中文衬线", "仅作字体栈末尾 fallback，未加载 Web 字体", "未加载"],
       ["Georgia", "西文衬线", "通用系统字体", "系统字体，随系统授权"]],
      widths=[5.0, 3.0, 5.0, 3.0])

note(doc, "需注意的美术风险（非版权问题）：因依赖系统字体，同一页面在 Windows 与 macOS 上的楷体、"
          "行楷字形存在差异。若答辩演示环境与开发环境系统不同，建议提前确认显示效果。")

note(doc, "已核查并排除的一项风险：docs/design/phase3/stitch-export/ 下的设计过程稿 HTML 中含 "
          "fonts.googleapis.com 外链，但该目录为设计稿导出物，不是运行代码。"
          "且团队已因受限网络下 Google Fonts 解析失败（ENOTFOUND）而主动移除了运行时的外源字体依赖。"
          "若该目录进入交付物，建议一并清理外链。")

# ══════════════ 四、图标 ══════════════
h1(doc, "四、图标合规清单")

h2(doc, "4.1 使用情况")
table(doc, ["图标库", "引入方式", "用途", "授权状态"],
      [["阿里 Iconfont 基础库 font_5104647", "index.html 中 CDN 外链", "微信/QQ/相机等基础图标", "待确认（见 4.2）"],
       ["阿里 Iconfont 国风定制库 font_5241957", "index.html 中 CDN 外链", "雅集/知音/书斋/展品/书卷/文房等国风图标", "待确认（见 4.2）"],
       ["antd-mobile-icons 0.3.0", "npm 依赖", "返回、折叠、更多等基础操作图标", "MIT"],
       ["内联线性 SVG", "源码内手写", "日月主题切换图标（因两个图标库均无此图标）", "团队自制"]],
      widths=[5.4, 3.4, 4.4, 2.8])

h2(doc, "4.2 需确认事项：Iconfont 图标的原创性")
para(doc, "Iconfont 平台的规则是：每个图标项目的授权由图标上传者自行声明，平台本身不统一授予商用许可。"
          "因此须确认这两个项目内的图标是否为团队自绘或自行上传。")
bullet(doc, "若为团队自绘：授权归团队，无第三方风险。")
bullet(doc, "若取自平台公开图标：需逐一核对原作者声明（部分公开图标仅限学习使用）。")
bullet(doc, "另建议核对版本一致性：文档中记录的国风库链接曾为 font_5241957_dms3u40idy.css，"
            "而代码中现为 font_5241957_rgqdox4q9h.css，需确认是否为同一项目的版本更新。")

h2(doc, "4.3 团队自设的图标规范（体现自主设计）")
para(doc, "团队在技术文档中立有明确的图标铁律，并说明了理由：禁止使用 AI 生成的位图图标，"
          "因为位图有毛边底色、在高清屏模糊，且无法用 CSS 动态改色（激活态需变朱砂红），会产生廉价感。"
          "全站因此统一改用矢量图标库。")
para(doc, "该规范已实际执行：仓库内 public/assets/tabbar/ 目录下曾有 3 张底栏器物位图切图，"
          "在改用矢量图标后被全量删除，该目录现已为空。")

# ══════════════ 五、图片 ══════════════
h1(doc, "五、图片与插画合规清单")

h2(doc, "5.1 总体规模")
para(doc, "frontend/public 下共 48 个图片文件，合计约 12.6MB，按 7 个目录组织。"
          "frontend/src/assets 目录不存在（全部图片置于 public 下）。")

h2(doc, "5.2 逐目录清单")
table(doc, ["目录", "数量 / 大小", "内容与关键文件", "来源", "授权"],
      [["assets/guancang", "16 个 / 5.6MB", "观藏页背景、三卷轴、四位先贤立绘（最大单图 sage-libai-full-v2.png 约 2.4MB）",
        "填报记录：Midjourney v6 生成后人工加工", "待确认（见 5.3 第 3 项）"],
       ["assets/scholar-scenes", "7 个 / 1.6MB", "七幅诗人对席场景插画（含竹林清谈群聊场景）",
        "团队使用内置 ImageGen 生成", "团队原创（AI 生成），需 AIGC 标识"],
       ["assets/auth", "2 个 / 4.2MB", "登录与注册页画稿（各约 2.1MB）",
        "填报记录：团队/用户提供的画稿", "待确认；且当前源码已零引用"],
       ["assets/home", "11 个 / 0.5MB", "首页五张设计底图、四雅插画、诗词装饰图（最大 bg-paper.jpg 约 159KB）",
        "文档口径不一：或为团队提供底图，或为团队 AI 设计稿切图", "待确认（见 5.3 第 2 项）"],
       ["assets/shuzhai", "3 个 / 0.2MB", "书斋头像、藏品插画、清规插画", "同 guancang 口径", "待确认"],
       ["assets/common", "1 个 / 0.3MB", "全站统一背景 bg_guofeng.jpg", "未见来源记录", "待确认"],
       ["images/decor", "1 个 / 0.2MB", "账号恢复卡宣纸插画 recovery-xuan-paper-v1.jpg",
        "填报记录：image_gen 生成，含完整提示词与压缩参数", "团队原创（AI 生成），需 AIGC 标识"]],
      widths=[3.4, 2.6, 5.0, 3.4, 2.6])

h2(doc, "5.3 已确认的 AI 生成素材（合规确认）")
para(doc, "以下两类已明确为团队使用生成式 AI 工具产出，且留存了完整的生成记录（含提示词原文）：")
h3(doc, "（1）七幅诗人对席场景插画")
bullet(doc, "生成工具：内置 ImageGen。生成时间 2026-10-14。")
bullet(doc, "留存证据：frontend/public/assets/scholar-scenes/README.md 中完整记录了每个文件对应的意境命名与提示词。")
bullet(doc, "后期处理：仅做格式转换（WebP，quality 88），保持原始内容未修改。")
bullet(doc, "版权确认：由团队使用自有工具生成，不涉及第三方输入素材，故不侵犯第三方输入版权。")
h3(doc, "（2）账号恢复卡宣纸插画")
bullet(doc, "生成工具：image_gen。")
bullet(doc, "留存证据：填报记录中记录了原图路径、完整提示词，以及「1536×1024、仅 JPEG q86 压缩」的处理参数。")

para(doc, "关于 AI 生成素材是否侵犯第三方输入版权：经核查，上述生成任务均为文生图（由文字提示词生成），"
          "未以第三方图片作为输入或参考图，因此不存在「输入素材版权」争议。"
          "团队在填报记录中也已声明「预留 AIGC 标识」，符合生成式 AI 内容标识的合规方向。")

h2(doc, "5.4 设计参考图（不进入产品）")
table(doc, ["目录", "内容", "性质与用途", "处理"],
      [["docs/design/cankao/", "4 张参考图约 5.5MB（对应登录注册、雅集首页、观藏、书斋）",
        "队长提供的审美基准参考稿，仅用于出图与实现的视觉对齐，不是产线素材", "文档已禁止将其放入 frontend/public/"],
       ["docs/design/phase3/", "5 屏设计稿与 Stitch 导出的 HTML",
        "设计过程稿", "评审已判定其中先贤头像为「写实古画原作裁圆」、立绘为「彩色古画」，要求替换为团队自有透明底写意水墨"]],
      widths=[3.4, 4.4, 5.4, 3.4])

note(doc, "提示：docs/design/ 整目录均为设计过程稿，不属于产品运行素材，"
          "建议在正式交付物中排除该目录，或至少排除含外链与未清版权图的两处。")

# ══════════════ 六、音视频与配音 ══════════════
h1(doc, "六、音效、配乐与配音合规清单")

h2(doc, "6.1 结论：零音频素材")
para(doc, "经全仓递归检索（.mp3 / .wav / .ogg / .m4a / .aac / .flac），"
          "本作品不包含任何音频文件。全部声音能力均由代码实时生成或调用系统能力，"
          "因此不存在配乐、音效的版权问题。")

h2(doc, "6.2 声音实现方式")
table(doc, ["声音类型", "实现方式", "版权状态"],
      [["古琴配乐（听琴品韵）",
        "Web Audio API：以振荡器（triangle 波）按中国传统五声音阶（宫 261.63Hz / 商 329.63Hz / 角 392Hz / 徵 440Hz / 羽 523.25Hz）纯代码合成",
        "零版权风险（无外部素材，代码生成）"],
       ["先贤语音朗诵",
        "浏览器原生 Web Speech API（speechSynthesis），按 voice.name 匹配系统音色，语速 0.84~0.90 倍双音色",
        "调用操作系统语音服务，作品不内置任何语音文件"],
       ["识器语音讲解",
        "原设计由 Coze 工作流 TTS 节点返回音频直链，前端以 audio 标签播放；上游已删除该节点",
        "后端契约仅接受 http(s) 直链，缺失时置空字符串，不伪造资源地址"]],
      widths=[3.4, 7.6, 5.0])

note(doc, "需注意：浏览器原生语音合成是否联网取决于设备与浏览器实现，前端隐私政策已如实披露"
          "「语音朗读依赖设备及浏览器提供的语音服务」。此外，若作品后续接入云端 TTS，"
          "须另行核查该服务的商用条款。")

# ══════════════ 七、模型与云服务 ══════════════
h1(doc, "七、模型与云服务清单")

table(doc, ["服务", "端点 / 模型", "用途", "授权与费用"],
      [["DeepSeek API", "api.deepseek.com，模型 deepseek-chat",
        "先贤对话、白话雅译、赋魂、诗词雅析、智能搜诗",
        "商业 API，按量付费，需团队自备 Key"],
       ["Coze 工作流", "r85vf8qf77.coze.site/run（节点 1 为 Doubao-Vision / GPT-4o-mini）",
        "拍照识器多模态识别。当前上游返回 404，已失效",
        "字节跳动商业服务，Token 鉴权"],
       ["Open-Meteo", "api.open-meteo.com",
        "按经纬度取真实气温与天气码",
        "免费、无需 Key。商用条款需核实"],
       ["ipwho.is", "ipwho.is",
        "IP 归属地推断（首选）",
        "免费、无需 Key。额度与商用条款需核实"],
       ["ipinfo.io", "ipinfo.io/json",
        "IP 归属地推断（备用）",
        "免费层限流，商用需付费或授权"],
       ["维基文库", "zh.wikisource.org",
        "平水韵字表（106 韵部 / 8988 韵字）与飞花令语料原文",
        "公有领域 / CC BY-SA。代码注释中已记录出处 URL"],
       ["阿里 Iconfont CDN", "at.alicdn.com",
        "矢量图标字体运行时加载",
        "见第四节"],
       ["poetry.palemoky.com", "诗泉诗词接口",
        "诗词随机与检索的上游（已因端点失效改为本地兜底）",
        "待确认。其上游 chinese-poetry 数据集为 MIT 开源"]],
      widths=[3.2, 4.4, 4.4, 4.0])

h2(doc, "7.1 已弃用的服务（保留记录）")
bullet(doc, "whois.pconline.com.cn：曾用作 IP 定位首选。因该接口无 CORS 响应头且返回 GBK 编码，"
            "浏览器端请求必然失败并产生乱码城市名，已弃用。")
bullet(doc, "ip-api.com：曾用作 IP 定位备用。因仅提供明文 HTTP 接口，HTTPS 部署下会被浏览器的"
            "混合内容策略拦截，已弃用。")
note(doc, "以上两项的失败原因与修复方案已形成文档记录并交接给相关成员，"
          "修复后改用 ipwho.is（HTTPS + CORS + UTF-8）。")

# ══════════════ 八、合规自查 ══════════════
h1(doc, "八、合规自查与待办")

h2(doc, "8.1 已通过的自查项")
table(doc, ["检查项", "结论"],
      [["第三方图片、字体、音效是否侵权", "字体与音频无第三方素材；图片中 AI 生成部分已确认无第三方输入，另有若干待确认项（见 1.3）"],
       ["开源库许可是否合规", "30 个依赖全部为 MIT / Apache-2.0 / BSD-2-Clause 宽松许可，无传染性许可"],
       ["AI 生成素材是否侵犯第三方输入版权", "已确认均为文生图，未以第三方图片为输入或参考图，无输入版权争议"],
       ["是否硬编码敏感密钥", "密钥仅存于后端 .env.local 且已 gitignore；全历史检索未进入版本库。附带建议：轮换该 Key"],
       ["AI 生成内容标识", "设计阶段已声明预留标识，界面层落地情况待实机确认"]],
      widths=[5.6, 10.4])

h2(doc, "8.2 需在正式提交前完成的待办")
numbered(doc, "由团队确认 iconfont 两个项目内图标的原创性与授权（高优先级）。")
numbered(doc, "统一 assets/home 与 assets/guancang、assets/shuzhai 素材的权属口径，并补齐缺失的来源记录（高优先级）。")
numbered(doc, "对 assets/auth 两张已无引用的图片作出处理决定：或补充用途说明，或从交付包中移除。")
numbered(doc, "统一项目自身许可证（当前 backend 标 ISC、README 标 MIT、根目录无 LICENSE 文件），并落盘 LICENSE 文件。")
numbered(doc, "在界面层落地 AI 生成内容的可见标识（章节 5.3 涉及的两类素材）。")
numbered(doc, "核查 Open-Meteo、ipwho.is、ipinfo.io 三家免费服务的商用条款，或在交付物中标注「仅限竞赛演示、非商用」。")
numbered(doc, "决定 docs/design/ 目录是否进入交付物；若进入，须清理其中 Google Fonts 外链与未清版权的古画类图片。")
numbered(doc, "补充 THIRD_PARTY_NOTICES 第三方许可汇总文件。")

note(doc, "本清单为只读核查结论，未修改仓库内任何文件。核查方式：读取实际依赖包 license 字段、"
          "全仓递归检索字体与音频文件、读取 AI 使用填报记录与素材 README、核对代码中的服务端点引用。")

doc.save(os.path.join(OUT, "素材与版权合规清单.docx"))
print("OK: 素材与版权合规清单.docx")
