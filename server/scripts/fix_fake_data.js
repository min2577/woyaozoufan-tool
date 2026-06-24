/**
 * 修复假数据和格式问题
 * 1. 将 amount 从字符串转为数字（解析单位）
 * 2. 重新计算热量
 * 3. 标记或删除假数据
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// 加载营养数据库（对象格式）
const nutritionDbPath = 'D:/bianchengchangshi/woyaozoufan/server/data/nutrition-db.json';
const nutritionDb = JSON.parse(fs.readFileSync(nutritionDbPath, 'utf8'));

// 营养库转换为方便查询的格式（已经是对象了）
const nutritionMap = nutritionDb;

// 单位转换规则（转换为克或毫升）
const unitConversions = {
  'g': 1,
  '克': 1,
  'kg': 1000,
  '千克': 1000,
  'ml': 1,
  '毫升': 1,
  'l': 1000,
  '升': 1000,
  '个': null, // 不需要转换
  '颗': null,
  '粒': null,
  '根': null,
  '片': null,
  '块': null,
  '把': null,
  '勺': 15, // 约15ml
  '汤匙': 15,
  '茶匙': 5,
  '杯': 250,
  '碗': 300,
};

// 解析 amount 字符串为数字（统一转为克或毫升）
function parseAmount(amountStr) {
  if (amountStr === null || amountStr === undefined) return null;
  if (typeof amountStr === 'number') return amountStr;
  
  const str = String(amountStr).trim();
  
  // 尝试匹配 "数字+单位" 格式
  const match = str.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z\u4e00-\u9fa5]+)?$/);
  if (match) {
    let num = parseFloat(match[1]);
    const unit = match[2] || '';
    
    // 处理纯数字情况
    if (!unit) return num;
    
    // 单位转换
    const unitLower = unit.toLowerCase();
    if (unitConversions[unit] !== undefined && unitConversions[unit] !== null) {
      return num * unitConversions[unit];
    }
    
    // 特殊处理
    if (unit.includes('斤')) {
      return num * 500; // 1斤 = 500g
    }
    if (unit.includes('两')) {
      return num * 50; // 1两 = 50g
    }
    
    return num; // 返回原始数字
  }
  
  // 如果无法解析，返回 null
  return null;
}

// 判断是否是油
function isOil(name) {
  const oilKeywords = ['油', '食用油', '花生油', '菜籽油', '大豆油', '玉米油', '葵花籽油', '橄榄油', '麻油', '香油', '猪油', '黄油'];
  return oilKeywords.some(k => name.includes(k));
}

// 获取营养库数据
function getNutrition(name) {
  // 精确匹配
  if (nutritionMap[name]) {
    return nutritionMap[name];
  }
  
  // 尝试模糊匹配
  const normalizedName = name.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '');
  for (const key of Object.keys(nutritionMap)) {
    const normalizedKey = key.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '');
    if (normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName)) {
      return nutritionMap[key];
    }
  }
  
  return null;
}

// 计算热量
function calculateCalories(ingredients) {
  let totalCalories = 0;
  const results = [];
  
  ingredients.forEach(ing => {
    const name = ing.name || '';
    let amount = ing.amount;
    
    // 如果是字符串，尝试解析
    if (typeof amount === 'string') {
      amount = parseAmount(amount);
    }
    
    // 如果 amount 仍然是字符串或 null，跳过该项的热量计算
    if (amount === null || typeof amount !== 'number') {
      results.push({
        ...ing,
        amount: typeof ing.amount === 'string' ? parseAmount(ing.amount) : ing.amount,
        itemTotalCalories: 0,
        missingNutrition: true
      });
      console.warn(`[Warning] 无法解析用量: ${name} - ${ing.amount}`);
      return;
    }
    
    // 检查是否是油
    if (isOil(name)) {
      // 油按 9 kcal/ml 计算
      const cal = Math.round(amount * 9);
      totalCalories += cal;
      results.push({
        ...ing,
        amount: typeof ing.amount === 'string' ? parseAmount(ing.amount) : ing.amount,
        itemTotalCalories: cal,
        missingNutrition: false
      });
    } else {
      // 从营养库查找
      const nutrition = getNutrition(name);
      
      if (nutrition && nutrition.per_100g && nutrition.per_100g.calories !== undefined) {
        const cal = Math.round(amount * nutrition.per_100g.calories / 100);
        totalCalories += cal;
        results.push({
          ...ing,
          amount: typeof ing.amount === 'string' ? parseAmount(ing.amount) : ing.amount,
          itemTotalCalories: cal,
          missingNutrition: false
        });
      } else {
        // 香料类默认值
        const spiceKeywords = ['椒', '粉', '末', '胡椒', '孜然', '辣椒', '五香', '花椒'];
        if (spiceKeywords.some(k => name.includes(k))) {
          const cal = 2; // 香料默认 2 kcal
          totalCalories += cal;
          results.push({
            ...ing,
            amount: typeof ing.amount === 'string' ? parseAmount(ing.amount) : ing.amount,
            itemTotalCalories: cal,
            missingNutrition: false
          });
        } else {
          results.push({
            ...ing,
            amount: typeof ing.amount === 'string' ? parseAmount(ing.amount) : ing.amount,
            itemTotalCalories: 0,
            missingNutrition: true
          });
          console.warn(`[Warning] 营养库未命中: ${name}`);
        }
      }
    }
  });
  
  return { totalCalories, results };
}

// 主程序
const db = new Database('D:/bianchengchangshi/woyaozoufan/server/data/recipes.db');

console.log('=== 开始修复数据 ===\n');

// 1. 首先处理所有记录的 amount 字段转换
const allRecipes = db.prepare('SELECT id, name, allIngredients, steps, calories FROM StandardRecipes').all();

console.log(`共 ${allRecipes.length} 条记录待处理\n`);

let fixedCount = 0;
let fakeDataCount = 0;
const fakeDataIds = [];

// 假数据的特征热量值
const fakeCaloriesList = [42, 45, 65, 80, 85, 93, 95, 120, 130];

allRecipes.forEach((recipe, index) => {
  try {
    const ingredients = JSON.parse(recipe.allIngredients);
    const steps = JSON.parse(recipe.steps);
    
    // 计算新的热量
    const { totalCalories, results } = calculateCalories(ingredients);
    
    // 检查是否是假数据（热量值是否在假数据列表中）
    const isFakeData = fakeCaloriesList.includes(recipe.calories);
    
    if (isFakeData) {
      fakeDataIds.push(recipe.id);
      fakeDataCount++;
    }
    
    // 更新记录
    const updateStmt = db.prepare(`
      UPDATE StandardRecipes 
      SET allIngredients = ?, calories = ?, updatedAt = datetime('now')
      WHERE id = ?
    `);
    
    updateStmt.run(JSON.stringify(results), totalCalories, recipe.id);
    fixedCount++;
    
    if ((index + 1) % 100 === 0) {
      console.log(`已处理 ${index + 1}/${allRecipes.length} 条...`);
    }
    
  } catch (e) {
    console.error(`处理失败: ${recipe.name}`, e.message);
  }
});

console.log(`\n=== 修复完成 ===`);
console.log(`总处理: ${fixedCount} 条`);
console.log(`假数据: ${fakeDataCount} 条`);
console.log(`\n假数据ID列表（前20条）:`);
fakeDataIds.slice(0, 20).forEach(id => console.log(`  ${id}`));

db.close();