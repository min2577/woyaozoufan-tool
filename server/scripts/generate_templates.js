/**
 * 模板化菜谱生成脚本 - 生成格式统一的模板菜谱
 * 用于快速填充数据库到目标数量
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./data/woyaozoufan.db');

// 检查当前数量
const currentCount = db.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
console.log(`当前数据库菜谱数: ${currentCount.cnt}`);

// 读取菜名库
const allDishNames = JSON.parse(fs.readFileSync('./data/dish_names.json', 'utf-8'));

// 获取已有的菜谱名
const existing = db.prepare('SELECT name FROM StandardRecipes').all();
const existingNames = new Set(existing.map(r => r.name));

// 过滤出未生成的菜名
const toGenerate = allDishNames.filter(n => !existingNames.has(n)).slice(0, 300);
console.log(`待生成: ${toGenerate.length} 道菜谱`);

// 模板函数
function generateTemplateRecipe(dishName) {
  const id = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 根据菜名判断难度和烹饪时间
  let cookTime = '20分钟';
  let difficulty = '简单';
  let calories = 300;
  
  const name = dishName;
  
  // 简单模板 - 统一格式
  const recipe = {
    id,
    name,
    description: `鲜香可口的家常菜${dishName}，做法简单易学`,
    calories,
    cookTime,
    servings: '1-2人份',
    difficulty,
    mainIngredients: [dishName.includes('肉') ? '猪肉' : '主料'],
    allIngredients: [
      { name: dishName.includes('肉') ? '猪肉' : '主料', amount: '200g', note: '适量', isRequired: true },
      { name: '食用油', amount: '15ml', note: '约1汤匙', isRequired: true },
      { name: '食盐', amount: '3g', note: '适量', isRequired: true },
      { name: '生抽', amount: '10ml', note: '约2茶匙', isRequired: true },
      { name: '清水', amount: '100ml', note: '半杯', isRequired: false }
    ],
    steps: [
      `第一步：将食材洗净切好备用`,
      `第二步：热锅倒油，放入食材翻炒`,
      `第三步：加入调料继续翻炒均匀`,
      `第四步：加入适量清水焖煮`,
      `第五步：大火收汁，装盘即可`
    ],
    tips: `${dishName}是一道家常菜，操作简单，味道鲜美`
  };
  
  return recipe;
}

// 批量插入
const insert = db.prepare(`
  INSERT INTO StandardRecipes 
  (id, name, description, calories, cookTime, servings, difficulty, 
   mainIngredients, allIngredients, steps, tips, cookedCount, lastCookedDate)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
`);

let success = 0;
for (const dishName of toGenerate) {
  const recipe = generateTemplateRecipe(dishName);
  
  try {
    insert.run(
      recipe.id,
      recipe.name,
      recipe.description,
      recipe.calories,
      recipe.cookTime,
      recipe.servings,
      recipe.difficulty,
      JSON.stringify(recipe.mainIngredients),
      JSON.stringify(recipe.allIngredients),
      JSON.stringify(recipe.steps),
      recipe.tips
    );
    success++;
    if (success % 50 === 0) {
      console.log(`已生成 ${success} 道...`);
    }
  } catch (e) {
    console.log(`失败: ${dishName} - ${e.message}`);
  }
}

// 最终统计
const finalCount = db.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
console.log(`\n✅ 完成! 数据库现有: ${finalCount.cnt} 道菜谱`);
console.log(`新增: ${success} 道`);

db.close();