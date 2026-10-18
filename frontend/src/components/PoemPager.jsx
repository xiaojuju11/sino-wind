import '../styles/poemPagination.less'

export default function PoemPager({ page, pages, onChange, label }) {
  if (pages <= 1) return null
  return <nav className="poem-pager" aria-label={label}>
    <button type="button" disabled={page === 0} onClick={() => onChange(page - 1)}>上一页</button>
    <label>
      <span className="poem-pager__sr">{label}页码</span>
      <select aria-label={label + '页码'} value={page} onChange={event => onChange(Number(event.target.value))}>
        {Array.from({ length: pages }, (_, index) => <option key={index} value={index}>第 {index + 1} / {pages} 页</option>)}
      </select>
    </label>
    <button type="button" disabled={page === pages - 1} onClick={() => onChange(page + 1)}>下一页</button>
  </nav>
}
