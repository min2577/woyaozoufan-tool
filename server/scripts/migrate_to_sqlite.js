const db = require('../lib/db');
const fs = require('fs');
const path = require('path');

const RECIPES_JSON = path.join(__dirname, '../data/recipes.json');

function parseIngredient(str) {
  // 尝试匹配 "名称 用量（备注）" 或 "名称 用量"
  const regex = /^(.+?)\s+([\d.]+[gml克毫升份个把勺片块个]+)?(?:（(.+)）)?$/;
  const match = str.match(regex);
  
  if (match) {
    return {
      name: match[1].trim(),
      amount: match[2] ? match[2].trim() : '',
      note: match[3] ? match[3].trim() : '',
      isRequired: true // 迁移数据默认必选
    };
  }
  return { name: str, amount: '', note: '', isRequired: true };
}

if (fs.existsSync(RECIPES_JSON)) {
  const recipes = JSON.parse(fs.readFileSync(RECIPES_JSON, 'utf-8'));
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO StandardRecipes (
      id, name, description, calories, cookTime, servings, difficulty, 
      mainIngredients, allIngredients, steps, tips, cookedCount, lastCookedDate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.db.transaction((data) => {
    for (const recipe of data) {
      const parsedIngredients = (recipe.allIngredients || []).map(parseIngredient);
      
      insert.run(
        recipe.id || `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        recipe.name,
        recipe.description || '',
        recipe.calories || 0,
        recipe.cookTime || '',
        recipe.servings || '',
        recipe.difficulty || '简单',
        JSON.stringify(recipe.mainIngredients || []),
        JSON.stringify(parsedIngredients),
        JSON.stringify(recipe.steps || []),
        recipe.tips || '',
        0,
        null
      );
    }
  });

  transaction(recipes);
  console.log(`✅ 成功迁移 ${recipes.length} 条数据到 SQLite。`);
} else {
  console.log('⚠️ 未找到 recipes.json，跳过迁移。');
}
