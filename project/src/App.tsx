import { useState, useEffect, createContext, useContext } from 'react';
import { ChefHat, Moon, Sun, Monitor, Utensils, MessageCircle, User } from 'lucide-react';
import RecipeGenerator from './components/RecipeGenerator';
import ToastContainer from './components/ToastContainer';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import ChuQuChiPage from './components/ChuQuChiPage';
import DiscussionPage from './components/DiscussionPage';
import ProfilePage from './components/ProfilePage';
import { useToast } from './hooks/useToast';

// 导航类型定义
type Tab = 'zoufan' | 'chuquchi' | 'discussion' | 'profile';

// 主题类型定义
type Theme = 'light' | 'dark' | 'system';

// 主题上下文
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// 创建主题上下文
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 主题切换组件
function ThemeToggle() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('ThemeToggle must be used within a ThemeProvider');
  }

  const { theme, setTheme } = context;

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-full transition-colors ${theme === 'light' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
        aria-label="亮色主题"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-full transition-colors ${theme === 'system' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
        aria-label="跟随系统"
      >
        <Monitor className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
        aria-label="暗色主题"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}

function App() {
  const { toasts, success, error, warning, info, removeToast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // 主题状态管理
  const [theme, setTheme] = useState<Theme>(() => {
    // 从localStorage读取主题偏好
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || 'system';
  });
  // 导航状态管理
  const [activeTab, setActiveTab] = useState<Tab>('zoufan');

  // 网络状态监听
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      success('已恢复在线');
    };
    const handleOffline = () => {
      setIsOnline(false);
      warning('当前离线，部分功能受限');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [success, warning]);

  // 主题更新效果
  useEffect(() => {
    const root = document.documentElement;
    // 保存主题偏好到localStorage
    localStorage.setItem('theme', theme);
    
    if (theme === 'system') {
      // 跟随系统主题
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      // 使用指定主题
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // 系统主题变化监听
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const root = document.documentElement;
        root.classList.toggle('dark', mediaQuery.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white dark:from-slate-950 dark:via-gray-950 dark:to-black text-gray-900 dark:text-gray-100 transition-colors duration-300">
        {/* Toast 通知容器 */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {/* PWA 安装提示 */}
        <PWAInstallPrompt />

        {/* 离线提示条 */}
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 text-sm font-medium z-[100]" role="alert">
            ⚠️ 当前离线，部分功能受限
          </div>
        )}

        {/* 主容器 - 固定为手机窗口大小 */}
        <div className="max-w-[414px] mx-auto h-screen flex flex-col bg-white/80 dark:bg-gray-950/50 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 backdrop-blur-sm transition-all duration-300">
          {/* 内容区域 */}
          <main className="flex-1 overflow-y-auto px-4 py-8">
            {/* 根据当前选中的tab渲染不同的页面 */}
            {activeTab === 'zoufan' && (
              <div>
                {/* 头部 */}
                <header className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ChefHat className="w-8 h-8 text-orange-400 drop-shadow-[0_0_10px_rgba(255,140,0,0.5)]" />
                      <h1 className="text-5xl font-extrabold tracking-wider text-gray-800 dark:text-gray-50 drop-shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
                        我要揍饭
                      </h1>
                    </div>
                    {/* 主题切换组件 */}
                    <ThemeToggle />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    有食材，就能做好饭
                  </p>
                </header>

                {/* 菜谱生成器 */}
                <RecipeGenerator 
                  onSuccess={success}
                  onError={error}
                  onInfo={info}
                />
              </div>
            )}
            
            {activeTab === 'chuquchi' && <ChuQuChiPage />}
            {activeTab === 'discussion' && <DiscussionPage />}
            {activeTab === 'profile' && <ProfilePage />}
          </main>

          {/* 底部导航栏 */}
          <nav className="h-16 bg-white/80 dark:bg-gray-950/80 border-t border-gray-200 dark:border-white/10 backdrop-blur-sm z-20">
            <div className="flex h-full items-center justify-around">
              {/* 揍饭 */}
              <button
                onClick={() => setActiveTab('zoufan')}
                className={`flex flex-col items-center justify-center h-full flex-1 ${activeTab === 'zoufan' ? 'text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <ChefHat className="w-5 h-5" />
                <span className="text-xs mt-1">揍饭</span>
              </button>
              
              {/* 出去吃 */}
              <button
                onClick={() => setActiveTab('chuquchi')}
                className={`flex flex-col items-center justify-center h-full flex-1 ${activeTab === 'chuquchi' ? 'text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <Utensils className="w-5 h-5" />
                <span className="text-xs mt-1">出去吃</span>
              </button>
              
              {/* 讨论 */}
              <button
                onClick={() => setActiveTab('discussion')}
                className={`flex flex-col items-center justify-center h-full flex-1 ${activeTab === 'discussion' ? 'text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs mt-1">讨论</span>
              </button>
              
              {/* 我的 */}
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex flex-col items-center justify-center h-full flex-1 ${activeTab === 'profile' ? 'text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <User className="w-5 h-5" />
                <span className="text-xs mt-1">我的</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
