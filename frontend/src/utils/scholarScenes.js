// Explicitly requested poet illustrations. Chat loads its active scene; lists
// reuse the same assets for portrait/poem thumbnails without separate bitmaps.
const scenes = {
  libai: { name: '李白', title: '太白邀月', face: [.25, .11] },
  sushi: { name: '苏轼', title: '赤壁清风', face: [.235, .103] },
  liqingzhao: { name: '李清照', title: '荷塘疏雨', face: [.265, .148] },
  dufu: { name: '杜甫', title: '浣花草堂', face: [.27, .18] },
  wangyangming: { name: '王阳明', title: '龙场悟道', face: [.24, .147] },
  xinqiji: { name: '辛弃疾', title: '灯下看剑', face: [.30, .178] },
  group_zhulin: { name: '竹林雅集', title: '竹林清谈', face: [.40, .24] },
}

export function getScholarScene(sageId, name = '', base = import.meta.env.BASE_URL) {
  const key = Object.hasOwn(scenes, sageId) ? sageId : Object.keys(scenes).find(id => name === scenes[id].name)
  return key ? { ...scenes[key], src: `${base}assets/scholar-scenes/${key}-scene-v1.webp` } : null
}
