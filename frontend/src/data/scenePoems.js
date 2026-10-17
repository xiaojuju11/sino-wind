// Curated excerpts. This is an explainable motif index, not a learned poetry model.
import { poemSource } from './sceneSources.js'
export const SCENE_TAGS = {
  tree: '树木', plant: '草木', grass: '芳草', water: '水面', mountain: '山峦', sky: '天空',
  flower: '花', rock: '山石', bridge: '桥', boat: '舟', building: '楼阁屋舍',
  snow: '雪', path: '小径', waterfall: '瀑布', moon: '月', stars: '星辰', willow: '柳', bamboo: '竹', lotus: '荷', rain: '雨', sunset: '夕阳',
}
export const SCENE_POEMS = [
  { id: 'sushi-yuhou', title: '饮湖上初晴后雨二首·其二', author: '苏轼', dynasty: '宋', lines: ['水光潋滟晴方好，', '山色空蒙雨亦奇。'], anchors: [['水', 'water'], ['山', 'mountain']], note: '诗人写西湖晴雨皆宜的风致。可从画面的水色、山势入诗；晴雨不由物体标签判定。' },
  { id: 'wangwei-hanjiang', title: '汉江临泛', author: '王维', dynasty: '唐', lines: ['江流天地外，', '山色有无中。'], anchors: [['江', 'water'], ['山', 'mountain']], note: '远水与淡山构成开阔层次，“有无中”写出山色若隐若现的感受。' },
  { id: 'menghaoran-guren', title: '过故人庄', author: '孟浩然', dynasty: '唐', lines: ['绿树村边合，', '青山郭外斜。'], anchors: [['树', 'tree'], ['山', 'mountain'], ['村', 'building']], note: '树木环抱村落，远处青山横斜，共同构成亲切的田园景象。' },
  { id: 'hanyuefu-jiangnan', title: '江南', author: '汉乐府', dynasty: '汉', lines: ['江南可采莲，', '莲叶何田田。'], anchors: [['莲', 'lotus']], note: '“田田”写莲叶茂盛的样子。荷莲需用户确认，普通水面不能证明画面中有莲。' },
  { id: 'yangwanli-xiaochi', title: '小池', author: '杨万里', dynasty: '宋', lines: ['泉眼无声惜细流，', '树阴照水爱晴柔。'], anchors: [['树', 'tree'], ['水', 'water']], note: '树阴与水面的相映适合细观。诗中的泉眼与天气属于原诗语境，不是额外的识别结果。' },
  { id: 'wangwan-beigu', title: '次北固山下', author: '王湾', dynasty: '唐', lines: ['客路青山外，', '行舟绿水前。'], anchors: [['山', 'mountain'], ['舟', 'boat'], ['水', 'water']], note: '行舟、绿水与青山组成旅途的空间。照片中的船可引出羁旅意象。' },
  { id: 'libai-tianmen', title: '望天门山', author: '李白', dynasty: '唐', lines: ['两岸青山相对出，', '孤帆一片日边来。'], anchors: [['山', 'mountain'], ['帆', 'boat']], note: '从山与舟读出行进中的视角；“孤帆”是对舟的文学联想，不代表检测到了帆。' },
  { id: 'libai-lushan', title: '望庐山瀑布', author: '李白', dynasty: '唐', lines: ['飞流直下三千尺，', '疑是银河落九天。'], anchors: [['飞流', 'waterfall']], note: '以飞流联想到银河，感受夸张与想象；诗句不用于测量瀑布高度。' },
  { id: 'dufu-jueju', title: '绝句', author: '杜甫', dynasty: '唐', lines: ['两个黄鹂鸣翠柳，', '一行白鹭上青天。'], anchors: [['柳', 'willow'], ['天', 'sky']], note: '由柳色、天空进入明丽的春景。鸟类与鸣声需画面或现场证据，不能从天空标签推断。' },
  { id: 'zhuxi-chunri', title: '春日', author: '朱熹', dynasty: '宋', lines: ['等闲识得东风面，', '万紫千红总是春。'], anchors: [['万紫千红', 'flower']], note: '以繁花联想春意。“春”是诗中意境，不能据花朵直接确定拍摄季节。' },
  { id: 'baijuyi-fude', title: '赋得古原草送别', author: '白居易', dynasty: '唐', lines: ['离离原上草，', '一岁一枯荣。'], anchors: [['草', 'grass']], note: '由草地联想到生命循环与送别，留意诗意超出画面所见的部分。' },
  { id: 'wangwei-zhuli', title: '竹里馆', author: '王维', dynasty: '唐', lines: ['独坐幽篁里，', '弹琴复长啸。'], anchors: [['幽篁', 'bamboo']], note: '幽篁指幽深的竹林。确认竹子之后，可由景物进入独处的意境。' },
  { id: 'zhangxu-taohua', title: '桃花溪', author: '张旭', dynasty: '唐', lines: ['隐隐飞桥隔野烟，', '石矶西畔问渔船。'], anchors: [['桥', 'bridge'], ['石', 'rock'], ['船', 'boat']], note: '桥、石、舟是寻访幽境的线索，烟雾与渔事保留为诗中语境。' },
  { id: 'wangzhihuan-lou', title: '登鹳雀楼', author: '王之涣', dynasty: '唐', lines: ['白日依山尽，', '黄河入海流。'], anchors: [['白日', 'sunset'], ['山', 'mountain'], ['河', 'water']], note: '落日、山与河流相映，从开阔景象体会登高远望的意境。' },
  { id: 'liuzongyuan-jiangxue', title: '江雪', author: '柳宗元', dynasty: '唐', lines: ['孤舟蓑笠翁，', '独钓寒江雪。'], anchors: [['舟', 'boat'], ['江', 'water'], ['雪', 'snow']], note: '舟、水、雪构成清寒境界。未在画面发现的雪与钓者，只属于文学联想。' },
  { id: 'wangwei-niaoming', title: '鸟鸣涧', author: '王维', dynasty: '唐', lines: ['月出惊山鸟，', '时鸣春涧中。'], anchors: [['月', 'moon'], ['山', 'mountain']], note: '由月与山体味幽静，鸟鸣是原诗描写的声音，静态照片无法确认。' },
  { id: 'dufu-jiangpan', title: '江畔独步寻花·其六', author: '杜甫', dynasty: '唐', lines: ['黄四娘家花满蹊，', '千朵万朵压枝低。'], anchors: [['花', 'flower'], ['蹊', 'path']], note: '花与小径相映，可以读到行走其中的亲近感。' },
  { id: 'wangwei-luchai', title: '鹿柴', author: '王维', dynasty: '唐', lines: ['返景入深林，', '复照青苔上。'], anchors: [['林', 'tree']], note: '从林木观察光影。“青苔”与夕照须另行观察，不能由树木标签自动确认。' },
  { id: 'zhaoshixiu-youyue', title: '约客', author: '赵师秀', dynasty: '宋', lines: ['黄梅时节家家雨，', '青草池塘处处蛙。'], anchors: [['雨', 'rain'], ['草', 'grass'], ['池塘', 'water']], note: '雨中的青草与池塘，令人联想到黄梅时节的闲静；蛙声留在原诗的听觉意境中。' },
  { id: 'libai-yelou', title: '夜宿山寺', author: '李白', dynasty: '唐', lines: ['危楼高百尺，', '手可摘星辰。'], anchors: [['楼', 'building'], ['星辰', 'stars']], note: '由建筑联想到登高的想象。星辰须另行确认，画面并不因此被认定为寺院或夜景。' },
  { id: 'gaopian-shanting', title: '山亭夏日', author: '高骈', dynasty: '唐', lines: ['绿树阴浓夏日长，', '楼台倒影入池塘。'], anchors: [['树', 'tree'], ['楼台', 'building'], ['池塘', 'water']], note: '浓荫环绕楼台，水中又收下一重倒影，近景与水色相互映衬。' },
  { id: 'zuyong-zhongnan', title: '终南望余雪', author: '祖咏', dynasty: '唐', lines: ['终南阴岭秀，', '积雪浮云端。'], anchors: [['岭', 'mountain'], ['雪', 'snow'], ['云', 'sky']], note: '山岭托起积雪，云天衬出高远与清寒，适合由雪山景象读入诗中。' },
  { id: 'sushi-xilin', title: '题西林壁', author: '苏轼', dynasty: '宋', lines: ['横看成岭侧成峰，', '远近高低各不同。'], anchors: [['岭', 'mountain']], note: '群峰在不同距离与角度中呈现层次，眼前山势正可与这种观看方式相映。' },
  { id: 'libai-jingting', title: '独坐敬亭山', author: '李白', dynasty: '唐', lines: ['相看两不厌，', '只有敬亭山。'], anchors: [['山', 'mountain']], note: '将群山视作可相对而坐的知己，从眼前山色读出安静的陪伴。' },
  { id: 'libai-jingmen', title: '渡荆门送别', author: '李白', dynasty: '唐', lines: ['山随平野尽，', '江入大荒流。'], anchors: [['山', 'mountain'], ['江', 'water']], note: '山势与水流一同铺展，将视线由近处引向开阔远方。' },
  { id: 'yangwanli-jingci', title: '晓出净慈寺送林子方', author: '杨万里', dynasty: '宋', lines: ['接天莲叶无穷碧，', '映日荷花别样红。'], anchors: [['莲叶', 'lotus'], ['荷花', 'lotus']], note: '莲叶与荷花连成一片，碧色与红色相映，铺陈出荷塘的明丽。' },
  { id: 'baijuyi-qiantang', title: '钱塘湖春行', author: '白居易', dynasty: '唐', lines: ['乱花渐欲迷人眼，', '浅草才能没马蹄。'], anchors: [['花', 'flower'], ['草', 'grass']], note: '繁花与浅草交织，适合以花地的色彩和层次体会春行的轻快。' },
  { id: 'caocao-canghai', title: '观沧海', author: '曹操', dynasty: '汉', lines: ['树木丛生，', '百草丰茂。'], anchors: [['树木', 'tree'], ['草', 'grass']], note: '树木与芳草共同构成蓬勃的绿意，由近处草地读向层叠林木。' },
  { id: 'wangwei-shanju', title: '山居秋暝', author: '王维', dynasty: '唐', lines: ['明月松间照，', '清泉石上流。'], anchors: [['月', 'moon'], ['松', 'tree'], ['泉', 'water'], ['石', 'rock']], note: '月色照进林间，清水穿过山石，光与水共同营造幽静的境界。' },
].map(poem => ({ ...poem, source: `${poem.author}《${poem.title}》`, ...poemSource(poem) }))

// Rare motifs must be present; background sky alone is never sufficient evidence of night.
const REQUIRED = {
  'zuyong-zhongnan': ['mountain', 'snow'],
  'wangwei-shanju': ['moon', 'tree', 'water'],
}
const WEIGHTS = { sky: .15, plant: .65, grass: 1.2, tree: 1.6, building: 1.6, water: 2.6, mountain: 3.2, flower: 4, snow: 4.5, rock: 1.3, path: 1.4, bridge: 2.7, boat: 3, waterfall: 4, moon: 3, stars: 3, rain: 3, sunset: 3, willow: 3, bamboo: 3, lotus: 4 }

export function matchScenePoems(selection) {
  const areas = new Map()
  for (const item of selection) {
    const row = typeof item === 'string' ? { tag: item, area: .15 } : item
    const boxArea = row.box ? Math.max(0, row.box[2] - row.box[0]) * Math.max(0, row.box[3] - row.box[1]) : .15
    const area = Number.isFinite(row.area) ? row.area : boxArea
    if (!SCENE_TAGS[row.tag] || area <= 0) continue
    areas.set(row.tag, Math.min(1, (areas.get(row.tag) || 0) + area))
  }
  const set = new Set(areas.keys())
  if (!set.size) return []
  const salience = new Map([...areas].map(([tag, area]) => [tag, (WEIGHTS[tag] || 1) * Math.sqrt(area)]))
  const total = [...salience.values()].reduce((sum, value) => sum + value, 0)
  return SCENE_POEMS.map(poem => {
    const matched = poem.anchors.filter(([, tag]) => set.has(tag))
    const required = REQUIRED[poem.id] || [...new Set(poem.anchors.map(([, tag]) => tag))]
    if (!required.every(tag => set.has(tag))) return null
    const unique = [...new Set(matched.map(([, tag]) => tag))]
    const support = unique.reduce((sum, tag) => sum + salience.get(tag), 0) / total
    const coverage = unique.length / new Set(poem.anchors.map(([, tag]) => tag)).size
    return { ...poem, matched, missing: poem.anchors.filter(([, tag]) => !set.has(tag)), rank: support * 30 + coverage * 8 + unique.length }
  }).filter(Boolean).sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id)).slice(0, 6)
}
