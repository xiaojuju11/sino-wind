const axios = require('axios')
const db = require('../config/db')
const { searchPoemsDeepSeek } = require('./deepseekController')
// 搜索兜底诗词库（84 首经典作品 / 248 联，取自 feihuaCorpus 原文，保留原诗文序与出处）。
// 原实现只有 2 首（静夜思/春晓），导致搜「山」「水」「酒」直接返回空结果。
const fallback = require('../data/poemFallback')
// 兜底搜索：按 标题/作者/正文 命中关键词，命中数多的排前面（确定性排序，便于测试与体验一致）
function searchFallback(keyword) {
  const kw = typeof keyword === 'string' ? keyword.trim() : ''
  if (!kw) return fallback.slice(0, 50)
  const scored = []
  for (const p of fallback) {
    const inTitle = p.title.includes(kw) ? 3 : 0
    const inAuthor = p.author.includes(kw) ? 2 : 0
    const body = p.fullText || p.content.join('')
    const inBody = body.includes(kw) ? 1 : 0
    const score = inTitle + inAuthor + inBody
    if (score > 0) scored.push({ p, score })
  }
  scored.sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title, 'zh'))
  return scored.slice(0, 50).map(x => x.p)
}
const cache = new Map(), pending = new Map()
const ttl = 60000

// ── 随机诗词预取池（消除「进页面等上游」造成的空屏）────────────────────────────
// 背景：上游诗泉单次取数约 2.6~4 秒，而 /api/poem/random 原来的缓存只有 2 秒，
// 于是每次进页面（间隔超过 2 秒）都要同步等一次上游，页面 loading 期间没有内容。
// 方案：后台预取若干首真实诗词放进池子，请求时**即时出池**并触发后台补池；
// 池空但有上一首真实诗时先返上一首（stale-while-revalidate）；
// 冷启动才等待，且最多等 RANDOM_WAIT_MS，超时立刻给内置兜底诗，绝不让页面干等。
const RANDOM_POOL_SIZE = 4
const RANDOM_WAIT_MS = 1500
const RANDOM_MAX_ATTEMPTS = 6
const randomPool = []
let lastRandom = null
let refilling = false
let inflightRandom = null

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }

function normalize(poem) {
  const result = { id: String(poem.id ?? ''), title: poem.title, author: typeof poem.author === 'string' ? poem.author : poem.author?.name,
    dynasty: typeof poem.dynasty === 'string' ? poem.dynasty : poem.dynasty?.name,
    content: Array.isArray(poem.content) ? poem.content : typeof poem.content === 'string' ? poem.content.split(/\r?\n/) : [], appreciation: typeof poem.appreciation === 'string' ? poem.appreciation : '', metadataVerified: false }
  result.dynasty = typeof result.dynasty === 'string' && result.dynasty.trim() ? result.dynasty.trim() : '待考'
  if (!result.id || result.id.length > 64 || typeof result.title !== 'string' || !result.title.trim() || typeof result.author !== 'string' || !result.author.trim() || !result.content.length || result.content.some(line => typeof line !== 'string' || !line.trim())) throw Error('Invalid upstream poem')
  return result
}

/** 真正打上游；上游异常不抛出，返回内置兜底（degraded:true） */
async function fetchUpstream(kind, keyword = '') {
  try {
    // 搜索端点：**仍未找到上游可用的关键词检索接口**，暂保持原路径 /api/search。
    //   已排除的可能性（2026-10-15 实测）：
    //     · /api/search?q=…        → 400（对任何参数组合都 400）
    //     · /api/poems?q=…         → 200 但【完全忽略 q】，传与不传返回同一批 20 条
    //     · /api/poems/search?q=…  → 400
    //   结论：不可用 /api/poems 冒充搜索端点（会导致"搜什么都返回同一批诗"，比降级更糟）。
    //   待确认上游真正的检索契约后再修；在此之前搜索继续走本地兜底（degraded:true）。
    const response = await axios.get('https://poetry.palemoky.com' + (kind === 'random' ? '/api/poems/random' : '/api/search'), {
      params: { lang: 'zh-Hans', ...(kind === 'search' ? { q: keyword } : {}) }, timeout: 4000, signal: AbortSignal.timeout(4000), maxContentLength: 2 * 1024 * 1024
    })
    const data = response.data.data
    if (kind === 'random') return { data: normalize(data), source: 'shiquan', degraded: false }
    const list = Array.isArray(data) ? data : data?.poems ?? data?.results ?? data?.items
    if (!Array.isArray(list)) throw Error('Invalid upstream search')
    return { data: list.slice(0, 50).map(normalize), source: 'shiquan', degraded: false }
  } catch {
    return { data: kind === 'random' ? fallback[Math.floor(Math.random() * fallback.length)] : searchFallback(keyword), source: 'local-fallback', degraded: true }
  }
}

/** 带缓存与并发合并的取数（搜索仍走这里；随机走下面的池子） */
async function query(kind, keyword = '') {
  const key = kind + ':' + keyword
  const saved = cache.get(key)
  if (saved && saved.expires > Date.now()) return saved.value
  if (pending.has(key)) return pending.get(key)
  // 不同关键词也受并发上限保护，避免绕过同键缓存压垮上游。
  if (pending.size >= 10) { const error = new Error('Poem service busy'); error.code = 'POEM_BUSY'; throw error }
  const request = (async () => {
    const value = await fetchUpstream(kind, keyword)
    if (cache.size >= 100) cache.delete(cache.keys().next().value)
    cache.set(key, { expires: Date.now() + (value.degraded ? 10000 : kind === 'random' ? 2000 : ttl), value })
    return value
  })()
  pending.set(key, request)
  try { return await request } finally { pending.delete(key) }
}

/** 取一首真实诗（并发去重：同一时刻只打一次上游） */
function prefetchOne() {
  if (!inflightRandom) {
    inflightRandom = fetchUpstream('random').finally(() => { inflightRandom = null })
  }
  return inflightRandom
}

function pushToPool(poem) {
  if (!poem || !poem.id) return false
  if (lastRandom && lastRandom.id === poem.id) return false
  if (randomPool.some((item) => item.id === poem.id)) return false
  randomPool.push(poem)
  return true
}

/** 后台把池子补到目标大小；上游不可用就停手，交给内置兜底 */
async function ensurePool() {
  if (refilling || randomPool.length >= RANDOM_POOL_SIZE) return
  refilling = true
  try {
    let attempts = 0
    while (randomPool.length < RANDOM_POOL_SIZE && attempts < RANDOM_MAX_ATTEMPTS) {
      attempts += 1
      const value = await prefetchOne()
      if (value.degraded) break
      pushToPool(value.data)
    }
  } catch {
    // 预取失败不影响任何请求路径
  } finally {
    refilling = false
  }
}

/**
 * 随机取诗：优先即时出池 → 其次是上一首真实诗 → 冷启动才短暂等待（≤1.5s）→ 兜底诗。
 * 返回值在契约字段之外附加 prefetched / stale，便于前端与日志区分「预热返回」。
 */
async function queryRandom() {
  if (randomPool.length) {
    const poem = randomPool.shift()
    lastRandom = poem
    ensurePool()
    return { data: poem, source: 'shiquan', degraded: false, prefetched: true }
  }
  if (lastRandom) {
    ensurePool()
    return { data: lastRandom, source: 'shiquan', degraded: false, prefetched: true, stale: true }
  }
  // 冷启动（进程刚起、池子还没预热完）：最多等 RANDOM_WAIT_MS
  const first = await Promise.race([prefetchOne(), sleep(RANDOM_WAIT_MS).then(() => null)])
  if (first && !first.degraded) {
    lastRandom = first.data
    ensurePool()
    return { data: first.data, source: 'shiquan', degraded: false, prefetched: true }
  }
  ensurePool()
  return { data: fallback[Math.floor(Math.random() * fallback.length)], source: 'local-fallback', degraded: true }
}

// 进程启动即预热，让第一位访客也走即时出池（失败不影响启动）
ensurePool()

const dataNotice = '第三方朝代字段存在已知错误，文化信息尚未经逐条核验；缺少赏析时请展示暂无赏析'
function present(poem) {
  const paragraphs = Array.isArray(poem.content) ? poem.content : []
  return { ...poem, paragraphs, bgArt: '', snippet: paragraphs.join('').slice(0, 100) }
}
async function random(ctx) {
  try {
    const value = await queryRandom()
    ctx.body = { code: 1, message: '获取成功', ...value, data: present(value.data), dataNotice }
  } catch { ctx.status = 429; ctx.body = { code: 0, message: '诗泉请求繁忙，请稍后再试' } }
}
async function search(ctx) {
  const q = ctx.query.q ?? ctx.query.keyword
  if (typeof q !== 'string' || !q.trim() || q.length > 100) { ctx.status = 400; ctx.body = { code: 0, message: '请输入 1–100 字的关键词' }; return }
  const cleanQ = q.trim()

  // 1. 优先调用 DeepSeek 大模型进行全息古诗词智能检索
  try {
    const aiResults = await searchPoemsDeepSeek(cleanQ)
    if (Array.isArray(aiResults) && aiResults.length > 0) {
      ctx.body = {
        code: 1,
        message: 'DeepSeek 智能寻诗成功',
        source: 'deepseek-ai',
        degraded: false,
        data: aiResults.map(present),
        dataNotice: '由 DeepSeek 智能诗词引擎甄选'
      }
      return
    }
  } catch (err) {
    console.warn('DeepSeek 搜诗异常，回退兜底检索:', err.message)
  }

  // 2. DeepSeek 未命中或异常时，走常规 query 或本地兜底
  try {
    const value = await query('search', cleanQ)
    ctx.body = { code: 1, message: '搜索成功', ...value, data: value.data.map(present), dataNotice }
  } catch {
    const localList = searchFallback(cleanQ)
    ctx.body = { code: 1, message: '搜索成功（典范库）', source: 'local-fallback', degraded: true, data: localList.map(present), dataNotice }
  }
}
async function collect(ctx) {
  const body = ctx.request.body || {}, input = body.poem || body
  const content = Array.isArray(input.content) ? input.content.join('\n') : input.content
  const poemId = input.poemId ?? input.poem_id ?? input.id ?? null
  const valid = (x, limit) => typeof x === 'string' && x.trim().length > 0 && x.length <= limit
  if ((Array.isArray(input.content) && input.content.some(line => typeof line !== 'string')) ||
      !valid(input.title, 100) || !valid(input.author, 50) || !valid(content, 20000) || (typeof content === 'string' && Buffer.byteLength(content, 'utf8') > 60000) ||
      (input.dynasty != null && !valid(input.dynasty, 30)) || (input.appreciation != null && (typeof input.appreciation !== 'string' || input.appreciation.length > 20000 || Buffer.byteLength(input.appreciation, 'utf8') > 60000)) ||
      (poemId != null && ((typeof poemId !== 'string' && typeof poemId !== 'number') || !valid(String(poemId), 64)))) {
    ctx.status = 400; ctx.body = { code: 0, message: '诗词字段不完整或超出长度限制' }; return
  }
  let connection
  try {
    connection = await db.getConnection()
    await connection.beginTransaction()
    const [users] = await connection.execute('SELECT id, poem_count FROM users WHERE id = ? FOR UPDATE', [ctx.userId])
    if (!users.length) { await connection.rollback(); ctx.status = 401; ctx.body = { code: 0, message: '请重新入席' }; return }
    const [existing] = await connection.execute('SELECT id FROM user_poems WHERE user_id = ? AND (poem_id = ? OR (title = ? AND author = ? AND content = ?)) LIMIT 1', [ctx.userId, poemId == null ? null : String(poemId), input.title.trim(), input.author.trim(), content])
    if (existing.length) { await connection.commit(); ctx.body = { code: 1, message: '已在诗笺中', newPoemCount: users[0].poem_count, id: existing[0].id, collected: false }; return }
    const [result] = await connection.execute('INSERT INTO user_poems (user_id, poem_id, title, author, dynasty, content, appreciation) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ctx.userId, poemId == null ? null : String(poemId), input.title.trim(), input.author.trim(), input.dynasty?.trim() || '待考', content, input.appreciation || null])
    await connection.execute('UPDATE users SET poem_count = COALESCE(poem_count, 0) + 1 WHERE id = ?', [ctx.userId])
    const [[updated]] = await connection.execute('SELECT poem_count FROM users WHERE id = ?', [ctx.userId])
    await connection.commit()
    ctx.body = { code: 1, message: '已成功摘录入卷', newPoemCount: updated.poem_count, id: result.insertId, collected: true }
  } catch {
    if (connection) await connection.rollback().catch(() => {})
    ctx.status = 503; ctx.body = { code: 0, message: '摘录服务暂不可用，请稍后重试' }
  } finally { if (connection) connection.release() }
}
// 供成员 C 的“我的诗笺”读取，用户身份仅取自已验证的 Token。
async function collection(ctx) {
  const page = Number(ctx.query.page || 1), pageSize = Number(ctx.query.pageSize || 20)
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    ctx.status = 400; ctx.body = { code: 0, message: '分页参数无效' }; return
  }
  try {
    const [rows] = await db.query('SELECT id, poem_id, title, author, dynasty, content, appreciation, created_at FROM user_poems WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?', [ctx.userId, pageSize, (page - 1) * pageSize])
    const [[total]] = await db.execute('SELECT COUNT(*) AS total FROM user_poems WHERE user_id = ?', [ctx.userId])
    ctx.body = { code: 1, message: '获取成功', data: rows, pagination: { page, pageSize, total: total.total } }
  } catch { ctx.status = 503; ctx.body = { code: 0, message: '诗笺暂未获取，请稍后重试' } }
}
async function myList(ctx) {
  try {
    const [rows] = await db.execute('SELECT id, poem_id, title, author, dynasty, content, appreciation, created_at FROM user_poems WHERE user_id = ? ORDER BY created_at DESC, id DESC', [ctx.userId])
    ctx.body = { code: 1, message: '获取成功', data: rows }
  } catch { ctx.status = 503; ctx.body = { code: 0, message: '诗笺暂未获取，请稍后重试' } }
}

async function removeCollect(ctx) {
  const poemId = ctx.params?.id || ctx.request.body?.id || ctx.request.body?.poemId
  if (!poemId) {
    ctx.status = 400
    ctx.body = { code: 0, message: '请提供待移出之诗笺编号' }
    return
  }

  let connection
  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    // 查找该用户是否拥有此收藏（支持按记录自增 id 或上游 poem_id 匹配）
    const [existing] = await connection.execute(
      'SELECT id FROM user_poems WHERE user_id = ? AND (id = ? OR poem_id = ?) LIMIT 1',
      [ctx.userId, poemId, String(poemId)]
    )

    if (!existing.length) {
      await connection.rollback()
      ctx.body = { code: 1, message: '诗笺已移出或不存在', removed: false }
      return
    }

    const rowId = existing[0].id
    await connection.execute('DELETE FROM user_poems WHERE id = ?', [rowId])
    await connection.execute(
      'UPDATE users SET poem_count = GREATEST(0, COALESCE(poem_count, 1) - 1) WHERE id = ?',
      [ctx.userId]
    )
    const [[updated]] = await connection.execute('SELECT poem_count FROM users WHERE id = ?', [ctx.userId])
    await connection.commit()

    ctx.body = {
      code: 1,
      message: '已成功退卷归架',
      newPoemCount: updated?.poem_count ?? 0,
      removed: true
    }
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {})
    ctx.status = 503
    ctx.body = { code: 0, message: '移出诗笺暂不可用，请稍后重试' }
  } finally {
    if (connection) connection.release()
  }
}

module.exports = { random, search, collect, collection, myList, removeCollect }
