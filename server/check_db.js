const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/recipes.db');
const db = new Database(dbPath, { readonly: true });

console.log('=== 数据库表结构检查 ===\n');

// 检查各表的字段
const tables = ['StandardRecipes', 'OutrageousRecipes', 'UserInventory'];
for (const table of tables) {
  console.log('【' + table + '】');
  const info = db.prepare('PRAGMA table_info(' + table + ')').all();
  info.forEach(col => {
    console.log('  ' + col.name + ' (' + col.type + ')');
  });
  console.log('');
}

console.log('=== 数据统计 ===\n');

// 菜谱总数
const stdCount = db.prepare('SELECT COUNT(*) as count FROM StandardRecipes').get();
const outCount = db.prepare('SELECT COUNT(*) as count FROM OutrageousRecipes').get();
console.log('标准菜谱总数:', stdCount.count);
console.log('离谱菜谱总数:', outCount.count);

// 草稿数
const stdDraft = db.prepare('SELECT COUNT(*) as count FROM StandardRecipes WHERE isDraft = 1').get();
const outDraft = db.prepare('SELECT COUNT(*) as count FROM OutrageousRecipes WHERE isDraft = 1').get();
console.log('标准草稿数:', stdDraft.count);
console.log('离谱草稿数:', outDraft.count);

// 今日新增
const todayNew = db.prepare("SELECT COUNT(*) as count FROM StandardRecipes WHERE date(createdAt) = date('now')").get();
console.log('今日新增标准菜谱:', todayNew.count);

// 热门菜谱 Top5
console.log('\n=== 热门菜谱 Top5 ===');
const topRecipes = db.prepare('SELECT name, cookedCount FROM StandardRecipes ORDER BY cookedCount DESC LIMIT 5').all();
topRecipes.forEach(r => console.log('  ' + r.name + ': ' + r.cookedCount + '次'));

// 用户库存统计
const invTotal = db.prepare('SELECT COUNT(*) as count FROM UserInventory').get();
const invClick = db.prepare('SELECT SUM(clickFrequency) as total FROM UserInventory').get();
console.log('\n用户库存记录:', invTotal.count);
console.log('总点击次数:', invClick.total || 0);

db.close();
console.log('\n=== 检查完成 ===');