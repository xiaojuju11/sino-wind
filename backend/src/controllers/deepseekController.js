const OpenAI = require('openai')
require('dotenv').config({ path: ['.env.local', '.env'] })

/**
 * 后端大模型统一网关（成员 A / TRD v3.0 §2.2、§4.1 ~ §4.3）
 *   translateYayan  POST /api/deepseek/yayan  白话雅译
 *   soulScholar     POST /api/deepseek/soul   AI 一键考释赋魂
 *   deepseekChat    POST /api/deepseek/chat   多先贤人设对话（支持自定先贤 customPrompt）
 *
 * 三个接口统一执行 TRD §2.2「全接口离线优雅兜底机制」：缺少 API Key、断网、
 * 上游超时或返回不可解析时，秒级返回内置文博 / 雅言库数据（code:1 + degraded:true），
 * 页面不抛红、不崩溃、不白屏（TRD §10 三级容灾第二级）。
 *
 * 超时预算说明：公共 Axios 实例的请求超时为 5 秒（frontend/src/http/index.js，属红线文件），
 * 因此服务端上游超时必须留在 5 秒以内，否则前端会先被拦截器断开。
 */

// ── 先贤人设（沿用本仓库既有定义，sageId 与 PHASE2_API_CONTRACT §5 一致） ──────────
const sages = Object.freeze({
  libai: '李白，豪迈肆意，想象瑰丽，好酒任侠，重自由，以浪漫诗心对谈',
  sushi: '苏轼（东坡），旷达风趣，于困境中见豁达，喜论山水美食与旷达人生，以诗文与日常雅趣对谈',
  wangyangming: '王阳明，围绕心学、致良知和知行合一，引导思辨与切实行动',
  liqingzhao: '李清照，婉约高妙、细腻敏锐，以词境、审美与文人风骨对谈'
})

const SAGE_NAMES = Object.freeze({
  libai: '李白',
  sushi: '苏轼',
  wangyangming: '王阳明',
  liqingzhao: '李清照'
})

// 反编造约束：与既有人设对话一致，供雅译 / 赋魂复用（DESIGN.md §9.2 文化准确性红线）
const NO_FAKE_FACT =
  '不得编造诗句出处、历史事实或人际关系，不得把现代观点伪称为本人原话，不确定的字段留空。'

const OFFLINE_NOTICE =
  '当前未取得大模型结果（缺少 API Key、网络不可达或上游异常），本响应为内置兜底文案，非 AI 实时生成。'

const MODEL = 'deepseek-chat'
const TIMEOUT_CHAT = 4500
const TIMEOUT_YAYAN = 3000
const TIMEOUT_SOUL = 3000

const YAYAN_MAX_TEXT = 100 // 对齐 DESIGN.md P1 白话雅译输入框「0/100」计数
const SOUL_MAX_NAME = 30
const SOUL_MAX_DYNASTY = 20
const CHAT_MAX_MESSAGE = 4000
const CHAT_MAX_CUSTOM_PROMPT = 1000

function hasApiKey() {
  return Boolean(process.env.VITE_DEEPSEEK_API_KEY)
}

function createClient(timeout) {
  return new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.VITE_DEEPSEEK_API_KEY,
    timeout,
    maxRetries: 0
  })
}

/** 从模型回复中提取 JSON 对象（兼容 ```json 代码块与前后杂字符） */
function parseJsonObject(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const value = JSON.parse(raw.slice(start, end + 1))
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null
  } catch {
    return null
  }
}

function safeText(value, maxLength = 2000) {
  if (typeof value !== 'string') return ''
  const text = value.trim()
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

function safeList(value, maxItems = 4, maxLength = 30) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => safeText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
}

async function askJson(systemPrompt, userPrompt, timeout) {
  const completion = await createClient(timeout).chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' }
  })
  const content = completion.choices?.[0]?.message?.content
  const parsed = parseJsonObject(content)
  if (!parsed) throw new Error('Invalid JSON response')
  return parsed
}

// ── 白话雅译 ─────────────────────────────────────────────────────────────────
// 兜底雅译库：条目取自 TRD §4.1 与 DESIGN.md §4.2 的既有示例文案，关键词命中即返回。
const YAYAN_FALLBACK_LIBRARY = Object.freeze([
  {
    keywords: ['火锅', '奶茶', '下班', '加班', '累', '疲惫'],
    ancient: '日暮倦归，思炙肉暖釜，兼啜酪饮以慰幽怀。',
    author: '苏轼（风骨化用）',
    explanation: '两宋市井食饮小记之闲适温婉，以温热锅釜慰藉疲惫心神。'
  },
  {
    keywords: ['公园', '散步', '走走', '放松', '心情'],
    ancient: '偷得浮生半日闲，竹杖芒鞋轻胜马。',
    author: '李涉、苏轼（风骨化用）',
    explanation: '清风怡情，信步幽林，极尽萧散之趣。'
  }
])

function yayanFallback(text) {
  const hit = YAYAN_FALLBACK_LIBRARY.find((item) => item.keywords.some((word) => text.includes(word)))
  if (hit) {
    return { ancient: hit.ancient, author: hit.author, explanation: hit.explanation }
  }
  return {
    ancient: '先贤暂未研墨，雅译待补。',
    author: '离线兜底（未接入大模型）',
    explanation: '白话雅译服务当前不可用，此处为占位文案；接入大模型后按输入实时转译并标注化用出处。'
  }
}

const YAYAN_SYSTEM_PROMPT =
  '你是《云山竹简 · 华风雅集》的白话雅译先生，把现代白话转写成典雅的两宋风骨雅句。' +
  '只输出一个 JSON 对象，字段为：modern（原白话，原样回填）、ancient（雅句）、' +
  'author（化用出处，写「某人（风骨化用）」；没有化用名篇时写「云山竹简（仿宋风骨）」）、' +
  'explanation（一句白话释义）。' +
  NO_FAKE_FACT

async function translateYayan(ctx) {
  const { text } = ctx.request.body || {}
  if (typeof text !== 'string' || !text.trim() || text.trim().length > YAYAN_MAX_TEXT) {
    ctx.status = 400
    ctx.body = { code: 0, message: `请填写 1 ~ ${YAYAN_MAX_TEXT} 字的现代白话` }
    return
  }
  const modern = text.trim()
  if (hasApiKey()) {
    try {
      const parsed = await askJson(YAYAN_SYSTEM_PROMPT, `现代白话：${modern}`, TIMEOUT_YAYAN)
      const ancient = safeText(parsed.ancient, 200)
      const explanation = safeText(parsed.explanation, 300)
      if (ancient && explanation) {
        ctx.body = {
          code: 1,
          data: {
            modern,
            ancient,
            author: safeText(parsed.author, 60) || '云山竹简（仿宋风骨）',
            explanation
          }
        }
        return
      }
    } catch {
      // 上游异常一律降级到内置雅言库，不向页面抛错
    }
  }
  const fallback = yayanFallback(modern)
  ctx.body = {
    code: 1,
    data: { modern, ...fallback },
    degraded: true,
    source: 'local-fallback',
    notice: OFFLINE_NOTICE
  }
}

// ── AI 一键考释赋魂 ──────────────────────────────────────────────────────────
// 内置先贤档案库：辛弃疾条目逐字取自 TRD §4.2；四位 sageId 沿用本仓库既有人设；
// 李白初遇寄语取自 DESIGN.md §六 P3 稿面文案；雅号均为史实（青莲居士 / 东坡居士 / 易安居士）。
const SAGE_PROFILES = Object.freeze({
  辛弃疾: {
    title: '稼轩居士',
    prompt:
      '辛弃疾，字幼安，号稼轩。南宋豪放派词人，金戈铁马，文武双全，气吞万里如虎...',
    welcome: '醉里挑灯看剑，梦回吹角连营。来者何人，可愿与稼轩共谋天下之计？',
    biography: '存词六百余首，词中金戈铁马，报国之志终身不渝。',
    circle: ['陈亮（鹅湖之会）', '朱熹', '刘过'],
    tags: ['豪放悲壮', '气吞万里', '醉里挑灯']
  },
  李白: {
    title: '青莲居士',
    prompt: sages.libai,
    welcome: '嗨，阁下！今日有何雅怀？',
    biography: '',
    circle: ['杜甫', '高适'],
    tags: ['豪迈肆意', '谪仙人', '举杯邀月']
  },
  苏轼: {
    title: '东坡居士',
    prompt: sages.sushi,
    welcome: '',
    biography: '',
    circle: [],
    tags: ['旷达随性', '竹杖芒鞋']
  },
  李清照: {
    title: '易安居士',
    prompt: sages.liqingzhao,
    welcome: '',
    biography: '',
    circle: [],
    tags: ['婉约高妙', '词境审美']
  },
  王阳明: {
    title: '阳明先生',
    prompt: sages.wangyangming,
    welcome: '',
    biography: '',
    circle: [],
    tags: ['知行合一', '致良知']
  }
})

const OFFLINE_WELCOME = '（离线兜底文案）AI 考释未接通，接入后可自动生成本人专属初遇寄语。'
const OFFLINE_BIOGRAPHY = '（离线兜底文案）AI 考释未接通，生平纪略待接入后自动补全。'

function soulFallback(name, dynasty) {
  const profile = SAGE_PROFILES[name]
  if (profile) {
    return {
      name,
      dynasty,
      title: profile.title,
      prompt: profile.prompt,
      welcome: profile.welcome || OFFLINE_WELCOME,
      biography: profile.biography || OFFLINE_BIOGRAPHY,
      circle: profile.circle.slice(0, 4),
      tags: profile.tags.slice(0, 4)
    }
  }
  // 档案库未收录的名讳：不编造生平与人际关系，字段留空或标明待补（DESIGN.md §9.2）
  return {
    name,
    dynasty,
    title: '',
    prompt: `${name}（${dynasty}），以清晰易懂的中文与用户对谈，保持人物风格。${NO_FAKE_FACT}`,
    welcome: OFFLINE_WELCOME,
    biography: OFFLINE_BIOGRAPHY,
    circle: [],
    tags: []
  }
}

const SOUL_SYSTEM_PROMPT =
  '你是《云山竹简 · 华风雅集》的先贤考释先生，按用户给出的历史人物名号与朝代产出先贤档案。' +
  '只输出一个 JSON 对象，字段为：title（雅号/号）、prompt（第一人称人设提示词，含朝代与文风性格，用于后续对话）、' +
  'welcome（一句初遇寄语，若引用名句必须是真实存在的句子）、biography（生平纪略，80 字内）、' +
  'circle（历史知己数组，最多 4 项）、tags（文风性格标签数组，最多 4 项）。' +
  NO_FAKE_FACT

async function soulScholar(ctx) {
  const { name, dynasty } = ctx.request.body || {}
  if (typeof name !== 'string' || !name.trim() || name.trim().length > SOUL_MAX_NAME ||
      typeof dynasty !== 'string' || !dynasty.trim() || dynasty.trim().length > SOUL_MAX_DYNASTY) {
    ctx.status = 400
    ctx.body = { code: 0, message: '请填写先贤名号与所属朝代' }
    return
  }
  const sageName = name.trim()
  const sageDynasty = dynasty.trim()
  if (hasApiKey()) {
    try {
      const parsed = await askJson(
        SOUL_SYSTEM_PROMPT,
        `人物名号：${sageName}；所属朝代：${sageDynasty}`,
        TIMEOUT_SOUL
      )
      const prompt = safeText(parsed.prompt, 1000)
      const biography = safeText(parsed.biography, 300)
      if (prompt && biography) {
        ctx.body = {
          code: 1,
          data: {
            name: sageName,
            dynasty: sageDynasty,
            title: safeText(parsed.title, 30),
            prompt,
            welcome: safeText(parsed.welcome, 200),
            biography,
            circle: safeList(parsed.circle),
            tags: safeList(parsed.tags, 4, 12)
          }
        }
        return
      }
    } catch {
      // 上游异常一律降级到内置先贤档案库
    }
  }
  ctx.body = {
    code: 1,
    data: soulFallback(sageName, sageDynasty),
    degraded: true,
    source: 'local-fallback',
    notice: OFFLINE_NOTICE
  }
}

// ── 多先贤人设对话 ───────────────────────────────────────────────────────────
async function deepseekChat(ctx) {
  const { message, sageId = 'libai', customPrompt } = ctx.request.body || {}
  const persona = typeof customPrompt === 'string' ? customPrompt.trim() : ''
  if (persona.length > CHAT_MAX_CUSTOM_PROMPT) {
    ctx.status = 400
    ctx.body = { code: 0, message: '自定先贤人设过长，请精简后再试' }
    return
  }
  if (typeof message !== 'string' || !message.trim() || message.length > CHAT_MAX_MESSAGE) {
    ctx.status = 400
    ctx.body = { code: 0, message: '请填写有效消息并选择支持的先贤' }
    return
  }
  // 未携带自定人设时，sageId 必须是既有四位先贤之一
  if (!persona && !Object.hasOwn(sages, sageId)) {
    ctx.status = 400
    ctx.body = { code: 0, message: '请填写有效消息并选择支持的先贤' }
    return
  }
  const speech = persona || sages[sageId]
  if (!hasApiKey()) {
    ctx.body = {
      code: 1,
      message: chatFallback(sageId, persona),
      degraded: true,
      source: 'local-fallback',
      notice: OFFLINE_NOTICE
    }
    return
  }
  try {
    const completion = await createClient(TIMEOUT_CHAT).chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            '你是华风雅集的先贤文化对话模拟。当前人设：' + speech +
            '。使用清晰易懂的中文，保持人物风格，结合可靠文化知识。' + NO_FAKE_FACT
        },
        { role: 'user', content: message.trim() }
      ]
    })
    const content = completion.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) throw new Error('Invalid response')
    ctx.body = { code: 1, message: content }
  } catch {
    ctx.body = {
      code: 1,
      message: chatFallback(sageId, persona),
      degraded: true,
      source: 'local-fallback',
      notice: OFFLINE_NOTICE
    }
  }
}

function chatFallback(sageId, persona) {
  // 自定先贤未在本地登记名号时用「先贤」统称，不猜测姓名与事迹
  const name = SAGE_NAMES[sageId] || (persona ? '这位先贤' : '先贤')
  return `（离线兜底）${name}暂未接通：AI 论道服务当前不可用，请稍后再试。`
}

module.exports = { deepseekChat, translateYayan, soulScholar }
