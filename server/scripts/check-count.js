const Database = require('better-sqlite3');

const db1 = new Database('./data/recipes.db');
const count1 = db1.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
console.log('recipes.db (StandardRecipes):', count1.cnt);
db1.close();

const db2 = new Database('./data/woyaozoufan.db');
try {
  const count2 = db2.prepare('SELECT COUNT(*) as cnt FROM recipes').get();
  console.log('woyaozoufan.db (recipes):', count2.cnt);
} catch(e) {
  console.log('woyaozoufan.db error:', e.message);
}
db2.close();