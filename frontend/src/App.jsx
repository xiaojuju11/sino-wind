import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles/app.less'
import BambooBreeze from './components/BambooBreeze'
import Layout from './pages/Layout'
import Home from './pages/Home'
import AIPage from './pages/AIPage'
import MinePage from './pages/MinePage'
import Recognition from './pages/Recognition'
import AccountSetting from './pages/AccountSetting'
import AiChat from './pages/AiChat'
import AuthPage from './pages/AuthPage'
import LetterList from './pages/LetterList'
import ScholarChat from './pages/ScholarChat'
import PoemPage from './pages/PoemPage'
import PoemCollection from './pages/PoemCollection'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <BambooBreeze />
      <Routes>
        <Route path='/login' element={<AuthPage/>}></Route>
        <Route path='/' element={<Layout/>}>
          {/* 默认重定向 */}
          <Route path='' element={<Navigate to='/home' />}></Route>
          <Route path='/home' element={<Home/>}></Route>
          <Route path='/letters' element={<LetterList/>}></Route>
          <Route path='/ai' element={<Navigate to='/letters' replace />}></Route>
          <Route path='/mine' element={<MinePage/>}></Route>
          <Route path='/recognition' element={<Recognition/>}></Route>
        </Route>
        <Route path='/accountSetting' element={<AccountSetting/>}></Route>
        <Route path='/chat/:id' element={<ScholarChat/>}></Route>
        <Route path='/ai-chat' element={<ScholarChat/>}></Route>
        {/* 古诗词鉴赏大卷轴与书斋诗笺 */}
        <Route path='/poem' element={<PoemPage/>}></Route>
        <Route path='/poem-collection' element={<PoemCollection/>}></Route>
        {/* 全局 404 迷津问渡路由兜底 */}
        <Route path='*' element={<NotFoundPage/>}></Route>
      </Routes>
    </BrowserRouter>
  )
}
