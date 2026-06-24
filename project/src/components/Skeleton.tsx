interface SkeletonProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`p-5 rounded-3xl bg-white/5 border border-white/10 ${className}`} role="status" aria-label="加载中">
      {/* 标题骨架 */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-5 h-5 rounded bg-gray-700 skeleton" />
          <div className="h-5 w-32 rounded bg-gray-700 skeleton" />
        </div>
        <div className="h-5 w-16 rounded-full bg-gray-700 skeleton" />
      </div>

      {/* 描述骨架 */}
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full rounded bg-gray-700 skeleton" />
        <div className="h-4 w-3/4 rounded bg-gray-700 skeleton" />
      </div>

      {/* 统计信息骨架 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gray-700 skeleton" />
          <div className="h-3 w-12 rounded bg-gray-700 skeleton" />
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gray-700 skeleton" />
          <div className="h-3 w-12 rounded bg-gray-700 skeleton" />
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gray-700 skeleton" />
          <div className="h-3 w-12 rounded bg-gray-700 skeleton" />
        </div>
      </div>

      {/* 底部操作栏骨架 */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="h-3 w-20 rounded bg-gray-700 skeleton" />
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-700 skeleton" />
          <div className="w-8 h-8 rounded-full bg-gray-700 skeleton" />
          <div className="w-8 h-8 rounded-full bg-gray-700 skeleton" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="加载中">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="加载中">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="h-4 rounded bg-gray-700 skeleton"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}
