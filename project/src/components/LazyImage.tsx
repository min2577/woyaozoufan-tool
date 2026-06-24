import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  width?: number;
  height?: number;
}

/**
 * 懒加载图片组件
 * - 使用 IntersectionObserver 检测可视区域
 * - 支持占位图
 * - 渐进式加载动画
 */
export function LazyImage({ 
  src, 
  alt, 
  className = '', 
  placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  width,
  height 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // 提前 100px 开始加载
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden bg-gray-800 ${className}`}
      style={{ width, height }}
    >
      {/* 占位图 */}
      <img
        src={placeholder}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      />
      
      {/* 真实图片 */}
      {isInView && !error && (
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setError(true);
            setIsLoaded(true);
          }}
        />
      )}
      
      {/* 加载失败占位 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-500">
          <span className="text-sm">图片加载失败</span>
        </div>
      )}
    </div>
  );
}

/**
 * 懒加载背景图片组件
 */
export function LazyBackground({ 
  src, 
  className = '',
  children 
}: { 
  src: string; 
  className?: string;
  children?: React.ReactNode;
}) {
  const [isInView, setIsInView] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (divRef.current) {
      observer.observe(divRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={divRef}
      className={className}
      style={{
        backgroundImage: isInView ? `url(${src})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1f2937',
        transition: 'background-image 0.3s'
      }}
    >
      {children}
    </div>
  );
}
