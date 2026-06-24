import { useEffect, useRef, useCallback } from 'react';

/**
 * useDebounce - 防抖 Hook
 * @param value - 需要防抖的值
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的值
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedValueRef = useRef<T>(value);

  useEffect(() => {
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      debouncedValueRef.current = value;
    }, delay);

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValueRef.current;
}

/**
 * useDebouncedCallback - 防抖回调 Hook
 * @param callback - 需要防抖的回调函数
 * @param delay - 延迟时间（毫秒）
 * @param deps - 依赖数组
 * @returns 防抖后的回调函数
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 500,
  deps: ReadonlyArray<unknown> = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // 更新回调引用
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay]);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay, ...deps]) as T;
}

/**
 * useThrottle - 节流 Hook
 * @param value - 需要节流的值
 * @param interval - 间隔时间（毫秒）
 * @returns 节流后的值
 */
export function useThrottle<T>(value: T, interval: number = 500): T {
  const lastUpdateRef = useRef<number>(0);
  const throttledValueRef = useRef<T>(value);

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= interval) {
      lastUpdateRef.current = now;
      throttledValueRef.current = value;
    }
  }, [value, interval]);

  return throttledValueRef.current;
}

/**
 * useThrottledCallback - 节流回调 Hook
 * @param callback - 需要节流的回调函数
 * @param interval - 间隔时间（毫秒）
 * @param deps - 依赖数组
 * @returns 节流后的回调函数
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  interval: number = 500,
  deps: ReadonlyArray<unknown> = []
): T {
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCallRef.current >= interval) {
      lastCallRef.current = now;
      callbackRef.current(...args);
    }
  }, [interval, ...deps]) as T;
}
