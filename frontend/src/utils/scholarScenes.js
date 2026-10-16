// Explicitly requested poet illustrations. Chat loads its active scene; lists
// reuse the same assets for portrait/poem thumbnails without separate bitmaps.
const scenes = {
  // Framing centers include the headdress and shoulders, rather than only the face.
  libai: { name: '李白', title: '太白邀月', portrait: { x: .26, y: .145, scale: 3.2 } },
  sushi: { name: '苏轼', title: '赤壁清风', portrait: { x: .26, y: .13, scale: 3.2 } },
  liqingzhao: { name: '李清照', title: '荷塘疏雨', portrait: { x: .245, y: .18, scale: 2.7 } },
  dufu: { name: '杜甫', title: '浣花草堂', portrait: { x: .27, y: .202, scale: 3.2 } },
  wangyangming: { name: '王阳明', title: '龙场悟道', portrait: { x: .23, y: .155, scale: 3.2 } },
  xinqiji: { name: '辛弃疾', title: '灯下看剑', portrait: { x: .30, y: .195, scale: 3 } },
  group_zhulin: { name: '竹林雅集', title: '竹林清谈', portrait: { x: .47, y: .235, scale: 1.1 } },
}

export function scholarPortraitStyle(scene) {
  if (!scene?.portrait) return undefined
  const { x, y, scale } = scene.portrait
  return {
    '--portrait-scale': `${scale * 100}%`,
    '--portrait-x': `${-x * 100}%`,
    '--portrait-y': `${-y * 100}%`,
  }
}

export function getScholarScene(sageId, name = '', base = import.meta.env.BASE_URL) {
  const key = Object.hasOwn(scenes, sageId) ? sageId : Object.keys(scenes).find(id => name === scenes[id].name)
  return key ? { ...scenes[key], src: `${base}assets/scholar-scenes/${key}-scene-v1.webp` } : null
}
