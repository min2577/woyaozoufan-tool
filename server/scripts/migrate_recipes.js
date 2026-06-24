const Database = require('better-sqlite3');

console.log('=== 数据库迁移检查 ===');

// 旧数据库（woyaozoufan.db）
const oldDb = new Database('./data/woyaozoufan.db');
const oldCount = oldDb.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
console.log(`woyaozoufan.db 菜谱数: ${oldCount.cnt}`);

// 新数据库（recipes.db）
const newDb = new Database('./data/recipes.db');
const newCount = newDb.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
console.log(`recipes.db 菜谱数: ${newCount.cnt}`);

// 迁移菜谱从 woyaozoufan.db 到 recipes.db
if (oldCount.cnt > 0 && newCount.cnt < oldCount.cnt) {
  console.log('\n开始迁移菜谱...');
  
  const recipes = oldDb.prepare('SELECT * FROM StandardRecipes').all();
  console.log(`读取到 ${recipes.length} 道菜谱`);
  
  const insert = newDb.prepare(`
    INSERT OR REPLACE INTO StandardRecipes 
    (id, name, description, calories, cookTime, servings, difficulty, 
     mainIngredients, allIngredients, steps, tips, cookedCount, lastCookedDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let success = 0;
  for (const r of recipes) {
    try {
      insert.run(
        r.id, r.name, r.description, r.calories, r.cookTime, r.servings, r.difficulty,
        r.mainIngredients, r.allIngredients, r.steps, r.tips, r.cookedCount || 0, r.lastCookedDate
      );
      success++;
    } catch (e) {
      console.log(`导入失败: ${r.name} - ${e.message}`);
    }
  }
  
  const finalCount = newDb.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
  console.log(`\n迁移完成! recipes.db 现在有: ${finalCount.cnt} 道菜谱`);
}

oldDb.close();
newDb.close();