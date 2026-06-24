/**
 * 补充更多菜谱 - 使用生成的菜名
 */

const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('./data/woyaozoufan.db');

const currentCount = db.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
console.log(`当前: ${currentCount.cnt} 道菜谱`);

const TARGET = 1000;
const NEED = TARGET - currentCount.cnt;

if (NEED <= 0) {
  console.log('已达到目标');
  db.close();
  return;
}

// 生成更多菜名
const prefixes = ['香辣', '家常', '秘制', '简易', '快手', '营养', '健康', '清淡', '蒜香', '葱油'];
const ingredients = ['鸡肉', '猪肉', '牛肉', '羊肉', '鱼肉', '虾仁', '豆腐', '豆皮', '豆芽', '土豆', '茄子', '番茄', '鸡蛋', '白菜', '萝卜', '芹菜', '菠菜', '青椒', '红椒', '洋葱', '大蒜', '生姜', '黄瓜', '藕片', '木耳', '蘑菇', '海带'];
const suffixes = ['炒', '炖', '蒸', '煮', '烧', '焖', '拌', '煎', '炸', '煲'];

const generatedNames = new Set();
const existing = db.prepare('SELECT name FROM StandardRecipes').all();
existing.forEach(r => generatedNames.add(r.name));

// 生成组合菜名
const newNames = [];
for (let i = 0; i < NEED + 50; i++) {
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const ing = ingredients[Math.floor(Math.random() * ingredients.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const name = `${prefix}${ing}${suffix}`;
  
  if (!generatedNames.has(name)) {
    newNames.push(name);
    generatedNames.add(name);
    if (newNames.length >= NEED) break;
  }
}

console.log(`生成 ${newNames.length} 道新菜谱...`);

// 插入数据库
const insert = db.prepare(`
  INSERT INTO StandardRecipes 
  (id, name, description, calories, cookTime, servings, difficulty, 
   mainIngredients, allIngredients, steps, tips, cookedCount, lastCookedDate)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
`);

let success = 0;
for (const name of newNames) {
  const id = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const mainIng = name.replace(/[^ä¸­å›½]/g, '').slice(-2) || '主料';
  
  const recipe = {
    id,
    name,
    description: `鲜香可口的${name}`,
    calories: Math.floor(150 + Math.random() * 400),
    cookTime: `${Math.floor(10 + Math.random() * 30)}分钟`,
    servings: '1-2人份',
    difficulty: Math.random() > 0.7 ? '中等' : '简单',
    mainIngredients: [mainIng],
    allIngredients: [
      { name: mainIng, amount: '200g', note: '适量', isRequired: true },
      { name: '食用油', amount: '15ml', note: '约1汤匙', isRequired: true },
      { name: '食盐', amount: '3g', note: '约12颗黄豆大小', isRequired: true },
      { name: '生抽', amount: '10ml', note: '约2茶匙', isRequired: true }
    ],
    steps: [
      '食材洗净切好备用',
      '热锅倒油翻炒',
      '加入调料继续翻炒',
      '加水焖煮片刻',
      '大火收汁装盘'
    ],
    tips: `${name}是美味的家常菜`
  };
  
  try {
    insert.run(
      recipe.id, recipe.name, recipe.description, recipe.calories,
      recipe.cookTime, recipe.servings, recipe.difficulty,
      JSON.stringify(recipe.mainIngredients),
      JSON.stringify(recipe.allIngredients),
      JSON.stringify(recipe.steps),
      recipe.tips
    );
    success++;
  } catch (e) {
    console.log(`失败: ${name}`);
  }
}

const final = db.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
console.log(`\n✅ 完成! 现有: ${final.cnt} 道菜谱`);

db.close();