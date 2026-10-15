# 给郑小君：`ancientCities.js` 定位链路的三处问题与改法

> 提出者：陈思卉（成员 B）｜ 日期：2026-10-15
> 对象：`frontend/src/utils/ancientCities.js` 的 `autoDetectUserCity()`
> **本人未改动你的文件**（除把 `CITY_DICT` 加 `export` 以便整合，见文末说明），
> 仅把实测到的问题与改法列在此处。
>
> 背景：我在 `feat/chen-home-geo` 里也做了城市定位，合并时实测发现你的定位链路
> **在当前网络环境下不会生效**，用户会一直看到默认的「临安（杭州）」。

---

## 先说结论

**三个问题叠加，导致「自动感知驻足城市」实际上不工作**：

| # | 问题 | 后果 | 严重度 |
|:---|:---|:---|:---|
| 1 | `pconline` 接口**没有 CORS 头** | 浏览器 `fetch` 直接失败，首选链路 100% 不通 | 🔴 致命 |
| 2 | 备选 `ip-api.com` 是**明文 HTTP** | HTTPS 部署下被浏览器按混合内容拦截；且该接口中文亦为乱码 | 🔴 致命 |
| 3 | `pconline` 返回 **GBK**，代码按 UTF-8 解 | 即使通了也会拿到乱码城市名 | 🟠 次要 |

三条都失败 → 走到代码末尾的 `return TOP_ANCIENT_CITIES[0]`，**永远是杭州**。
也就是说用户看到的「自动感知」其实是写死的默认值。

---

## 问题 1：pconline 无 CORS 头（致命）

```js
const resp = await fetch('https://whois.pconline.com.cn/ipJson.jsp?json=true')
```

**实测响应头**：
```
HTTP 200
Access-Control-Allow-Origin: （未声明）
```

**浏览器内实测**（Chrome DevTools Protocol，页面上下文）：
```
TypeError: Failed to fetch
```

同批对比（我用的两个服务）：

| 服务 | 状态 | CORS |
|:---|:---|:---|
| `whois.pconline.com.cn`（你的首选） | 200 | **未声明 → 浏览器拦** |
| `http://ip-api.com`（你的备选） | 200 | `*`（但见问题 2） |
| `https://ipwho.is`（我用的） | 200 | `*` ✅ |
| `https://ipinfo.io/json`（我用的备选） | 200 | `*` ✅ |

> 你在本机 `npm run dev`（http://localhost）调试时可能看不出问题 ——
> 但同源策略与 CORS 是两回事，**缺少 ACAO 头时会直接 fetch 失败**。

### 改法

把首选换成有 CORS 头的 HTTPS 服务。**已验证可用**的两个：

```js
// 首选：ipwho.is（HTTPS + CORS:*，免费无 Key）
const resp = await fetch('https://ipwho.is/')
if (resp.ok) {
  const json = await resp.json()
  if (json.success !== false) {
    const cityName = json.city || json.region || ''
    // ... matchAncientCity(cityName)
  }
}

// 备选：ipinfo.io（HTTPS + CORS:*）
const resp = await fetch('https://ipinfo.io/json')
const json = await resp.json()
const cityName = json.city || json.region || ''
```

若确实想保留 pconline，则必须走后端代理（同源请求不受 CORS 限制），
但那要动后端路由 —— 建议直接换成上面任一个。

---

## 问题 2：备选是明文 HTTP（致命）

```js
const resp = await fetch('http://ip-api.com/json/?lang=zh-CN')
```

HTTP 页面下能跑，但**部署到 HTTPS 后会被浏览器按「混合内容」拦截**
（`Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure resource 'http://ip-api.com/...'`）。
该接口的 HTTPS 版本需付费。

另外实测它的中文返回也是乱码：
```
{"country":"ä¸å½","regionName":"æ±è¥¿","city":...}
```

### 改法

直接删掉这条备选，用问题 1 里给的 HTTPS 服务（`ipwho.is` / `ipinfo.io` 都有 CORS）。

---

## 问题 3：GBK 未解码（次要，但会污染缓存）

```js
const json = await resp.json()      // ← 默认按 UTF-8 解
```

**实测**：
```
按 UTF-8 解 city = "�Ž���"      ← 你当前的用法
按 GBK  解 city = "九江市"      ← 正确
```

拿到乱码后 `matchAncientCity("�Ž���")` 匹配不到任何城，走「地域兜底」分支返回
`{ name: '�Ž���', ancient: '九州·�Ž���' }`，**并且这个乱码结果被写进
`localStorage.gufeng_detected_city_cache` 缓存 12 小时** —— 用户刷新也恢复不了，
要等缓存过期。

### 改法

```js
const resp = await fetch(url)
const buf = await resp.arrayBuffer()
// pconline 是 GBK；TextDecoder('gbk') 浏览器原生支持（已实测 ✅）
const text = url.includes('pconline') ? new TextDecoder('gbk').decode(buf) : new TextDecoder('utf-8').decode(buf)
const json = JSON.parse(text)
```

**注意**：换成 `ipwho.is` / `ipinfo.io` 后**不需要 GBK 处理**（它们是 UTF-8），
所以采问题 1 的改法后，本问题自动消失。

---

## 建议的最小改动（一次解决三个问题）

把 `autoDetectUserCity()` 里的两段 fetch 换成：

```js
// 2. 尝试免授权 IP 地理定位（HTTPS + CORS，UTF-8）
const IP_PROVIDERS = [
  { url: 'https://ipwho.is/', pick: (j) => (j.success === false ? '' : (j.city || j.region || '')) },
  { url: 'https://ipinfo.io/json', pick: (j) => (j.city || j.region || '') },
]
for (const p of IP_PROVIDERS) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const resp = await fetch(p.url, { signal: controller.signal })
    clearTimeout(timer)
    if (!resp.ok) continue
    const cityName = p.pick(await resp.json())
    if (!cityName) continue
    const matched = matchAncientCity(cityName)
    localStorage.setItem('gufeng_detected_city_cache', JSON.stringify({ timestamp: Date.now(), data: matched }))
    return matched
  } catch {
    // 换下一个服务
  }
}
// 3. 最终回落到默认
return TOP_ANCIENT_CITIES[0]
```

顺带建议：**缓存前先校验城名可读**，避免把脏数据缓存 12 小时：

```js
const readable = cityName && !/[\uFFFD]|[^\u4e00-\u9fa5A-Za-z0-9·\-\s]/.test(cityName)
if (!readable) continue
```

---

## 附：已合并的整合说明（供你知悉）

你我的实现是同一需求的两个并行版本（你 21:46 提交并合并，我 21:xx）。
已按整合方案合并到 `feat/chen-home-geo`：

- **保留你的 `CITY_DICT`**（65 城逐城精编诗句与物候雅称，如绍兴「兰渚流觞」）——
  已作为**最高优先级**接入 `cityView()`；实测留驻绍兴显示
  「会稽（绍兴）· 20° · 此地有崇山峻岭，茂林修竹。· 物候：兰渚流觞」
- 我的部分：361 城坐标/古称、真实气温（Open-Meteo）、359 城朝代沿革轴、
  678 条古称检索、十二时辰弹窗
- 为整合，我给 `CITY_DICT` 补了 `export`（原先未导出，外部取不到）；
  另补了一行注释说明它在新架构中的角色。**这是我在你文件里唯一的改动**，
  若你不认可可以撤掉，我改用复制一份的方式。

另外我在整合层加了一道**防御**：`autoDetectUserCity` 返回的城名若含替换符或
非中日韩字符即弃用、转走我的 `locate()` —— 目的是在根因修复前先保证线上不出现
乱码城市名。等你的问题 1/2/3 修好后，这道防御可以移除。
