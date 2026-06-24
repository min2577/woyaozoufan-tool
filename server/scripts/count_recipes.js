const db = require('better-sqlite3')('./data/recipes.db');
const count = db.prepare('SELECT count(*) as cnt FROM StandardRecipes').get();
console.log(JSON.stringify(count));
db.close();