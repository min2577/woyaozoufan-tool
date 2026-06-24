import { useEffect, useCallback } from 'react';

interface HotkeyConfig {
  key: string;
  handler: (e: KeyboardEvent) => void;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  preventDefault?: boolean;
  description?: string;
}

export function useHotkeys(configs: HotkeyConfig[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 在输入框内时禁用大部分快捷键
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    for (const config of configs) {
      const { key, ctrl, shift, alt, preventDefault = true } = config;

      // 检查修饰键
      if (!!ctrl !== e.ctrlKey && !!ctrl !== e.metaKey) continue;
      if (!!shift !== e.shiftKey) continue;
      if (!!alt !== e.altKey) continue;

      // 检查按键（不区分大小写）
      if (key.toLowerCase() !== e.key.toLowerCase()) continue;

      // 输入框内只允许特定快捷键
      if (isInput && !['Escape', 'Enter'].includes(key)) continue;

      if (preventDefault) {
        e.preventDefault();
      }

      config.handler(e);
      return;
    }
  }, [configs]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// 预定义的快捷键配置
export const defaultHotkeys: HotkeyConfig[] = [
  {
    key: 'Enter',
    ctrl: true,
    handler: () => console.log('Generate recipe'),
    description: '生成菜谱'
  },
  {
    key: 'k',
    ctrl: true,
    handler: () => console.log('Search ingredients'),
    description: '搜索食材'
  },
  {
    key: 'f',
    ctrl: true,
    handler: () => console.log('Open favorites'),
    description: '打开收藏夹'
  },
  {
    key: 'b',
    ctrl: true,
    handler: () => console.log('Toggle outrageous mode'),
    description: '脑洞模式开关'
  },
  {
    key: 'Escape',
    handler: () => console.log('Close modal/drawer'),
    description: '关闭弹窗/抽屉'
  }
];

// 数字键切换分类
export const categoryHotkeys: HotkeyConfig[] = [1, 2, 3, 4, 5].map(num => ({
  key: num.toString(),
  handler: () => console.log(`Switch to category ${num}`),
  description: `切换分类 ${num}`
}));
