const OpenAI = require('openai')
const dotenv = require('dotenv')

dotenv.config({
  path: ['.env.local', '.env']
})

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.VITE_DEEPSEEK_API_KEY,
});


async function deepseekChat(ctx) {
  const { message } = ctx.request.body
  if (!message) {
    ctx.status = 400
    ctx.body = { message: '消息不能为空', code: 0 }
    return
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "你是一个专业的教育助手" },
        { role: "user", content: message },
      ],
      model: "deepseek-chat",
    });
    ctx.body = {
      code: 1,
      message: completion.choices[0].message.content
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      message: '请求失败',
      code: 0,
      error: error.message
    }
  }
}

module.exports = {
  deepseekChat
}