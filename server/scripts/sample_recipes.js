const Database = require('better-sqlite3');
const db = new Database('./data/recipes.db');

// 抽查几道新格式菜谱
const recipes = db.prepare("SELECT * FROM StandardRecipes WHERE requiredSeasonings IS NOT NULL AND requiredSeasonings != '[]' LIMIT 3").all();

console.log('=== 抽查已更新菜谱 ===\n');
for (const r of recipes) {
  console.log(`【${r.name}】`);
  console.log(`  简介: ${r.description}`);
  console.log(`  难度: ${r.difficulty} | 时间: ${r.cookTime} | 热量: ${r.calories}`);
  console.log(`  主料: ${r.mainIngredients}`);
  console.log(`  必需调料: ${r.requiredSeasonings}`);
  console.log(`  可选调料: ${r.optionalSeasonings}`);
  console.log(`  原始厨具: ${r.originalTools}`);
  console.log(`  食材清单: ${r.allIngredients?.slice(0, 500)}...`);
  console.log(`  步骤数: ${r.steps?.split('],').length || 0}`);
  console.log(`  小贴士: ${r.tips}`);
  console.log('');
}

db.close();