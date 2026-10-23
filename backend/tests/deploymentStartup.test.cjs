const test = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const path = require('node:path')

test('验证码接口在 sharp 二进制不可用时仍可启动并返回真实 SVG', () => {
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict')
    const Module = require('node:module')
    const originalLoad = Module._load
    Module._load = function(name, ...args) {
      if (name === 'sharp') throw new Error('Missing platform binary')
      return originalLoad.call(this, name, ...args)
    }
    const http = require('node:http')
    const listen = http.Server.prototype.listen
    http.Server.prototype.listen = function() {
      const server = listen.call(this, 0, '127.0.0.1')
      server.once('listening', async () => {
        try {
          const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/auth/captcha')
          assert.equal(response.status, 200)
          const data = await response.json()
          assert.equal(data.code, 1)
          assert.ok(data.captchaId)
          assert.match(data.captchaSvg, /<svg/)
          process.exit(0)
        } catch (error) { console.error(error); process.exit(1) }
      })
      return server
    }
    require('./src/index.js')
  `], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 60000,
    env: { ...process.env, JWT_SECRET: 'deployment-test-secret-only-'.repeat(3) } })
  assert.equal(result.status, 0, [result.stdout, result.stderr, result.error?.message].filter(Boolean).join(String.fromCharCode(10)))
})

