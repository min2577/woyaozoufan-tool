const Database = require('better-sqlite3');
const db = new Database('D:/bianchengchangshi/woyaozoufan/server/data/recipes.db');

console.log('=== 详细分析假数据 ===\n');

// 假数据模板特征分析
const allRecipes = db.prepare(`
  SELECT id, name, calories, servings, allIngredients, steps 
  FROM StandardRecipes
  ORDER BY calories ASC
`).all();

// 识别假数据的规则：
// 1. 热量异常低（2人份以上但 < 150 kcal）
// 2. 名称格式统一（秘制/健康/简易+食材+做法）
// 3. amount 为字符串格式

let fakeDataList = [];
let realDataList = [];

allRecipes.forEach(recipe => {
  const servings = parseInt(recipe.servings) || 1;
  const caloriesPerServing = recipe.calories / servings;
  
  // 假数据特征
  const isFakeByCalories = servings >= 2 && recipe.calories < 150;
  const isFakeByName = /^(秘制|健康|简易|清淡|快手|营养|家常|香辣|葱油|蒜香)/.test(recipe.name);
  const isFakeByExactValue = [45, 65, 85, 95].includes(recipe.calories);
  
  const ingredients = JSON.parse(recipe.allIngredients);
  const hasStringAmount = ingredients.some(i => typeof i.amount === 'string');
  
  if (isFakeByCalories || (isFakeByName && isFakeByExactValue)) {
    fakeDataList.push({
      id: recipe.id,
      name: recipe.name,
      calories: recipe.calories,
      servings: recipe.servings,
      caloriesPerServing: caloriesPerServing.toFixed(1),
      hasStringAmount,
      reason: isFakeByCalories ? '热量异常低' : (isFakeByName ? '名称模板化' : '热量为模板值')
    });
  } else {
    realDataList.push(recipe.name);
  }
});

console.log(`=== 识别出的假数据: ${fakeDataList.length} 条 ===\n`);

console.log('--- 热量异常低的假数据示例（前30条）---');
fakeDataList.slice(0, 30).forEach(r => {
  console.log(`[${r.calories} kcal] ${r.name} (${r.servings}, ${r.caloriesPerServing} kcal/人) - ${r.reason}`);
});

console.log(`\n--- 真实数据示例（共 ${realDataList.length} 条）---`);
console.log(realDataList.slice(0, 20).join(', '));

// 统计假数据的模式
console.log('\n=== 假数据热量分布 ===');
const calorieDist = {};
fakeDataList.forEach(r => {
  const cal = r.calories;
  calorieDist[cal] = (calorieDist[cal] || 0) + 1;
});
Object.keys(calorieDist).sort((a,b) => a-b).forEach(cal => {
  console.log(`${cal} kcal: ${calorieDist[cal]} 条`);
});

// 检查 amount 类型问题
console.log('\n=== Amount 字段问题统计 ===');
let totalStringAmount = 0;
let totalNumberAmount = 0;
let totalNullAmount = 0;

allRecipes.forEach(recipe => {
  const ingredients = JSON.parse(recipe.allIngredients);
  ingredients.forEach(ing => {
    if (ing.amount === null) totalNullAmount++;
    else if (typeof ing.amount === 'string') totalStringAmount++;
    else if (typeof ing.amount === 'number') totalNumberAmount++;
  });
});

console.log(`数字类型: ${totalNumberAmount}`);
console.log(`字符串类型: ${totalStringAmount}`);
console.log(`Null类型: ${totalNullAmount}`);

// 列出所有需要修复的菜谱ID
console.log('\n=== 需要修复的所有假数据 ID 列表 ===');
console.log(fakeDataList.map(r => r.id).join('\n'));

db.close();