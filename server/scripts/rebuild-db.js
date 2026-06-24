const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

// 删除旧数据库
const dbPath = './data/recipes.db';
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('已删除旧数据库');
}

const db = new Database(dbPath);

// 创建表
db.exec(`
  CREATE TABLE StandardRecipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    calories INTEGER,
    cookTime TEXT,
    servings TEXT,
    difficulty TEXT,
    mainIngredients TEXT,
    allIngredients TEXT,
    steps TEXT,
    tips TEXT,
    tools TEXT,
    cookedCount INTEGER DEFAULT 0,
    lastCookedDate TEXT,
    createdAt TEXT,
    updatedAt TEXT
  );
  
  CREATE TABLE OutrageousRecipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    calories INTEGER,
    cookTime TEXT,
    servings TEXT,
    difficulty TEXT,
    mainIngredients TEXT,
    allIngredients TEXT,
    steps TEXT,
    tips TEXT,
    professionalAnalysis TEXT,
    cookedCount INTEGER DEFAULT 0,
    lastCookedDate TEXT,
    createdAt TEXT,
    updatedAt TEXT
  );
  
  CREATE TABLE UserInventory (
    id TEXT PRIMARY KEY,
    ingredientName TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'ingredient',
    clickFrequency INTEGER DEFAULT 0,
    orderIndex INTEGER DEFAULT 0,
    isExpiring INTEGER DEFAULT 0,
    quantity REAL,
    unit TEXT,
    expiryDate TEXT,
    createdAt TEXT,
    updatedAt TEXT
  );
`);

console.log('数据库重建完成');

// 读取 recipes.json
const data = JSON.parse(fs.readFileSync('./data/recipes.json', 'utf8'));
console.log('准备导入', data.length, '条菜谱');

// 插入语句
const insert = db.prepare(`INSERT INTO StandardRecipes 
(id, name, description, calories, cookTime, servings, difficulty, mainIngredients, allIngredients, steps, tips, tools, cookedCount, lastCookedDate, createdAt, updatedAt)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`);

const now = new Date().toISOString();
let success = 0;

for (const r of data) {
  try {
    const mainIngs = JSON.stringify(r.mainIngredients || []);
    const allIngs = JSON.stringify(r.allIngredients || []);
    const stepArr = r.steps || [];
    const steps = JSON.stringify(stepArr);
    const tools = JSON.stringify(r.tools || []);
    
    insert.run(
      r.id || 'r-' + Date.now() + '-' + Math.random().toString(36).substr(2,9),
      r.name || '',
      r.description || '',
      r.calories || 0,
      r.cookTime || '',
      r.servings || '',
      r.difficulty || '简单',
      mainIngs,
      allIngs,
      steps,
      r.tips || '',
      tools,
      now,
      now
    );
    success++;
  } catch(e) {
    console.log('失败:', r.name, e.message);
  }
}

console.log('成功导入:', success, '条');
const cnt = db.prepare('SELECT COUNT(*) c FROM StandardRecipes').get();
console.log('数据库现有:', cnt.c, '条');
db.close();
console.log('完成!');