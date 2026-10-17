const STOP = new Set('之 乎 者 也 兮 矣 焉 哉 其 而 于 於 以 为 与 及 乃 夫 所 则 且 亦 何 不 无 有 是 此 彼 斯 一 了 的 地 得 不能 不知 如何 何处 今日 何时'.split(' '))
function selectRows(rows, query) {
  return rows.filter(p => (!query.corpus || p.corpus === query.corpus) && (!query.author || p.author === query.author) && (!query.title || p.title.includes(query.title)))
}
function units(poem, mode) {
  return mode === 'word' ? poem.tokens.filter(t => [...t].length >= 2 && /^\p{Script=Han}+$/u.test(t)) : poem.paragraphs.flatMap(p => p.match(/\p{Script=Han}/gu) || [])
}
function analyze(rows, query = {}) {
  const selected = selectRows(rows, query), counts = new Map(), documents = new Map()
  let total = 0, included = 0
  for (const poem of selected) {
    const seen = new Set()
    for (const token of units(poem, query.mode)) {
      total++
      if (query.stop && STOP.has(token)) continue
      included++; counts.set(token, (counts.get(token) || 0) + 1); seen.add(token)
    }
    for (const token of seen) documents.set(token, (documents.get(token) || 0) + 1)
  }
  const terms = [...counts].map(([term, count]) => ({ term, count, poems: documents.get(term), per10k: total ? +(count / total * 10000).toFixed(2) : 0 }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term, 'zh-CN'))
  return { poems: selected.length, authors: new Set(selected.map(p => p.author)).size, total, included, distinct: counts.size, terms: terms.slice(0, query.limit || 30), cloudTerms: terms.slice(0, 150) }
}
function contexts(rows, query) {
  const selected = selectRows(rows, query).filter(p => units(p, query.mode).includes(query.term))
  const offset = (query.page - 1) * 10
  return { total: selected.length, page: query.page, items: selected.slice(offset, offset + 10).map(({ id, author, title, corpus, paragraphs }) => ({ id, author, title, corpus, excerpt: paragraphs.find(line => line.includes(query.term)) || paragraphs[0] })) }
}
module.exports = { analyze, contexts, selectRows, units, STOP }
