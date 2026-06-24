const Database = require('better-sqlite3');

console.log('=== 检查 recipes.db (旧数据库) ===');
try {
  const db1 = new Database('./data/recipes.db');
  const tables = db1.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('表:', tables.map(t => t.name).join(', '));
  
  const inv1 = db1.prepare("PRAGMA table_info(UserInventory)").all();
  console.log('UserInventory字段:', inv1.map(c => c.name).join(', '));
  db1.close();
} catch (e) {
  console.log('错误:', e.message);
}

console.log('\n=== 检查 woyaozoufan.db (新数据库) ===');
try {
  const db2 = new Database('./data/woyaozoufan.db');
  const tables = db2.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('表:', tables.map(t => t.name).join(', '));
  
  const inv2 = db2.prepare("PRAGMA table_info(UserInventory)").all();
  console.log('UserInventory字段:', inv2.map(c => c.name).join(', '));
  db2.close();
} catch (e) {
  console.log('错误:', e.message);
}