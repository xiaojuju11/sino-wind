// Deterministic, code-only landscape. Geometry is built once per size/theme;
// animation reuses the cached painting rather than reading image pixels.
export function createLandscapeGeometry(width, height, seed = 73) {
  let state = seed >>> 0
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
  const ridges = []
  for (const bottom of [false, true]) {
    for (let layer = 0; layer < 4; layer++) {
      const points = []
      const baseline = height * (bottom ? .98 - layer * .035 : .30 - layer * .025)
      const summits = Array.from({ length: 6 }, (_, i) => ({ center: (i + random() * .8) / 6, spread: .025 + random() * .065, rise: .35 + random() * .8 }))
      for (let i = 0; i <= 120; i++) {
        const x = i / 120 * width
        const phase = i / 120
        const envelope = bottom ? .4 + .6 * Math.abs(phase - .5) * 2 : .55 + .45 * Math.sin(phase * Math.PI)
        const peaks = Math.max(...summits.map(s => s.rise * Math.exp(-(((phase - s.center) / s.spread) ** 2))))
        const detail = Math.sin(phase * 83 + layer) * .045 + (random() - .5) * .035
        const amplitude = height * (bottom ? .12 : .14) * envelope
        points.push({ x, y: baseline - amplitude * (peaks + detail) })
      }
      ridges.push({ bottom, layer, baseline, points })
    }
  }
  const bamboo = Array.from({ length: 28 }, () => ({ x: random() * width * .29, y: random() * height * .23, angle: random() * 2.2 - .8, length: width * (.035 + random() * .055) }))
  const fibers = Array.from({ length: 400 }, () => ({ x: random() * width, y: random() * height, length: random() * 3 + 1 }))
  return { width, height, ridges, bamboo, fibers }
}

export function paintLandscape(ctx, geometry, dark) {
  const { width: w, height: h, ridges, bamboo, fibers } = geometry
  ctx.clearRect(0, 0, w, h)
  const ink = dark ? '164,184,178' : '57,74,65'
  const paper = dark ? '#111c25' : '#f5ebd9'
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, dark ? '#10222c' : '#f2e8d5'); sky.addColorStop(.45, paper); sky.addColorStop(1, dark ? '#101b23' : '#eee2cb')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = dark ? '#d9c48b07' : '#795c3510'; ctx.lineWidth = .45
  ctx.beginPath(); for (const f of fibers) { ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + f.length, f.y + .5) } ctx.stroke()
  const moonX = w * .79, moonY = h * .075, radius = w * .065
  const halo = ctx.createRadialGradient(moonX, moonY, radius * .6, moonX, moonY, radius * 3.6)
  halo.addColorStop(0, dark ? '#f6df9f55' : '#ce8a4930'); halo.addColorStop(1, '#edc79000')
  ctx.fillStyle = halo; ctx.fillRect(moonX - radius * 4, moonY - radius * 4, radius * 8, radius * 8)
  ctx.fillStyle = dark ? '#f2deb2' : '#c8755880'; ctx.beginPath(); ctx.arc(moonX, moonY, radius, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = dark ? '#a58e5930' : '#f9e6c660'
  if (dark) for (let i = 0; i < 11; i++) { ctx.beginPath(); ctx.arc(moonX + Math.sin(i * 4) * radius * .7, moonY + Math.cos(i * 3) * radius * .65, radius * (.08 + i % 3 * .035), 0, Math.PI * 2); ctx.fill() }
  // Far ridges first; each pigment pass fades into untouched paper.
  for (const ridge of [...ridges].sort((a, b) => b.layer - a.layer)) {
    const { points, baseline, layer, bottom } = ridge
    const floor = Math.min(h, baseline + h * .09)
    const wash = ctx.createLinearGradient(0, baseline - h * .17, 0, floor)
    wash.addColorStop(0, `rgba(${ink},${.14 + (3 - layer) * .07})`); wash.addColorStop(1, `rgba(${ink},0)`)
    ctx.fillStyle = wash; ctx.beginPath(); ctx.moveTo(0, floor)
    traceRidge(ctx, points)
    ctx.lineTo(w, floor); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = `rgba(${ink},${.12 + (3 - layer) * .035})`; ctx.lineWidth = .65
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); traceRidge(ctx, points); ctx.stroke()
    // Broken brush marks follow the slope, never a regular triangle grid.
    ctx.strokeStyle = `rgba(${ink},${bottom ? .16 : .1})`; ctx.lineWidth = .55
    ctx.beginPath()
    points.forEach((p, i) => { if (i % 3 === 0) { ctx.moveTo(p.x, p.y + 2); ctx.quadraticCurveTo(p.x - 4, p.y + 9, p.x + Math.sin(i) * 5, p.y + 18 + layer * 2) } })
    ctx.stroke()
    if (layer < 2) for (let i = 3; i < points.length - 2; i += 5) {
      const p = points[i]
      if (p.y > baseline - h * .035) continue
      // Dry-brush pines and broken rocks enrich the silhouette without a bitmap.
      const size = w * (.009 + .003 * Math.sin(i))
      ctx.strokeStyle = `rgba(${ink},.38)`; ctx.lineWidth = .7
      ctx.beginPath(); ctx.moveTo(p.x, p.y + size * 2); ctx.lineTo(p.x - 1, p.y - size * 2); ctx.stroke()
      ctx.fillStyle = `rgba(${ink},.27)`
      for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.ellipse(p.x + Math.sin(j * 4) * size, p.y - j * size * .32, size * (.85 - j * .1), size * .34, Math.sin(j) * .4, 0, Math.PI * 2); ctx.fill() }
      ctx.strokeStyle = `rgba(${ink},.12)`; ctx.beginPath()
      for (let j = 0; j < 7; j++) { const dx = Math.sin(i * j + j) * size * 2; ctx.moveTo(p.x + dx, p.y + j * 3 + 6); ctx.lineTo(p.x + dx + size, p.y + j * 3 + 7) } ctx.stroke()
    }
  }
  // Bamboo is painted with tapered bezier leaves, independent of icon systems.
  ctx.strokeStyle = `rgba(${ink},.55)`; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(w * .015, h * .27); ctx.bezierCurveTo(w * .10, h * .19, w * .04, h * .10, w * .01, 0); ctx.stroke()
  for (const leaf of bamboo) {
    ctx.strokeStyle = `rgba(${ink},.3)`; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(w * .02, Math.max(0, leaf.y - h * .025)); ctx.quadraticCurveTo(leaf.x * .55, leaf.y - 6, leaf.x, leaf.y); ctx.stroke()
    ctx.save(); ctx.translate(leaf.x, leaf.y); ctx.rotate(leaf.angle); ctx.fillStyle = `rgba(${ink},.55)`
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(leaf.length * .3, -4, leaf.length * .8, -2, leaf.length, 0); ctx.bezierCurveTo(leaf.length * .6, 2, leaf.length * .2, 4, 0, 0); ctx.fill(); ctx.restore()
  }
  // A small pavilion on the far shore, with restrained lantern light at night.
  const px = w * .86, py = h * .235, size = w * .055
  ctx.fillStyle = `rgba(${ink},.65)`; ctx.beginPath(); ctx.moveTo(px - size * 1.5, py); ctx.quadraticCurveTo(px - size * .5, py, px, py - size * .7); ctx.quadraticCurveTo(px + size * .5, py, px + size * 1.5, py); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = `rgba(${ink},.65)`; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(px - size, py + 2); ctx.lineTo(px - size, py + size); ctx.moveTo(px + size, py + 2); ctx.lineTo(px + size, py + size); ctx.moveTo(px - size * 1.4, py + size); ctx.lineTo(px + size * 1.4, py + size); ctx.stroke()
  if (dark) { ctx.fillStyle = '#e7af62'; ctx.fillRect(px - 2, py + 3, 4, size * .45) }
  // Water is deliberately quiet behind the bottom margin, with a lone skiff.
  ctx.strokeStyle = `rgba(${ink},.17)`; ctx.lineWidth = .65; ctx.beginPath()
  for (let i = 0; i < 20; i++) { const y = h * (.88 + i * .005); const x = w * (.33 + Math.sin(i * 2.4) * .18); ctx.moveTo(x, y); ctx.lineTo(x + w * (.1 + i % 4 * .025), y) } ctx.stroke()
  ctx.strokeStyle = `rgba(${ink},.075)`; ctx.lineWidth = .8; ctx.beginPath()
  for (const ridge of ridges.filter(r => r.bottom && r.layer < 2)) ridge.points.forEach((p, i) => {
    const x = p.x + Math.sin(i * 1.8) * 2, y = h * .93 + (h * .93 - p.y) * .28
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y)
  })
  ctx.stroke()
  ctx.strokeStyle = `rgba(${ink},.65)`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(w * .46, h * .925); ctx.quadraticCurveTo(w * .52, h * .938, w * .59, h * .925); ctx.moveTo(w * .53, h * .925); ctx.lineTo(w * .53, h * .907); ctx.moveTo(w * .52, h * .91); ctx.lineTo(w * .57, h * .934); ctx.stroke()
  // Open central reserve ensures the illustration never competes with text.
  const reserve = ctx.createLinearGradient(0, h * .22, 0, h * .87)
  reserve.addColorStop(0, 'rgba(0,0,0,0)'); reserve.addColorStop(.24, 'rgba(0,0,0,.96)'); reserve.addColorStop(.78, 'rgba(0,0,0,.96)'); reserve.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = reserve; ctx.fillRect(0, h * .22, w, h * .65); ctx.globalCompositeOperation = 'source-over'
}

function traceRidge(ctx, points) {
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i], next = points[i + 1]
    ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2)
  }
  const last = points.at(-1)
  ctx.lineTo(last.x, last.y)
}

export function paintAtmosphere(ctx, width, height, progress, dark, cycle = 0) {
  // Periodic mist and cranes: no object allocations proportional to pixel count.
  const pulse = Math.sin(Math.PI * progress)
  ctx.save(); ctx.globalAlpha = pulse
  if (dark) {
    const glow = ctx.createRadialGradient(width * .79, height * .075, width * .05, width * .79, height * .075, width * (.18 + pulse * .025))
    glow.addColorStop(0, '#f4d68c22'); glow.addColorStop(1, '#f4d68c00'); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height * .3)
  }
  const drift = Math.sin(progress * Math.PI * 2 + cycle) * width * .08
  for (const y of [height * .22, height * .83]) {
    const mist = ctx.createRadialGradient(width * .5 + drift, y, 0, width * .5 + drift, y, width * .48)
    mist.addColorStop(0, dark ? '#b3c5cd19' : '#fff9e875'); mist.addColorStop(1, '#fff9e800')
    ctx.fillStyle = mist; ctx.save(); ctx.translate(0, y * .8); ctx.scale(1, .2); ctx.fillRect(0, 0, width, height); ctx.restore()
  }
  ctx.strokeStyle = dark ? '#eddaa8' : '#35473d'; ctx.lineWidth = .9
  for (let i = 0; i < 3; i++) {
    const x = width * (.52 + progress * .2 + i * .065), y = height * (.06 + i * .018)
    const wing = 2 + Math.sin(progress * 18 + i) * 2
    ctx.beginPath(); ctx.moveTo(x - 5, y - wing); ctx.quadraticCurveTo(x - 2, y - 1, x, y + 1); ctx.quadraticCurveTo(x + 2, y - 1, x + 5, y - wing); ctx.stroke()
  }
  ctx.strokeStyle = dark ? '#d4c28a33' : '#536b5930'; ctx.lineWidth = .65
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(width * .53, height * .93, width * (.05 + progress * .14 + i * .025), height * .004 * (1 + progress), 0, 0, Math.PI * 2); ctx.stroke() }
  ctx.restore()
}
