const Database = require('better-sqlite3');
const db = new Database('./data/recipes.db');

console.log('=== 所有含五花肉的菜谱 ===\n');

// 查找五花肉菜谱
const recipes = db.prepare("SELECT * FROM StandardRecipes WHERE mainIngredients LIKE '%五花肉%' OR mainIngredients LIKE '%猪肉%' LIMIT 20").all();

for (const r of recipes) {
  console.log(`\n【${r.name}】`);
  console.log(`  简介: ${r.description}`);
  console.log(`  难度: ${r.difficulty} | 时间: ${r.cookTime} | 热量: ${r.calories} kcal`);
  console.log(`  主料: ${r.mainIngredients}`);
  console.log(`  必需调料: ${r.requiredSeasonings}`);
  console.log(`  可选调料: ${r.optionalSeasonings}`);
  
  // 食材清单
  try {
    const allIng = JSON.parse(r.allIngredients);
    console.log('  食材清单:');
    allIng.forEach(ing => {
      console.log(`    ${ing.isRequired ? '✅' : '○'} ${ing.name}: ${ing.amount} (${ing.note})`);
    });
  } catch {}
  
  // 步骤
  try {
    const steps = JSON.parse(r.steps);
    console.log(`  步骤数: ${steps.length}步`);
  } catch {}
  
  if (r.tips) {
    console.log(`  小贴士: ${r.tips}`);
  }
}

const total = db.prepare("SELECT COUNT(*) as cnt FROM StandardRecipes WHERE mainIngredients LIKE '%五花肉%' OR mainIngredients LIKE '%猪肉%'").get();
console.log(`\n总计: ${total.cnt}道五花肉/猪肉菜谱`);

db.close();