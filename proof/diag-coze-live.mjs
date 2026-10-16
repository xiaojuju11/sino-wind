// 实测 Coze 拍照识器是否真能跑通（决定第 4 问「完成程度」怎么写）
// 用一张真实 PNG 调 /api/coze/recognition
import fs from 'node:fs'

// 一张真实的 1x1 透明 PNG（base64），再放大到 256x256 由浏览器端无所谓 —— 上游只要能解码即可
const tiny = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

// 造一张 256x256 的浅青瓷色 PNG（手写、无依赖）
function makePng(w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    const off = y * (w * 3 + 1)
    raw[off] = 0
    for (let x = 0; x < w; x++) {
      raw[off + 1 + x * 3] = 200
      raw[off + 2 + x * 3] = 220
      raw[off + 3 + x * 3] = 235
    }
  }
  const table = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  const crc32 = (buf) => {
    let crc = 0xffffffff
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
    return (crc ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  // 用 stored（未压缩）deflate 块，避免依赖 zlib
  const stored = (data) => {
    const out = [Buffer.from([0x78, 0x01])]
    for (let i = 0; i < data.length; i += 65535) {
      const blk = data.subarray(i, i + 65535)
      const last = i + 65535 >= data.length ? 1 : 0
      const hdr = Buffer.alloc(5)
      hdr[0] = last
      hdr.writeUInt16LE(blk.length, 1)
      hdr.writeUInt16LE(~blk.length & 0xffff, 3)
      out.push(hdr, blk)
    }
    const adler = Buffer.alloc(4)
    let a = 1, b = 0
    for (const x of data) { a = (a + x) % 65521; b = (b + a) % 65521 }
    adler.writeUInt32BE((b << 16) | a)
    out.push(adler)
    return Buffer.concat(out)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', stored(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

let png
try { png = makePng(256, 256) } catch (e) { console.log('  自造 PNG 失败，改用内置 1x1: ' + e.message); png = Buffer.from(tiny, 'base64') }
fs.writeFileSync('C:/Users/2869/AppData/Local/Temp/probe.png', png)
const dataUrl = 'data:image/png;base64,' + png.toString('base64')
console.log('  测试图: ' + png.length + ' bytes · dataURL ' + Math.round(dataUrl.length / 1024) + 'KB')

console.log('')
console.log('  ── POST /api/coze/recognition（真实 Coze 工作流，超时上限 20s）──')
const t0 = Date.now()
try {
  const r = await fetch('http://127.0.0.1:3000/api/coze/recognition', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ img: dataUrl }),
  })
  const txt = await r.text()
  console.log('    HTTP ' + r.status + ' · 耗时 ' + (Date.now() - t0) + 'ms')
  console.log('    响应: ' + txt.slice(0, 600))
} catch (e) {
  console.log('    ❌ ' + e.message + ' (' + (Date.now() - t0) + 'ms)')
}
