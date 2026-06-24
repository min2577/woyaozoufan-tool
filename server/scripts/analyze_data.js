const Database = require('better-sqlite3');
const db = new Database('D:/bianchengchangshi/woyaozoufan/server/data/recipes.db');

console.log('=== 分析 StandardRecipes 数据 ===\n');

// 获取所有记录
const allRecipes = db.prepare('SELECT id, name, calories, servings, allIngredients, steps FROM StandardRecipes').all();

console.log('总记录数:', allRecipes.length);
console.log('\n');

// 分析假数据的特征
// 1. 检查 allIngredients 中的 amount 是否为数字
let amountNotNumber = 0;
let amountIsString = 0;
let amountIsNull = 0;
let properNumber = 0;

// 2. 检查假数据的模式
let suspiciousRecipes = [];

// 3. 检查卡路里是否明显异常（太低）
let lowCalorieRecipes = [];

allRecipes.forEach(recipe => {
  try {
    const ingredients = JSON.parse(recipe.allIngredients);
    const steps = JSON.parse(recipe.steps);
    const servings = parseInt(recipe.servings) || 1;
    
    // 检查 amount 类型
    ingredients.forEach(ing => {
      if (ing.amount === null || ing.amount === undefined) {
        amountIsNull++;
      } else if (typeof ing.amount === 'string') {
        amountIsString++;
      } else if (typeof ing.amount === 'number') {
        properNumber++;
      } else {
        amountNotNumber++;
      }
    });
    
    // 检查是否是假数据（统一模板）- 通过检测格式一致性
    // 假数据特征：name 和 note 格式过于统一
    const notePattern = ing => ing.note && (
      ing.note.includes('约') && 
      (ing.note.includes('个') || ing.note.includes('cm') || ing.note.includes('手掌') || ing.note.includes('碗') || ing.note.includes('汤匙') || ing.note.includes('勺'))
    );
    
    // 检查卡路里异常低的情况（2人份以上但热量<200）
    const caloriesPerServing = recipe.calories / servings;
    if (servings >= 2 && recipe.calories < 200) {
      lowCalorieRecipes.push({
        name: recipe.name,
        calories: recipe.calories,
        servings: recipe.servings,
        caloriesPerServing: caloriesPerServing.toFixed(1)
      });
    }
    
  } catch (e) {
    console.log('Parse error:', recipe.name, e.message);
  }
});

console.log('=== Amount 字段分析 ===');
console.log('数字类型:', properNumber);
console.log('字符串类型（如"300g》）:', amountIsString);
console.log('Null类型:', amountIsNull);
console.log('其他:', amountNotNumber);

console.log('\n=== 卡路里异常低的菜谱（2人份以上但<200kcal）===');
lowCalorieRecipes.forEach(r => {
  console.log(`- ${r.name}: ${r.calories} kcal, ${r.servings} (${r.caloriesPerServing} kcal/人)`);
});

console.log('\n=== 查找可能的假数据（通过格式分析）===');

// 检查前20条的格式特征
const samples = db.prepare('SELECT id, name, allIngredients FROM StandardRecipes LIMIT 20').all();

// 检测统一模板特征：note 格式完全相同
let templateCount = 0;
samples.forEach(recipe => {
  const ingredients = JSON.parse(recipe.allIngredients);
  const notes = ingredients.map(i => i.note || '');
  
  // 检测是否是模板生成的（note 格式过于统一）
  const hasTemplate = notes.some(n => n.match(/约\d+[个cm勺克毫升]+/));
  if (hasTemplate) {
    templateCount++;
    console.log(`[模板特征] ${recipe.name}`);
  }
});

console.log(`\n前20条中有模板特征的: ${templateCount} 条`);

// 检查特定的假数据模式
console.log('\n=== 检查已知可能的问题 ===');

// 检查油脂类食材是否正确识别
const oilRecipes = allRecipes.filter(r => {
  const ingredients = JSON.parse(r.allIngredients);
  return ingredients.some(i => i.name && i.name.includes('油'));
});

console.log('含油的菜谱数量:', oilRecipes.length);

// 检查一条有油的菜谱
if (oilRecipes.length > 0) {
  const first = oilRecipes[0];
  const ingredients = JSON.parse(first.allIngredients);
  const oilIng = ingredients.find(i => i.name && i.name.includes('油'));
  console.log(`\n第一个含油菜谱 "${first.name}" 的油信息:`);
  console.log('  油名称:', oilIng.name);
  console.log('  油量:', oilIng.amount, typeof oilIng.amount);
  console.log('  油note:', oilIng.note);
}

db.close();