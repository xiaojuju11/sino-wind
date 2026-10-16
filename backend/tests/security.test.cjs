const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')

function load(file, dependencies = {}, processStub = process, directory) {
  const filename = path.resolve(__dirname, '../src', file), module = { exports: {} }
  const nativeRequire = createRequire(filename)
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    require: name => Object.hasOwn(dependencies, name) ? dependencies[name] : nativeRequire(name),
    module, exports: module.exports, __dirname: directory || path.dirname(filename), process: processStub,
    console: { log() {}, error() {}, warn() {} }, Buffer,
  }, { filename })
  return module.exports
}

function uploads() {
  const writes = [], reads = []
  const fakeFs = { ...fs, existsSync: () => true, readdirSync: () => [],
    statSync: () => ({ size: 0 }), promises: { ...fs.promises, writeFile: async file => writes.push(file) } }
  fakeFs.createReadStream = file => { reads.push(file); throw new Error('unexpected read') }
  return { api: load('controllers/uploadController.js', { fs: fakeFs }), writes, reads }
}
const hash = 'a'.repeat(24) + '_1024'

test('all upload routes reject traversal hashes before touching any files', async () => {
  for (const fileHash of ['../outside', '..\\outside', '/absolute', 'C:\\outside', {}, 'a/b']) {
    for (const method of ['checkFile', 'uploadChunk', 'mergeChunks']) {
      const f = uploads(), ctx = { request: { body: { fileHash, fileName: 'avatar.png', chunkIndex: 0, totalChunks: 1 } }, file: { buffer: Buffer.from('data') } }
      await f.api[method](ctx)
      assert.equal(ctx.status, 400, `${method} accepted ${String(fileHash)}`)
      assert.equal(f.writes.length + f.reads.length, 0)
    }
  }
})

test('chunk indexes must be bounded nonnegative integers, not file paths', async () => {
  for (const chunkIndex of ['../../../src/index.js', '..\\..\\escape', -1, 1.5, '1.5', 'Infinity', {}, 1000000]) {
    const f = uploads(), ctx = { request: { body: { fileHash: hash, chunkIndex } }, file: { buffer: Buffer.from('data') } }
    await f.api.uploadChunk(ctx)
    assert.equal(ctx.status, 400, `accepted ${String(chunkIndex)}`)
    assert.equal(f.writes.length, 0)
  }
})

test('normal frontend fingerprints and numeric multipart indexes remain compatible', async () => {
  const f = uploads(), ctx = { request: { body: { fileHash: hash, chunkIndex: '0' } }, file: { buffer: Buffer.from('data') } }
  await f.api.uploadChunk(ctx)
  assert.equal(ctx.body.code, 1)
  assert.equal(path.relative(path.resolve(__dirname, '../uploads_temp/chunks'), f.writes[0]), path.join(hash, '0'))
})

test('merge rejects noninteger or unbounded totals before opening streams', async () => {
  for (const totalChunks of [Infinity, 1.1, 'Infinity', -1, 0, 1000000]) {
    const f = uploads(), ctx = { request: { body: { fileHash: hash, fileName: 'avatar.png', totalChunks } } }
    await f.api.mergeChunks(ctx)
    assert.equal(ctx.status, 400)
    assert.equal(f.reads.length, 0)
  }
})

test('profile model cannot update primary keys or password hashes', async () => {
  const queries = [], db = { execute: async (...args) => { queries.push(args); return [{ affectedRows: 1 }] } }
  const model = load('models/userModel.js', { '../config/db.js': db })
  for (const input of [{ id: 42 }, { password_hash: 'replacement' }, {}, null, { nickname: '  ' }]) {
    await assert.rejects(model.updateUserInfo(input, 1))
  }
  assert.equal(queries.length, 0)
  await model.updateUserInfo({ nickname: '新雅士' }, 1)
  assert.match(queries[0][0], /UPDATE users SET nickname = \? WHERE id = \?/)
})

test('profile HTTP handler rejects sensitive and mixed fields before the model', async () => {
  let updates = 0
  const api = load('controllers/authController.js', {
    '../utils/jwt.js': { JWT_SECRET: 'x'.repeat(48) },
    '../models/userModel.js': { updateUserInfo: async () => { updates++; return { affectedRows: 1 } } },
    '../utils/captcha.js': {},
  })
  for (const body of [{ password_hash: 'replacement' }, { id: 42 }, { nickname: '雅士', id: 42 }, {}]) {
    const ctx = { userId: 1, path: '/api/auth/updateNickname', request: { body } }
    await api.updateUser(ctx)
    assert.equal(ctx.status, 400)
  }
  assert.equal(updates, 0)
})

test('avatar field permissions follow the router for trailing slashes and case variants', async () => {
  const updates = []
  const api = load('controllers/authController.js', {
    '../utils/jwt.js': { JWT_SECRET: 'x'.repeat(48) }, '../utils/captcha.js': {},
    '../models/userModel.js': { updateUserInfo: async params => { updates.push(params); return { affectedRows: 1 } } },
  })
  const router = load('routes/authRoutes.js', { '../controllers/authController.js': api,
    '../utils/jwt.js': { verifyToken: () => async (ctx, next) => { ctx.userId = 1; await next() } } })
  for (const route of ['/api/auth/updateAvatar', '/api/auth/updateAvatar/', '/api/auth/updateavatar']) {
    const ctx = { path: route, method: 'POST', request: { body: { avatar: '/uploads/avatars/example.png' } }, state: {} }
    await router.routes()(ctx, async () => {})
    assert.equal(ctx.body?.code, 1, route)
  }
  assert.equal(updates.length, 3)
  assert.ok(updates.every(params => params.avatar === '/uploads/avatars/example.png' && !Object.hasOwn(params, 'nickname')))
})

test('JWT fails closed when secret is absent, weak, or the old public fallback', () => {
  for (const secret of [undefined, '', 'short', 'sino_wind_gufeng_jwt_secret_2026']) {
    assert.throws(() => load('utils/jwt.js', { dotenv: { config() {} } }, { env: { JWT_SECRET: secret } }), /JWT_SECRET/)
  }
  const api = load('utils/jwt.js', { dotenv: { config() {} } }, { env: { JWT_SECRET: 'a'.repeat(48) } })
  assert.equal(api.JWT_SECRET.length, 48)
})

test('normal upload, resume, stream merge and instant upload work with real isolated files', async () => {
  const parent = path.resolve(__dirname, '../uploads_temp')
  fs.mkdirSync(parent, { recursive: true })
  const root = fs.mkdtempSync(path.join(parent, 'regression-'))
  try {
    const api = load('controllers/uploadController.js', {}, process, path.join(root, 'src/controllers'))
    for (const [chunkIndex, text] of ['first', '-second'].entries()) {
      const ctx = { request: { body: { fileHash: hash, chunkIndex: String(chunkIndex) } }, file: { buffer: Buffer.from(text) } }
      await api.uploadChunk(ctx); assert.equal(ctx.body.code, 1)
    }
    const before = { request: { body: { fileHash: hash, fileName: 'avatar.png' } } }
    await api.checkFile(before)
    assert.deepEqual(Array.from(before.body.data.uploadedChunks).sort(), [0, 1])
    const merge = { request: { body: { fileHash: hash, fileName: 'avatar.png', totalChunks: 2 } } }
    await api.mergeChunks(merge); assert.equal(merge.body.code, 1)
    assert.equal(fs.readFileSync(path.join(root, 'public', merge.body.data.url), 'utf8'), 'first-second')
    assert.equal(fs.existsSync(path.join(root, 'uploads_temp/chunks', hash)), false)
    const after = { request: before.request }; await api.checkFile(after)
    assert.equal(after.body.data.isUploaded, true)
    assert.ok(fs.readdirSync(path.join(root, 'public/uploads/avatars')).every(name => !name.endsWith('.part')))
  } finally {
    const relative = path.relative(parent, root)
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(root).startsWith('regression-'))
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('password change checks old password and uses only the dedicated password model', async () => {
  const changes = []
  const api = load('controllers/authController.js', {
    '../utils/jwt.js': { JWT_SECRET: 'x'.repeat(48) }, '../utils/captcha.js': {},
    bcrypt: { compare: async password => password === 'old-valid', hash: async () => 'bcrypt-result' },
    '../models/userModel.js': { findUserById: async () => ({ password_hash: 'old-hash', auth_version: 0 }),
      updateUserInfo: async () => { throw new Error('Password must not use the profile model') },
      updateUserPassword: async (...args) => { changes.push(args); return { affectedRows: 1 } } },
  })
  const denied = { userId: 7, request: { body: { oldPassword: 'wrong', newPassword: 'new-valid' } } }
  await api.updatePassword(denied); assert.equal(denied.status, 400); assert.equal(changes.length, 0)
  const allowed = { userId: 7, request: { body: { oldPassword: 'old-valid', newPassword: 'new-valid' } } }
  await api.updatePassword(allowed); assert.equal(allowed.body.code, 1)
  assert.deepEqual(changes, [['bcrypt-result', 7, 'old-hash', 0]])
})
