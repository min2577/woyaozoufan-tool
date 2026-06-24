/**
 * 统一错误处理中间件
 * 提供标准化的错误响应格式和错误分类
 */

const { logger } = require('./logger');
const config = require('../config');

/**
 * 自定义应用错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', data = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
    this.isOperational = true; // 区分操作性错误和编程错误
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 常见错误类型快捷方法
 */
AppError.badRequest = (message, data = null) => 
  new AppError(message, 400, 'BAD_REQUEST', data);

AppError.unauthorized = (message = '未授权访问', data = null) => 
  new AppError(message, 401, 'UNAUTHORIZED', data);

AppError.forbidden = (message = '禁止访问', data = null) => 
  new AppError(message, 403, 'FORBIDDEN', data);

AppError.notFound = (message = '资源不存在', data = null) => 
  new AppError(message, 404, 'NOT_FOUND', data);

AppError.conflict = (message = '资源冲突', data = null) => 
  new AppError(message, 409, 'CONFLICT', data);

AppError.tooManyRequests = (message = '请求过于频繁', data = null) => 
  new AppError(message, 429, 'TOO_MANY_REQUESTS', data);

AppError.aiServiceError = (message = 'AI 服务不可用', data = null) => 
  new AppError(message, 503, 'AI_SERVICE_ERROR', data);

AppError.databaseError = (message = '数据库操作失败', data = null) => 
  new AppError(message, 500, 'DATABASE_ERROR', data);

/**
 * 异步处理器 - 包装异步路由处理器，自动捕获错误
 * 用法：app.get('/route', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 处理中间件
 */
function notFoundHandler(req, res, next) {
  const error = AppError.notFound(`接口不存在：${req.path}`);
  next(error);
}

/**
 * 全局错误处理中间件
 * 必须是最后一个中间件
 */
function globalErrorHandler(err, req, res, next) {
  // 确保是 AppError 实例
  let error = err;
  if (!(err instanceof AppError)) {
    error = new AppError(
      err.message || '服务器内部错误',
      err.statusCode || 500,
      err.code || 'INTERNAL_ERROR',
      err.data
    );
    
    // 记录原始错误堆栈（仅开发环境）
    if (config.server.env === 'development') {
      error.stack = err.stack;
    }
  }

  // 记录错误日志
  logger.error('全局错误捕获', {
    error: error.message,
    code: error.code,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    stack: config.server.env === 'development' ? error.stack : undefined,
    data: error.data
  });

  // 构建响应
  const response = {
    success: false,
    error: {
      message: config.server.env === 'development' 
        ? error.message 
        : getSafeMessage(error.code),
      code: error.code,
      path: req.path,
      requestId: req.headers['x-request-id']
    },
    timestamp: new Date().toISOString()
  };

  // 开发环境添加额外调试信息
  if (config.server.env === 'development') {
    response.error.stack = error.stack;
    response.error.data = error.data;
  }

  res.status(error.statusCode).json(response);
}

/**
 * 获取安全的错误消息（不泄露敏感信息）
 */
function getSafeMessage(code) {
  const safeMessages = {
    'BAD_REQUEST': '请求参数错误',
    'UNAUTHORIZED': '请先登录',
    'FORBIDDEN': '无权访问此资源',
    'NOT_FOUND': '请求的资源不存在',
    'CONFLICT': '操作冲突，请重试',
    'TOO_MANY_REQUESTS': '请求过于频繁，请稍后再试',
    'AI_SERVICE_ERROR': 'AI 服务暂时不可用，请稍后重试',
    'DATABASE_ERROR': '数据库操作失败，请稍后重试',
    'INTERNAL_ERROR': '服务器内部错误，请稍后重试'
  };
  
  return safeMessages[code] || '服务器内部错误';
}

/**
 * 异步重试装饰器
 * @param {Function} fn - 要重试的异步函数
 * @param {Object} options - 重试配置
 * @returns {Function} 包装后的函数
 */
function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    shouldRetry = (err) => true
  } = options;

  return async (...args) => {
    let lastError;
    let currentDelay = delay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        if (!shouldRetry(error) || attempt === maxRetries) {
          break;
        }

        logger.warn(`重试 ${attempt}/${maxRetries}`, {
          delay: currentDelay,
          error: error.message
        });

        await sleep(currentDelay);
        currentDelay *= backoff;
      }
    }

    throw lastError;
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  AppError,
  asyncHandler,
  notFoundHandler,
  globalErrorHandler,
  withRetry
};
