/**
 * 标准格式菜谱生成脚本 - 生成符合原有格式的模板菜谱
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./data/woyaozoufan.db');

// 获取当前数量
const currentCount = db.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
console.log(`当前数据库菜谱数: ${currentCount.cnt}`);

const TARGET_COUNT = 1000;
const NEED_TO_GENERATE = TARGET_COUNT - currentCount.cnt;

if (NEED_TO_GENERATE <= 0) {
  console.log('已达到目标数量');
  db.close();
  process.exit(0);
}

// 读取菜名库
const allDishNames = JSON.parse(fs.readFileSync('./data/dish_names.json', 'utf-8'));

// 获取已有的菜谱名
const existing = db.prepare('SELECT name FROM StandardRecipes').all();
const existingNames = new Set(existing.map(r => r.name));

// 过滤出未生成的菜名
const toGenerate = allDishNames.filter(n => !existingNames.has(n)).slice(0, NEED_TO_GENERATE + 100);
console.log(`待生成: ${toGenerate.length} 道菜谱`);

// 常见食材映射（根据菜名推断主料）
const ingredientMap = {
  '肉': '猪肉', '鸡': '鸡肉', '鱼': '鱼肉', '虾': '虾仁', '牛': '牛肉',
  '豆腐': '豆腐', '蛋': '鸡蛋', '番茄': '番茄', '土豆': '土豆', '茄子': '茄子',
  '白菜': '白菜', '萝卜': '萝卜', '青菜': '青菜', '芹菜': '芹菜', '菠菜': '菠菜',
  '藕': '莲藕', '豆角': '豆角', '辣椒': '辣椒', '蒜': '大蒜', '葱': '大葱',
  '姜': '生姜', '蘑菇': '蘑菇', '木耳': '木耳', '海带': '海带'
};

function getMainIngredient(dishName) {
  for (const key in ingredientMap) {
    if (dishName.includes(key)) {
      return ingredientMap[key];
    }
  }
  return '主料';
}

// 生成标准格式菜谱
function generateRecipe(dishName) {
  const id = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const mainIng = getMainIngredient(dishName);
  
  // 根据菜名判断难度和时间
  let cookTime = '20分钟';
  let difficulty = '简单';
  let calories = Math.floor(200 + Math.random() * 400);
  
  if (dishName.includes('炖') || dishName.includes('红烧') || dishName.includes('卤')) {
    cookTime = '40分钟';
    difficulty = '中等';
    calories += 200;
  } else if (dishName.includes('蒸')) {
    cookTime = '25分钟';
  } else if (dishName.includes('凉拌')) {
    cookTime = '15分钟';
    calories = Math.floor(100 + Math.random() * 150);
  } else if (dishName.includes('炒')) {
    cookTime = '15分钟';
  }
  
  // 生成符合格式的步骤
  const steps = [
    `${mainIng}洗净切好备用`,
    `热锅倒油，放入${mainIng}翻炒`,
    `加入调料继续翻炒均匀`,
    `加入适量清水焖煮片刻`,
    `大火收汁，装盘即可`
  ];
  
  // 生成符合格式的食材
  const allIngredients = [
    { name: mainIng, amount: '200g', note: '适量', isRequired: true },
    { name: '食用油', amount: '15ml', note: '约1汤匙', isRequired: true },
    { name: '食盐', amount: '3g', note: '约12颗黄豆大小', isRequired: true },
    { name: '生抽', amount: '10ml', note: '约2茶匙', isRequired: true },
    { name: '清水', amount: '100ml', note: '半杯', isRequired: false }
  ];
  
  return {
    id,
    name: dishName,
    description: `鲜香可口的家常菜${dishName}，做法简单`,
    calories,
    cookTime,
    servings: '1-2人份',
    difficulty,
    mainIngredients: [mainIng],
    allIngredients,
    steps,
    tips: `${dishName}是美味的家常菜`
  };
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
  const recipe = generateRecipe(dishName);
  
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