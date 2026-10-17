const fs = require('node:fs')
const path = require('node:path')
const { segmentationModel, root } = require('../src/utils/sceneModelConfig')
const segmentation = segmentationModel()
let failed = false
for (const [name, folder] of [[segmentation.name, segmentation.folder], ['Depth Anything V2 Small', path.join(root, 'depth')]]) {
  for (const relative of ['config.json', 'preprocessor_config.json', 'onnx/model_quantized.onnx']) {
    const file = path.join(folder, relative)
    try {
      const size = fs.statSync(file).size
      if (relative.endsWith('.json')) JSON.parse(fs.readFileSync(file, 'utf8'))
      if (size < (relative.endsWith('.onnx') ? 1024 * 1024 : 2)) throw new Error('empty or incomplete file')
      console.log(`PASS ${name}/${relative} (${size} bytes)`)
    } catch { console.error(`FAIL ${name}/${relative}: missing or invalid`); failed = true }
  }
}
if (failed) console.error('Run backend/scripts/prepare-scene-models.ps1, then repeat this check. No model files are committed to Git.')
else console.log('Model files ready. Run test:scene:http against the running backend to verify actual inference.')
process.exitCode = failed ? 1 : 0
