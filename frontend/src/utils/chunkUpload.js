import axios from '../http'

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
 * 计算文件指纹 Hash（使用 Web Crypto API 原生 SHA-256 采样加权，毫秒级响应，零卡顿）
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

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

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
