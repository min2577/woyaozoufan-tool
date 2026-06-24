const Database = require('better-sqlite3');
const db = new Database('./data/recipes.db');

// 查找红烧牛肉
let r = db.prepare("SELECT * FROM StandardRecipes WHERE name LIKE '%红烧牛肉%'").get();

if (!r) {
  // 查找任何含"红烧"和"牛"的
  r = db.prepare("SELECT * FROM StandardRecipes WHERE name LIKE '%红烧%' AND (mainIngredients LIKE '%牛%' OR name LIKE '%牛肉%') LIMIT 1").get();
}

if (!r) {
  // 找任何红烧
  r = db.prepare("SELECT * FROM StandardRecipes WHERE name LIKE '%红烧%' LIMIT 1").get();
}

if (r) {
  console.log('=== 【' + r.name + '】数据检查 ===\n');
  console.log('mainIngredients:', r.mainIngredients);
  console.log('requiredSeasonings:', r.requiredSeasonings);
  console.log('optionalSeasonings:', r.optionalSeasonings);
  console.log('\nallIngredients (前1000字符):');
  console.log(r.allIngredients?.slice(0, 1000));
} else {
  console.log('未找到红烧类菜谱');
}

db.close();