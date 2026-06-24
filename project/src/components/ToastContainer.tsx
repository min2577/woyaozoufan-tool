interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const icons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

const styles = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500'
};

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div 
      className="fixed top-4 right-4 z-[100] space-y-2"
      role="region"
      aria-label="通知提示"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg 
            text-white font-medium min-w-[280px] max-w-md
            transform transition-all duration-300 ease-out
            animate-slide-in-right
            ${styles[toast.type]}
          `}
          role="alert"
        >
          <span className="text-lg font-bold" aria-hidden="true">
            {icons[toast.type]}
          </span>
          <span className="flex-1 text-sm">{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="关闭通知"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
