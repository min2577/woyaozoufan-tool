#!/usr/bin/env node

/**
 * 数据库迁移脚本
 * 功能：
 * 1. 添加缺失的列
 * 2. 迁移旧数据
 * 3. 标准化数据格式
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// 数据库路径
const dbPath = path.join(__dirname, '../data/recipes.db');
// 备份路径
const backupPath = path.join(__dirname, '../data/recipes.db.backup_' + new Date().toISOString().slice(0, 19).replace(/[:T-]/g, ''));

// 日志函数
function log(message) {
  console.log(`[${new Date().toLocaleString()}] ${message}`);
}

// 错误处理
function handleError(err) {
  log(`错误：${err.message}`);
  process.exit(1);
}

// 备份数据库
function backupDatabase() {
  return new Promise((resolve, reject) => {
    log('正在备份数据库...');
    fs.copyFile(dbPath, backupPath, (err) => {
      if (err) {
        reject(err);
      } else {
        log(`数据库已备份到：${backupPath}`);
        resolve();
      }
    });
  });
}

// 运行迁移
async function runMigration() {
  try {
    // 备份数据库
    await backupDatabase();
    
    // 连接数据库
    log('正在连接到数据库...');
    const db = new Database(dbPath);
    log('已连接到数据库');
    
    // 1. 添加originalTools列（如果不存在）
    log('正在添加originalTools列...');
    try {
      db.exec(`ALTER TABLE recipes ADD COLUMN originalTools TEXT DEFAULT '[]'`);
      log('originalTools列已添加');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        log('originalTools列已存在');
      } else {
        handleError(err);
      }
    }
    
    // 2. 迁移旧数据：将tools数据复制到originalTools
    log('正在迁移旧数据...');
    db.exec(`UPDATE recipes SET originalTools = tools WHERE originalTools = '[]'`);
    log('旧数据迁移完成');
    
    // 3. 标准化数据格式
    log('正在标准化数据格式...');
    const rows = db.prepare(`SELECT id, tools FROM recipes`).all();
    let count = 0;
    
    rows.forEach(row => {
      try {
        // 确保tools是有效的JSON数组
        let tools = JSON.parse(row.tools);
        if (!Array.isArray(tools)) {
          tools = [];
        }
        
        // 更新数据
        const stmt = db.prepare(`UPDATE recipes SET tools = ? WHERE id = ?`);
        stmt.run(JSON.stringify(tools), row.id);
        count++;
      } catch (e) {
        // 如果解析失败，重置为默认值
        const stmt = db.prepare(`UPDATE recipes SET tools = ? WHERE id = ?`);
        stmt.run('[]', row.id);
      }
    });
    
    log(`已标准化 ${count} 条菜谱数据`);
    
    // 验证迁移结果
    log('正在验证迁移结果...');
    const result = db.prepare(`SELECT COUNT(*) as total, COUNT(originalTools) as withOriginalTools FROM recipes`).get();
    log(`验证结果：`);
    log(`  总菜谱数：${result.total}`);
    log(`  已迁移originalTools：${result.withOriginalTools}`);
    log(`  迁移成功率：${(result.withOriginalTools / result.total * 100).toFixed(2)}%`);
    
    // 关闭数据库连接
    db.close();
    log('数据库连接已关闭');
    log('迁移完成！');
    
  } catch (err) {
    handleError(err);
  }
}

// 开始迁移
log('=== 开始数据库迁移 ===');
runMigration();
