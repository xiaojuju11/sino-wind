import { unstableSetRender } from 'antd-mobile'; // Support since version ^5.40.0

import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './utils/rem.js'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
    <App />
)

unstableSetRender((node, container) => {
  container._reactRoot ||= createRoot(container);
  const root = container._reactRoot;
  root.render(node);
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    root.unmount();
  };
});