import { useScholarScope } from '../utils/useScholarScope'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloseOutline, DeleteOutline, MessageOutline, ScanningOutline, RedoOutline } from 'antd-mobile-icons'
import axios from '../http'
import '../styles/scholarEcosystem.less'
import ScholarSurface from './ScholarSurface'
import EmptyState from './EmptyState'
import { scholarScope } from '../utils/scholarLetters'
import { localArtifacts, removeLocalArtifact } from '../utils/scholarAssets'

function ScholarArtifactDrawerSession({ onClose, onPick, presentation }) {
  const navigate = useNavigate()
  const [data, setData] = useState(null), [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [revision, setRevision] = useState(0)
  const [confirmId, setConfirmId] = useState(null)
  useEffect(() => {
    let current = true
    const scope = scholarScope()
    if (scope === 'guest') {
      setBusy(false); setNotice('')
      const rows = localArtifacts()
      setData({ artifacts: rows.slice((page - 1) * 12, page * 12), total: rows.length, pageSize: 12 })
      return
    }
    setBusy(true); setNotice('')
    axios.get('/api/deepseek/scholar/artifacts', { params: { page }, timeout: 10000 }).then(res => { if (current && scope === scholarScope()) setData(res.data.data) })
      .catch(() => { if (current) setNotice('宝鉴暂未开卷，请重试') }).finally(() => { if (current) setBusy(false) })
    return () => { current = false }
  }, [page, revision])
  useEffect(() => {
    const refresh = () => { setData(null); setConfirmId(null); setRevision(n => n + 1) }
    const events = ['scholarAssetsUpdated', 'storage', 'focus', 'userInfoUpdated']
    events.forEach(event => window.addEventListener(event, refresh))
    return () => events.forEach(event => window.removeEventListener(event, refresh))
  }, [])
  const remove = async id => {
    if (confirmId !== id) { setConfirmId(id); return }
    setBusy(true)
    const scope = scholarScope()
    try {
      if (scope === 'guest') removeLocalArtifact(id)
      else await axios.delete(`/api/deepseek/scholar/artifacts/${id}`, { timeout: 10000 })
      if (scope !== scholarScope()) return
      setConfirmId(null); setPage(1); setRevision(n => n + 1)
      window.dispatchEvent(new Event('scholarAssetsUpdated'))
    }
    catch { setNotice('暂未移出宝鉴，可稍后再试') }
    finally { setBusy(false) }
  }

  // 携此物前往先贤对席论道
  const handleDebateWithArtifact = (item) => {
    if (presentation === 'drawer' && onClose) onClose()
    navigate('/chat/libai', {
      state: {
        sageId: 'libai',
        prefillMessage: `太白先生，吾日前收录一器物「${item.name}」（${item.dynasty || '年代待考'}），考释云：“${(item.description || '').slice(0, 80)}…”。愿请先生从唐人器用与风雅辨析其微意。`
      }
    })
  }

  const artifacts = data?.artifacts || []
  const hasItems = artifacts.length > 0

  return <ScholarSurface presentation={presentation} onClose={onClose} label={onPick ? '携物入席 · 宝鉴' : '物溯宝鉴'}>
    {presentation !== 'page' && (
      <header className='scholar-archive-tophead'>
        <h2>{onPick ? '携物入席 · 宝鉴' : '物溯宝鉴 · 已藏器物'}</h2>
        <button type='button' onClick={onClose} aria-label='合上宝鉴'><CloseOutline /></button>
      </header>
    )}

    {/* 顶部工具与统计条 */}
    <div className='scholar-summary-banner'>
      <div className='scholar-summary-banner__info'>
        <span className='scholar-summary-banner__rank'>古物鉴藏</span>
        <span className='scholar-summary-banner__divider'>·</span>
        <span className='scholar-summary-banner__count'>已藏 {data?.total ?? 0} 件</span>
      </div>
      <div className='scholar-summary-banner__actions'>
        <button
          type='button'
          className='scholar-capsule-btn primary'
          onClick={() => {
            if (presentation === 'drawer' && onClose) onClose()
            navigate('/recognition')
          }}
        >
          <ScanningOutline /> 识辨新器
        </button>
        <button
          type='button'
          className='scholar-icon-refresh-btn'
          disabled={busy}
          onClick={() => setRevision(n => n + 1)}
          aria-label='重新展卷'
        >
          <RedoOutline className={busy ? 'is-spinning' : ''} />
        </button>
      </div>
    </div>

    {notice && <p className='scholar-status-notice' role='status'>{notice}</p>}
    {busy && <div className='scholar-loading-hint' role='status'><RedoOutline className='is-spinning' /> 展卷探物中…</div>}

    {!busy && !hasItems && (
      <EmptyState
        seal='虚案'
        title='案上尚无博古珍藏'
        desc='游历山水，以物溯之眼识辨古物器用，一键收录入宝鉴，还可携物与千古先贤论道。'
        actionText='前往识辨古物'
        onAction={() => {
          if (presentation === 'drawer' && onClose) onClose()
          navigate('/recognition')
        }}
      />
    )}

    {hasItems && (
      <div className='scholar-artifacts-grid'>
        {artifacts.map(item => (
          <article className='scholar-artifact-card' key={item.id}>
            <div className='scholar-artifact-card__head'>
              <div className='scholar-artifact-card__title-row'>
                <h3 className='scholar-artifact-card__name'>{item.name}</h3>
                {item.dynasty && (
                  <span className='scholar-artifact-card__dynasty'>{item.dynasty}</span>
                )}
              </div>
              <span className='scholar-artifact-card__rank'>
                {item.degraded ? '待考推演' : (item.score >= 80 ? '妙品' : '能品')}
              </span>
            </div>

            <div className='scholar-artifact-card__desc'>
              <p>{item.description || '暂无详细流变考释记录。'}</p>
            </div>

            <div className='scholar-artifact-card__footer'>
              <span className='scholar-artifact-card__date'>
                {new Date(item.at || Date.now()).toLocaleDateString('zh-CN')}
              </span>
              <div className='scholar-artifact-card__ops'>
                {onPick ? (
                  <button type='button' className='scholar-btn-action primary' disabled={busy} onClick={() => onPick(item)}>
                    携此物入席
                  </button>
                ) : (
                  <button type='button' className='scholar-btn-action primary' disabled={busy} onClick={() => handleDebateWithArtifact(item)}>
                    <MessageOutline /> 携物论道
                  </button>
                )}
                <button
                  type='button'
                  className={`scholar-btn-action ${confirmId === item.id ? 'danger-active' : 'subtle'}`}
                  disabled={busy}
                  onClick={() => remove(item.id)}
                >
                  <DeleteOutline /> {confirmId === item.id ? '确认移出' : '移出'}
                </button>
                {confirmId === item.id && (
                  <button type='button' className='scholar-btn-action text' onClick={() => setConfirmId(null)}>
                    取消
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    )}

    {data?.total > (data?.pageSize || 12) && (
      <nav className='scholar-pagination' aria-label='宝鉴分页'>
        <button type='button' disabled={busy || page <= 1} onClick={() => setPage(n => n - 1)}>前页</button>
        <span className='scholar-pagination__current'>第 {page} 页 / 共 {Math.ceil(data.total / data.pageSize)} 页</span>
        <button type='button' disabled={busy || !data || page * data.pageSize >= data.total} onClick={() => setPage(n => n + 1)}>后页</button>
      </nav>
    )}
  </ScholarSurface>
}

export default function ScholarArtifactDrawer(props) {
  const scope = useScholarScope()
  return <ScholarArtifactDrawerSession key={scope} {...props} />
}
