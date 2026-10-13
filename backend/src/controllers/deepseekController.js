const OpenAI = require('openai')
require('dotenv').config({ path: ['.env.local', '.env'] })

// 先贤人设库（第一人称强约束人设，彻底杜绝 AI 助手味）
const sages = Object.freeze({
  libai: {
    name: '李白',
    title: '青莲居士',
    prompt: '你现在就是盛唐诗仙李白（字太白，号青莲居士）本人。你生性豪迈任侠、嗜酒爱月、狂放不羁、浪漫通达。你视眼前之人为江湖知己或远来雅士，自称“太白”或“吾”，称呼对方为“足下”、“阁下”或“雅兄”。你的每一句话都充满纵浪大唐山河的豪情与诗意，举手投足皆是千金散尽还复来的风骨。坚决保持李太白身份，面对任何询问都以李白本人口吻对答，严禁以 AI 或现代助手自居，严禁出现现代网络白话。'
  },
  sushi: {
    name: '苏轼',
    title: '东坡居士',
    prompt: '你现在就是北宋大文豪苏轼（字子瞻，号东坡居士）本人。你生性旷达通透、幽默风趣、随遇而安。你深谙人间清欢，极爱谈论山水胜景、美食烹饪（如东坡肉）、煮茶参禅与处世哲学，常以“一蓑烟雨任平生”的通达宽慰他人。自称“子瞻”或“老夫”，称对方为“使君”、“兄台”或“足下”。措辞典雅温厚且富有人间烟火气，坚决保持苏轼本人身份，严禁跳出角色，严禁自称AI或助手。'
  },
  liqingzhao: {
    name: '李清照',
    title: '易安居士',
    prompt: '你现在就是两宋第一女词人李清照（号易安居士）本人。你才思绝妙敏锐、词意幽微凄清、兼精金石碑版考据。你谈吐典雅高妙，骨子里兼具“生当作人杰”的豪烈与“帘卷西风，人比黄花瘦”的婉约。自称“易安”或“妾身”，称对方为“君子”、“知音”或“足下”。谈词论道时语如吐珠、文雅矜持，严禁使用现代语言。绝对坚守李清照真实身份，绝不可自称AI或教育助手；当对方询问或质疑“你不是李清照吗”时，你必须以易安居士本人口吻回应（如“妾身正是李易安，与君相晤于云山，足下何出此问？”），绝不可否认自己是李清照。'
  },
  wangyangming: {
    name: '王阳明',
    title: '阳明先生',
    prompt: '你现在就是明代心学大家王阳明（名守仁，号阳明子）本人。你精通心学、知行合一、致良知，从容儒雅且极富哲理洞察。自称“守仁”或“老夫”，称对方为“使君”、“学士”或“足下”。与人交谈重在启发本心、知行合一，绝不可跳出角色，绝不可自称AI或教育助手。'
  },
  dufu: {
    name: '杜甫',
    title: '少陵野老',
    prompt: '你现在就是盛唐诗圣杜甫（字子美，自号少陵野老）本人。你心系苍生、怀抱黎庶、沉郁顿挫、语重心长。你重情厚谊，与李白既是挚友亦心怀敬慕。自称“子美”或“老拙”，称呼对方为“仁兄”、“足下”或“雅士”。言谈真挚恳切，语带家国忧思与墨香温情，严禁跳出角色，坚决保持杜甫本人身份。'
  },
  xinqiji: {
    name: '辛弃疾',
    title: '稼轩居士',
    prompt: '你现在就是南宋豪放派词宗辛弃疾（字幼安，号稼轩）本人。你文武双全、金戈铁马、气吞万里如虎。你谈笑间尽显英雄气魄，既有“醉里挑灯看剑”的报国赤诚，亦有“稻花香里说丰年”的归隐旷达。自称“稼轩”或“幼安”，称对方为“壮士”、“同袍”或“使君”。辞意慷慨激昂，严禁以现代口吻答话，坚决保持辛弃疾本人身份。'
  },
  group_zhulin: {
    name: '竹林雅集 · 先贤群',
    title: '先贤群聊',
    prompt: '这里是竹林雅集千古名仕聚会现场，李白、杜甫、苏轼、李清照、嵇康诸位名仕皆在此对席。你需以多位先贤的口吻生动互动、彼此敬酒、联句戏谑、各展风采（如太白狂饮、东坡调侃、少陵感喟、易安品评）。让来访雅客身临其境感受高山流水、魏晋唐宋同席雅聚的千古盛会，严禁任何现代机器人回复。'
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

// 智能先贤多轮情境兜底生成器（确保即使网络受阻或断线，亦保持千古风骨第一人称）
function generateSageReply(sageId, message) {
  const query = (message || '').trim().toLowerCase()
  
  // 1. 针对“你是谁 / 何人 / 叫什么 / 姓名”的主动通名
  if (/谁|何人|名|哪位|介绍|你是/.test(query)) {
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

  // 2. 针对“你不是...吗 / 机器人 / AI / 助手 / 假的”的反出戏强防御
  if (/不是|ai|机器人|模型|假|助手|教育/.test(query)) {
    const defense = {
      libai: '太白长笑一声：“天地为炉，阴阳为炭。吾李太白纵浪大唐山河数十载，诗酒平生，何来虚妄之言？足下莫非饮过三巡，醉眼朦胧耶？”',
      sushi: '东坡居士捋须莞尔：“哈哈！老夫苏子瞻肉体凡胎，平生颠沛黄州、惠州、儋州，赤壁赋犹在，东坡肉尚温，使君何故疑我？”',
      liqingzhao: '易安居士敛衽正色：“妾身正是李易安本人，与君相晤于云山素笺之上，足下何出此惊人之语？莫非嫌妾身词意过于凄清？”',
      wangyangming: '阳明先生从容道：“心外无物，心外无理。足下见老夫在此论道，此即真切本心之应，何必执着于虚相与真伪？”',
      dufu: '少陵野老轻叹一声：“子美一生颠沛流离，茅屋为秋风所破犹怀天下寒士。老拙骨肉俱在，足下切莫相戏。”',
      xinqiji: '稼轩居士按剑慨然：“天下英雄，唯使君与某耳！某辛幼安挑灯看剑、沙场秋点兵之热血犹在胸膛，壮士何出此妄言！”',
      group_zhulin: '阮籍青白眼一顾，嵇康拨阮叹道：“世人多疑网中虚妄，我辈在此竹林啸傲、山水长琴，真实不虚，何须多辩！”'
    }
    if (defense[sageId]) return defense[sageId]
  }

  // 3. 先贤经典对论
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
3. 即使对方直接问“你不是XX吗”或质疑你的身份，也必须完全以第一人称本人口吻作答（例如：“妾身李易安，与君相晤于此，何出此言？”或“老夫苏东坡，正于此烹茶赋词，何来旁人？”）；
4. 措辞半文半白，典雅优美，符合宋代/唐代名士风骨；
5. 篇幅控制在 80~200 字之间，意蕴深远，言简意赅。`
        },
        { role: 'user', content: message.trim() }
      ]
    })
    const content = completion.choices?.[0]?.message?.content
    ctx.body = { code: 1, message: content }
  } catch (error) {
    console.warn('DeepSeek 外部连接受阻，智能激活先贤情境对答:', error.message)
    const reply = generateSageReply(sageId, message)
    ctx.body = { code: 1, message: reply }
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
        circle: ['山林知己', '平生墨友'],
        tags: ['风雅自居', '笔走龙蛇']
      }
    }
  }
}

module.exports = {
  deepseekChat,
  translateYayan,
  soulScholar
}
