const Router = require('koa-router')
const { Worker } = require('node:worker_threads')
const path = require('node:path')
const router = new Router({ prefix: '/api/poetry-frequency' })
let worker, sequence = 0
const pending = new Map()
function call(kind, query) {
  if (pending.size >= 12) return Promise.reject(Object.assign(Error('诗库正在检索，请稍后再试'), { status: 503 }))
  if (!worker) {
    const current = worker = new Worker(path.resolve(__dirname, '../utils/frequencyWorker.cjs'))
    current.on('message', message => {
      const job = pending.get(message.id); if (!job) return
      clearTimeout(job.timer); pending.delete(message.id)
      if (message.error) job.reject(Object.assign(Error(message.error), { status: message.status })); else job.resolve(message.result)
    })
    const fail = error => {
      if (worker !== current) return
      worker = undefined
      for (const job of pending.values()) { clearTimeout(job.timer); job.reject(Object.assign(Error('诗库暂未就绪，请重试'), { status: 503 })) }
      pending.clear(); console.error('[poetry-frequency]', error.message)
    }
    current.on('error', fail); current.on('exit', code => fail(Error(`Worker exit ${code}`)))
  }
  const current = worker
  return new Promise((resolve, reject) => {
    const id = ++sequence
    const timer = setTimeout(() => { current.terminate() }, 30000)
    pending.set(id, { resolve, reject, timer }); current.postMessage({ id, kind, query })
  })
}
function query(ctx) {
  const q = ctx.query
  if (Object.values(q).some(v => typeof v !== 'string')) ctx.throw(400, '参数格式错误')
  if (q.corpus && !['tang', 'song'].includes(q.corpus)) ctx.throw(400, '请选择唐诗或宋词')
  if (q.mode && !['char', 'word'].includes(q.mode)) ctx.throw(400, '统计方式错误')
  if ((q.author || '').length > 40 || (q.title || '').length > 80 || (q.term || '').length > 20) ctx.throw(400, '检索内容过长')
  return { corpus: q.corpus || '', author: (q.author || '').trim(), title: (q.title || '').trim(), mode: q.mode || 'char', stop: q.stop === '1', limit: 30 }
}
router.get('/meta', async ctx => { ctx.body = await call('meta', {}) })
router.get('/stats', async ctx => { ctx.body = await call('stats', query(ctx)) })
router.get('/contexts', async ctx => {
  const q = query(ctx), page = Number(ctx.query.page || '1'), term = ctx.query.term || ''
  if (!/^\p{Script=Han}+$/u.test(term) || !Number.isInteger(page) || page < 1 || page > 10000) ctx.throw(400, '字词或页码错误')
  ctx.body = await call('contexts', { ...q, term, page })
})
router.get('/poems/:id', async ctx => {
  if (!/^[a-f0-9]{20}$/.test(ctx.params.id)) ctx.throw(400, '篇目编号错误')
  ctx.body = await call('poem', { id: ctx.params.id })
})
module.exports = router
