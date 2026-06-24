const Database = require('better-sqlite3');
const db = new Database('./data/recipes.db');

const total = db.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
const newFormat = db.prepare("SELECT COUNT(*) as cnt FROM StandardRecipes WHERE requiredSeasonings IS NOT NULL AND requiredSeasonings != '[]'").get();

console.log('=== 菜谱生成进度 ===');
console.log('总菜谱数:', total.cnt);
console.log('新格式菜谱:', newFormat.cnt);
console.log('剩余需更新:', total.cnt - newFormat.cnt);

db.close();