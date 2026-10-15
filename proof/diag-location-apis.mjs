// 核实两件事：
// ① pconline 是否带 CORS 头（决定浏览器能否直接调用）
// ② GBK 解码改法在 Node 侧是否可行
const urls = [
  ['pconline（他的首选）', 'https://whois.pconline.com.cn/ipJson.jsp?json=true'],
  ['ip-api（他的备选，明文）', 'http://ip-api.com/json/?lang=zh-CN'],
  ['ipwho.is（我用的）', 'https://ipwho.is/'],
  ['ipinfo.io（我用的备选）', 'https://ipinfo.io/json'],
]

for (const [name, url] of urls) {
  console.log('── ' + name + ' ──')
  try {
    const r = await fetch(url)
    const buf = Buffer.from(await r.arrayBuffer())
    const plain = buf.toString('latin1')
    const acao = r.headers.get('access-control-allow-origin')
    console.log('   HTTP ' + r.status + '   CORS(Access-Control-Allow-Origin) = ' + (acao || '（未声明 → 浏览器会拦）'))
    // pconline 是 GBK，单独两种解码对比
    if (name.includes('pconline')) {
      const asUtf8 = buf.toString('utf8')
      const asGbk = new TextDecoder('gbk').decode(buf)
      const cU = (() => { try { return JSON.parse(asUtf8).city } catch { return '(解析失败)' } })()
      const cG = (() => { try { return JSON.parse(asGbk).city } catch { return '(解析失败)' } })()
      console.log('   按 UTF-8 解 city = ' + JSON.stringify(cU) + '   ← 他当前的用法')
      console.log('   按 GBK  解 city = ' + JSON.stringify(cG) + '   ← 正确')
    } else {
      console.log('   ' + plain.slice(0, 100).replace(/\s+/g, ' '))
    }
  } catch (e) {
    console.log('   ❌ ' + e.message)
  }
  console.log('')
}
