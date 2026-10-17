// Coordinates and runs always refer to the same reduced-resolution image grid.
const LABELS = {
  tree: ['tree', '树木'], plant: ['plant', '草木'], grass: ['grass', '芳草'],
  water: ['water', '水面'], river: ['water', '江河'], lake: ['water', '湖水'], sea: ['water', '海面'],
  mountain: ['mountain', '山峦'], hill: ['mountain', '山丘'], sky: ['sky', '天空'],
  flower: ['flower', '花'], rock: ['rock', '山石'], bridge: ['bridge', '桥'],
  boat: ['boat', '舟'], ship: ['boat', '船'], building: ['building', '建筑'],
  house: ['building', '屋舍'], tower: ['building', '楼塔'], snow: ['snow', '雪'],
  path: ['path', '小径'], road: ['path', '道路'], waterfall: ['waterfall', '瀑布'],
}
function encodeMask(data, width, height, depth) {
  const runs = []; let start = -1, count = 0, sum = 0
  let minX = width, minY = height, maxX = 0, maxY = 0
  for (let i = 0; i <= data.length; i++) {
    if (i < data.length && data[i] > 127) {
      if (start < 0) start = i
      const x = i % width, y = Math.floor(i / width)
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      count++; sum += depth?.[i] || 0
    } else if (start >= 0) { runs.push(start, i - start); start = -1 }
  }
  return { runs, area: count / (width * height), box: [minX / width, minY / height, (maxX + 1) / width, (maxY + 1) / height], near: depth && count ? sum / count / 255 : null }
}
module.exports = { LABELS, encodeMask }
