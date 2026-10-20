import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './styles/app.less'
import BambooBreeze from './components/BambooBreeze'
import Layout from './pages/Layout'
import Home from './pages/Home'
import MinePage from './pages/MinePage'
import AuthPage from './pages/AuthPage'
import LetterList from './pages/LetterList'

// 二级页面路由级按需加载（提升移动端首屏加载性能）
const Recognition = lazy(() => import('./pages/Recognition'))
const AccountSetting = lazy(() => import('./pages/AccountSetting'))
const ScholarChat = lazy(() => import('./pages/ScholarChat'))
const PoemPage = lazy(() => import('./pages/PoemPage'))
const PoemCollection = lazy(() => import('./pages/PoemCollection'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const CityChroniclePage = lazy(() => import('./pages/CityChroniclePage'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const LegalPage = lazy(() => import('./pages/LegalPage'))
const StudyPage = lazy(() => import('./pages/StudyPage'))
const ScenePoetry = lazy(() => import('./pages/ScenePoetry'))
const SceneScroll = lazy(() => import('./pages/SceneScroll'))
const SceneArchive = lazy(() => import('./pages/SceneArchive'))
const PoetryFrequency = lazy(() => import('./pages/PoetryFrequency'))
const FrequencyPoem = lazy(() => import('./pages/FrequencyPoem'))

function PageFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--gf-bg-paper, #F4EFE6)',
        color: 'var(--gf-seal, #8A2B2B)',
        fontFamily: "'STKaiti', 'KaiTi', serif",
        fontSize: '16px',
        letterSpacing: '0.1em'
      }}
      role="status"
    >
      <span>展卷中…</span>
    </div>
  )
}

const ROUTE_TITLES = {
  '/': '华风雅集',
  '/home': '华风雅集 · 首页',
  '/login': '入席 · 华风雅集',
  '/recognition': '物溯古今 · 华风雅集',
  '/scene-poetry': '寻境入诗 · 华风雅集',
  '/scene-poetry/view/draft': '诗境品鉴 · 华风雅集',
  '/poetry-frequency': '诗海字衡 · 华风雅集',
  '/mine': '墨隐书斋 · 华风雅集',
  '/mine/setting': '雅士修持 · 华风雅集',
  '/mine/scenes': '诗境画阁 · 华风雅集',
  '/poem': '诗词大厅 · 华风雅集',
  '/collection': '藏牒阁 · 华风雅集',
  '/letters': '知音信札 · 华风雅集',
  '/city': '城邑志 · 华风雅集',
  '/legal/terms': '用户协议 · 华风雅集',
  '/legal/privacy': '隐私政策 · 华风雅集',
  '/recover': '重设密押 · 华风雅集',
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    let title = ROUTE_TITLES[pathname]
    if (!title) {
      if (pathname.startsWith('/chat/')) title = '先贤论道 · 华风雅集'
      else if (pathname.startsWith('/scene-poetry/view/')) title = '诗境品鉴 · 华风雅集'
      else if (pathname.startsWith('/poetry-frequency/poem/')) title = '诗文细读 · 华风雅集'
      else title = '云山竹简 · 华风雅集'
    }
    if (typeof document !== 'undefined') {
      document.title = title
    }
  }, [pathname])
  return null
}

function RootRedirect() {
  const token = localStorage.getItem('token')
  return token ? <Navigate to='/home' replace /> : <Navigate to='/login' replace />
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ScrollToTop />
      <BambooBreeze />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path='/login' element={<AuthPage/>}></Route>
          <Route path='/recover' element={<ForgotPassword/>}></Route>
          <Route path='/legal/:kind' element={<LegalPage/>}></Route>
          {/* 默认首页入口：首屏一律直达登录注册页（华风雅集入席/缔约） */}
          <Route path='/' element={<Navigate to='/login' replace />}></Route>
          <Route element={<Layout/>}>
            <Route path='/home' element={<Home/>}></Route>
            <Route path='/letters' element={<LetterList/>}></Route>
            <Route path='/ai' element={<Navigate to='/letters' replace />}></Route>
            <Route path='/mine' element={<MinePage/>}></Route>
          </Route>
          <Route path='/recognition' element={<Recognition/>}></Route>
          <Route path='/accountSetting' element={<AccountSetting/>}></Route>
          <Route path='/chat/:id' element={<ScholarChat/>}></Route>
          <Route path='/ai-chat' element={<ScholarChat/>}></Route>
          <Route path='/scholar-chat/:id' element={<ScholarChat/>}></Route>
          {/* 古诗词鉴赏大卷轴与书斋诗笺 */}
          <Route path='/poem' element={<PoemPage/>}></Route>
          <Route path='/poem-collection' element={<PoemCollection/>}></Route>
          {/* 九州地名志 · 城邑春秋：独立全屏页（原为首页底部弹窗，2026-10-16 改为二级页面） */}
          <Route path='/city-chronicle' element={<CityChroniclePage/>}></Route>
          <Route path='/mine/artifacts' element={<StudyPage section='artifacts'/>}></Route>
          <Route path='/mine/yayan' element={<StudyPage section='yayan'/>}></Route>
          <Route path='/mine/messages' element={<StudyPage section='messages'/>}></Route>
          <Route path='/scene-poetry' element={<ScenePoetry/>}></Route>
          <Route path='/scene-poetry/view/:id' element={<SceneScroll/>}></Route>
          <Route path='/mine/scenes' element={<SceneArchive/>}></Route>
          <Route path='/poetry-frequency' element={<PoetryFrequency/>}></Route>
          <Route path='/poetry-frequency/poem/:id' element={<FrequencyPoem/>}></Route>
          {/* 全局 404 迷津问渡路由兜底 */}
          <Route path='*' element={<NotFoundPage/>}></Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
