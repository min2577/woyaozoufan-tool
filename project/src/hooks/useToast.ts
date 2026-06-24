import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((
    type: Toast['type'],
    message: string,
    duration: number = 3000
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, message };

    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => 
    addToast('success', message, duration), [addToast]);

  const error = useCallback((message: string, duration?: number) => 
    addToast('error', message, duration), [addToast]);

  const warning = useCallback((message: string, duration?: number) => 
    addToast('warning', message, duration), [addToast]);

  const info = useCallback((message: string, duration?: number) => 
    addToast('info', message, duration), [addToast]);

  return {
    toasts,
    success,
    error,
    warning,
    info,
    removeToast
  };
}
