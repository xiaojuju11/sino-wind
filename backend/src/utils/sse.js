const { PassThrough } = require('node:stream')
const { once } = require('node:events')

// Koa owns the response; downstream disconnects cancel both heartbeat and upstream.
function openSSE(ctx, timeoutMs = 30000) {
  const stream = new PassThrough({ highWaterMark: 16384 })
  const controller = new AbortController()
  const originalOnError = ctx.onerror
  ctx.onerror = function (error) {
    // A reader cancelling its own SSE is an ordinary disconnect, not a server fault.
    if (controller.signal.aborted && error?.code === 'ERR_STREAM_PREMATURE_CLOSE') return
    return originalOnError.call(this, error)
  }
  ctx.status = 200
  ctx.set('Content-Type', 'text/event-stream; charset=utf-8')
  ctx.set('Cache-Control', 'no-cache, no-transform')
  ctx.set('X-Accel-Buffering', 'no')
  ctx.body = stream
  const abort = () => controller.abort()
  const deadline = setTimeout(abort, timeoutMs)
  const heartbeat = setInterval(() => {
    if (!controller.signal.aborted && !stream.destroyed && stream.writableLength < 16384) stream.write(': heartbeat\n\n')
  }, 8000)
  ctx.res.once('close', abort)
  stream.once('error', abort)
  const send = async (event, data) => {
    if (controller.signal.aborted || stream.destroyed) throw new Error('Stream closed')
    if (!stream.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)) {
      await once(stream, 'drain', { signal: controller.signal })
    }
  }
  const close = () => {
    clearTimeout(deadline)
    clearInterval(heartbeat)
    ctx.res.removeListener('close', abort)
    controller.abort()
    if (!stream.destroyed) stream.end()
  }
  return { send, close, signal: controller.signal }
}
module.exports = { openSSE }
