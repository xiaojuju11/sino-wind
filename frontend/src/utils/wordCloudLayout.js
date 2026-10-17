// Deterministic ellipse packing. Rectangle collision bounds are conservative for
// real canvas font measurements; spatial bins keep the search bounded.
export function layoutWordCloud(terms, measure) {
  const width = 1000, height = 660, cx = width / 2, cy = height / 2
  const placed = [], bins = new Map(), cell = 60
  const maximum = Math.max(1, ...terms.map(t => t.count))
  const baseSize = entry => Math.min(135, 420 / Math.max(1, [...entry.term].length), 14 + 121 * (entry.count / maximum) ** 3.2)
  const area = terms.slice(0, 150).reduce((sum, entry) => sum + (baseSize(entry) ** 2 * Math.max(1, [...entry.term].length) * 1.3), 0)
  const scale = Math.min(1, Math.sqrt(300000 / Math.max(1, area)))
  const keysFor = box => {
    const keys = []
    for (let x = Math.floor(box.x / cell); x <= Math.floor((box.x + box.w) / cell); x++) {
      for (let y = Math.floor(box.y / cell); y <= Math.floor((box.y + box.h) / cell); y++) keys.push(x + ':' + y)
    }
    return keys
  }
  const inside = box => [box.x, box.x + box.w].every(x => [box.y, box.y + box.h].every(y => ((x - cx) / 492) ** 2 + ((y - cy) / 322) ** 2 <= 1))
  const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  terms.slice(0, 150).forEach((entry, index) => {
    if (!entry.term || !Number.isFinite(entry.count) || entry.count <= 0) return
    const base = baseSize(entry) * scale
    const angle = index > 7 && index % 11 === 0 ? -90 : 0
    for (let shrink = 0; shrink < 5; shrink++) {
      const size = Math.max(13, Math.round(base * .86 ** shrink))
      const advance = Math.max(measure(entry.term, size), size * [...entry.term].length * .85)
      const w = (angle ? size * 1.16 : advance) + 5, h = (angle ? advance : size * 1.16) + 5
      for (let step = 0; step < 6500; step++) {
        const radius = 6.8 * Math.sqrt(step), theta = step * .39 + index * 1.7
        const x = cx + Math.cos(theta) * radius, y = cy + Math.sin(theta) * radius * .66
        const box = { x: x - w / 2, y: y - h / 2, w, h }
        if (!inside(box)) continue
        const keys = keysFor(box), nearby = new Set(keys.flatMap(key => bins.get(key) || []))
        if ([...nearby].some(other => intersects(box, other))) continue
        const word = { ...entry, x, y, size, angle, box, color: index % 7 }
        placed.push(word)
        for (const key of keys) { if (!bins.has(key)) bins.set(key, []); bins.get(key).push(box) }
        return
      }
      if (size === 13) break
    }
  })
  if (!placed.length) return { width, height, words: [] }
  // Queries with a steep frequency curve pack into a smaller central region.
  // Fit that whole composition to the viewport, preserving all relative sizes.
  const left = Math.min(...placed.map(w => w.box.x)), top = Math.min(...placed.map(w => w.box.y))
  const right = Math.max(...placed.map(w => w.box.x + w.box.w)), bottom = Math.max(...placed.map(w => w.box.y + w.box.h))
  const fit = Math.min(2, 960 / (right - left), 620 / (bottom - top))
  const midX = (left + right) / 2, midY = (top + bottom) / 2
  const words = placed.map(word => ({ ...word, x: cx + (word.x - midX) * fit, y: cy + (word.y - midY) * fit, size: word.size * fit,
    box: { x: cx + (word.box.x - midX) * fit, y: cy + (word.box.y - midY) * fit, w: word.box.w * fit, h: word.box.h * fit } }))
  return { width, height, words }
}
