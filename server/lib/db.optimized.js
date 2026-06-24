const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/recipes.db');

// 确保目录存在
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);

// 启用 WAL 模式（更好的并发性能）
db.pragma('journal_mode = WAL');

// 优化查询性能的配置
db.pragma('cache_size = -64000'); // 64MB 缓存
db.pragma('temp_store = memory');
db.pragma('mmap_size = 268435456'); // 256MB 内存映射

// 初始化表结构并添加索引
db.exec(`
  -- 标准菜谱表
  CREATE TABLE IF NOT EXISTS StandardRecipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    calories INTEGER,
    cookTime TEXT,
    servings TEXT,
    difficulty TEXT,
    mainIngredients TEXT, -- JSON array
    allIngredients TEXT, -- JSON array of {name, amount, note, isRequired}
    steps TEXT, -- JSON array
    tips TEXT,
    cookedCount INTEGER DEFAULT 0,
    lastCookedDate TEXT
  );

  -- 为常用查询字段添加索引
  CREATE INDEX IF NOT EXISTS idx_standard_name ON StandardRecipes(name);
  CREATE INDEX IF NOT EXISTS idx_standard_difficulty ON StandardRecipes(difficulty);
  CREATE INDEX IF NOT EXISTS idx_standard_cooked ON StandardRecipes(cookedCount DESC);
  CREATE INDEX IF NOT EXISTS idx_standard_calories ON StandardRecipes(calories);
  
  -- 使用 JSON 提取函数创建虚拟列索引（SQLite 3.38+）
  CREATE INDEX IF NOT EXISTS idx_standard_main_ing ON StandardRecipes(
    json_extract(mainIngredients, '$[0]')
  );

  -- 离谱菜谱表
  CREATE TABLE IF NOT EXISTS OutrageousRecipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    calories INTEGER,
    cookTime TEXT,
    servings TEXT,
    difficulty TEXT,
    mainIngredients TEXT, -- JSON array
    allIngredients TEXT, -- JSON array of {name, amount, note, isRequired}
    steps TEXT, -- JSON array
    tips TEXT,
    professionalAnalysis TEXT, -- 离谱模式专有的专业原理解析
    cookedCount INTEGER DEFAULT 0,
    lastCookedDate TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_outrageous_name ON OutrageousRecipes(name);
  CREATE INDEX IF NOT EXISTS idx_outrageous_cooked ON OutrageousRecipes(cookedCount DESC);

  -- 用户库存表
  CREATE TABLE IF NOT EXISTS UserInventory (
    ingredientName TEXT PRIMARY KEY,
    clickFrequency INTEGER DEFAULT 0,
    orderIndex INTEGER DEFAULT 0,
    isExpiring INTEGER DEFAULT 0 -- 0: false, 1: true (红色快过期)
  );

  CREATE INDEX IF NOT EXISTS idx_inventory_frequency ON UserInventory(clickFrequency DESC);
  CREATE INDEX IF NOT EXISTS idx_inventory_expiring ON UserInventory(isExpiring DESC);
`);

// 预编译常用查询语句（提高性能）
const statements = {
  // 菜谱查询
  findRecipeById: db.prepare('SELECT * FROM StandardRecipes WHERE id = ?'),
  findRecipeByName: db.prepare('SELECT * FROM StandardRecipes WHERE name = ?'),
  findPopularRecipes: db.prepare('SELECT * FROM StandardRecipes ORDER BY cookedCount DESC LIMIT ?'),
  findRecipesByDifficulty: db.prepare('SELECT * FROM StandardRecipes WHERE difficulty = ? ORDER BY cookedCount DESC LIMIT 20'),
  
  // 库存查询
  findInventoryItem: db.prepare('SELECT * FROM UserInventory WHERE ingredientName = ?'),
  findAllInventory: db.prepare('SELECT * FROM UserInventory ORDER BY clickFrequency DESC'),
  findExpiringInventory: db.prepare('SELECT * FROM UserInventory WHERE isExpiring = 1'),
  
  // 更新操作
  updateCookedCount: db.prepare('UPDATE StandardRecipes SET cookedCount = cookedCount + 1, lastCookedDate = ? WHERE id = ?'),
  updateInventoryStatus: db.prepare('INSERT OR REPLACE INTO UserInventory (ingredientName, isExpiring) VALUES (?, ?)'),
  incrementInventoryFrequency: db.prepare('UPDATE UserInventory SET clickFrequency = clickFrequency + 1 WHERE ingredientName = ?')
};

module.exports = db;
module.exports.statements = statements;
