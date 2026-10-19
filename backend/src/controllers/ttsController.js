const { synthesizeSpeech, synthesizePoemTTS } = require('../services/ttsService')

/**
 * 诗词与文人语音合成控制器
 */
async function handleTTS(ctx) {
  const isGet = ctx.method === 'GET'
  const params = isGet ? ctx.query : (ctx.request.body || {})
  
  const title = params.title || ''
  const author = params.author || ''
  const rawText = params.text || params.content || ''
  const text = Array.isArray(rawText) ? rawText.join('，') : String(rawText || '').trim()
  const voice = params.voice || ''
  const rate = params.rate || '-10%'

  try {
    const result = title || author
      ? await synthesizePoemTTS({ title, author, text, voice, rate })
      : await synthesizeSpeech({ text, voice, rate })

    if (isGet && ctx.query.redirect === '1') {
      ctx.redirect(result.url)
      return
    }

    ctx.body = {
      code: 1,
      message: '合成成功',
      data: result
    }
  } catch (err) {
    console.error('[TTS Controller Error]:', err.message || err)
    ctx.status = /不能为空|不能超过|不支持/.test(err.message || '') ? 400 : 503
    ctx.body = {
      code: 0,
      message: err.message || '语音合成失败，请稍后重试'
    }
  }
}

module.exports = {
  handleTTS
}
