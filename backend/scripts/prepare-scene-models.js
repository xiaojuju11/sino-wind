#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const https = require('node:https')

const root = path.resolve(__dirname, '../models/scene')
const models = [
  {
    name: 'segmenter-b1',
    repo: 'Xenova/segformer-b1-finetuned-ade-512-512',
    revision: '6308717ce1fc0f39dd847e3b2e98edebc4ace4a0',
    files: ['config.json', 'preprocessor_config.json', 'README.md', 'onnx/model_quantized.onnx']
  },
  {
    name: 'depth',
    repo: 'onnx-community/depth-anything-v2-small',
    revision: '4472b7362082ad9968fee890ca0f1e5aca36b93d',
    files: ['config.json', 'preprocessor_config.json', 'README.md', 'onnx/model_quantized.onnx']
  }
]

// 优先采用国内高速镜像站 hf-mirror.com，若失败自动降级至 huggingface.co
const MIRRORS = [
  'https://hf-mirror.com',
  'https://huggingface.co'
]

function downloadFileWithRedirect(url, destPath) {
  return new Promise((resolve, reject) => {
    function get(currentUrl, redirectsLeft = 10) {
      if (redirectsLeft === 0) return reject(new Error(`Too many redirects for ${url}`))
      const req = https.get(currentUrl, { timeout: 60000 }, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          return get(res.headers.location, redirectsLeft - 1)
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} from ${currentUrl}`))
        }
        const fileStream = fs.createWriteStream(destPath)
        res.pipe(fileStream)
        fileStream.on('finish', () => {
          fileStream.close()
          resolve()
        })
        fileStream.on('error', err => {
          fs.unlink(destPath, () => {})
          reject(err)
        })
      })
      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error(`Timeout connecting to ${currentUrl}`))
      })
    }
    get(url)
  })
}

async function prepare() {
  console.log('正在检查寻境入诗 AI 视觉模型文件...')
  let allPresent = true
  for (const m of models) {
    for (const f of m.files) {
      const full = path.join(root, m.name, f)
      if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
        allPresent = false
        break
      }
    }
  }

  if (allPresent) {
    console.log('✓ 所有识景与景深模型已就绪 (SegFormer-B1, Depth-Anything-V2)。')
    return
  }

  for (const m of models) {
    const dir = path.join(root, m.name, 'onnx')
    fs.mkdirSync(dir, { recursive: true })

    for (const f of m.files) {
      const target = path.join(root, m.name, f)
      if (fs.existsSync(target) && fs.statSync(target).size > 0) {
        console.log(`[已就绪] ${m.name}/${f} (${(fs.statSync(target).size / 1024 / 1024).toFixed(2)} MB)`)
        continue
      }
      console.log(`正在下载 ${m.name}/${f} ...`)
      let downloaded = false
      const temp = target + '.tmp'

      for (const mirror of MIRRORS) {
        const fileUrl = `${mirror}/${m.repo}/resolve/${m.revision}/${f}`
        try {
          await downloadFileWithRedirect(fileUrl, temp)
          fs.renameSync(temp, target)
          console.log(`✓ 成功从 ${mirror} 下载: ${m.name}/${f} (${(fs.statSync(target).size / 1024 / 1024).toFixed(2)} MB)`)
          downloaded = true
          break
        } catch (err) {
          console.warn(`! 从 ${mirror} 下载失败 (${err.message})，尝试下一镜像...`)
          if (fs.existsSync(temp)) fs.unlinkSync(temp)
        }
      }

      if (!downloaded) {
        throw new Error(`无法下载 ${m.name}/${f}，请检查网络连接。`)
      }
    }
  }
  console.log('寻境入诗模型下载与校验全部完成！')
}

prepare().catch(err => {
  console.error('模型准备失败:', err.message)
  process.exit(1)
})
