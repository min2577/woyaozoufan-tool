import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 注册 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker 注册成功:', registration.scope);
        
        // 检查更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 有新版本可用，刷新页面以更新');
                // 可以在这里显示更新提示
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker 注册失败:', error);
      });
  });
}

// 性能监控
if (typeof performance !== 'undefined') {
  window.addEventListener('load', () => {
    // 获取性能指标
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (!perfData) return;
      console.log('📊 性能指标:', {
        'DNS 查询': perfData.domainLookupEnd - perfData.domainLookupStart,
        'TCP 连接': perfData.connectEnd - perfData.connectStart,
        '首字节时间': perfData.responseStart - perfData.requestStart,
        '内容加载': perfData.responseEnd - perfData.responseStart,
        'DOM 加载': perfData.domComplete - perfData.domInteractive,
        '总加载时间': perfData.loadEventEnd - perfData.fetchStart
      });
    }, 0);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
