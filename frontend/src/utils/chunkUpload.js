import axios from '../http/index.js'

// 默认分片大小：512KB（适合大图切片、能直观展示切片进度与并发）
export const DEFAULT_CHUNK_SIZE = 512 * 1024

/**
 * 将文件切片
 * @param {File} file 
 * @param {number} chunkSize 
 * @returns {Array<{index: number, chunk: Blob, size: number}>}
 */
export function createChunks(file, chunkSize = DEFAULT_CHUNK_SIZE) {
  const chunks = []
  let cur = 0
  let index = 0
  while (cur < file.size) {
    const end = Math.min(cur + chunkSize, file.size)
    chunks.push({
      index,
      chunk: file.slice(cur, end),
      size: end - cur
    })
    cur += chunkSize
    index++
  }
  return chunks
}

/**
 * 纯 JS 标准 SHA-256 实现
 * 用于在 HTTP 等非安全上下文（crypto.subtle 为 undefined）下无缝回退，杜绝 Cannot read properties of undefined (reading 'digest')
 * @param {ArrayBuffer} buffer
 * @returns {string} 64位十六进制哈希字符串
 */
export function sha256Pure(buffer) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]

  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19

  const bytes = new Uint8Array(buffer)
  const len = bytes.length
  const bitLen = len * 8

  const padLen = (((len + 8) >> 6) + 1) << 6
  const padded = new Uint8Array(padLen)
  padded.set(bytes)
  padded[len] = 0x80

  const view = new DataView(padded.buffer)
  view.setUint32(padLen - 4, bitLen & 0xffffffff, false)
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false)

  const W = new Uint32Array(64)

  for (let chunk = 0; chunk < padLen; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(chunk + i * 4, false)
    }
    for (let i = 16; i < 64; i++) {
      const s0 = (W[i - 15] >>> 7 | W[i - 15] << 25) ^ (W[i - 15] >>> 18 | W[i - 15] << 14) ^ (W[i - 15] >>> 3)
      const s1 = (W[i - 2] >>> 17 | W[i - 2] << 15) ^ (W[i - 2] >>> 19 | W[i - 2] << 13) ^ (W[i - 2] >>> 10)
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7

    for (let i = 0; i < 64; i++) {
      const S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K[i] + W[i]) | 0
      const S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) | 0

      h = g
      g = f
      f = e
      e = (d + temp1) | 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) | 0
    }

    H0 = (H0 + a) | 0
    H1 = (H1 + b) | 0
    H2 = (H2 + c) | 0
    H3 = (H3 + d) | 0
    H4 = (H4 + e) | 0
    H5 = (H5 + f) | 0
    H6 = (H6 + g) | 0
    H7 = (H7 + h) | 0
  }

  const out = [H0, H1, H2, H3, H4, H5, H6, H7]
  return out.map(n => (n >>> 0).toString(16).padStart(8, '0')).join('')
}

/**
 * 计算文件指纹 Hash（优先使用 Web Crypto API 原生 SHA-256；在 HTTP/非安全上下文环境下无缝回退到纯 JS SHA-256）
 * @param {File} file 
 * @returns {Promise<string>}
 */
export async function calculateFileHash(file) {
  // 采样策略：文件小于 4MB 全量读取；大于 4MB 采样首、中、尾各 1MB 并结合 size 与修改时间
  let buffer
  const sampleSize = 1 * 1024 * 1024
  if (file.size <= 4 * 1024 * 1024) {
    buffer = await file.arrayBuffer()
  } else {
    const head = file.slice(0, sampleSize)
    const mid = file.slice(Math.floor(file.size / 2) - sampleSize / 2, Math.floor(file.size / 2) + sampleSize / 2)
    const tail = file.slice(file.size - sampleSize, file.size)
    const combinedBlob = new Blob([head, mid, tail])
    buffer = await combinedBlob.arrayBuffer()
  }

  let hashHex
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch {
      hashHex = sha256Pure(buffer)
    }
  } else {
    hashHex = sha256Pure(buffer)
  }

  // 拼接文件长度标识，确保唯一性
  return `${hashHex.slice(0, 24)}_${file.size}`
}

/**
 * 并发切片上传核心函数
 * @param {Object} options
 * @param {File} options.file - 要上传的文件
 * @param {number} [options.chunkSize] - 分片大小
 * @param {number} [options.concurrency] - 并发数量（默认 3）
 * @param {Function} [options.onProgress] - 进度回调 ({ percent, uploadedCount, totalChunks, stage })
 * @param {AbortSignal} [options.signal] - 取消信号
 * @returns {Promise<{ url: string, isInstant: boolean }>}
 */
export async function uploadFileChunks({
  file,
  chunkSize = DEFAULT_CHUNK_SIZE,
  concurrency = 3,
  onProgress = () => {},
  signal
}) {
  if (!file) {
    throw new Error('未提供待上传文件')
  }

  // 阶段 1：计算文件特征 Hash
  onProgress({ percent: 0, uploadedCount: 0, totalChunks: 0, stage: 'hashing', stageText: '计算文件特征指纹...' })
  const fileHash = await calculateFileHash(file)

  if (signal?.aborted) {
    throw new Error('上传已取消')
  }

  // 阶段 2：文件切片
  const chunks = createChunks(file, chunkSize)
  const totalChunks = chunks.length

  // 阶段 3：向服务端查询文件状态（秒传 / 断点续传已传切片）
  onProgress({ percent: 5, uploadedCount: 0, totalChunks, stage: 'checking', stageText: '正在校验秒传与断点...' })
  const checkRes = await axios.post('/api/upload/check', {
    fileHash,
    fileName: file.name,
    totalChunks
  }, { signal })

  const checkData = checkRes.data?.data || {}

  // 秒传命中
  if (checkData.isUploaded && checkData.url) {
    onProgress({
      percent: 100,
      uploadedCount: totalChunks,
      totalChunks,
      stage: 'done',
      stageText: '秒传成功！'
    })
    return {
      url: checkData.url,
      isInstant: true
    }
  }

  // 阶段 4：过滤需要上传的分片
  const uploadedSet = new Set(checkData.uploadedChunks || [])
  const pendingChunks = chunks.filter(c => !uploadedSet.has(c.index))

  // 进度统计
  const chunkProgressMap = {}
  chunks.forEach(c => {
    chunkProgressMap[c.index] = uploadedSet.has(c.index) ? c.size : 0
  })

  const updateOverallProgress = () => {
    const loadedBytes = Object.values(chunkProgressMap).reduce((acc, curr) => acc + curr, 0)
    // 预留最后 5% 留给合并阶段
    const percent = Math.min(95, Math.floor((loadedBytes / file.size) * 95))
    onProgress({
      percent,
      uploadedCount: chunks.length - pendingChunks.length,
      totalChunks,
      stage: 'uploading',
      stageText: `正在分片上传 (${uploadedSet.size}/${totalChunks})`
    })
  }

  updateOverallProgress()

  // 阶段 5：并发上传控制
  let currentIndex = 0
  let activeCount = 0
  let uploadError = null

  await new Promise((resolve, reject) => {
    if (pendingChunks.length === 0) {
      return resolve()
    }

    const next = () => {
      if (signal?.aborted) {
        return reject(new Error('上传已取消'))
      }
      if (uploadError) {
        return reject(uploadError)
      }
      if (currentIndex >= pendingChunks.length && activeCount === 0) {
        return resolve()
      }

      while (activeCount < concurrency && currentIndex < pendingChunks.length) {
        const item = pendingChunks[currentIndex++]
        activeCount++

        const formData = new FormData()
        formData.append('fileHash', fileHash)
        formData.append('chunkIndex', String(item.index))
        formData.append('totalChunks', String(totalChunks))
        formData.append('chunk', item.chunk)

        axios.post('/api/upload/chunk', formData, {
          signal,
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            chunkProgressMap[item.index] = progressEvent.loaded || 0
            updateOverallProgress()
          }
        }).then(() => {
          chunkProgressMap[item.index] = item.size
          uploadedSet.add(item.index)
          activeCount--
          updateOverallProgress()
          next()
        }).catch((err) => {
          activeCount--
          if (!uploadError) {
            uploadError = err
            reject(err)
          }
        })
      }
    }

    next()
  })

  if (signal?.aborted) {
    throw new Error('上传已取消')
  }

  // 阶段 6：通知服务端合并分片
  onProgress({
    percent: 96,
    uploadedCount: totalChunks,
    totalChunks,
    stage: 'merging',
    stageText: '所有分片传输完毕，服务端合并中...'
  })

  const mergeRes = await axios.post('/api/upload/merge', {
    fileHash,
    fileName: file.name,
    totalChunks
  }, { signal })

  const finalUrl = mergeRes.data?.data?.url
  if (!finalUrl) {
    throw new Error(mergeRes.data?.message || '合并分片失败')
  }

  onProgress({
    percent: 100,
    uploadedCount: totalChunks,
    totalChunks,
    stage: 'done',
    stageText: '上传成功！'
  })

  return {
    url: finalUrl,
    isInstant: false
  }
}
