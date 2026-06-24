const Database = require('better-sqlite3');
const db = new Database('./data/recipes.db');

console.log('=== 查找旧格式菜谱 ===');
const old = db.prepare("SELECT name FROM StandardRecipes WHERE requiredSeasonings IS NULL OR requiredSeasonings = '[]' LIMIT 20").all();

old.forEach(r => console.log(' -', r.name));

console.log('\n=== 检查字段是否为空字符串 ===');
const emptyString = db.prepare("SELECT COUNT(*) as cnt FROM StandardRecipes WHERE requiredSeasonings = ''").get();
console.log('空字符串:', emptyString.cnt);

const isNull = db.prepare("SELECT COUNT(*) as cnt FROM StandardRecipes WHERE requiredSeasonings IS NULL").get();
console.log('NULL:', isNull.cnt);

db.close();