import { useEffect, useRef, useCallback, useState } from 'react';

interface UseInfiniteScrollOptions {
  /** 触发加载的阈值（距离底部多少像素） */
  threshold?: number;
  /** 是否立即加载 */
  loadImmediately?: boolean;
  /** 是否有更多数据 */
  hasMore?: boolean;
  /** 加载中状态 */
  isLoading?: boolean;
  /** 根元素（用于 overflow 容器） */
  root?: Element | null;
  /** 根边距 */
  rootMargin?: string;
}

/**
 * useInfiniteScroll - 无限滚动 Hook
 * @param onLoadMore - 加载更多数据的回调
 * @param options - 配置选项
 * @returns { ref, isLoading, hasMore } - 监听元素 ref、加载状态、是否有更多数据
 */
export function useInfiniteScroll(
  onLoadMore: () => Promise<void> | void,
  options: UseInfiniteScrollOptions = {}
) {
  const {
    threshold = 100,
    loadImmediately = true,
    hasMore = true,
    isLoading = false,
    root = null,
    rootMargin = '0px',
  } = options;

  const computedRootMargin =
    rootMargin === '0px' ? `0px 0px ${threshold}px 0px` : rootMargin;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // 更新回调引用
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // 清理 observer
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // 设置 IntersectionObserver
  useEffect(() => {
    if (!hasMore || isLoading) return;

    const element = loadMoreRef.current;
    if (!element) return;

    // 清理旧的 observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // 创建新的 observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsIntersecting(entry.isIntersecting);

        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMoreRef.current();
        }
      },
      {
        root,
        rootMargin: computedRootMargin,
        threshold: 0,
      }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, root, computedRootMargin]);

  // 立即加载
  useEffect(() => {
    if (loadImmediately && hasMore && !isLoading) {
      onLoadMoreRef.current();
    }
  }, [loadImmediately, hasMore, isLoading]);

  // 设置 ref 的回调函数
  const refCallback = useCallback((node: HTMLDivElement | null) => {
    loadMoreRef.current = node;
  }, []);

  return {
    ref: refCallback,
    isLoading,
    hasMore,
    isIntersecting,
  };
}

/**
 * useScrollPosition - 获取滚动位置 Hook
 * @param element - 目标元素（不传则为 window）
 * @returns { scrollX, scrollY, scrollHeight, clientHeight }
 */
export function useScrollPosition(element?: HTMLElement | null) {
  const [position, setPosition] = useState({
    scrollX: 0,
    scrollY: 0,
    scrollHeight: 0,
    clientHeight: 0,
    atBottom: false,
  });

  useEffect(() => {
    const target = element || window;

    const handleScroll = () => {
      const scrollX = element ? element.scrollLeft : window.scrollX;
      const scrollY = element ? element.scrollTop : window.scrollY;
      const scrollHeight = element ? element.scrollHeight : document.documentElement.scrollHeight;
      const clientHeight = element ? element.clientHeight : window.innerHeight;
      const atBottom = scrollHeight - scrollY - clientHeight < 100;

      setPosition({
        scrollX,
        scrollY,
        scrollHeight,
        clientHeight,
        atBottom,
      });
    };

    handleScroll(); // 初始化

    target.addEventListener('scroll', handleScroll, { passive: true });
    if (!element) {
      window.addEventListener('resize', handleScroll, { passive: true });
    }

    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (!element) {
        window.removeEventListener('resize', handleScroll);
      }
    };
  }, [element]);

  return position;
}
