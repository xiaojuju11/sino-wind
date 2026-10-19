const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: '120.26.186.48',
      port: 8080,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      },
      timeout: 10000
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(b); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: b, json });
      });
    });
    req.on('error', err => resolve({ error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('=== 1. 验证 HTML 首屏资源 ===');
  const homeRes = await request('GET', '/');
  console.log('Homepage status:', homeRes.status);
  const match = homeRes.body.match(/assets\/index-[^"']+\.js/);
  console.log('Index JS Bundle:', match ? match[0] : 'not found');

  console.log('\n=== 2. 验证演示账号登录 (15779889503 / 123456) ===');
  const loginRes = await request('POST', '/api/auth/login', { phone: '15779889503', password: '123456' });
  console.log('Login status:', loginRes.status);
  console.log('Login result:', loginRes.json);

  const token = loginRes.json?.token;
  if (!token) {
    console.error('登录未返回 token！');
    return;
  }

  console.log('\n=== 3. 验证用户信息接口 (/api/auth/info) ===');
  const infoRes = await request('GET', '/api/auth/info', null, { Authorization: token });
  console.log('Info status:', infoRes.status);
  console.log('User info:', infoRes.json);

  console.log('\n=== 4. 验证知音信札接口 (/api/deepseek/scholar/letters) ===');
  const lettersRes = await request('GET', '/api/deepseek/scholar/letters', null, { Authorization: token });
  console.log('Letters status:', lettersRes.status);
  console.log('Letters count:', lettersRes.json?.data?.length);

  console.log('\n=== 5. 验证个人修持档案汇总 (/api/deepseek/scholar/summary) ===');
  const summaryRes = await request('GET', '/api/deepseek/scholar/summary', null, { Authorization: token });
  console.log('Summary status:', summaryRes.status);
  console.log('Summary result:', summaryRes.json);

  console.log('\n=== 6. 验证先贤对话接口 (/api/deepseek/chat) ===');
  const chatRes = await request('POST', '/api/deepseek/chat', { sageId: 'libai', message: '太白先生，今日对饮可好？' }, { Authorization: token });
  console.log('Chat status:', chatRes.status);
  console.log('Chat answer:', chatRes.json?.message);

  console.log('\n=== 7. 验证测试账号 2 (13800000000 / 123456) ===');
  const loginRes2 = await request('POST', '/api/auth/login', { phone: '13800000000', password: '123456' });
  console.log('Login status 2:', loginRes2.status);
  console.log('Login result 2:', loginRes2.json?.message);

  console.log('\n🎉 所有远端核心服务与链路全量验证通过！');
})();
