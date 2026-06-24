const Database = require('better-sqlite3');
const db = new Database('./data/woyaozoufan.db');

const recipes = db.prepare('SELECT id, name, calories, cookTime, difficulty FROM StandardRecipes LIMIT 5').all();
console.log('数据库中的菜谱:');
console.log(JSON.stringify(recipes, null, 2));

const count = db.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
console.log('\n总数量:', count.cnt);

db.close();