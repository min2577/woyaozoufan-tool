const Database = require('better-sqlite3');
const db = new Database('./data/woyaozoufan.db');

console.log('=== UserInventory 表结构 ===');
const inventoryCols = db.prepare("PRAGMA table_info(UserInventory)").all();
console.log(JSON.stringify(inventoryCols, null, 2));

console.log('\n=== StandardRecipes 表结构 ===');
const recipeCols = db.prepare("PRAGMA table_info(StandardRecipes)").all();
console.log(JSON.stringify(recipeCols, null, 2));

console.log('\n=== 测试 API 查询 ===');
try {
  const inv = db.prepare('SELECT ingredientName, clickFrequency, isExpiring FROM UserInventory LIMIT 3').all();
  console.log('✅ 字段 ingredientName, clickFrequency, isExpiring 存在');
  console.log(JSON.stringify(inv, null, 2));
} catch (e) {
  console.log('❌ 字段查询失败:', e.message);
}

db.close();