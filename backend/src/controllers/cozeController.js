const axios = require('axios')
const dotenv = require('dotenv')

dotenv.config({ path: ['.env.local', '.env'] })

async function recognition(ctx) {
  const { img } = ctx.request.body
  // 向工作流发请求
  // 根据工作流示例，直接传递 image 参数
  const params = { image: img }

  try {
    // 确保 API key 正确获取，尝试多种可能的环境变量名称
    const apiKey = process.env.COZE_IMAGE_TO_TEXT_AND_VOICE || process.env.VITE_COZE_IMAGE_TO_TEXT_AND_VOICE || ''
    
    if (!apiKey) {
      throw new Error('API key not found')
    }
    
    console.log('API Key found:', apiKey.length > 0)
    console.log('Request params:', JSON.stringify(params, null, 2))
    
    const res = await axios({
      method: 'post',
      url: 'https://r85vf8qf77.coze.site/run',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: params
    })
    
    console.log('Coze API response:', JSON.stringify(res.data, null, 2))
    
    ctx.body = {
      code: 1,
      data: res.data
    }

  } catch (error) {
    console.error('Coze API error:', error.message)
    if (error.response) {
      console.error('Response data:', error.response.data)
      console.error('Response status:', error.response.status)
    }
    ctx.status = 500
    ctx.body = {
      code: 0,
      message: error.message
    }
  }
}

module.exports = {
  recognition
}