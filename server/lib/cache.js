const NodeCache = require('node-cache');

// 创建缓存实例
const cache = new NodeCache({ 
  stdTTL: 300, // 默认 5 分钟过期
  checkperiod: 60, // 每 60 秒检查过期
  useClones: true, // 返回克隆避免引用问题
  maxKeys: 1000 // 最多缓存 1000 个键
});

/**
 * 缓存装饰器
 * @param {string} keyPrefix - 键前缀
 * @param {number} ttl - 过期时间（秒）
 * @param {Function} fn - 要缓存的函数
 */
function withCache(keyPrefix, ttl, fn) {
  return async (...args) => {
    const key = `${keyPrefix}:${JSON.stringify(args)}`;
    const cached = cache.get(key);
    
    if (cached !== undefined) {
      console.log(`[Cache HIT] ${key}`);
      return cached;
    }
    
    console.log(`[Cache MISS] ${key}`);
    const result = await fn(...args);
    cache.set(key, result, ttl);
    return result;
  };
}

/**
 * 同步版本的缓存装饰器
 */
function withCacheSync(keyPrefix, ttl, fn) {
  return (...args) => {
    const key = `${keyPrefix}:${JSON.stringify(args)}`;
    const cached = cache.get(key);
    
    if (cached !== undefined) {
      console.log(`[Cache HIT] ${key}`);
      return cached;
    }
    
    console.log(`[Cache MISS] ${key}`);
    const result = fn(...args);
    cache.set(key, result, ttl);
    return result;
  };
}

/**
 * 清除缓存
 */
function clearCache(pattern) {
  if (pattern) {
    const keys = cache.keys().filter(k => k.includes(pattern));
    cache.del(keys);
    console.log(`[Cache] Cleared ${keys.length} keys matching "${pattern}"`);
  } else {
    cache.flushAll();
    console.log('[Cache] Cleared all cache');
  }
}

/**
 * 获取缓存统计
 */
function getCacheStats() {
  const stats = cache.getStats();
  return {
    键数量：stats.keys,
    命中率：stats.hits,
    未命中：stats.misses,
    命中率百分比：stats.keys > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%' : '0%'
  };
}

// 定期清理大对象
cache.on('expired', (key, value) => {
  console.log(`[Cache] Key expired: ${key}`);
});

cache.on('del', (key) => {
  console.log(`[Cache] Key deleted: ${key}`);
});

module.exports = {
  cache,
  withCache,
  withCacheSync,
  clearCache,
  getCacheStats
};
