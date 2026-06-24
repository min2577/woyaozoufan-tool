const Database = require('better-sqlite3');
const db = new Database('./data/recipes.db');

// 检查新生成菜谱的字段
const recipes = db.prepare("SELECT name, mainIngredients, requiredSeasonings, optionalSeasonings, allIngredients FROM StandardRecipes WHERE name LIKE '%红烧%' LIMIT 5").all();

console.log('=== 红烧类菜谱检查 ===');
for (const r of recipes) {
  console.log(`\n菜名: ${r.name}`);
  console.log('mainIngredients:', r.mainIngredients);
  console.log('requiredSeasonings:', r.requiredSeasonings);
  console.log('optionalSeasonings:', r.optionalSeasonings);
  console.log('allIngredients:', r.allIngredients?.slice(0, 300));
}

db.close();