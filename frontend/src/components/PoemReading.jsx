import { useMemo, useState } from 'react'
import PoemPager from './PoemPager'
import { paginatePoem } from '../utils/poemPagination'

export default function PoemReading({ lines }) {
  const pages = useMemo(() => paginatePoem(lines), [lines])
  const [page, setPage] = useState(0)
  const current = Math.min(page, pages.length - 1)
  const long = pages.length > 1
  return <div className={long ? 'poem-reading poem-reading--paged' : 'poem-reading'}>
    {long && <p className="poem-reading__hint">长篇分卷 · 共 {pages.length} 页</p>}
    <div className="poem-scroll__body" aria-live="polite" aria-atomic="true">
      {(pages[current] || []).map((line, index) => <span className="poem-scroll__line" key={current + '-' + index}>{line}</span>)}
    </div>
    <PoemPager label="诗词正文翻页" page={current} pages={pages.length} onChange={setPage} />
  </div>
}
