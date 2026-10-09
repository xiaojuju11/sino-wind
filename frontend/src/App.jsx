import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles/app.less'
import Layout from './pages/Layout'
import Home from './pages/Home'
import AIPage from './pages/AIPage'
import MinePage from './pages/MinePage'
import Recognition from './pages/Recognition'
import AccountSetting from './pages/AccountSetting'
import AiChat from './pages/AiChat'
import AuthPage from './pages/AuthPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path='/login' element={<AuthPage/>}></Route>
        <Route path='/' element={<Layout/>}>
          {/* 默认重定向 */}
          <Route path='' element={<Navigate to='/home' />}></Route>
          <Route path='/home' element={<Home/>}></Route>
          <Route path='/ai' element={<AIPage/>}></Route>
          <Route path='/mine' element={<MinePage/>}></Route>
          <Route path='/recognition' element={<Recognition/>}></Route>
        </Route>
        <Route path='/accountSetting' element={<AccountSetting/>}></Route>
        <Route path='/ai-chat' element={<AiChat/>}></Route>
      </Routes>
    </BrowserRouter>
  )
}