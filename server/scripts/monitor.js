/**
 * 系统监控脚本
 * 用法：node scripts/monitor.js
 * 
 * 监控内容：
 * - 服务器健康状态
 * - 数据库状态
 * - 日志文件统计
 * - 缓存状态
 * - 系统资源
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  serverUrl: 'http://localhost:3001',
  logsDir: path.join(__dirname, '../logs'),
  dbPath: path.join(__dirname, '../data/recipes.db')
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * 检查服务器健康状态
 */
async function checkHealth() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    http.get(`${CONFIG.serverUrl}/health`, (res) => {
      const duration = Date.now() - startTime;
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          resolve({
            ok: health.ok,
            responseTime: duration,
            data: health
          });
        } catch {
          resolve({ ok: false, responseTime: duration, error: '解析失败' });
        }
      });
    }).on('error', (err) => {
      resolve({ ok: false, responseTime: Date.now() - startTime, error: err.message });
    });
  });
}

/**
 * 检查数据库状态
 */
function checkDatabase() {
  try {
    if (!fs.existsSync(CONFIG.dbPath)) {
      return { ok: false, error: '数据库文件不存在' };
    }
    
    const stats = fs.statSync(CONFIG.dbPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    return {
      ok: true,
      size: sizeKB,
      modified: stats.mtime
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 检查日志文件
 */
function checkLogs() {
  try {
    if (!fs.existsSync(CONFIG.logsDir)) {
      return { ok: false, error: '日志目录不存在' };
    }
    
    const files = fs.readdirSync(CONFIG.logsDir)
      .filter(f => f.endsWith('.log'));
    
    const totalSize = files.reduce((sum, f) => {
      try {
        return sum + fs.statSync(path.join(CONFIG.logsDir, f)).size;
      } catch {
        return sum;
      }
    }, 0);
    
    const today = new Date().toISOString().split('T')[0];
    const todayFile = files.find(f => f.startsWith(today));
    let todayLines = 0;
    
    if (todayFile) {
      const content = fs.readFileSync(path.join(CONFIG.logsDir, todayFile), 'utf-8');
      todayLines = content.split('\n').filter(l => l.trim()).length;
    }
    
    return {
      ok: true,
      files: files.length,
      totalSize: (totalSize / 1024).toFixed(2),
      todayLines
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * 检查系统资源
 */
function checkSystem() {
  const memUsage = process.memoryUsage();
  
  return {
    rss: (memUsage.rss / 1024 / 1024).toFixed(2),
    heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
    heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
    uptime: (process.uptime() / 60).toFixed(2)
  };
}

/**
 * 生成状态图标
 */
function statusIcon(ok) {
  return ok ? '✅' : '❌';
}

/**
 * 主监控函数
 */
async function monitor() {
  console.log('\n' + '='.repeat(50));
  log(colors.cyan, '🔍 系统监控报告');
  log(colors.cyan, '📅 ' + new Date().toLocaleString('zh-CN'));
  console.log('='.repeat(50) + '\n');
  
  // 服务器健康
  log(colors.blue, '🖥️  服务器状态');
  const health = await checkHealth();
  if (health.ok) {
    log(colors.green, `   ${statusIcon(true)} 服务正常 (响应时间：${health.responseTime}ms)`);
    log(colors.green, `   环境：${health.data.env || 'unknown'}`);
    log(colors.green, `   模型：${health.data.model || 'unknown'}`);
  } else {
    log(colors.red, `   ${statusIcon(false)} 服务异常：${health.error || '无法连接'}`);
  }
  
  // 数据库状态
  console.log();
  log(colors.blue, '💾 数据库状态');
  const db = checkDatabase();
  if (db.ok) {
    log(colors.green, `   ${statusIcon(true)} 数据库正常 (${db.size} KB)`);
    log(colors.green, `   最后修改：${db.modified.toLocaleString('zh-CN')}`);
  } else {
    log(colors.red, `   ${statusIcon(false)} 数据库异常：${db.error}`);
  }
  
  // 日志状态
  console.log();
  log(colors.blue, '📝 日志状态');
  const logs = checkLogs();
  if (logs.ok) {
    log(colors.green, `   ${statusIcon(true)} 日志文件：${logs.files} 个`);
    log(colors.green, `   总大小：${logs.totalSize} KB`);
    log(colors.green, `   今日日志：${logs.todayLines} 行`);
  } else {
    log(colors.red, `   ${statusIcon(false)} 日志异常：${logs.error}`);
  }
  
  // 系统资源
  console.log();
  log(colors.blue, '⚙️  系统资源');
  const system = checkSystem();
  log(colors.green, `   运行时长：${system.uptime} 分钟`);
  log(colors.green, `   内存使用：${system.heapUsed} / ${system.heapTotal} MB`);
  log(colors.green, `   RSS 内存：${system.rss} MB`);
  
  // 总结
  console.log();
  console.log('='.repeat(50));
  const allOk = health.ok && db.ok && logs.ok;
  if (allOk) {
    log(colors.green, '✅ 所有系统正常');
  } else {
    log(colors.yellow, '⚠️  部分系统异常，请检查');
  }
  console.log('='.repeat(50) + '\n');
  
  return allOk;
}

// 如果是直接运行，执行监控
if (require.main === module) {
  monitor().then(ok => {
    process.exit(ok ? 0 : 1);
  }).catch(err => {
    console.error('监控执行失败:', err);
    process.exit(1);
  });
}

module.exports = { monitor, checkHealth, checkDatabase, checkLogs, checkSystem };
