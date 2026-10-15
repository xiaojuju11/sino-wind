/**
 * 🏮 华夏古今城邑雅称总典与时令物候映射表
 * 两宋文人漫游九州，将现代城市地名无缝溯源为诗意古称与千古名句。
 */

// 1. 两宋十六名都（用户打开弹窗优先呈现的文化首选）
export const TOP_ANCIENT_CITIES = [
  { name: '杭州', ancient: '临安', province: '浙江', temp: '24°', weather: '晴和', desc: '水光潋滟晴方好，山色空蒙雨亦奇。', wuhou: '菊有黄华', text: '临安（杭州）· 水光潋滟晴方好' },
  { name: '开封', ancient: '汴京', province: '河南', temp: '19°', weather: '微风', desc: '烟柳画桥，风帘翠幕，参差十万人家。', wuhou: '草木黄落', text: '汴京（开封）· 烟柳画桥风帘幕' },
  { name: '西安', ancient: '长安', province: '陕西', temp: '18°', weather: '清爽', desc: '春风得意马蹄疾，一日看尽长安花。', wuhou: '鸿雁来宾', text: '长安（西安）· 春风得意马蹄疾' },
  { name: '洛阳', ancient: '洛邑', province: '河南', temp: '20°', weather: '晴朗', desc: '洛阳地脉花最宜，牡丹尤为天下奇。', wuhou: '玄鸟归去', text: '洛阳（洛邑）· 地脉花宜满城香' },
  { name: '苏州', ancient: '姑苏', province: '江苏', temp: '21°', weather: '薄雾', desc: '月落乌啼霜满天，江枫渔火对愁眠。', wuhou: '寒蝉鸣止', text: '姑苏（苏州）· 江枫渔火对愁眠' },
  { name: '南京', ancient: '金陵', province: '江苏', temp: '23°', weather: '和煦', desc: '江南佳丽地，金陵帝王州。', wuhou: '水始涸', text: '金陵（南京）· 江南佳丽帝王州' },
  { name: '成都', ancient: '锦官城', province: '四川', temp: '22°', weather: '润泽', desc: '晓看红湿处，花重锦官城。', wuhou: '草木敷荣', text: '锦官城（成都）· 花重锦官天下春' },
  { name: '扬州', ancient: '广陵', province: '江苏', temp: '22°', weather: '和风', desc: '天下三分明月夜，二分无赖是扬州。', wuhou: '绿树阴浓', text: '广陵（扬州）· 二分无赖是广陵' },
  { name: '武汉', ancient: '江城', province: '湖北', temp: '23°', weather: '晴爽', desc: '黄鹤楼中吹玉笛，江城五月落梅花。', wuhou: '白露降', text: '江城（武汉）· 黄鹤长波天际流' },
  { name: '绍兴', ancient: '会稽', province: '浙江', temp: '21°', weather: '微雨', desc: '此地有崇山峻岭，茂林修竹。', wuhou: '兰渚流觞', text: '会稽（绍兴）· 崇山峻岭茂修竹' },
  { name: '北京', ancient: '燕京', province: '北京', temp: '17°', weather: '高爽', desc: '燕山雪花大如席，片片吹落轩辕台。', wuhou: '霜始降', text: '燕京（北京）· 蓟门秋爽远山寒' },
  { name: '广州', ancient: '羊城', province: '广东', temp: '28°', weather: '温润', desc: '日啖荔枝三百颗，不辞长作岭南人。', wuhou: '荔熟蝉清', text: '羊城（广州）· 越秀长风度岭南' },
  { name: '抚州', ancient: '临川', province: '江西', temp: '22°', weather: '清润', desc: '临川四梦才情绝，王谢堂前翰墨香。', wuhou: '木樨弄香', text: '临川（抚州）· 梦入芝兰墨自香' },
  { name: '南昌', ancient: '豫章', province: '江西', temp: '23°', weather: '朗阔', desc: '落霞与孤鹜齐飞，秋水共长天一色。', wuhou: '雁字横空', text: '豫章（南昌）· 落霞孤鹜长天色' },
  { name: '泉州', ancient: '刺桐', province: '福建', temp: '26°', weather: '海霁', desc: '市井十洲人，涨海声中万国商。', wuhou: '温陵帆远', text: '刺桐（泉州）· 涨海声中万国商' },
  { name: '九江', ancient: '浔阳', province: '江西', temp: '20°', weather: '薄岚', desc: '浔阳江头夜送客，枫叶荻花秋瑟瑟。', wuhou: '荻花枫冷', text: '浔阳（九江）· 匡庐烟雨入浔阳' },
]

// 2. 全国主要城市古称精细映射库（65 城，逐城精编诗句与物候雅称，自动去行政化）
// 2026-10-15 合并说明：本表与 geoCities.js（361 城坐标/古称）、almanac.js（真实气温、
// 节气物候）协同 —— 本表的 desc 与 wuhou（如绍兴「兰渚流觞」）作为【精品覆盖】优先呈现；
// 未收录的城邑回落到按季节取句、按节气取物候。故导出供 Home.jsx 整合使用。
export const CITY_DICT = {
  // 华东
  '杭州': { ancient: '临安', desc: '水光潋滟晴方好，山色空蒙雨亦奇。', wuhou: '菊有黄华' },
  '宁波': { ancient: '明州', desc: '海外杂货，海舶之利，云集明州。', wuhou: '秋海澄明' },
  '温州': { ancient: '东瓯', desc: '一片繁华海上头，从来唤作小京都。', wuhou: '橘柚飘香' },
  '绍兴': { ancient: '会稽', desc: '此地有崇山峻岭，茂林修竹。', wuhou: '兰渚流觞' },
  '湖州': { ancient: '吴兴', desc: '吴兴山水清远，吴兴墨韵幽长。', wuhou: '笔底生花' },
  '嘉兴': { ancient: '禾城', desc: '南湖烟雨微茫里，菱角香生水上舟。', wuhou: '烟雨荷残' },
  '金华': { ancient: '婺州', desc: '水通南国三千里，气压江城十四州。', wuhou: '枫林渐染' },
  '衢州': { ancient: '柯城', desc: '烂柯仙弈悠悠远，四省通衢古道幽。', wuhou: '秋山行旅' },
  '南京': { ancient: '金陵', desc: '江南佳丽地，金陵帝王州。', wuhou: '水始涸' },
  '无锡': { ancient: '梁溪', desc: '梁溪十里太湖碧，惠泉九龙试新茶。', wuhou: '竹径泉清' },
  '徐州': { ancient: '彭城', desc: '彭城自古雄藩地，汉家雄风万古长。', wuhou: '古柏萧疏' },
  '常州': { ancient: '毗陵', desc: '毗陵胜境千帆过，儒风雅墨润龙城。', wuhou: '荻花胜雪' },
  '苏州': { ancient: '姑苏', desc: '月落乌啼霜满天，江枫渔火对愁眠。', wuhou: '寒蝉鸣止' },
  '南通': { ancient: '通州', desc: '江海要津开古郡，紫琅叠翠纳云涛。', wuhou: '海月潮生' },
  '连云港': { ancient: '海州', desc: '东海古邑千重浪，郁林青峦石刻长。', wuhou: '海雾晨敛' },
  '淮安': { ancient: '淮阴', desc: '一饭千金淮阴侯，古运河畔柳依依。', wuhou: '霜冷蒹葭' },
  '盐城': { ancient: '盐渎', desc: '海盐古邑天连水，鹤舞神洲草木深。', wuhou: '仙鹤南迁' },
  '扬州': { ancient: '广陵', desc: '天下三分明月夜，二分无赖是扬州。', wuhou: '绿树阴浓' },
  '镇江': { ancient: '京口', desc: '何处望神州？满眼风光北固楼。', wuhou: '急管催秋' },
  '福州': { ancient: '闽都', desc: '三山半落青天外，榕荫蔽日古坊深。', wuhou: '榕阴送爽' },
  '厦门': { ancient: '鹭岛', desc: '沧海茫茫浮仙岛，白鹭翩翩舞碧天。', wuhou: '海风入幕' },
  '泉州': { ancient: '刺桐', desc: '市井十洲人，涨海声中万国商。', wuhou: '温陵帆远' },
  '南昌': { ancient: '豫章', desc: '落霞与孤鹜齐飞，秋水共长天一色。', wuhou: '雁字横空' },
  '九江': { ancient: '浔阳', desc: '浔阳江头夜送客，枫叶荻花秋瑟瑟。', wuhou: '荻花枫冷' },
  '景德镇': { ancient: '昌南', desc: '中华向号瓷之国，瓷业高峰是昌南。', wuhou: '窑火映天' },
  '抚州': { ancient: '临川', desc: '临川四梦才情绝，王谢堂前翰墨香。', wuhou: '木樨弄香' },
  '赣州': { ancient: '虔州', desc: '郁孤台下清江水，中间多少行人泪。', wuhou: '章贡秋深' },
  '济南': { ancient: '历下', desc: '海右此亭古，济南名士多。', wuhou: '泉涌漱玉' },
  '青岛': { ancient: '琴岛', desc: '万国建筑依翠岗，红瓦绿树碧海间。', wuhou: '海浪平沙' },
  '合肥': { ancient: '庐州', desc: '包公铁面留清白，淝水古渡忆英雄。', wuhou: '草木渐黄' },
  '黄山': { ancient: '徽州', desc: '一生痴绝处，无梦到徽州。', wuhou: '烟锁白墙' },

  // 华中与华南
  '武汉': { ancient: '江城', desc: '黄鹤楼中吹玉笛，江城五月落梅花。', wuhou: '白露降' },
  '襄阳': { ancient: '襄樊', desc: '江流天地外，山色有无中。', wuhou: '江风回澜' },
  '荆州': { ancient: '江陵', desc: '千里江陵一日还，两岸猿声啼不住。', wuhou: '渚清沙白' },
  '长沙': { ancient: '潭州', desc: '独立寒秋，湘江北去，橘子洲头。', wuhou: '岳麓枫丹' },
  '岳阳': { ancient: '巴陵', desc: '先天下之忧而忧，后天下之乐而乐。', wuhou: '洞庭波平' },
  '广州': { ancient: '羊城', desc: '日啖荔枝三百颗，不辞长作岭南人。', wuhou: '荔熟蝉清' },
  '深圳': { ancient: '鹏城', desc: '大鹏一日同风起，扶摇直上九万里。', wuhou: '海碧天阔' },
  '珠海': { ancient: '香山', desc: '伶仃洋里叹伶仃，千古丹心映汗青。', wuhou: '海气氤氲' },
  '桂林': { ancient: '始安', desc: '桂林山水甲天下，玉碧罗青意自闲。', wuhou: '漓江水碧' },

  // 西南与西北
  '成都': { ancient: '锦官城', desc: '晓看红湿处，花重锦官城。', wuhou: '草木敷荣' },
  '重庆': { ancient: '巴渝', desc: '巴山夜雨涨秋池，共剪西窗烛影幽。', wuhou: '江烟笼雨' },
  '贵阳': { ancient: '筑城', desc: '黔中要害筑仙城，甲秀楼前水佩清。', wuhou: '竹影婆娑' },
  '昆明': { ancient: '滇池', desc: '天气常如二三月，花枝不断四时春。', wuhou: '繁花漫卷' },
  '大理': { ancient: '妙香国', desc: '下关风，上关花，苍山雪，洱海月。', wuhou: '风花雪月' },
  '西安': { ancient: '长安', desc: '春风得意马蹄疾，一日看尽长安花。', wuhou: '鸿雁来宾' },
  '咸阳': { ancient: '秦川', desc: '渭城朝雨浥轻尘，客舍青青柳色新。', wuhou: '渭水向东' },
  '汉中': { ancient: '梁州', desc: '当年万里觅封侯，匹马戍梁州。', wuhou: '秦岭秋色' },
  '兰州': { ancient: '金城', desc: '金城汤池固，大河东逝水。', wuhou: '白日依山' },
  '敦煌': { ancient: '沙州', desc: '劝君更尽一杯酒，西出阳关无故人。', wuhou: '黄沙夕照' },
  '银川': { ancient: '兴庆', desc: '贺兰山下古边关，黄河滚滚穿平原。', wuhou: '塞上秋声' },
  '西宁': { ancient: '青唐', desc: '日月山头望长安，湟水东流日夜喧。', wuhou: '雪岭凝霜' },
  '拉萨': { ancient: '逻些', desc: '雪域圣境白云高，日光普照布达拉。', wuhou: '雪域晴岚' },
  '乌鲁木齐': { ancient: '迪化', desc: '轮台东门送君去，去时雪满天山路。', wuhou: '天山积雪' },

  // 华北与东北
  '北京': { ancient: '燕京', desc: '燕山雪花大如席，片片吹落轩辕台。', wuhou: '霜始降' },
  '天津': { ancient: '沽上', desc: '九河下梢沽上地，帆樯如织水西头。', wuhou: '海河清凉' },
  '石家庄': { ancient: '常山', desc: '常山赵子龙威名，古刹钟声彻井陉。', wuhou: '太行晚照' },
  '保定': { ancient: '清苑', desc: '总督畿辅控咽喉，古莲池畔荷花瘦。', wuhou: '莲池月明' },
  '太原': { ancient: '晋阳', desc: '晋祠流水如碧玉，微波龙鳞莎草绿。', wuhou: '汾水秋清' },
  '大同': { ancient: '平城', desc: '云冈古窟佛陀笑，代北风高草木枯。', wuhou: '边风劲烈' },
  '沈阳': { ancient: '盛京', desc: '关东雄镇扼要塞，故宫琉璃耀北都。', wuhou: '枫落辽东' },
  '大连': { ancient: '三山浦', desc: '黄海之滨山水阔，星海风来浪卷珠。', wuhou: '海潮鸣秋' },
  '长春': { ancient: '宽城', desc: '林海茫茫松水阔，秋霜初降染长街。', wuhou: '白桦染金' },
  '哈尔滨': { ancient: '冰城', desc: '松江水阔冻云凝，北国风光万里冰。', wuhou: '塞北飞霜' },
  '呼和浩特': { ancient: '青城', desc: '敕勒川，阴山下，天似穹庐笼四野。', wuhou: '大漠秋风' }
}

/**
 * 现代地名去公文行政化，提取核心城市简称
 * 例："阿坝藏族羌族自治州" -> "阿坝"
 *     "成都市" -> "成都"
 *     "阿拉善盟" -> "阿拉善"
 */
export function cleanCityName(raw = '') {
  return raw
    .replace(/(?:特别行政区|藏族羌族自治州|柯尔克孜自治州|哈萨克自治州|蒙古自治州|回族自治州|苗族侗族自治州|壮族苗族自治州|朝鲜族自治州|自治州|地区|林区|矿区|盟|市|县)$/, '')
    .trim()
}

/**
 * 将任意现代城市名称智能匹配为国风典雅展示对象
 */
export function matchAncientCity(rawCityName = '杭州') {
  const pureName = cleanCityName(rawCityName) || '杭州'

  // 1. 先在经典名城字典中直接或模糊检索
  for (const [key, val] of Object.entries(CITY_DICT)) {
    if (pureName.includes(key) || key.includes(pureName)) {
      return {
        name: key,
        ancient: val.ancient,
        temp: '22°',
        weather: '清和',
        desc: val.desc,
        wuhou: val.wuhou,
        text: `${val.ancient}（${key}）· ${val.desc.slice(0, 10)}`
      }
    }
  }

  // 2. 属于没有显著古称的地区：按地域山川赋予两宋典雅文辞
  let regionalPrefix = '华夏'
  if (['阿坝', '甘孜', '凉山', '攀枝花'].some(k => pureName.includes(k))) regionalPrefix = '蜀西'
  else if (['阿拉善', '巴彦淖尔', '锡林郭勒', '呼伦贝尔'].some(k => pureName.includes(k))) regionalPrefix = '塞外'
  else if (['阿里', '日喀则', '那曲', '昌都'].some(k => pureName.includes(k))) regionalPrefix = '高原'
  else if (['喀什', '和田', '阿克苏', '阿勒泰', '塔城'].some(k => pureName.includes(k))) regionalPrefix = '西域'
  else if (['安顺', '毕节', '铜仁', '黔东南'].some(k => pureName.includes(k))) regionalPrefix = '黔中'
  else regionalPrefix = '九州'

  const poeticAncient = `${regionalPrefix}·${pureName}`
  return {
    name: pureName,
    ancient: poeticAncient,
    temp: '20°',
    weather: '清润',
    desc: `${regionalPrefix}风物自古幽深，山川毓秀，天地一色。`,
    wuhou: '秋水澄清',
    text: `${poeticAncient}（${pureName}）· 天地毓秀气象新`
  }
}

/**
 * 自动定位探知用户驻足城市（支持离线缓存、IP免打扰探知与GPS备选）
 */
export async function autoDetectUserCity() {
  // 1. 优先从 LocalStorage 中读取 12 小时内的定位缓存，避免每次刷新闪烁
  try {
    const cached = JSON.parse(localStorage.getItem('gufeng_detected_city_cache') || 'null')
    if (cached && (Date.now() - cached.timestamp < 12 * 3600 * 1000) && cached.data) {
      return cached.data
    }
  } catch {
    // ignore
  }

  // 2. 尝试免授权 IP 地理定位（HTTPS + CORS:*，支持中文）
  const IP_PROVIDERS = [
    {
      url: 'https://ipwho.is/?lang=zh-CN',
      pick: (j) => (j && j.success !== false ? (j.city || j.region || '') : '')
    },
    {
      url: 'https://ipinfo.io/json',
      pick: (j) => (j ? (j.city || j.region || '') : '')
    }
  ]

  for (const p of IP_PROVIDERS) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 2500)
      const resp = await fetch(p.url, { signal: controller.signal })
      clearTimeout(timer)
      if (!resp.ok) continue
      const rawJson = await resp.json()
      const cityName = p.pick(rawJson)
      // 校验城名是否可读（排查乱码/非预期特殊字符），避免脏数据写入 12 小时缓存
      const readable = cityName && !/[\uFFFD]|[^\u4e00-\u9fa5A-Za-z0-9·\-\s]/.test(cityName)
      if (!readable) continue

      const matched = matchAncientCity(cityName)
      localStorage.setItem('gufeng_detected_city_cache', JSON.stringify({ timestamp: Date.now(), data: matched }))
      return matched
    } catch {
      // 接口超时或网络异常，继续尝试下一个备选服务
    }
  }

  // 3. 终极默认：江南临安（杭州）
  return TOP_ANCIENT_CITIES[0]
}
