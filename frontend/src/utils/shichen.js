// 十二时辰 · 养生与雅事
//
// 每个时辰给出：雅称、时段、古人生活、养生要点、雅事。
// 雅称采用通行的十二时辰别称（《左传》「日之数十，故有十时」一脉，
// 后世通行：夜半/鸡鸣/平旦/日出/食时/隅中/日中/日昳/晡时/日入/黄昏/人定）。
//
// ⚠️ 修正历史 bug：原 Home.jsx 把时辰后缀写死为「日映」，
//    既非十二时辰别称，也不随时间变化（亥时应为「人定」）。

export const SHICHEN = [
  { name: '子时', alias: '夜半', range: '23:00-01:00', life: '夜半人静，月照竹影', health: '胆经当令，宜深眠养胆', affair: '万籁俱寂，一阳初生' },
  { name: '丑时', alias: '鸡鸣', range: '01:00-03:00', life: '鸡鸣破晓，万籁俱寂', health: '肝经当令，宜熟睡藏血', affair: '酣卧养肝，勿扰清梦' },
  { name: '寅时', alias: '平旦', range: '03:00-05:00', life: '平旦晨曦，云蒸霞蔚', health: '肺经当令，宜静卧养气', affair: '晓色将分，晨钟未动' },
  { name: '卯时', alias: '日出', range: '05:00-07:00', life: '日出扶桑，晓雾轻拂', health: '大肠经当令，宜饮水如厕', affair: '晨起盥漱，推窗纳新' },
  { name: '辰时', alias: '食时', range: '07:00-09:00', life: '食时晨光，烟柳凝翠', health: '胃经当令，宜进食早餐', affair: '朝食温粥，展卷临帖' },
  { name: '巳时', alias: '隅中', range: '09:00-11:00', life: '隅中日照，琴韵悠扬', health: '脾经当令，宜劳作活动', affair: '读书理事，神思最清' },
  { name: '午时', alias: '日中', range: '11:00-13:00', life: '日中当空，竹影婆娑', health: '心经当令，宜小憩养心', affair: '午食后小睡，养精蓄锐' },
  { name: '未时', alias: '日昳', range: '13:00-15:00', life: '日昳微风，烹茶品茗', health: '小肠经当令，宜多饮水', affair: '烹茶品茗，闲话桑麻' },
  { name: '申时', alias: '晡时', range: '15:00-17:00', life: '晡时斜照，书声朗朗', health: '膀胱经当令，宜走动舒展', affair: '习字抚琴，日影西斜' },
  { name: '酉时', alias: '日入', range: '17:00-19:00', life: '日入暮霞，烟波浩渺', health: '肾经当令，宜静心收敛', affair: '晚食宜少，临水观霞' },
  { name: '戌时', alias: '黄昏', range: '19:00-21:00', life: '黄昏掌灯，抚琴长啸', health: '心包经当令，宜舒缓心情', affair: '秉烛夜读，抚琴长啸' },
  { name: '亥时', alias: '人定', range: '21:00-23:00', life: '人定归心，掩卷幽思', health: '三焦经当令，宜安歇就寝', affair: '掩卷幽思，夜卧安歇' },
]

/** 按时间取时辰（子时跨 23:00-01:00，故先做 +1 小时偏移再除以 2） */
export function shichenOf(date = new Date()) {
  const idx = Math.floor(((date.getHours() + 1) % 24) / 2)
  return SHICHEN[idx]
}

/** 时辰的完整雅称，如「人定 · 亥时」 */
export function shichenLabel(date = new Date()) {
  const s = shichenOf(date)
  return `${s.alias} · ${s.name}`
}
