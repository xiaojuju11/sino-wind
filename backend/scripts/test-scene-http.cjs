const { spawnSync } = require('node:child_process')
const path = require('node:path')
const result = spawnSync(process.execPath, ['--test', path.join(__dirname, 'test-scene-poetry.cjs')], {
  stdio: 'inherit', env: { ...process.env, SCENE_API: process.env.SCENE_API || 'http://127.0.0.1:3000/api/scene' },
})
process.exitCode = result.status ?? 1
