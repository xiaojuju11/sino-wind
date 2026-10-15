// Native Canvas only: no DOM rasterizer, remote image, SVG, or external font.
export function drawVerticalText(ctx, text, { right, top, bottom, left, size = 22, gap = 12 }) {
  let x = right, y = top
  ctx.font = `${size}px "STKaiti", "KaiTi", "SimSun", serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  for (const char of Array.from(text)) {
    if (char === '\n') { x -= size + gap; y = top; continue }
    if (y + size > bottom) { x -= size + gap; y = top }
    if (x < left) throw new Error('文牒文字超出画布范围')
    if (char === ' ') { y += size; continue }
    // Traditional punctuation sits at the upper-right of its vertical cell.
    const punctuation = /[，。；：、！？]/u.test(char)
    ctx.fillText(char, x + (punctuation ? size * 0.3 : 0), y - (punctuation ? size * 0.2 : 0))
    y += size + 8
  }
}

// Original geometric seal-style strokes. All character strokes are cubic curves,
// independent of installed calligraphy fonts; this is a decorative seal, not a font facsimile.
const SEAL_GLYPHS = {
  云: [
    [[.2,.16],[.35,.16,.65,.16,.8,.16]], [[.12,.34],[.35,.34,.65,.34,.88,.34]],
    [[.43,.35],[.36,.51,.27,.62,.19,.7],[.4,.77,.65,.71,.78,.67]],
    [[.65,.53],[.75,.62,.83,.74,.87,.84]]
  ],
  山: [
    [[.5,.1],[.5,.35,.5,.65,.5,.87]],
    [[.14,.34],[.14,.5,.14,.71,.14,.85],[.35,.89,.64,.89,.86,.85],[.86,.7,.86,.49,.86,.34]]
  ],
  印: [
    [[.46,.12],[.32,.13,.2,.18,.15,.25],[.15,.4,.15,.58,.15,.72],[.25,.72,.34,.72,.46,.72]],
    [[.16,.42],[.26,.42,.35,.42,.46,.42]],
    [[.59,.22],[.68,.22,.78,.22,.86,.22],[.86,.36,.86,.49,.86,.63],[.86,.75,.78,.74,.72,.68]],
    [[.59,.23],[.59,.46,.59,.72,.59,.91]]
  ],
  记: [
    [[.12,.12],[.16,.15,.2,.2,.24,.24]],
    [[.08,.38],[.13,.38,.19,.38,.24,.38],[.24,.53,.24,.67,.24,.83],[.3,.79,.36,.73,.41,.69]],
    [[.49,.2],[.6,.2,.73,.2,.86,.2],[.86,.3,.86,.4,.86,.49],[.74,.49,.61,.49,.5,.49],[.5,.58,.5,.68,.5,.78],[.51,.94,.85,.94,.91,.77]]
  ]
}
function seal(ctx, x, y, size, seed) {
  let value = seed >>> 0
  const random = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 2 ** 32 }
  ctx.save(); ctx.translate(x, y); ctx.rotate((random() - 0.5) * 0.09)
  ctx.strokeStyle = '#8a2b2b'; ctx.fillStyle = '#8a2b2b'; ctx.lineWidth = 4
  const wave = () => (random() - 0.5) * 5
  ctx.beginPath(); ctx.moveTo(2, 2)
  ctx.bezierCurveTo(size / 3, wave(), size * 2 / 3, wave(), size - 2, 2)
  ctx.bezierCurveTo(size + wave(), size / 3, size + wave(), size * 2 / 3, size - 2, size - 2)
  ctx.bezierCurveTo(size * 2 / 3, size + wave(), size / 3, size + wave(), 2, size - 2)
  ctx.bezierCurveTo(wave(), size * 2 / 3, wave(), size / 3, 2, 2)
  ctx.closePath(); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeRect(7, 7, size - 14, size - 14)
  Array.from('云山印记').forEach((char, i) => {
    ctx.save(); ctx.translate(i < 2 ? size * .53 : size * .12, i % 2 ? size * .53 : size * .12)
    ctx.scale(size * .35, size * .35); ctx.lineWidth = .075; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    for (const [start, ...curves] of SEAL_GLYPHS[char]) {
      ctx.beginPath(); ctx.moveTo(...start)
      for (const curve of curves) ctx.bezierCurveTo(...curve)
      ctx.stroke()
    }
    ctx.restore()
  })
  ctx.restore()
}

export async function createScholarCertificate(game, documentObject = document) {
  if (!game || game.status !== 'finished' || !game.settled) throw new Error('对局结算后方可生成文牒')
  if (typeof game.id !== 'string' || !game.id || !Array.isArray(game.turns) || game.turns.length > 32 || game.turns.some(t => !t || !['user', 'sage'].includes(t.role) || typeof t.line !== 'string' || t.line.length > 180) || !Number.isFinite(new Date(game.endedAt).getTime())) throw new Error('文牒档案不完整，请刷新后重试')
  await documentObject.fonts?.ready
  const lines = game.turns.map(t => `${t.role === 'user' ? '雅士' : '先贤'}：${t.line.replace(/\s+/gu, '')}。`).join('')
  const outcome = game.winner === 'user' ? '胜出' : game.winner === 'draw' ? '和局' : '研习'
  const sageName = { libai: '李白', sushi: '苏轼', liqingzhao: '李清照', wangyangming: '王阳明', dufu: '杜甫' }[game.sageId] || '先贤'
  const text = `雅士${String(game.nickname || '云山居士').replace(/\s+/gu, '').slice(0, 30)}，与${sageName}对席飞花。以「${game.keyword}」为令，遵${game.rhyme || '未定韵'}，共成${game.rounds}轮，今记${outcome}。${lines}本局实记修持${game.pointsAwarded || 0}分。`
  const columns = 12, rows = Math.ceil(Array.from(text).length / columns) + 2
  const width = 600, height = Math.max(1080, 510 + rows * 30), scale = 2
  if (height > 4000) throw new Error('文牒过长，请减少记录内容')
  const canvas = documentObject.createElement('canvas'); canvas.width = width * scale; canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器无法绘制文牒')
  ctx.scale(scale, scale)
  ctx.fillStyle = '#f5efdf'; ctx.fillRect(0, 0, width, height)
  let seed = Array.from(game.id).reduce((sum, c) => Math.imul(sum, 31) + c.codePointAt(0), 1) >>> 0
  for (let i = 0; i < 2200; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const x = seed % width; const y = (seed >>> 10) % height
    ctx.fillStyle = 'rgba(95,76,40,0.045)'; ctx.fillRect(x, y, 1, 2)
  }
  ctx.strokeStyle = '#af8d53'; ctx.lineWidth = 2; ctx.strokeRect(24, 24, width - 48, height - 48)
  ctx.lineWidth = 1; ctx.strokeRect(32, 32, width - 64, height - 64)
  ctx.fillStyle = '#342d24'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.font = 'bold 42px "STKaiti", "KaiTi", serif'
  ctx.fillText(game.winner === 'user' ? '飞花通关文牒' : '风雅研习文牒', width / 2, 70)
  ctx.font = '18px "SimSun", serif'; ctx.fillText('云山竹简 · 华风雅集', width / 2, 135)
  const visibleRows = Math.floor((height - 250 - 210 - 22) / 30) + 1
  const usedColumns = Math.ceil(Array.from(text).length / visibleRows)
  const columnStep = Math.min(38, 420 / Math.max(1, usedColumns - 1))
  const bodyRight = width / 2 + (usedColumns - 1) * columnStep / 2
  drawVerticalText(ctx, text, { right: bodyRight, left: 70, top: 210, bottom: height - 250, size: 22, gap: columnStep - 22 })
  const stampSeed = seed
  seal(ctx, 90, height - 200, 90, stampSeed)
  ctx.textAlign = 'right'; ctx.fillStyle = '#66543c'; ctx.font = '14px "SimSun", serif'
  ctx.fillText(`对局编号 ${game.id}`, width - 55, height - 100)
  ctx.fillText(new Date(game.endedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }), width - 55, height - 75)
  ctx.textAlign = 'center'; ctx.font = '12px "SimSun", serif'; ctx.fillText('文化研习纪念 · 非学历、资质或文物鉴定证明', width / 2, height - 45)
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('文牒导出失败')), 'image/png'))
  return { blob, width: canvas.width, height: canvas.height }
}

export async function downloadScholarCertificate(game) {
  const { blob } = await createScholarCertificate(game)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `飞花文牒-${game.id}.png`
  document.body.appendChild(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
