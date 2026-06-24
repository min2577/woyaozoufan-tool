const Database = require('better-sqlite3');
const db = new Database('./data/recipes.db');

// 抽查肉菜
const recipes = db.prepare("SELECT name, mainIngredients, requiredSeasonings, cookTime, difficulty, calories FROM StandardRecipes WHERE requiredSeasonings IS NOT NULL LIMIT 8").all();

console.log('=== 肉菜抽查结果 ===\n');
recipes.forEach(r => {
  console.log(`【${r.name}】`);
  console.log(`  主料: ${r.mainIngredients}`);
  console.log(`  必需调料: ${r.requiredSeasonings}`);
  console.log(`  时间: ${r.cookTime} | 难度: ${r.difficulty} | 热量: ${r.calories} kcal`);
  console.log('');
});

db.close();