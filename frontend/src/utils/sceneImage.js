export async function readSceneImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) throw new Error('请选择 12MB 以内的 JPG、PNG 或 WebP 照片。')
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    if (image.naturalWidth * image.naturalHeight > 24000000) throw new Error('照片像素过大，请先缩小至 2400 万像素以内。')
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f4efdf'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', .87)
  } finally { URL.revokeObjectURL(url) }
}
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('图片无法展开，请重新选择。')); image.src = src
  })
}
export function decodeRuns(runs, length) {
  const result = new Uint8Array(length)
  for (let i = 0; i < runs.length; i += 2) {
    const start = Math.max(0, runs[i]), end = Math.min(length, start + runs[i + 1])
    result.fill(1, start, end)
  }
  return result
}
export function manualRegion(start, end, width, height, tag, label) {
  const x0 = Math.max(0, Math.floor(Math.min(start.x, end.x) * width)), x1 = Math.min(width, Math.ceil(Math.max(start.x, end.x) * width))
  const y0 = Math.max(0, Math.floor(Math.min(start.y, end.y) * height)), y1 = Math.min(height, Math.ceil(Math.max(start.y, end.y) * height))
  if (x1 - x0 < 3 || y1 - y0 < 3) return null
  const runs = []
  for (let y = y0; y < y1; y++) runs.push(y * width + x0, x1 - x0)
  return { id: `manual-${crypto.randomUUID()}`, tag, label, source: 'manual', runs, box: [x0 / width, y0 / height, x1 / width, y1 / height], near: null }
}
export async function exportScene(scene, poem) {
  await document.fonts.ready
  const image = await loadImage(scene.image)
  const width = 600, photoHeight = Math.min(660, Math.max(240, width * image.height / image.width))
  const canvas = document.createElement('canvas'); canvas.width = width * 2; canvas.height = (photoHeight + 330) * 2
  const ctx = canvas.getContext('2d'); ctx.scale(2, 2)
  ctx.fillStyle = '#f6efde'; ctx.fillRect(0, 0, width, canvas.height / 2)
  ctx.strokeStyle = '#b2934e'; ctx.lineWidth = 1; ctx.strokeRect(16, 16, width - 32, canvas.height / 2 - 32); ctx.strokeRect(21, 21, width - 42, canvas.height / 2 - 42)
  const scale = Math.min((width - 64) / image.width, (photoHeight - 32) / image.height)
  const drawWidth = image.width * scale, drawHeight = image.height * scale
  ctx.drawImage(image, (width - drawWidth) / 2, 32 + (photoHeight - 32 - drawHeight) / 2, drawWidth, drawHeight)
  ctx.textAlign = 'center'; ctx.fillStyle = '#292d29'; ctx.font = '28px STKaiti, KaiTi, serif'
  poem.lines.forEach((line, i) => ctx.fillText(line, width / 2, photoHeight + 65 + i * 44))
  ctx.font = '17px STKaiti, KaiTi, serif'; ctx.fillStyle = '#6d675a'; ctx.fillText(`${poem.dynasty} · ${poem.author}《${poem.title}》`, width / 2, photoHeight + 175, width - 70)
  ctx.font = '14px STKaiti, KaiTi, serif'; ctx.fillText('寻镜入诗 · 云山竹简', width / 2, photoHeight + 220)
  ctx.fillStyle = '#8a302d'; ctx.fillRect(width / 2 - 18, photoHeight + 240, 36, 46); ctx.fillStyle = '#fff2da'; ctx.font = '18px STKaiti, KaiTi, serif'; ctx.fillText('诗', width / 2, photoHeight + 260); ctx.fillText('境', width / 2, photoHeight + 280)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('暂未能生成长图，请重试。')
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `寻镜入诗-${poem.title}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000)
}
