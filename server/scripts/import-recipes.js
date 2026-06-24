const fs = require('fs');
const Database = require('better-sqlite3');

// 连接数据库
const db = new Database('./data/recipes.db');

// 检查表结构
const tableInfo = db.pragma('table_info(StandardRecipes)');
console.log('表结构字段:', tableInfo.map(c => c.name).join(', '));

// 检查是否有 createdAt 字段，如果没有则添加
if (!tableInfo.find(c => c.name === 'createdAt')) {
  console.log('添加 createdAt 字段...');
  db.exec('ALTER TABLE StandardRecipes ADD COLUMN createdAt TEXT');
}
if (!tableInfo.find(c => c.name === 'updatedAt')) {
  console.log('添加 updatedAt 字段...');
  db.exec('ALTER TABLE StandardRecipes ADD COLUMN updatedAt TEXT');
}

// 读取 recipes.json
const data = fs.readFileSync('./data/recipes.json', 'utf8');
const recipes = JSON.parse(data);
console.log('读取到', recipes.length, '条菜谱');

// 插入语句 - 共15个字段
const insert = db.prepare(`INSERT OR REPLACE INTO StandardRecipes 
(id, name, description, calories, cookTime, servings, difficulty, mainIngredients, allIngredients, steps, tips, cookedCount, lastCookedDate, createdAt, updatedAt)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const now = new Date().toISOString();

let success = 0;
let failed = 0;

for (const r of recipes) {
  try {
    // 统一格式：将数组转为JSON字符串
    const mainIngs = Array.isArray(r.mainIngredients) ? JSON.stringify(r.mainIngredients) : r.mainIngredients;
    const allIngs = Array.isArray(r.allIngredients) ? JSON.stringify(r.allIngredients) : r.allIngredients;
    const stepArr = Array.isArray(r.steps) ? r.steps : [];
    const steps = JSON.stringify(stepArr);
    const tools = r.tools ? JSON.stringify(r.tools) : '[]';
    
    // 备用：确保 tools 字段存在
    // const tools = r.tools ? JSON.stringify(r.tools) : '[]';
    
    insert.run(
      r.id || 'recipe-' + Date.now() + '-' + Math.random().toString(36).substr(2,9),
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
      r.cookedCount || 0,
      r.lastCookedDate || null,
      now,
      now
    );
    success++;
  } catch (e) {
    failed++;
    console.log('插入失败:', r.name, e.message);
  }
}

const count = db.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
console.log('\n最终数据库菜谱数量:', count.cnt);
console.log('成功:', success, '失败:', failed);

db.close();
console.log('\n导入完成!');