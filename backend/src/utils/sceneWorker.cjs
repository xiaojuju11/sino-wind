const { parentPort } = require('node:worker_threads')
const path = require('node:path')
const { LABELS, encodeMask } = require('./sceneMasks')
const { root, segmentationModel } = require('./sceneModelConfig')
let segmenter, depthEstimator
parentPort.on('message', async ({ image }) => {
  try {
    const { pipeline, RawImage, env } = await import('@huggingface/transformers')
    env.allowRemoteModels = false
    const segmentation = segmentationModel()
    const options = { dtype: 'q8', local_files_only: true, session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 } }
    segmenter ||= await pipeline('image-segmentation', segmentation.folder, options)
    const raw = await RawImage.fromBlob(new Blob([Buffer.from(image.split(',')[1], 'base64')]))
    // Match the model's 512px input instead of discarding detail at 256px first.
    // Bound pipeline post-processing too, keeping CPU response times predictable.
    const inputScale = Math.min(1, 512 / Math.max(raw.width, raw.height))
    const modelImage = await raw.resize(Math.max(1, Math.round(raw.width * inputScale)), Math.max(1, Math.round(raw.height * inputScale)))
    const scale = Math.min(1, 384 / Math.max(raw.width, raw.height))
    const small = await raw.resize(Math.max(1, Math.round(raw.width * scale)), Math.max(1, Math.round(raw.height * scale)))
    const segments = await segmenter(modelImage)
    let depth = null, depthNotice = ''
    try {
      depthEstimator ||= await pipeline('depth-estimation', path.join(root, 'depth'), options)
      depth = (await depthEstimator(modelImage)).depth
      depth = (await depth.resize(small.width, small.height)).data
    } catch { depthNotice = '远近层次暂未展开，仍可选景寻诗。' }
    const regions = []
    for (const row of segments) {
      const mapping = LABELS[row.label]
      if (!mapping) continue
      const mask = await row.mask.resize(small.width, small.height, { resample: 0 })
      const encoded = encodeMask(mask.data, small.width, small.height, depth)
      if (encoded.area < 0.004) continue
      regions.push({ id: `region-${regions.length}`, tag: mapping[0], label: mapping[1], source: 'model', ...encoded })
    }
    parentPort.postMessage({ data: { width: small.width, height: small.height, regions, depth: depth ? Array.from(depth) : null, depthNotice, model: segmentation.name, depthModel: depth ? 'Depth Anything V2 Small' : null } })
  } catch (error) {
    parentPort.postMessage({ error: error.message })
  }
})
