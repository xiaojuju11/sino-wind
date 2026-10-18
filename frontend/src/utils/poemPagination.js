// Keep every item in order while bounding both row count and reading length.
export function paginateLines(lines, { maxRows = 6, maxCharacters = 120, textOf = value => value } = {}) {
  const pages = []
  let page = [], characters = 0
  for (const line of lines) {
    const length = Array.from(textOf(line) || '').length
    if (page.length && (page.length >= maxRows || characters + length > maxCharacters)) {
      pages.push(page)
      page = []
      characters = 0
    }
    page.push(line)
    characters += length
  }
  if (page.length) pages.push(page)
  return pages
}

export function paginatePoem(lines) {
  if (lines.length <= 8 && lines.join('').length <= 180) return [lines]
  const segments = lines.flatMap(line => {
    if (Array.from(line).length <= 32) return [line]
    return (line.match(/[^。！？；]+[。！？；]?|[。！？；]/gu) || [line])
      .flatMap(sentence => {
        const chars = Array.from(sentence), chunks = []
        for (let i = 0; i < chars.length; i += 32) chunks.push(chars.slice(i, i + 32).join(''))
        return chunks
      })
  })
  return paginateLines(segments)
}
