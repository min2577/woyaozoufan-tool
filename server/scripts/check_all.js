const Database = require('better-sqlite3');
const db = new Database('./data/recipes.db');

const total = db.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
const newFormat = db.prepare("SELECT COUNT(*) as cnt FROM StandardRecipes WHERE requiredSeasonings IS NOT NULL").get();

console.log('总菜谱:', total.cnt);
console.log('有requiredSeasonings:', newFormat.cnt);
console.log('无/旧格式:', total.cnt - newFormat.cnt);

db.close();