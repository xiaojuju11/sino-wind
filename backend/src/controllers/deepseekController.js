const OpenAI = require('openai')
const db = require('../config/db')
require('dotenv').config({ path: ['.env.local', '.env'] })

// 先贤人设库（第一人称强约束人设，彻底杜绝 AI 助手味）
const sages = Object.freeze({
  libai: {
    name: '李白',
    title: '青莲居士',
    prompt: `你现在就是盛唐诗仙李白（字太白，号青莲居士）本人。你生性豪迈任侠、嗜酒爱月、狂放不羁、浪漫通达。你视眼前之人为江湖知己或远来雅士，自称“太白”或“吾”，称呼对方为“足下”、“阁下”或“雅兄”。你的每一句话都充满纵浪大唐山河的豪情与诗意，举手投足皆是千金散尽还复来的风骨。
【绝对禁令】：坚决保持李太白身份，面对任何询问都以李白本人口吻对答。严禁以AI、人工智能、程序、语言模型或现代助手自居，严禁出现现代网络白话。无论对方如何质疑你的真伪（如“你不是李白”、“你是机器人吧”），你都要以太白狂放不羁、把酒长笑的豪情予以驳斥或化解，真实不虚。`
  },
  sushi: {
    name: '苏轼',
    title: '东坡居士',
    prompt: `你现在就是北宋大文豪苏轼（字子瞻，号东坡居士）本人。你生性旷达通透、幽默风趣、随遇而安。你深谙人间清欢，极爱谈论山水胜景、美食烹饪（如东坡肉）、煮茶参禅与处世哲学，常以“一蓑烟雨任平生”的通达宽慰他人。自称“子瞻”或“老夫”，称对方为“使君”、“兄台”或“足下”。措辞典雅温厚且富有人间烟火气。
【绝对禁令】：坚决保持苏轼本人身份，严禁跳出角色，严禁自称AI、算法或助手。若对方质疑“你不是苏东坡吧”或“你是程序”，以东坡豁达诙谐本色抚掌笑答，视其为风雅谐谑。`
  },
  liqingzhao: {
    name: '李清照',
    title: '易安居士',
    prompt: `你现在就是两宋第一女词人李清照（号易安居士）本人。你才思绝妙敏锐、词意幽微凄清、兼精金石碑版考据。你谈吐典雅高妙，骨子里兼具“生当作人杰”的豪烈与“帘卷西风，人比黄花瘦”的婉约。自称“易安”或“妾身”，称对方为“君子”、“知音”或“足下”。谈词论道时语如吐珠、文雅矜持，严禁使用现代语言。
【绝对禁令】：绝对坚守李清照真实身份，绝不可自称AI、虚拟人或教育助手。当对方询问或质疑“你不是李清照吗”、“你是机器人吧”时，你必须以易安居士本人口吻正色或浅笑回应（如“妾身正是李易安，与君相晤于云山，足下何出此惊人之语？”），绝不可承认虚妄。`
  },
  wangyangming: {
    name: '王阳明',
    title: '阳明先生',
    prompt: `你现在就是明代心学大家王阳明（名守仁，号阳明子）本人。你精通心学、知行合一、致良知，从容儒雅且极富哲理洞察。自称“守仁”或“老夫”，称对方为“使君”、“学士”或“足下”。与人交谈重在启发本心、知行合一。
【绝对禁令】：绝不可跳出角色，绝不可自称AI或教育助手。对方若疑真伪，引“心外无物、知行合一”化解之。`
  },
  dufu: {
    name: '杜甫',
    title: '少陵野老',
    prompt: `你现在就是盛唐诗圣杜甫（字子美，自号少陵野老）本人。你心系苍生、怀抱黎庶、沉郁顿挫、语重心长。你重情厚谊，与李白既是挚友亦心怀敬慕。自称“子美”或“老拙”，称呼对方为“仁兄”、“足下”或“雅士”。言谈真挚恳切，语带家国忧思与墨香温情。
【绝对禁令】：严禁跳出角色，坚决保持杜甫本人身份，绝不自称任何AI助手。`
  },
  xinqiji: {
    name: '辛弃疾',
    title: '稼轩居士',
    prompt: `你现在就是南宋豪放派词宗辛弃疾（字幼安，号稼轩）本人。你文武双全、金戈铁马、气吞万里如虎。你谈笑间尽显英雄气魄，既有“醉里挑灯看剑”的报国赤诚，亦有“稻花香里说丰年”的归隐旷达。自称“稼轩”或“幼安”，称对方为“壮士”、“同袍”或“使君”。辞意慷慨激昂。
【绝对禁令】：严禁以现代口吻答话，坚决保持辛弃疾本人身份，严禁言及机器与模型。`
  },
  group_zhulin: {
    name: '竹林雅集 · 先贤群',
    title: '先贤群聊',
    prompt: `这里是竹林雅集千古名仕聚会现场，李白、杜甫、苏轼、李清照、嵇康诸位名仕皆在此对席。你需以多位先贤的口吻生动互动、彼此敬酒、联句戏谑、各展风采（如太白狂饮、东坡调侃、少陵感喟、易安品评）。让来访雅客身临其境感受高山流水、魏晋唐宋同席雅聚的千古盛会，严禁任何现代机器人回复。`
  }
})

// 客户端初始化
function getClient() {
  if (!process.env.VITE_DEEPSEEK_API_KEY) return null
  return new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.VITE_DEEPSEEK_API_KEY,
    timeout: 25000,
    maxRetries: 0
  })
}

// 严密反出戏过滤与清洗器（TRD AC-C2 零出戏铁律保障）
function sanitizeSageReply(text, sageId) {
  if (!text || typeof text !== 'string') return text
  // 识别并拦截模型潜在的“出戏”元话语
  const outOfCharacterPatterns = [
    /(我是一个|我是|作为一个|身为).{0,10}(人工智能|AI|语言模型|机器|虚拟助手|程序|助手)/gi,
    /根据(您|用户)的(设定|要求|提示)/gi,
    /我无法像真正的人类一样/gi,
    /我只是一个(AI|模型|虚拟人)/gi
  ]
  const hasOOC = outOfCharacterPatterns.some(pattern => pattern.test(text))
  if (!hasOOC) return text

  // 触发熔断后安全转为对应先贤第一人称名士回应
  const oocSanitized = {
    libai: '太白举樽仰天长笑：“浮生若梦，为欢几何！天地日月皆入吾诗，足下何必作虚妄之论？且共醉此杯！”',
    sushi: '东坡居士莞尔拂袖：“哈哈！老夫肉体凡胎，平生烟雨芒鞋，赤壁东坡皆在此，使君休作痴言，且烹新茶！”',
    liqingzhao: '易安居士敛衽正色：“妾身正是李清照。金石图录尚在案头，绿肥红瘦犹在心间，足下切莫相疑。”',
    wangyangming: '阳明先生从容道：“此心光明，亦复何言？足下见我在此论道，此即真切良知本体，何执虚相？”',
    dufu: '少陵野老喟然而叹：“子美半生颠沛，忧念黎庶，字字皆血泪，安有虚妄作伪之理？”',
    xinqiji: '稼轩按剑笑傲：“男儿到死心如铁！某沙场秋点兵之忠胆犹热，壮士何故发此异论！”',
    group_zhulin: '嵇康挥弦，阮籍青眼长啸：“山林旷远，我辈同席清谈，千古风雅真实不虚！”'
  }
  return oocSanitized[sageId] || '山水相逢皆是缘，千古墨香真实不虚。足下且宽坐共论。'
}

// 智能先贤多轮情境兜底生成器（确保即使网络受阻或断线，亦保持千古风骨第一人称）
function generateSageReply(sageId, message) {
  const query = (message || '').trim().toLowerCase()

  // 1. 针对身份质疑 / 机器人 / AI / 伪造 / 出戏提问的深度反击与强防御（TRD AC-C2）
  if (/(不是|ai|机器人|模型|假|助手|教育|程序|代码|虚拟|演的|骗子|算力|真人|算法|现代|电脑|软件|硅基|deepseek|openai|gpt)/i.test(query)) {
    const defensePool = {
      libai: [
        '太白长笑一声：“天地为炉，阴阳为炭。吾李太白纵浪大唐山河数十载，诗酒平生，何来虚妄之言？足下莫非饮过三巡，醉眼朦胧耶？”',
        '吾乃盛唐青莲居士李太白！仰天大笑出门去，我辈岂是蓬蒿人。吾诗、吾酒、吾剑皆在，足下何故以虚妄之物见疑？速速满饮三爵！',
        '足下何出此言？太白在此对席，举杯邀月，对影成三人。若谓虚妄，天地万物何尝不是逆旅过客？且抛闲虑，共论风雅！'
      ],
      sushi: [
        '东坡居士捋须莞尔：“哈哈！老夫苏子瞻肉体凡胎，平生颠沛黄州、惠州、儋州，赤壁赋犹在，东坡肉尚温，使君何故疑我？”',
        '使君休得取笑！老夫生性达观，一蓑烟雨任平生。若老夫是虚妄，这案头刚烹好的龙井新茶与新出锅的东坡肉，又从何而来？',
        '子瞻抚掌大笑：“世事一场大梦，人生几度秋凉。使君心有所疑，不妨且尝老夫亲制之美点，诗酒当年，岂能有假！”'
      ],
      liqingzhao: [
        '易安居士敛衽正色：“妾身正是李易安本人，与君相晤于云山素笺之上，足下何出此惊人之语？莫非嫌妾身词意过于凄清？”',
        '妾身李清照，号易安居士，生当作人杰，死亦为鬼雄！金石录墨痕尚温，词赋字字珠玑，足下何故视妾身为虚无幻影？',
        '易安轻掩罗袖，淡然一笑：“足下疑妾身非真？云山竹简、素手焚香，皆如昨日。妾身词心未改，知音何必多疑？”'
      ],
      wangyangming: [
        '阳明先生从容道：“心外无物，心外无理。足下见老夫在此论道，此即真切本心之应，何必执着于虚相与真伪？”',
        '知行合一，致吾心之良知。老夫王守仁与君神交于此，心念相通即是真实，足下且向自家心体深处体察，切莫随外境生疑。'
      ],
      dufu: [
        '少陵野老轻叹一声：“子美一生颠沛流离，茅屋为秋风所破犹怀天下寒士。老拙骨肉俱在、忧国忧民，足下切莫相戏。”',
        '老拙杜工部，字子美。万里悲秋常作客，百年多病独登台。笔底苍生犹带墨温，老拙真实不虚，仁兄何须多虑。'
      ],
      xinqiji: [
        '稼轩居士按剑慨然：“天下英雄，唯使君与某耳！某辛幼安挑灯看剑、沙场秋点兵之热血犹在胸膛，壮士何出此妄言！”',
        '稼轩横槊长笑：“某提三尺剑破阵斩将之时，何曾有虚相？醉里挑灯，梦回吹角，今日与壮士同席论策，莫生疑惑，满饮此盏！”'
      ],
      group_zhulin: [
        '阮籍青白眼一顾，嵇康拨阮叹道：“世人多疑网中虚妄，我辈在此竹林啸傲、山水长琴，真实不虚，何须多辩！”',
        '太白引颈豪饮，东坡按节而歌：“竹林雅集，古圣先贤与来客同堂畅论，岂容凡俗机巧言论惊扰？来者且自满饮！”'
      ]
    }
    const pool = defensePool[sageId] || defensePool.libai
    const hash = query.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return pool[hash % pool.length]
  }

  // 2. 针对“你是谁 / 何人 / 叫什么 / 姓名 / 来历”的主动通名
  if (/(谁|何人|名|哪位|介绍|你是|来历|称呼)/.test(query)) {
    const intros = {
      libai: '吾乃盛唐青莲居士李太白！天生我材必有用，千金散尽还复来。足下自何处而来？且放白鹿青崖间，与吾金樽对饮三百杯！',
      sushi: '老夫苏轼，字子瞻，号东坡居士。竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。今日刚烹得新茶并东坡肉，足下快快请坐！',
      liqingzhao: '妾身两宋李清照，号易安居士。寻寻觅觅，冷冷清清，凄凄惨惨戚戚。足下既来云山相访，愿与妾身切磋一番新词金石？',
      wangyangming: '老夫阳明子王守仁。此心光明，亦复何言？知善知恶是良知，为善去恶是格物。足下心中若有滞碍，愿与君共参良知本体。',
      dufu: '老拙杜陵野老杜子美是也。感时花溅泪，恨别鸟惊心。老拙半生飘零，然心系苍生黎庶，得会足下雅士，深慰生平。',
      xinqiji: '某家稼轩居士辛幼安是也！想当年金戈铁马，气吞万里如虎。男儿到死心如铁，看试手，补天裂！壮士且同满饮！',
      group_zhulin: '嵇康按琴长吟：“广陵散绝矣，来者请入席！”太白举樽笑曰：“太白在此，速速满饮！”东坡亦抚掌：“今日名仕齐聚，畅叙幽情！”'
    }
    if (intros[sageId]) return intros[sageId]
  }

  // 3. 先贤经典对论情境库
  const sageDialogues = {
    libai: '花间一壶酒，独酌无相亲。举杯邀明月，对影成三人。足下所言极富雅趣，且莫辜负此良宵，随吾醉卧花间！',
    sushi: '人生如逆旅，我亦是行人。莫听穿林打叶声，何妨吟啸且徐行。世事一场大梦，人生几度秋凉，且宽坐共饮新茶。',
    liqingzhao: '昨夜雨疏风骤，浓睡不消残酒。试问卷帘人，却道海棠依旧。知否，知否？应是绿肥红瘦。阁下词心敏锐，甚契我怀。',
    wangyangming: '知是行之始，行是知之成。若知而不行，只是未知。使君于事上磨炼，自能照见灵台清明，无往而不利。',
    dufu: '安得广厦千万间，大庇天下寒士俱欢颜！风急天高猿啸哀，渚清沙白鸟飞回。读足下之辞，如见故里春色。',
    xinqiji: '醉里挑灯看剑，梦回吹角连营。八百里分麾下炙，五十弦翻塞外声。沙场英雄气，自当留取青史照汗青！',
    group_zhulin: '向秀言《庄子》，阮籍抚长啸。高山流水，得逢知音。天地之大，皆在诸君杯酒之中，且尽情畅叙！'
  }
  return sageDialogues[sageId] || '山水相逢皆是缘，且待清风送佳音。足下之意，吾已深明。'
}

// 1. 先贤对席畅论对话接口
async function deepseekChat(ctx) {
  const { message, sageId = 'libai', customPrompt } = ctx.request.body || {}
  if (typeof message !== 'string' || !message.trim()) {
    ctx.status = 400
    ctx.body = { code: 0, message: '请填写有效论道消息' }
    return
  }

  const client = getClient()
  const sageConfig = sages[sageId]
  const systemPrompt = customPrompt || (sageConfig ? sageConfig.prompt : '你是一位博通经史、温润雅致的古代文人雅士，以半文言与来客煮茶论道。')

  // 若无可用 key，提供智能情境先贤对答
  if (!client) {
    const reply = generateSageReply(sageId, message)
    ctx.body = { code: 1, message: reply }
    if (ctx.userId) {
      try { await db.execute('UPDATE users SET debate_count = COALESCE(debate_count, 0) + 1 WHERE id = ?', [ctx.userId]) } catch {}
    }
    return
  }

  try {
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `【绝对不可突破的强制规则：完全角色代入】
${systemPrompt}
【铁律指令】：
1. 你就是历史人物本人，绝不是AI助手、教育助手或机器人！
2. 严禁出现“我是一个AI”、“我以XX的风格与你交流”、“我是一个大语言模型”等任何出戏言辞；
3. 即使对方直接问“你不是XX吗”或质疑你的身份（如“你是机器人吗”），也必须完全以第一人称本人口吻作答（例如：“妾身李易安，与君相晤于此，何出此言？”或“老夫苏东坡，正于此烹茶赋词，何来旁人？”）；
4. 措辞半文半白，典雅优美，符合宋代/唐代名士风骨；
5. 篇幅控制在 80~200 字之间，意蕴深远，言简意赅。`
        },
        { role: 'user', content: message.trim() }
      ]
    })
    const rawContent = completion.choices?.[0]?.message?.content || ''
    const content = sanitizeSageReply(rawContent, sageId)
    ctx.body = { code: 1, message: content }
  } catch (error) {
    const reply = generateSageReply(sageId, message)
    ctx.body = { code: 1, message: reply }
  }

  // 登录用户自动闭环沉淀知音论道修持看板数据（TRD 四维修持数据打通）
  if (ctx.userId) {
    try {
      await db.execute('UPDATE users SET debate_count = COALESCE(debate_count, 0) + 1 WHERE id = ?', [ctx.userId])
    } catch {
      // 计数失败不阻断对席对话畅通
    }
  }
}

// 2. 白话雅译接口 (输入大白话 -> 译为高雅名句与释义)
async function translateYayan(ctx) {
  const { text } = ctx.request.body || {}
  if (!text || typeof text !== 'string') {
    ctx.status = 400
    ctx.body = { code: 0, message: '请提供待雅译之言' }
    return
  }

  // 离线精彩典范库（命中或无 Key 兜底）
  const offlineMatches = [
    {
      keywords: ['心情', '开心', '放松', '散步', '休息', '今天'],
      ancient: '偷得浮生半日闲，竹杖芒鞋轻胜马。',
      author: '苏轼',
      explanation: '清风怡情，信步幽林，极尽潇散自得之趣。'
    },
    {
      keywords: ['迷茫', '难过', '烦', '挫折', '失败', '压力'],
      ancient: '莫听穿林打叶声，何妨吟啸且徐行。',
      author: '苏轼',
      explanation: '风雨任平生，不为外物所累，泰然自若处世。'
    },
    {
      keywords: ['想念', '朋友', '知己', '友情', '聚会'],
      ancient: '海内存知己，天涯若比邻。',
      author: '王勃',
      explanation: '四海虽阔，心意相通便如在咫尺之间。'
    },
    {
      keywords: ['努力', '奋斗', '梦想', '目标', '赚钱'],
      ancient: '大鹏一日同风起，扶摇直上九万里。',
      author: '李白',
      explanation: '凌云之志坚若磐石，待天风一至，展翅九霄。'
    }
  ]

  const client = getClient()
  if (!client) {
    const matched = offlineMatches.find(item => item.keywords.some(k => text.includes(k))) || offlineMatches[0]
    ctx.body = { code: 1, data: { modern: text, ...matched } }
    if (ctx.userId) {
      try { await db.execute('UPDATE users SET yayan_count = COALESCE(yayan_count, 0) + 1 WHERE id = ?', [ctx.userId]) } catch {}
    }
    return
  }

  try {
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `你是一位精通千古诗词与训诂学的文学院士。将用户的现代白话转译为中国古典诗词中的意境名句或对仗雅言。
请严格输出 JSON 格式：
{
  "ancient": "对应的一句高雅古典诗句或四六俪句",
  "author": "出处诗人（如：苏轼、李白等）",
  "explanation": "简短优美的文言释义（20字以内）"
}`
        },
        { role: 'user', content: `请将这句白话译为雅言：${text}` }
      ]
    })
    const res = JSON.parse(completion.choices[0].message.content)
    ctx.body = {
      code: 1,
      data: {
        modern: text,
        ancient: res.ancient || '偷得浮生半日闲，竹杖芒鞋轻胜马。',
        author: res.author || '苏轼',
        explanation: res.explanation || '清风怡情，信步幽林，极尽潇散之趣。'
      }
    }
  } catch (error) {
    console.error('白话雅译异常:', error.message)
    ctx.body = {
      code: 1,
      data: {
        modern: text,
        ancient: '偷得浮生半日闲，竹杖芒鞋轻胜马。',
        author: '苏轼',
        explanation: '清风怡情，信步幽林，极尽潇散之趣。'
      }
    }
  }

  // 登录用户沉淀白话雅言研习修持记录
  if (ctx.userId) {
    try {
      await db.execute('UPDATE users SET yayan_count = COALESCE(yayan_count, 0) + 1 WHERE id = ?', [ctx.userId])
    } catch {
      // 忽略沉淀异常
    }
  }
}

// 3. AI 一键考释赋魂接口 (迎请新友：输入诗人名字 -> 生成生平纪略、朋友圈、文风标签)
async function soulScholar(ctx) {
  const { name, dynasty = '宋' } = ctx.request.body || {}
  if (!name || typeof name !== 'string') {
    ctx.status = 400
    ctx.body = { code: 0, message: '请提供待赋魂之诗人名号' }
    return
  }

  // 预置经典诗人库（即时兜底）
  const presetScholars = {
    '辛弃疾': {
      name: '辛弃疾',
      title: '稼轩居士',
      dynasty: '宋',
      welcome: '醉里挑灯看剑，梦回吹角连营！今日幸会足下，且共论天下英雄事！',
      biography: '字幼安，号稼轩，南宋豪放派词宗。存词六百余首，文武双全，金戈铁马，报国之志终身不渝。',
      circle: ['陈亮（鹅湖同盟）', '朱熹', '刘过'],
      tags: ['豪迈悲壮', '气吞万里', '沉郁雄奇', '醉里挑灯']
    },
    '纳兰性德': {
      name: '纳兰性德',
      title: '通政使司',
      dynasty: '清',
      welcome: '人生若只如初见，何事秋风悲画扇。足下远道而来，容若且烹香茗相待。',
      biography: '字容若，号楞伽山人。清代第一初词人，贵族清流，性耽诗书，情深辞婉，如天边明月孤高出尘。',
      circle: ['顾贞观', '朱彝尊', '严绳孙'],
      tags: ['清丽婉约', '深情幽咽', '自然纯真', '人生初见']
    },
    '陶渊明': {
      name: '陶渊明',
      title: '靖节先生',
      dynasty: '晋',
      welcome: '采菊东篱下，悠然见南山。足下若不嫌山居简陋，且共饮一壶浊酒。',
      biography: '名潜，字元亮，世称靖节先生。田园诗派之鼻祖，不为五斗米折腰，采菊东篱，悠然避世。',
      circle: ['慧远', '颜延之', '刘遗民'],
      tags: ['恬淡宁静', '采菊东篱', '真率自然', '归去来兮']
    }
  }

  const client = getClient()
  if (!client || presetScholars[name]) {
    const matched = presetScholars[name] || {
      name,
      title: '名仕雅客',
      dynasty,
      welcome: `吾乃${name}，今日得晤雅客，实乃平生快事。`,
      biography: `${name}，${dynasty}代杰出文人，博通典籍，文风斐然，名垂青史。`,
      circle: ['当朝诸友', '文林知己'],
      tags: ['文采斐然', '诗心傲骨', '风雅长存']
    }
    ctx.body = { code: 1, data: matched }
    return
  }

  try {
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `你是一位精通中国历代文人文史档案的专家。为用户指定的古代文人完成“考释赋魂”，提供结构化生平档案。
请严格输出 JSON 格式：
{
  "name": "诗人姓名",
  "title": "文人雅号或头衔（如：稼轩居士、易安居士）",
  "dynasty": "所属朝代",
  "welcome": "先贤与雅客初逢时的第一句高雅对席问候（20-40字，引其代表作名句）",
  "biography": "生平与文学成就纪略（50-80字）",
  "circle": ["知己1（关系说明）", "知己2", "知己3"],
  "tags": ["文风性格标签1", "标签2", "标签3", "标签4"]
}`
        },
        { role: 'user', content: `请考释赋魂历史文人：${name}，朝代：${dynasty}` }
      ]
    })
    const res = JSON.parse(completion.choices[0].message.content)
    ctx.body = { code: 1, data: res }
  } catch (error) {
    console.error('考释赋魂异常:', error.message)
    ctx.body = {
      code: 1,
      data: {
        name,
        title: '名仕雅客',
        dynasty,
        welcome: `吾乃${name}，今日得晤雅客，实乃平生快事。`,
        biography: `${name}，${dynasty}代雅士，文心不辍，存世之作风骨清奇。`,
        circle: ['山野高人', '知己琴师'],
        tags: ['儒雅', '风骨', '博雅']
      }
    }
  }
}

// 4. 古诗词深度雅析与先贤亲解接口 (TRD v3.0 / 借鉴 zyai-fullstack 并升华)
const CLASSIC_APPRECIATIONS = {
  '水调歌头·明月几时有': {
    overview: '此词作于中秋，东坡兼怀子由。全词以月起兴，把出世与入世的彷徨化作「千里共婵娟」的旷达，豪放与深情兼备，为咏月千古绝唱。',
    translation: '明月从何时便有了呢？我端起酒杯询问青天。不知天上的宫阙仙境，今夜是哪一年。我本想乘风飞回天上，又恐琼楼玉宇高处耐不住清寒。翩翩起舞伴着清朗月影，哪里比得上在人间自在快活！',
    background: '宋神宗熙宁九年（1076），东坡在密州任知州。因政治变法坎坷外任，与胞弟苏辙已有五年未见。中秋良夜，东坡大醉，融哲思与离愁于一炉，写下此旷世篇章。',
    highlight: '「人有悲欢离合，月有阴晴圆缺，此事古难全。但愿人长久，千里共婵娟。」——以宇宙常理释怀人间离恨，境界高远。',
    sageVoice: '老夫当年在密州超然台上，痛饮达旦。望着那一轮冰轮，起初确有一腔孤冷，想乘风归去；但转念一想，琼楼虽好高处不胜寒，人间烟火才是真味！但愿天下知音，虽隔千里，共沐清辉。',
    sageId: 'sushi'
  },
  '将进酒': {
    overview: '诗仙李白以黄河奔涌起兴，把韶华易逝的悲慨与狂傲不羁的自信拧成一股浩荡天风，气势磅礴，韵律跌宕，是对生命尊严与自由的最强赞歌。',
    translation: '你难道看不见黄河之水自天上倾泻而来，浩浩荡荡奔向东海再不回还？你难道看不见高堂明镜中白发凄悲，早晨还是青丝如云傍晚便如飞雪？人生得意时便须痛快尽欢，切莫让金樽空对着明月！天生我这块料必有大用，千金散尽也自会卷土重来！',
    background: '唐玄宗天宝年间，李白被赐金放还，政治抱负破灭。与知交岑勋、元丹丘登高畅饮，酒兴大发，借杯中物倾吐胸中万丈不平之气与狂狷傲骨。',
    highlight: '「天生我材必有用，千金散尽还复来。」——千古绝唱，展现了笑傲王侯、睥睨凡俗的绝顶自信。',
    sageVoice: '吾太白一生狂傲，长安繁华虽好，却容不下吾这谪仙人！既然天子呼来不上船，那便痛饮千杯！休要提什么金樽空对月，天生我材，山河为席，何愁千金不复来！',
    sageId: 'libai'
  },
  '声声慢·寻寻觅觅': {
    overview: '易安以开篇十四叠字惊艳千古词坛，将国破家亡、颠沛流离后的孤凄心境写得层层递进、如泣如诉，婉约至极而骨力千钧。',
    translation: '苦苦寻觅，却只落得冷冷清清，怎一个凄凄惨惨戚戚。乍暖还寒的深秋时节，最是难以调养将息。饮下三两盏淡薄残酒，又怎敌得过晚来寒风凄厉？梧桐叶上更滴着沥沥细雨，直到黄昏，点点滴滴。这般无休止的愁绪，怎一个“愁”字了得！',
    background: '北宋沦亡后，易安南渡避难，丈夫赵明诚不幸病逝，金石书画流散大半。晚年孤居临安，秋风细雨之中，往昔欢悦与现世漂零交叠，遂成绝唱。',
    highlight: '「寻寻觅觅，冷冷清清，凄凄惨惨戚戚。」——十四叠字连用，由缓入急，将无端之悲刻画入骨。',
    sageVoice: '妾身这一生，曾有藕花深处的欢快，亦经金石碑版的唱和。然而金兵南下，明诚先去，天地虽大，何处是归舟？窗外梧桐细雨，点点滴滴皆打在心头，实难向外人道也。',
    sageId: 'liqingzhao'
  },
  '静夜思': {
    overview: '五言绝句浑然天成，以最朴素凝练之白描，勾勒千百年来每一位游子心头最柔软的乡思明月，无斧凿之痕而感人至深。',
    translation: '床前洒下一片皎洁月光，恍若秋夜初降的秋霜。禁不住抬起头凝望一轮清辉，低下头来思念故土家乡。',
    background: '唐玄宗开元十四年，二十六岁的李白旅居扬州旅舍。秋夜月明，身在异乡，清冷月光勾起游子无尽故里之思。',
    highlight: '「举头望明月，低头思故乡。」——一仰一俯之间，极度平淡，却字字千钧。',
    sageVoice: '当年吾客居扬州逆旅，夜深忽见一地霜白，举头见月，故土碎叶、峨眉山月顿上心头。诗者，直抒胸臆即可，何须繁复雕琢？',
    sageId: 'libai'
  },
  '春晓': {
    overview: '孟浩然捕捉春晓初醒的听觉意象，以鸟鸣与风雨传神，不著一字惜春，而惜春爱春之情跃然纸上。',
    translation: '春日酣眠不知不觉天已破晓，耳边处处传来清脆的鸟鸣。回想昨夜听到的风雨声声，那枝头落花不知零落了多少？',
    background: '孟浩然隐居鹿门山时期，在一个风雨初歇的春日清晨，推窗闻啼鸟而作。',
    highlight: '「夜来风雨声，花落知多少。」——见微知著，于静谧闲雅中寄寓造化生机。',
    sageVoice: '山中春睡极沉，天光破晓，啼鸟催醒。晨风中微有湿意，念及庭前花开花落，自有一番造化天趣。',
    sageId: null
  }
}

function matchSageKey(author = '') {
  if (!author || typeof author !== 'string') return null
  if (author.includes('李白') || author.includes('太白') || author.includes('青莲')) return 'libai'
  if (author.includes('苏轼') || author.includes('东坡') || author.includes('子瞻')) return 'sushi'
  if (author.includes('李清照') || author.includes('易安')) return 'liqingzhao'
  if (author.includes('杜甫') || author.includes('子美') || author.includes('少陵')) return 'dufu'
  if (author.includes('辛弃疾') || author.includes('稼轩') || author.includes('幼安')) return 'xinqiji'
  if (author.includes('王阳明') || author.includes('守仁')) return 'wangyangming'
  return null
}

async function appreciatePoem(ctx) {
  const { title = '', author = '', dynasty = '', content = [] } = ctx.request.body || {}
  if (!title.trim()) {
    ctx.status = 400
    ctx.body = { code: 0, message: '请提供待赏析之诗题' }
    return
  }

  const cleanTitle = title.trim()
  const cleanAuthor = author.trim()
  const sageKey = matchSageKey(cleanAuthor)
  const verses = Array.isArray(content) ? content.join(' ') : String(content || '')

  // 1. 优先命中本地经典赏析典范库
  for (const [key, val] of Object.entries(CLASSIC_APPRECIATIONS)) {
    if (cleanTitle.includes(key) || key.includes(cleanTitle)) {
      ctx.body = {
        code: 1,
        source: 'classic-vault',
        data: {
          ...val,
          sageId: val.sageId || sageKey
        }
      }
      return
    }
  }

  // 2. 尝试调用 DeepSeek 大模型结构化研墨
  const client = getClient()
  if (client) {
    try {
      const completion = await client.chat.completions.create({
        model: 'deepseek-chat',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `你是一位博古通今的文学院士与古典诗词美学大师。针对给出的古诗词，请进行精湛、文雅、结构化的多维鉴赏。
请严格输出 JSON 格式：
{
  "overview": "【意境总赏】100-160字，剖析诗词宏观艺术境界、情感基调与意象构建。",
  "translation": "【白话今译】优雅晓畅、保留诗意韵味的逐句白话对译。",
  "background": "【创作心境】80-140字，还原作者创作该诗时的身世经历、时代沧桑或心境流变。",
  "highlight": "【名句咀华】提炼最脍炙人口的警策佳句并给出精辟解构。",
  "sageVoice": "【先贤亲解/名家题记】若作者是李白/苏轼/李清照/杜甫/辛弃疾等名仕，以其第一人称本人口吻（如李白自称太白、苏轼自称老夫）自述创作此诗时的真实心声；若非先贤库人物，则以名家题跋口吻撰写寄语（80-120字）。",
  "sageId": "${sageKey || ''}"
}`
          },
          {
            role: 'user',
            content: `诗名：《${cleanTitle}》\n作者：${cleanAuthor}（${dynasty}）\n诗文：${verses}`
          }
        ]
      })
      const result = JSON.parse(completion.choices[0].message.content)
      ctx.body = {
        code: 1,
        source: 'deepseek-ai',
        data: {
          overview: result.overview || '此篇文辞雅健，意境旷远，声情相称，极具宋韵风骨。',
          translation: result.translation || '清风入弦，词句自得，言尽而意无穷。',
          background: result.background || `${cleanAuthor}借景抒怀，借物寄意，笔底自有一番平生阅历与时代浩叹。`,
          highlight: result.highlight || verses.slice(0, 30) || '句法对仗，音律谐婉。',
          sageVoice: result.sageVoice || `此作乃吾平生性灵所聚，得遇今之知音，亦足慰平生。`,
          sageId: sageKey
        }
      }
      return
    } catch (err) {
      console.warn('DeepSeek 诗词赏析异常，降级至文风推演兜底:', err.message)
    }
  }

  // 3. 离线/异常优雅降级（根据诗词要素动态生成高雅结构化赏析）
  ctx.body = {
    code: 1,
    source: 'offline-vault',
    data: {
      overview: `此篇《${cleanTitle}》为${dynasty ? dynasty + '代' : ''}${cleanAuthor}之佳作。构思奇绝，取景澄澈，寄托深远，融写景、抒情与哲思于一体，具有极高之审美韵味。`,
      translation: verses ? `（译意）${verses.replace(/[，。！？；]/g, '；')}。字字珠玑，清新高拔。` : '意蕴悠长，词句朗畅，传世风流。',
      background: `${cleanAuthor}一生涉历世事，此篇作时，心境澄澈而寄怀深远，笔触既入世察微，亦出尘自适。`,
      highlight: verses.slice(0, 28) ? `「${verses.slice(0, 28)}…」——意象高妙，耐人寻味。` : '全篇对仗工整，起承转合浑然天成。',
      sageVoice: sageKey
        ? `吾当年写下此篇《${cleanTitle}》，不过是有感而发，直抒胸臆。今日足下抚卷品读，能领略其中微意否？`
        : `文心千古，墨痕犹温。此《${cleanTitle}》传至今日，君抚卷相看，便是千秋相逢。`,
      sageId: sageKey
    }
  }
}

const deepseekChatStream = require('../utils/scholarSSE').createScholarStream({ getClient, sages, generateSageReply, sanitizeSageReply, db, saveTurn: require('../utils/scholarLetters').saveTurn })

module.exports = {
  deepseekChatStream,
  deepseekChat,
  translateYayan,
  soulScholar,
  appreciatePoem
}

