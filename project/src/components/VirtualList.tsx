import { useRef, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  onLoadMore?: () => void;
}

/**
 * 虚拟列表组件
 * - 只渲染可视区域内的项目
 * - 支持自定义项高度
 * - 支持加载更多
 */
export function VirtualList<T>({ 
  items, 
  itemHeight, 
  renderItem, 
  className = '',
  overscan = 5,
  onLoadMore
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  // 计算可视区域
  const { virtualItems, totalSize } = useMemo(() => {
    if (!containerRef.current) {
      return { virtualItems: [], totalSize: items.length * itemHeight };
    }

    const containerHeight = containerRef.current.clientHeight || 600;
    const scrollTop = containerRef.current.scrollTop;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const virtualItems = [];
    for (let i = startIndex; i < endIndex; i++) {
      virtualItems.push({
        index: i,
        item: items[i],
        offset: i * itemHeight
      });
    }

    return {
      virtualItems,
      totalSize: items.length * itemHeight
    };
  }, [items, itemHeight, overscan]);

  // 监听滚动到底部
  const handleScroll = () => {
    if (!containerRef.current || !onLoadMore) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = scrollHeight - clientHeight - 200;

    if (scrollTop >= threshold) {
      onLoadMore();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      style={{ height: '600px' }}
    >
      <div style={{ height: `${totalSize}px`, position: 'relative' }}>
        {virtualItems.map(({ index, item, offset }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${offset}px)`
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
        
        {/* 加载更多触发器 */}
        {onLoadMore && (
          <div
            ref={loaderRef}
            style={{
              position: 'absolute',
              top: totalSize,
              left: 0,
              width: '100%',
              height: '1px'
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 简化版虚拟列表（使用固定高度）
 */
export function SimpleVirtualList<T>({ 
  items, 
  itemHeight, 
  renderItem,
  className = ''
}: { 
  items: T[]; 
  itemHeight: number; 
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { visibleItems, totalHeight, offsetY } = useMemo(() => {
    if (!containerRef.current) {
      return { visibleItems: items.slice(0, 20), totalHeight: items.length * itemHeight, offsetY: 0 };
    }

    const scrollTop = containerRef.current.scrollTop;
    const containerHeight = containerRef.current.clientHeight;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + 5
    );

    return {
      visibleItems: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: '600px' }}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={index} style={{ height: `${itemHeight}px` }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
