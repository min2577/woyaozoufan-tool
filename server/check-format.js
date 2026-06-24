const Database = require('better-sqlite3');

console.log('=== 当前 woyaozoufan.db 16条格式 ===');
const db = new Database('./data/woyaozoufan.db');
const row = db.prepare('SELECT name, mainIngredients, allIngredients, steps FROM StandardRecipes LIMIT 1').get();
console.log('名称:', row.name);
console.log('主料:', row.mainIngredients);
console.log('辅料前300字:', row.allIngredients ? row.allIngredients.substring(0, 300) : null);
console.log('步骤前300字:', row.steps ? row.steps.substring(0, 300) : null);
db.close();

console.log('\n=== 116条备份格式 ===');
const db2 = new Database('D:/bianchengchangshi/woyaozoufan-final-backup-20260312-224232/server/data/recipes.db');
const row2 = db2.prepare('SELECT name, mainIngredients, allIngredients, steps FROM StandardRecipes LIMIT 1').get();
console.log('名称:', row2.name);
console.log('主料:', row2.mainIngredients);
console.log('辅料前300字:', row2.allIngredients ? row2.allIngredients.substring(0, 300) : null);
console.log('步骤前300字:', row2.steps ? row2.steps.substring(0, 300) : null);
db2.close();