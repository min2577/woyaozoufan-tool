/**
 * 无障碍访问工具函数
 */

/**
 * 聚焦到指定元素
 */
export function focusElement(selector: string): boolean {
  const element = document.querySelector(selector);
  if (element) {
    (element as HTMLElement).focus();
    return true;
  }
  return false;
}

/**
 * 宣布消息给屏幕阅读器
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = message;
  
  document.body.appendChild(announcer);
  
  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
}

/**
 * 管理焦点陷阱（用于模态框）
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);
  
  // 初始聚焦
  firstFocusable?.focus();

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * 检查是否减少动画偏好
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 检查是否深色模式
 */
export function prefersDarkScheme(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * 检查是否高对比度模式
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * 检查是否触摸设备
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * 生成无障碍标签
 */
export function generateAriaLabel(base: string, context?: string): string {
  return context ? `${base} - ${context}` : base;
}

/**
 * 格式化状态文本供屏幕阅读器使用
 */
export function formatStatus(status: string, value?: string | number): string {
  if (value !== undefined) {
    return `${status}: ${value}`;
  }
  return status;
}

/**
 * 创建跳过链接（无障碍导航）
 */
export function createSkipLink(targetId: string, text: string = '跳到主要内容'): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.textContent = text;
  link.className = 'skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg';
  return link;
}

/**
 * 初始化跳过链接
 */
export function initSkipLink(targetId: string = 'main-content'): void {
  const skipLink = createSkipLink(targetId);
  document.body.insertBefore(skipLink, document.body.firstChild);
}
