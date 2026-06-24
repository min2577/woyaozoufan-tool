import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void> | void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
};

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 检查是否已经提示过
      const hasPrompted = localStorage.getItem('pwa-prompted');
      if (!hasPrompted) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('用户接受了安装');
      localStorage.setItem('pwa-prompted', 'true');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompted', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999]">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl p-4 border border-gray-700 animate-slide-up">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-orange-500/20 rounded-xl">
              <Download className="w-6 h-6 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1">安装应用</h3>
              <p className="text-xs text-gray-400">
                将"我要揍饭"添加到主屏幕，随时访问
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="关闭提示"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-orange-400 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-orange-500/30 transition-all"
          >
            立即安装
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 bg-white/10 rounded-lg font-medium text-sm hover:bg-white/20 transition-all"
          >
            稍后
          </button>
        </div>
      </div>
    </div>
  );
}
