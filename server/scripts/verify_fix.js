const Database = require('better-sqlite3');
const db = new Database('D:/bianchengchangshi/woyaozoufan/server/data/recipes.db');

console.log('=== 修复后数据验证 ===\n');

// 检查修复后的 amount 类型
const allRecipes = db.prepare('SELECT id, name, calories, allIngredients FROM StandardRecipes LIMIT 5').all();

allRecipes.forEach(recipe => {
  console.log(`菜谱: ${recipe.name}`);
  console.log(`热量: ${recipe.calories} kcal`);
  
  const ingredients = JSON.parse(recipe.allIngredients);
  ingredients.slice(0, 3).forEach(ing => {
    console.log(`  - ${ing.name}: amount=${ing.amount} (${typeof ing.amount}), kcal=${ing.itemTotalCalories}, missing=${ing.missingNutrition}`);
  });
  console.log('');
});

// 验证一个具体的菜谱（比如番茄炒蛋）
console.log('=== 番茄炒蛋详细验证 ===');
const tomatoEgg = db.prepare("SELECT * FROM StandardRecipes WHERE name LIKE '%番茄炒蛋%'").get();
if (tomatoEgg) {
  console.log('原始热量:', tomatoEgg.calories);
  const ingredients = JSON.parse(tomatoEgg.allIngredients);
  let totalCalc = 0;
  ingredients.forEach(ing => {
    console.log(`  ${ing.name}: ${ing.amount}g → ${ing.itemTotalCalories} kcal`);
    totalCalc += ing.itemTotalCalories;
  });
  console.log('计算热量:', totalCalc);
}

db.close();