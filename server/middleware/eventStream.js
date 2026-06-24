/**
 * 实时事件流中间件 - 使用 Server-Sent Events (SSE)
 * 功能：实时推送后台进程日志到前端
 */

const EventEmitter = require('events');

// 创建事件发射器实例
const eventEmitter = new EventEmitter();

// 最大监听器数量
// eventEmitter.setMaxListeners(100);

/**
 * 发送事件到所有连接的客户端
 * @param {string} event - 事件类型
 * @param {any} data - 事件数据
 */
function emitEvent(event, data) {
  eventEmitter.emit('event', event, data);
}

/**
 * SSE 中间件
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - Express 中间件函数
 */
function eventStreamMiddleware(req, res, next) {
  // 设置响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 发送初始连接事件
  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent('connect', { message: '已连接到事件流', timestamp: new Date().toISOString() });

  // 监听事件
  const eventListener = (event, data) => {
    sendEvent(event, data);
  };

  eventEmitter.on('event', eventListener);

  // 清理函数
  const cleanup = () => {
    eventEmitter.removeListener('event', eventListener);
    res.end();
  };

  // 监听客户端关闭连接
  req.on('close', cleanup);
  req.on('error', cleanup);
}

/**
 * 替换现有 logger，添加事件流支持
 * @param {Object} originalLogger - 原始 logger 对象
 * @returns {Object} - 增强的 logger 对象
 */
function createEventLogger(originalLogger) {
  // 复制原始 logger 的方法
  const eventLogger = { ...originalLogger };

  // 增强日志方法，添加事件流
  ['info', 'error', 'warn', 'api', 'db', 'http'].forEach(method => {
    eventLogger[method] = (message, data = null) => {
      // 调用原始 logger 方法
      originalLogger[method](message, data);
      
      // 发送到事件流
      const logEntry = {
        level: method.toUpperCase(),
        message,
        data,
        timestamp: new Date().toISOString()
      };
      emitEvent('log', logEntry);
    };
  });

  return eventLogger;
}

module.exports = {
  eventStreamMiddleware,
  emitEvent,
  createEventLogger
};
