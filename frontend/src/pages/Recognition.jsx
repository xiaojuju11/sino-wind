import { useCallback, useRef, useState } from 'react'
import { Toast } from 'antd-mobile'
import axios from '../http'
import ImageCaptureAndProcess from '../components/imageCaptureAndProcess/index.jsx'
import RecognitionResult, { RecognitionSkeleton } from '../components/recognitionResult/Index.jsx'
import '../styles/recognition.less'

const REQUEST_TIMEOUT = 65000 // 比服务端默认 60 秒超时多留出传输时间
const FAILURE_MESSAGE = '本次未能取得识别结果，请检查网络后重试。'

function createPresetSvg(glyph, name, dynasty, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <rect width="600" height="450" fill="${color}"/>
    <circle cx="300" cy="190" r="110" fill="none" stroke="#C5A059" stroke-width="2" stroke-dasharray="6 3" opacity="0.6"/>
    <circle cx="300" cy="190" r="92" fill="#181512" stroke="#D4AF37" stroke-width="1.5"/>
    <text x="300" y="215" font-family="serif" font-size="72" fill="#F4EFE6" text-anchor="middle" font-weight="bold">${glyph}</text>
    <text x="300" y="340" font-family="serif" font-size="28" fill="#D4AF37" text-anchor="middle" letter-spacing="4" font-weight="600">${name}</text>
    <text x="300" y="380" font-family="serif" font-size="18" fill="#A4937D" text-anchor="middle" letter-spacing="2">〔文博典范 · ${dynasty}绝品〕</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const MUSEUM_PRESETS = [
  {
    id: 'naicha',
    name: '酪饮 · 酥签',
    dynasty: '两宋',
    category: '临安茶肆乳酪绝品',
    seal: '今物',
    bgColor: '#4a3319',
    tag: '今夕相映 · 现代奶茶雅祖',
    thumb: '酪',
    desc: '煎点酥酪芳润，辛弃疾词云“饮罢松萝一盏酪”',
    description: '宋代临安与汴京茶肆之消暑与冬令雅饮。宋人将初乳精炼为酥酪，辅以松萝清茶或龙脑花露煎点，称为「酪饮」或「酥签」，辛弃疾词云“饮罢松萝一盏酪，清芬留得绕牙香”，实为现代鲜奶茶与奶盖之雅制源头。\n【流变考略】汉魏酥酪浆饮 ➔ 唐代醍醐与酥山（冷冻点心） ➔ 两宋茶肆酥签与酪饮（文人雅饮） ➔ 明清酥油茶与老北京酪香 ➔ 现当代新中式茶饮与鲜萃奶茶。',
    craft: '古法乳酪提炼与煎茶调和工艺',
    material: '天然乳脂、松萝茶与龙脑花露'
  },
  {
    id: 'shubao',
    name: '漆藤书笈 · 简囊',
    dynasty: '宋代',
    category: '士子负笈随行重器',
    seal: '今物',
    bgColor: '#213028',
    tag: '士子雅行 · 现代书包之源',
    thumb: '笈',
    desc: '负笈求学之重器，多层屉格分储简册文房',
    description: '古人负笈求学行万里路之随身文器，多以轻质竹木或细藤编织为胎，外髹生漆，内置多层屉格与护角，分别收纳诗卷、简策、砚台与笔墨，兼具防水防蛀与便携之能，苏轼诗云“短褐风霜负笈游”，正为此物。\n【流变考略】战国竹简革囊 ➔ 汉晋漆藤书笈与负箧 ➔ 宋元折叠箱笈（分层收纳体系确立） ➔ 明清硬木文具箱与布夹 ➔ 现当代多功能减负书包与文创双肩包。',
    craft: '劈篾编织与大漆髹涂工艺',
    material: '江南紫竹、细藤与熟桐油生漆'
  },
  {
    id: 'tianmu-cup',
    name: '曜变天目茶盏',
    dynasty: '宋代',
    category: '建阳窑黑釉绝品',
    seal: '案例',
    bgColor: '#172230',
    tag: '国宝名瓷 · 一盏含星河',
    thumb: '盏',
    desc: '宋代点茶极品，深黑曜斑青紫流光',
    description: '宋代建阳窑绝品，深黑釉面上散落曜斑与青紫光晕，有“一盏含星河”之妙，为两宋点茶斗茶之极品重器。\n【流变考略】唐代越窑青瓷茶瓯 ➔ 宋代建窑曜变黑釉盏（点茶斗茶风靡） ➔ 明清宜兴紫砂壶与青花盖碗 ➔ 当代建盏非遗柴烧与国风茶事美学。',
    craft: '建窑黑釉高温结晶烧造工艺',
    material: '高铁黏土与天然矿物釉'
  },
  {
    id: 'tiehua-flagon',
    name: '酱釉贴花酒樽',
    dynasty: '唐代',
    category: '盛唐酒礼重器',
    seal: '案例',
    bgColor: '#382315',
    tag: '丝路融合 · 胡风西韵',
    thumb: '樽',
    desc: '堆贴胡人驯狮，兼融西域金银器型',
    description: '盛唐气象之酒礼重器，器身堆贴胡人驯狮及忍冬纹饰，兼融中原制瓷风骨与西域金银器造型之精髓。\n【流变考略】先秦青铜尊彝 ➔ 汉晋漆羽觞与青瓷扁壶 ➔ 唐代酱釉与三彩贴花酒樽 ➔ 宋代注子温碗与梅瓶 ➔ 现当代景德镇名窑分酒器。',
    craft: '模印贴花与高温酱釉还原烧',
    material: '盛唐高岭土与矿物酱釉'
  },
  {
    id: 'sancai-horse',
    name: '三彩腾空三彩马',
    dynasty: '唐代',
    category: '丝路陶俑雕塑巅峰',
    seal: '案例',
    bgColor: '#212d1b',
    tag: '万国来朝 · 盛世风骨',
    thumb: '驹',
    desc: '昂首腾空，绿褐白三色流淌交融',
    description: '唐代雕塑艺术之巅峰，矫健昂首，腾空跃动，绿褐白三色流淌交融，尽显丝绸之路万国来朝之昂扬风貌。\n【流变考略】秦汉行军陶俑与铜奔马 ➔ 盛唐开元天宝三彩骏马（陪葬明器与盛世礼仪） ➔ 宋元以画代俑（李公麟五马图） ➔ 当代国潮数字雕塑与非遗唐三彩烧制。',
    craft: '二次烧成法（素烧与低铅釉彩烧）',
    material: '白色高岭土与铜铁钴矿物釉'
  }
]

function getInitialPreset() {
  if (typeof window === 'undefined' || !window.location?.search) return null
  try {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('preset')
    return (id && MUSEUM_PRESETS.find(p => p.id === id)) || null
  } catch {
    return null
  }
}

export default function Recognition() {
  const initialSpecimen = getInitialPreset()
  const [recognitionResult, setRecognitionResult] = useState(() => initialSpecimen ? {
    code: 1,
    source: 'preset-specimen',
    notice: '内置研习案例：图示与考释为预先编写的示例，本次未调用图像识别，不作为个人识物成果。',
    data: {
      name: initialSpecimen.name,
      dynasty: initialSpecimen.dynasty,
      description: initialSpecimen.description,
      craft: initialSpecimen.craft,
      material: initialSpecimen.material
    }
  } : null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scene, setScene] = useState(0) // 每次识别递增，用作结果组件的 key，确保新一轮结果从干净状态起渲染
  const [presetPreview, setPresetPreview] = useState(() => initialSpecimen ? createPresetSvg(initialSpecimen.thumb, initialSpecimen.name, initialSpecimen.dynasty, initialSpecimen.bgColor) : null)
  const [activePresetId, setActivePresetId] = useState(() => initialSpecimen ? initialSpecimen.id : '')
  const requestSeq = useRef(0) // 请求序号：旧响应一律丢弃，避免覆盖新一次识别
  const selectedImage = useRef(initialSpecimen ? createPresetSvg(initialSpecimen.thumb, initialSpecimen.name, initialSpecimen.dynasty, initialSpecimen.bgColor) : null)

  const recognize = useCallback(async (dataUrl) => {
    const seq = ++requestSeq.current
    selectedImage.current = dataUrl
    setPresetPreview(null)
    setActivePresetId('')
    setScene(seq)
    setLoading(true)
    setRecognitionResult(null)
    setError('')
    Toast.show({ content: '呈递图卷 · 先贤研墨考证中…', duration: 3500 })

    try {
      const res = await axios.post('/api/coze/recognition', { img: dataUrl }, { timeout: REQUEST_TIMEOUT, silentToast: true })
      if (requestSeq.current !== seq) return
      const body = res?.data
      if (body && body.code === 1 && body.data && !body.degraded && body.source !== 'local-fallback') {
        // 真实识别结果直接上屏
        setRecognitionResult(body)
        Toast.show({ content: '考释完毕 · 雅文已著', icon: 'success' })
      } else {
        setError(body?.degraded || body?.source === 'local-fallback'
          ? '本次未能完成图片识别，服务返回了离线示例，请重试或联系管理员。'
          : body?.message || FAILURE_MESSAGE)
      }
    } catch (err) {
      console.warn('Recognition request failed or timed out:', err?.message)
      if (requestSeq.current !== seq) return
      setError(err?.response?.data?.message || err?.data?.message || FAILURE_MESSAGE)
    } finally {
      if (requestSeq.current === seq) {
        setLoading(false)
      }
    }
  }, [])

  const handleSelectPreset = useCallback((preset) => {
    const seq = ++requestSeq.current
    const svgUrl = createPresetSvg(preset.thumb, preset.name, preset.dynasty, preset.bgColor)
    selectedImage.current = svgUrl
    setPresetPreview(svgUrl)
    setActivePresetId(preset.id)
    setScene(seq)
    setLoading(false)
    setError('')
    setRecognitionResult({
      code: 1,
      source: 'preset-specimen',
      notice: '内置研习案例：图示与考释为预先编写的示例，本次未调用图像识别，不作为个人识物成果。',
      data: {
        name: preset.name,
        dynasty: preset.dynasty,
        description: preset.description,
        craft: preset.craft,
        material: preset.material
      }
    })
    Toast.show({ content: `呈递典范 · ${preset.name}`, icon: 'success' })
  }, [])

  const handleClearPreview = useCallback(() => {
    setPresetPreview(null)
    setActivePresetId('')
  }, [])

  return (
    <ImageCaptureAndProcess
      onRecognition={recognize}
      previewImage={presetPreview}
      onClear={handleClearPreview}
    >
      {loading && <RecognitionSkeleton />}
      {!loading && error && (
        <section className='object-recognition-error' role='alert'>
          <h2>本次识别未完成</h2>
          <p>{error}</p>
          <button type='button' className='image-capture-btn image-capture-btn--secondary'
            onClick={() => recognize(selectedImage.current)}>重新识别</button>
        </section>
      )}

      {/* 文博典范标本推荐栏（秒级通道：国宝标本免等极速体验，现场防翻车安全气囊） */}
      <section className='museum-presets-container' aria-label='文博典范标本推荐'>
        <div className='presets-header'>
          <div className='presets-title-wrap'>
            <span className='presets-badge'>典范标本</span>
            <h3 className='presets-title'>文博金石 · 秒级考释</h3>
          </div>
          <span className='presets-sub'>内置研习案例 · 无需上传</span>
        </div>
        <div className='presets-grid'>
          {MUSEUM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type='button'
              className={`preset-card${activePresetId === preset.id ? ' is-active' : ''}`}
              onClick={() => handleSelectPreset(preset)}
              aria-label={`研摩${preset.name}`}
            >
              <div className='preset-icon-circle' style={{ backgroundColor: preset.bgColor }}>
                {preset.thumb}
              </div>
              <span className='preset-tag'>〔{preset.dynasty}〕{preset.seal}</span>
              <strong className='preset-name'>{preset.name}</strong>
              <span className='preset-desc'>{preset.desc}</span>
              <span className='preset-action-cue'>即刻考释 ➔</span>
            </button>
          ))}
        </div>
      </section>

      {!loading && recognitionResult && (
        <RecognitionResult key={scene} recognitionResult={recognitionResult} />
      )}
    </ImageCaptureAndProcess>
  )
}
