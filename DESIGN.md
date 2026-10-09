# 🏮《云山竹简 · 华风雅集》古风 UI 设计规范与 AI 出图指令指南 (DESIGN.md)

> 本文档专为 **“面向大众古风爱好者的国风文化修养与 AI 雅聚平台”** 定制。  
> 配合原版界面的 5 张原型截图，提供**元素映射表、视觉规范体系、以及专供 GPT Image / Google Stitch 使用的高精度 Prompt 指令**。

---

## 🎨 一、 核心视觉美学规范 (Visual Tokens)

### 1. 中国传统色谱 (Color Palette)
* **宣纸原色 (Base / Background)**: `#F5F0E6`（温润护眼、手作生宣微黄质感，告别纯白与刺眼背景）
* **绢帛玉白 (Card / Surface)**: `#FAF7F0`（卡片底色，温润如羊脂玉或素绢）
* **远山黛墨 (Primary Text / Deep Ink)**: `#22252A`（正文与主标题，松烟浓墨质感）
* **淡墨焦墨 (Secondary Text / Muted Ink)**: `#5C6068`（辅助副标题与时间戳）
* **朱砂印泥红 (Accent / Seal Red)**: `#9E2A2B`（印章 Logo、主要行动按钮、激活态高亮）
* **苍竹墨绿 (Secondary Accent / Bamboo Green)**: `#3A5A40`（鉴宝标签、生机、点缀标记）
* **霁蓝 / 黛青 (Night Indigo)**: `#203A4C`（夜间模式、雅集沉浸背景、墨客对话气泡）
* **沉香古金 (Golden Detail)**: `#C59B27`（称号徽章、诗签边框、VIP 雅士标识）
* **古纸线界 (Border / Divider)**: `#E2D9C8`（浅淡的纸张折痕与竹简分隔线）

### 2. 质感与意境特征 (Aesthetic Attributes)
* **纸张肌理**: 隐约可见的手工竹纸 / 宣纸植物纤维细微暗纹，禁用科技感发光渐变。
* **印章篆刻**: 按钮、Logo、头像框融入“金石朱红方印”与“回纹边框”意象。
* **书法骨骼**: 标题与诗词推荐使用宋体/楷体风韵（如思源宋体、霞鹜文楷、仿宋），字间距微放（letter-spacing: 0.5px - 1.5px）。
* **留白美学**: 继承宋代美学精髓，画面舒展、克制典雅，拒绝信息过载。

---

## 📱 二、 5 大核心界面映射与 Prompt 出图指南

---

### 1. 登录页【入席】 (Login Screen)

#### 🔄 元素映射与重塑 (Mapping)
| 原设计（卡通儿童版） | **新设计（古风大众版）** |
| :--- | :--- |
| 浅蓝波点背景 | **微黄手工宣纸背景**，四角带有淡若游丝的宋代山水水墨晕染 |
| 粉色卡通艺术字 "logo" | **朱砂篆刻方印【華風】**，内敛古朴 |
| "亲子教育 · 成长伴侣" | **"云山竹简 · 华风雅集"**（主标题） |
| "专注0-12岁亲子教育..." | **"格物致知 · 品茗论道 · 与千古先贤共赏风雅"**（副标题） |
| 橙色滑块 "登录" / "注册" | **朱砂红滑动印符 "入席"（登录） / "缔约"（注册）** |
| "请输入手机号或邮箱" | **"请输入雅士手机号或信箱"**（宣纸白内嵌底） |
| "请输入密码" | **"请输入通行密押"** |
| 橙色长条 "登录" 按钮 | **朱砂印章长条按键 "落座入席"**，象牙白字，带有微金内边线 |
| "第三方账号登录" | **"以文会友 · 快捷入席"**，古铜/黛色古典图标 |
| "注册即表示您同意《用户协议》" | **"入席即代表您遵循《雅集清规》与《文墨共识》"** |

#### 🖼️ GPT Image / Midjourney 出图 Prompt
```text
Mobile app UI design of a login screen for a Classical Chinese Culture app named "云山竹简 · 华风雅集". 
Vertical layout, smartphone screen. 
Visual style: Song Dynasty minimalism, traditional Chinese aesthetic, warm Xuan paper parchment background (#F5F0E6), delicate ink-wash mountain silhouettes. 
Center card made of raw silk white (#FAF7F0) with subtle gold filigree border and cinnabar red seal stamp logo reading "華風". 
Refined typography with Chinese KaiTi/SongTi calligraphy. 
Two tabs at the top of the card: "入席" (Login, highlighted in cinnabar red seal badge) and "缔约" (Register). 
Two elegant minimalist input fields with muted ink borders for phone and password. 
A dignified cinnabar red button (#9E2A2B) labeled "落座入席" with subtle gold trimmed border. 
Clean, poetic, tranquil, luxury cultural elegance, high resolution, Figma UI mockup, 8k.
```

---

### 2. 注册页【缔约】 (Register Screen)

#### 🔄 元素映射与重塑 (Mapping)
| 原设计（卡通儿童版） | **新设计（古风大众版）** |
| :--- | :--- |
| "请输入昵称" | **"拟定雅号（如：青莲居士、东坡散人）"** |
| "请输入手机号或邮箱" | **"请输入手机号或信箱"** |
| "请输入验证码" + 图形码 | **"请输入验真码"**，右侧验证码如同水墨草书防伪字迹 |
| "请设置密码" | **"请设置通行密押"** |
| 橙色 "注册" 按钮 | **朱砂红长条按键 "立约缔盟"** |

#### 🖼️ GPT Image 出图 Prompt
```text
Mobile app UI design of a user registration screen for a Chinese traditional culture platform. 
Warm raw parchment background with soft ink splatter aesthetics. 
A central card with four refined input fields: Scholar Moniker ("拟定雅号"), Contact Number, Calligraphic Captcha verification code, and Access Key password. 
Sophisticated cinnabar red button labeled "立约缔盟". 
Classical Chinese border motif, warm beige and tea tones, cinnabar red and bamboo green accents. 
Minimalist, artistic, poetic, mobile iOS app interface, clean vector mockup.
```

---

### 3. 首页【雅集大厅】 (Home Screen)

#### 🔄 元素映射与重塑 (Mapping)
| 原设计（卡通儿童版） | **新设计（古风大众版）** |
| :--- | :--- |
| 顶部卡通 Hero: "和孩子一起探索更大的世界" | **「岁时风物」顶部雅席**：干支纪年、时令节气（如“甲辰年 · 霜降”），配以“天地为幕 · 墨韵留香” |
| "开始探索" 橙色按钮 | **【每日诗签】互动木笺**：实时展示如“人生如逆旅，我亦是行人 —— 苏轼”，附带“摇取新签”与“论诗解惑”按钮 |
| 泡泡标签（安全提示、朗读诗词） | **风物标签**：🍵 围炉煎茶、📜 金石碑帖、👘 汉服礼韵、🌸 飞花诗会、🎋 知行合一 |
| 2列网格卡片（学单词、做实验、睡前故事） | **四大核心雅席入口（竹简式精美卡片）**：<br>1. **博古识器**（瓷器/玉石/古建筑/文玩鉴赏与形制考据）<br>2. **先贤论道**（与李白/苏轼/王阳明/李清照穿越问策）<br>3. **飞花诗令**（以月/风/花/雪对诗唱和）<br>4. **四般闲事**（焚香、点茶、插花、挂画生活志） |
| 底部导航栏 | **四大古风 Tab**：【雅集】、【鉴宝】、【论道】（居中圆形朱砂红浮岛按键）、【书斋】 |

#### 🖼️ GPT Image 出图 Prompt
```text
Mobile app UI design for the home dashboard of a Traditional Chinese Culture App "云山竹简". 
Vertical mobile layout. 
Top section features a "Daily Poetry Fortune" wooden slip card (每日诗签) displaying a famous ancient poem line with calligraphic stamp. 
Weather & Solar term banner showing Chinese lunar calendar and seasonal aesthetics. 
Main section displays a 2x2 grid of classical bamboo-slip style cards: 
1. "博古识器" (Antiquities Appraisal & Ceramics), 
2. "先贤论道" (Philosopher Dialogue with Li Bai & Su Shi), 
3. "飞花诗令" (Poetry Solitaire Game), 
4. "四般闲事" (Incense, Tea ceremony, Flower arrangement). 
Bottom navigation bar with 4 poetic tabs: "雅集" (Home), "鉴宝" (Appraise), floating center cinnabar seal button "论道" (Dialogue), and "书斋" (Profile). 
Color palette: Xuan paper cream (#F5F0E6), dark pine green (#3A5A40), cinnabar red (#9E2A2B), warm tea gold (#C59B27). 
Ultra-clean, modern Chinese luxury aesthetic, 8k UI shot.
```

---

### 4. 核心功能页【古风古友】 (GuFeng Ancient Friends / Literati Companions)

#### 🔄 元素映射与重塑 (Mapping)
| 原设计（卡通儿童版） | **新设计（古风大众版 · 古风古友）** |
| :--- | :--- |
| 顶部蓝色渐变: "AI小伙伴，让AI陪伴孩子成长" | **顶部远山黛青/天青瓷雅致题头**："古风古友 · 跨越千古逢知己"，副标"与先贤知交煮茶对坐，笑谈风月古今" |
| 卡片 1: "智能对话 · AI陪孩子聊天" | **「古友论道」**：与千古知己（李白、苏轼、王阳明、李清照、庄子）倾心畅谈。探讨诗酒意趣、心学修身、解答世俗烦忧 |
| 卡片 2: "作业辅导 · AI陪孩子完成作业" | **「诗韵唱和」**：与古风好友切磋诗词对仗、飞花令、对联拆字、文墨推敲，以文会友 |
| 卡片 3: "语音交互 · 支持语音输入" | **「抚琴听音」**：古风拟人语音交互，伴以古琴流水清音，与古友听雨夜话 |
| 底部导航中央高亮按钮 | **中央圆形朱砂印章按钮【古友】**，一键唤醒知己畅聊 |

#### 🖼️ GPT Image 出图 Prompt
```text
Mobile app UI design for the "古风古友" (Ancient Literati AI Companions) Hub of a Traditional Chinese Culture App. 
Song dynasty visual aesthetics, calm misty teal (#203A4C) to warm Xuan paper gradient top bar. 
Title typography in elegant Chinese calligraphy reads "古风古友 · 千古知己". 
Top horizontal carousel displaying miniature portrait avatars of ancient companions: 
Li Bai (poet holding wine jug), Su Shi (holding tea bowl), Wang Yangming (mind philosophy master), Li Qingzhao (female poet by lotus). 
Three classical scroll-style feature cards with refined ink-line illustration badges: 
1. "古友论道" (Heart-to-heart Dialogue with Ancient Sages - poetry & life wisdom), 
2. "诗韵唱和" (Poetry Duets & FeiHuaLing Solitaire Challenge), 
3. "抚琴听音" (Voice chat accompanied by tranquil Guqin zither melodies). 
Cinnabar red (#9E2A2B) seal stamps, bamboo green (#3A5A40) accents, pure literati elegance, Figma mobile UI mockup, 8k.
```

---

### 5. 个人中心【墨隐书斋】 (Profile Screen)

#### 🔄 元素映射与重塑 (Mapping)
| 原设计（卡通儿童版） | **新设计（古风大众版）** |
| :--- | :--- |
| 顶部紫色渐变 + 默认蓝色头像 | **素雅竹林书斋雅室题头**，印章式头像框（朱砂底金线纹），配有专属雅号（如“青莲诗客”） |
| "123 · 亲子教育 AI 助手" | **雅号与修身境界**："云山居士" | 徽章【修身三重 · 翰林待诏】，文人座右铭："格物穷理，知行合一" |
| 无修持数据 | **雅士修持数据栏（古风数轴）**：<br>🏺 鉴宝藏器 (12) ｜ 📜 论道问策 (36) ｜ 🌸 诗笺摘录 (48) ｜ 🎋 文风品阶 (玖阶) |
| "我的内容：我的收藏、浏览历史" | **「藏品与墨卷」**：<br>• 琅嬛藏诗阁（已收藏的名篇与诗签）<br>• 博古鉴宝录（已品鉴的文玩古器画卷） |
| "设置：账号设置、通知、帮助、退出" | **「书斋清规」**：<br>• 印信与密押设置（修改雅号与通行密押）<br>• 岁时节气物候提醒<br>• 雅集问难答疑<br>• 整装离席（退出登录） |

#### 🖼️ GPT Image 出图 Prompt
```text
Mobile app UI design for the user profile screen titled "墨隐书斋" (Scholar's Study). 
Serene Chinese literati room vibe. 
Top profile card featuring a cinnabar square seal avatar frame, scholar moniker "云山居士", and a bronze status badge "翰林待诏". 
A four-column scholarly achievement stats bar: 
"12 鉴宝藏器" (Antiques Appraised), "36 论道问策" (Wisdom Debates), "48 诗笺摘录" (Poetry Collected), "玖阶 文风品阶" (Literary Rank). 
Two structured list cards below made of parchment silk with carved wood border style: 
"藏品与墨卷" (Collected Poems & Appraised Treasures) and "书斋清规" (Settings & Seal Security). 
Color palette: Warm parchment cream, cinnabar red (#9E2A2B), ancient pine green (#3A5A40), and muted gold. 
High-end, meditative, culturally rich mobile screen mockup, 8k.
```

---

## 🛠️ 三、 在 Google Stitch 中的拼合与绘制指引

当你在 GPT Image 中生成各界面的概念效果图后，在 Google Stitch / Figma 中落地时建议遵循以下原则：

1. **统一视口标准**: 
   - 画布尺寸统一设定为 **`390px × 844px`**（标准移动端视口）。
2. **栅格系统 (Grid)**:
   - 左右两边留白统一为 **`16px`** 或 **`20px`**。
   - 卡片圆角统一为 **`8px` ~ `12px`**（古风忌用过于圆滚的 24px 大圆角，小圆角更显方正从容）。
3. **边框细节**:
   - 绝大多数古风卡片采用 `1px solid #E2D9C8` 或虚线 `1px dashed #D5CAB5`，微带竹纸边缘质感。
4. **印章组件复用**:
   - 制作一个可复用的朱砂印章 Component（宽高 40-50px，圆角 4-6px，正红色 #9E2A2B，白色金石篆刻字），贯穿全站作为品牌灵魂。
