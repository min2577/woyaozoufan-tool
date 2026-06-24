const Database = require('better-sqlite3');
const db = new Database('./data/woyaozoufan.db');

const r = db.prepare("SELECT * FROM StandardRecipes WHERE name='番茄炒蛋'").get();
console.log('标准格式示例（番茄炒蛋）:');
console.log(JSON.stringify(r, null, 2));

// 查看步骤格式
const steps = JSON.parse(r.steps);
console.log('\n步骤格式:');
console.log(steps);

const allIngredients = JSON.parse(r.allIngredients);
console.log('\n食材格式:');
console.log(allIngredients);

db.close();