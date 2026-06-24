/**
 * 日志中间件 - 支持日志轮转和结构化输出
 * 使用 winston 进行日志管理（需安装）或降级到内置 fs
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

// 尝试使用 winston，如果未安装则使用内置实现
let winston = null;
try {
  winston = require('winston');
} catch (e) {
  // winston 未安装，使用内置实现
}

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, '..', config.logging.dir);
    this.ensureLogsDir();
    
    if (winston) {
      this.initWinston();
    }
  }

  ensureLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  initWinston() {
    const { createLogger, format } = winston;
    const DailyRotateFile = require('winston-daily-rotate-file');
    
    this.winstonLogger = createLogger({
      level: config.logging.level,
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.json()
      ),
      transports: [
        // 文件轮转：每天一个文件，保留 14 天
        new DailyRotateFile({
          filename: path.join(this.logsDir, 'app-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: config.logging.maxSize,
          maxFiles: config.logging.maxFiles,
          level: 'info'
        }),
        // 错误日志单独文件
        new DailyRotateFile({
          filename: path.join(this.logsDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: config.logging.maxSize,
          maxFiles: config.logging.maxFiles,
          level: 'error'
        })
      ]
    });

    // 开发环境添加控制台输出
    if (config.logging.enableConsole && config.server.env === 'development') {
      this.winstonLogger.add(new winston.transports.Console({
        format: format.combine(
          format.colorize(),
          format.timestamp({ format: 'HH:mm:ss' }),
          format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
            return `${timestamp} [${level}] ${message}${metaStr}`;
          })
        )
      }));
    }
  }

  /**
   * 内置日志实现（无 winston 时使用）
   */
  logInternal(type, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type,
      message,
      data,
      env: config.server.env,
      pid: process.pid
    };
    
    const logFile = path.join(this.logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    // 异步写入，避免阻塞
    fs.appendFile(logFile, logLine, (err) => {
      if (err) console.error('日志写入失败:', err);
    });

    // 控制台输出（带颜色）
    if (config.logging.enableConsole) {
      const colors = {
        'INFO': '\x1b[36m',    // cyan
        'ERROR': '\x1b[31m',   // red
        'WARN': '\x1b[33m',    // yellow
        'API': '\x1b[35m',     // magenta
        'DB': '\x1b[34m',      // blue
        'HTTP': '\x1b[32m'     // green
      };
      const reset = '\x1b[0m';
      const prefix = {
        'INFO': '📝',
        'ERROR': '❌',
        'WARN': '⚠️',
        'API': '🤖',
        'DB': '💾',
        'HTTP': '🌐'
      }[type] || '•';
      
      console.log(`${colors[type] || ''}${prefix} [${type}] ${message}${reset}`);
      if (data && config.server.env === 'development') {
        console.log(data);
      }
    }
  }

  info(message, data = null) {
    if (this.winstonLogger) {
      this.winstonLogger.info(message, data);
    } else {
      this.logInternal('INFO', message, data);
    }
  }

  error(message, data = null) {
    if (this.winstonLogger) {
      this.winstonLogger.error(message, data);
    } else {
      this.logInternal('ERROR', message, data);
    }
  }

  warn(message, data = null) {
    if (this.winstonLogger) {
      this.winstonLogger.warn(message, data);
    } else {
      this.logInternal('WARN', message, data);
    }
  }

  api(message, data = null) {
    if (this.winstonLogger) {
      this.winstonLogger.info(message, { ...data, category: 'API' });
    } else {
      this.logInternal('API', message, data);
    }
  }

  db(message, data = null) {
    if (this.winstonLogger) {
      this.winstonLogger.info(message, { ...data, category: 'DB' });
    } else {
      this.logInternal('DB', message, data);
    }
  }

  http(message, data = null) {
    if (this.winstonLogger) {
      this.winstonLogger.http(message, data);
    } else {
      this.logInternal('HTTP', message, data);
    }
  }

  /**
   * 获取日志统计信息（用于监控）
   */
  async getStats() {
    try {
      const files = fs.readdirSync(this.logsDir);
      const today = new Date().toISOString().split('T')[0];
      const todayFile = files.find(f => f.startsWith(today) && f.endsWith('.log'));
      
      if (!todayFile) {
        return { todayLines: 0, totalSize: 0 };
      }

      const todayPath = path.join(this.logsDir, todayFile);
      const stats = fs.statSync(todayPath);
      const content = fs.readFileSync(todayPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim()).length;

      const totalSize = files
        .filter(f => f.endsWith('.log'))
        .reduce((sum, f) => {
          try {
            return sum + fs.statSync(path.join(this.logsDir, f)).size;
          } catch {
            return sum;
          }
        }, 0);

      return {
        todayLines: lines,
        totalSize,
        totalFiles: files.filter(f => f.endsWith('.log')).length,
        oldestFile: files.sort()[0],
        newestFile: files.sort().reverse()[0]
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// 单例模式
const logger = new Logger();

/**
 * Express 请求日志中间件
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 将 requestId 附加到响应头
  res.setHeader('X-Request-ID', requestId);
  
  // 记录请求开始
  logger.http(`${req.method} ${req.path}`, {
    requestId,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    // 根据状态码记录不同级别
    if (status >= 500) {
      logger.error(`${req.method} ${req.path} ${status}`, {
        requestId,
        duration: `${duration}ms`
      });
    } else if (status >= 400) {
      logger.warn(`${req.method} ${req.path} ${status}`, {
        requestId,
        duration: `${duration}ms`
      });
    } else {
      logger.http(`${req.method} ${req.path} ${status}`, {
        requestId,
        duration: `${duration}ms`
      });
    }
  });
  
  next();
}

module.exports = {
  logger,
  requestLogger,
  Logger
};
