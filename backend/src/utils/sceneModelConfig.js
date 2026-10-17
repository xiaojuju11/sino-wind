const path = require('node:path')
const fs = require('node:fs')
const root = path.resolve(__dirname, '../../models/scene')
function segmentationModel() {
  const b1 = path.join(root, 'segmenter-b1')
  if (fs.existsSync(path.join(b1, 'onnx/model_quantized.onnx'))) return { folder: b1, name: 'SegFormer-B1 / ADE20K', available: true }
  const legacy = path.join(root, 'segmenter')
  const available = fs.existsSync(path.join(legacy, 'onnx/model_quantized.onnx'))
  return { folder: legacy, name: 'SegFormer-B0 / ADE20K', available }
}
module.exports = { root, segmentationModel }
