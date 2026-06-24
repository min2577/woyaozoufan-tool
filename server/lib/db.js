/**
 * 数据库模块 - sql.js版本
 * 功能：连接池、索引优化、查询性能提升、事务管理
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { logger } = require('../middleware/logger');

// 数据库路径
const DB_PATH = path.join(__dirname, '../', config.database.path);

// 确保目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 保存数据库实例
let db = null;
let SQL = null;

// 初始化数据库
async function initDatabase() {
  SQL = await initSqlJs();
  
  // 加载现有数据库（如果存在）
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    logger.db('加载已有数据库', { path: DB_PATH });
  } else {
    db = new SQL.Database();
    logger.db('创建新数据库', { path: DB_PATH });
  }
  
  // 设置 SQLite 优化参数
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA cache_size = -64000');
  db.run('PRAGMA temp_store = MEMORY');
  db.run('PRAGMA busy_timeout = ' + config.database.busyTimeout);
  
  return db;
}

// 同步初始化（启动时调用）
initDatabase().catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});

// 保存数据库到文件
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// 定期保存数据库（每30秒）
setInterval(saveDatabase, 30000);

// 优雅关闭时保存数据库
process.on('exit', saveDatabase);
process.on('SIGINT', () => {
  saveDatabase();
  process.exit();
});
process.on('SIGTERM', () => {
  saveDatabase();
  process.exit();
});

/**
 * 初始化表结构和索引
 */
async function initializeDatabase() {
  // 等待数据库初始化
  await initDatabase();
  
  logger.db('初始化数据库结构');

  try {
    db.run(`
      -- 标准菜谱表
      CREATE TABLE IF NOT EXISTS StandardRecipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        calories INTEGER,
        cookTime TEXT,
        servings TEXT,
        difficulty TEXT CHECK(difficulty IN ('简单', '中等', '困难')),
        mainIngredients TEXT,
        requiredSeasonings TEXT,
        optionalSeasonings TEXT,
        tools TEXT,
        originalTools TEXT,
        allIngredients TEXT,
        steps TEXT,
        tips TEXT,
        category TEXT,
        note TEXT,
        totalWeight INTEGER,
        cookedCount INTEGER DEFAULT 0,
        isDraft INTEGER DEFAULT 0,
        lastCookedDate TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      )
    `);

    db.run(`
      -- 离谱菜谱表
      CREATE TABLE IF NOT EXISTS OutrageousRecipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        calories INTEGER,
        cookTime TEXT,
        servings TEXT,
        difficulty TEXT CHECK(difficulty IN ('简单', '中等', '困难')),
        mainIngredients TEXT,
        requiredSeasonings TEXT,
        optionalSeasonings TEXT,
        tools TEXT,
        originalTools TEXT,
        allIngredients TEXT,
        steps TEXT,
        tips TEXT,
        professionalAnalysis TEXT,
        category TEXT,
        note TEXT,
        totalWeight INTEGER,
        cookedCount INTEGER DEFAULT 0,
        isDraft INTEGER DEFAULT 0,
        lastCookedDate TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      )
    `);

    db.run(`
      -- 用户库存表（统一字段命名）
      CREATE TABLE IF NOT EXISTS UserInventory (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        type TEXT DEFAULT 'ingredient',
        frequency INTEGER DEFAULT 0,
        orderIndex INTEGER DEFAULT 0,
        status TEXT DEFAULT 'normal',
        quantity REAL,
        unit TEXT,
        expiryDate TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      )
    `);

    db.run(`
      -- 流程追踪表
      CREATE TABLE IF NOT EXISTS FlowTrace (
        id TEXT PRIMARY KEY,
        sessionId TEXT,
        step INTEGER CHECK(step BETWEEN 1 AND 7),
        status TEXT DEFAULT 'pending',
        inputData TEXT,
        outputData TEXT,
        duration INTEGER DEFAULT 0,
        errorMessage TEXT,
        createdAt TEXT DEFAULT (datetime('now'))
      )
    `);

    db.run(`
      -- AI调用日志表
      CREATE TABLE IF NOT EXISTS AILLMCalls (
        id TEXT PRIMARY KEY,
        model TEXT,
        promptTokens INTEGER DEFAULT 0,
        completionTokens INTEGER DEFAULT 0,
        prompt TEXT,
        response TEXT,
        duration INTEGER DEFAULT 0,
        status TEXT DEFAULT 'success',
        errorMessage TEXT,
        createdAt TEXT DEFAULT (datetime('now'))
      )
    `);

    db.run(`
      -- 节点配置表
      CREATE TABLE IF NOT EXISTS NodeConfig (
        nodeName TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        timeout INTEGER DEFAULT 30000,
        retryCount INTEGER DEFAULT 3,
        updatedAt TEXT DEFAULT (datetime('now'))
      )
    `);

    // 索引优化
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_standard_name ON StandardRecipes(name)',
      'CREATE INDEX IF NOT EXISTS idx_standard_difficulty ON StandardRecipes(difficulty)',
      'CREATE INDEX IF NOT EXISTS idx_standard_cookedCount ON StandardRecipes(cookedCount DESC)',
      'CREATE INDEX IF NOT EXISTS idx_standard_lastCooked ON StandardRecipes(lastCookedDate DESC)',
      'CREATE INDEX IF NOT EXISTS idx_outrageous_name ON OutrageousRecipes(name)',
      'CREATE INDEX IF NOT EXISTS idx_outrageous_cookedCount ON OutrageousRecipes(cookedCount DESC)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_frequency ON UserInventory(frequency DESC)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_type ON UserInventory(type)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_status ON UserInventory(status)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_expiryDate ON UserInventory(expiryDate)',
      'CREATE INDEX IF NOT EXISTS idx_flowtrace_sessionId ON FlowTrace(sessionId)',
      'CREATE INDEX IF NOT EXISTS idx_flowtrace_createdAt ON FlowTrace(createdAt DESC)',
      'CREATE INDEX IF NOT EXISTS idx_aillmcalls_createdAt ON AILLMCalls(createdAt DESC)',
      'CREATE INDEX IF NOT EXISTS idx_aillmcalls_status ON AILLMCalls(status)'
    ];

    for (const sql of indexes) {
      try {
        db.run(sql);
      } catch (err) {
        // 忽略索引创建错误（可能已存在）
      }
    }

    // 修复旧表结构（从旧字段名迁移到新字段名）
    try {
      // 检查并添加 name 列
      const tableInfo = db.exec('PRAGMA table_info(UserInventory)');
      const columns = tableInfo[0].values.map(row => row[1]);
      
      if (!columns.includes('name')) {
        db.run('ALTER TABLE UserInventory ADD COLUMN name TEXT');
        db.run('UPDATE UserInventory SET name = ingredientName WHERE name IS NULL');
        logger.db('修复: 添加 name 列并同步数据');
      }
      
      if (!columns.includes('frequency')) {
        db.run('ALTER TABLE UserInventory ADD COLUMN frequency INTEGER DEFAULT 0');
        db.run('UPDATE UserInventory SET frequency = clickFrequency WHERE frequency = 0 AND clickFrequency > 0');
        logger.db('修复: 添加 frequency 列并同步数据');
      }
      
      if (!columns.includes('status')) {
        db.run('ALTER TABLE UserInventory ADD COLUMN status TEXT DEFAULT "normal"');
        db.run("UPDATE UserInventory SET status = CASE WHEN isExpiring = 1 THEN 'expiring' ELSE 'normal' END WHERE status IS NULL");
        logger.db('修复: 添加 status 列并同步数据');
      }
      
      logger.db('旧表结构修复完成');
    } catch (err) {
      logger.db('表结构检查/修复:', err.message);
    }

    saveDatabase(); // 初始化后保存
    logger.db('数据库初始化完成', { path: DB_PATH });
  } catch (error) {
    logger.error('数据库初始化失败', { error: error.message });
    throw error;
  }
}

// 初始化数据库
initializeDatabase();

// 导入并执行库存数据迁移
if (require.main !== module) {
  try {
    // MVP版本：禁用自动迁移脚本
    // const migrateInventory = require('../scripts/migrate_inventory');
    // migrateInventory();
  } catch (error) {
    console.warn('库存数据迁移初始化失败:', error.message);
  }
}

/**
 * 数据库操作封装类
 */
class DatabaseService {
  constructor() {
    // 使用 getter 而不是固定值，这样可以获得最新的 db 引用
  }

  // 动态获取 db 实例
  getDatabase() {
    return db;
  }

  // sql.js的prepare返回statement，需要特殊处理
  prepare(sql) {
    const self = this;
    const database = this.getDatabase();
    return {
      all: function(...params) {
        try {
          if (!database) throw new Error('数据库未初始化');
          const stmt = database.prepare(sql);
          stmt.bind(params);
          const results = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (error) {
          logger.error('数据库查询失败', { sql, error: error.message });
          throw error;
        }
      },
      get: function(...params) {
        try {
          if (!database) throw new Error('数据库未初始化');
          const stmt = database.prepare(sql);
          stmt.bind(params);
          let result = null;
          if (stmt.step()) {
            result = stmt.getAsObject();
          }
          stmt.free();
          return result;
        } catch (error) {
          logger.error('数据库查询失败', { sql, error: error.message });
          throw error;
        }
      },
      run: function(...params) {
        try {
          if (!database) throw new Error('数据库未初始化');
          database.run(sql, params);
          return {
            changes: database.getRowsModified(),
            lastInsertRowid: 0
          };
        } catch (error) {
          logger.error('数据库写入失败', { sql, error: error.message });
          throw error;
        }
      }
    };
  }

  exec(sql) {
    try {
      if (!db) throw new Error('数据库未初始化');
      db.run(sql);
      return [{ changes: db.getRowsModified() }];
    } catch (error) {
      logger.error('数据库执行失败', { sql, error: error.message });
      throw error;
    }
  }

  /**
   * 执行查询（带错误处理）
   */
  query(sql, params = []) {
    try {
      const stmt = this.prepare(sql);
      return stmt.all(...params);
    } catch (error) {
      logger.error('数据库查询失败', { sql, error: error.message });
      throw error;
    }
  }

  /**
   * 获取单条记录
   */
  get(sql, params = []) {
    try {
      const stmt = this.prepare(sql);
      return stmt.get(...params);
    } catch (error) {
      logger.error('数据库查询失败', { sql, error: error.message });
      throw error;
    }
  }

  /**
   * 执行写入操作
   */
  run(sql, params = []) {
    try {
      db.run(sql, params);
      return {
        changes: db.getRowsModified(),
        lastInsertRowid: 0
      };
    } catch (error) {
      logger.error('数据库写入失败', { sql, error: error.message });
      throw error;
    }
  }

  /**
   * 事务执行
   */
  transaction(fn) {
    try {
      db.run('BEGIN TRANSACTION');
      const result = fn();
      db.run('COMMIT');
      saveDatabase(); // 事务后保存
      return result;
    } catch (error) {
      db.run('ROLLBACK');
      logger.error('数据库事务失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 批量插入（优化性能）
   */
  bulkInsert(table, records) {
    if (!records || records.length === 0) return 0;

    const keys = Object.keys(records[0]);
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.join(', ');

    return this.transaction(() => {
      let count = 0;
      for (const record of records) {
        const sql = `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`;
        db.run(sql, Object.values(record));
        count++;
      }
      return count;
    });
  }

  /**
   * 获取数据库统计信息
   */
  getStats() {
    try {
      return {
        recipes: {
          standard: this.get('SELECT COUNT(*) as count FROM StandardRecipes').count,
          outrageous: this.get('SELECT COUNT(*) as count FROM OutrageousRecipes').count
        },
        inventory: {
          total: this.get('SELECT COUNT(*) as count FROM UserInventory').count,
          byStatus: {
            normal: this.get("SELECT COUNT(*) as count FROM UserInventory WHERE isExpiring = 0").count,
            yellow: this.get("SELECT COUNT(*) as count FROM UserInventory WHERE isExpiring = 1").count,
          }
        },
        fileSize: fs.statSync(DB_PATH).size
      };
    } catch (error) {
      logger.error('获取数据库统计失败', { error: error.message });
      return null;
    }
  }

  /**
   * 数据库备份
   */
  backup(backupPath) {
    try {
      if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(backupPath, buffer);
        logger.db('数据库备份成功', { path: backupPath });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('数据库备份失败', { error: error.message });
      return false;
    }
  }

  /**
   * 关闭连接
   */
  close() {
    try {
      saveDatabase();
      if (db) {
        db.close();
        db = null;
      }
      logger.db('数据库连接已关闭');
    } catch (error) {
      logger.error('关闭数据库连接失败', { error: error.message });
    }
  }
}

// 导出单例
const dbService = new DatabaseService();

module.exports = dbService;
module.exports.DatabaseService = DatabaseService;
module.exports.raw = db; // 导出原始连接供特殊用途
