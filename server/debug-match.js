const db = require('./lib/db');

// 模拟 API 请求
const reqBody = {
  ingredients: ['番茄', '鸡蛋'],
  seasonings: { '食用油': true, '盐': true, '白砂糖': true, '生抽': true },
  tools: ['炒锅'],
  mode: 'standard',
  page: 1
};

console.log('=== 调试匹配逻辑 ===');
console.log('请求参数:', JSON.stringify(reqBody, null, 2));
console.log('');

const { ingredients = [], seasonings = {}, tools = [], mode = 'standard', page = 1 } = reqBody;
const isOutrageous = mode === 'outrageous';
const table = isOutrageous ? 'OutrageousRecipes' : 'StandardRecipes';

console.log('查询表:', table);
console.log('');

const inventoryData = db.query('SELECT ingredientName, clickFrequency, isExpiring FROM UserInventory');
const inventoryMap = Object.fromEntries(inventoryData.map(i => [i.ingredientName, i]));

const allRecipes = db.prepare(`SELECT * FROM ${table}`).all();
console.log('总菜谱数:', allRecipes.length);
console.log('');

const processedResults = allRecipes.map(recipe => {
  const mainIngs = JSON.parse(recipe.mainIngredients);
  const allIngs = JSON.parse(recipe.allIngredients);
  
  const missingCore = mainIngs.filter(ing => !ingredients.includes(ing));
  if (missingCore.length > 0) {
    return null;
  }
  
  const missingRequired = allIngs.filter(ing => 
    ing.isRequired && 
    !ingredients.includes(ing.name) &&
    !(seasonings && typeof seasonings === 'object' && seasonings[ing.name])
  );
  
  let adaptedTool = null;
  if (recipe.tools) {
    const recipeTools = recipe.tools || [];
    const userTools = tools || [];
    const toolMismatch = recipeTools.some(t => !userTools.includes(t));
    if (toolMismatch) {
      adaptedTool = 'test-replacement';
      if (!adaptedTool) {
        return null;
      }
    }
  }
  
  let weight = 0;
  mainIngs.forEach(ing => {
    const inv = inventoryMap[ing];
    if (inv) {
      weight += (inv.clickFrequency || 0) * 2;
    }
  });
  
  let category = null;
  let note = '';
  
  if (missingRequired.length === 0) {
    category = '立即下厨';
    const missingOptional = allIngs.filter(ing => 
      !ing.isRequired && 
      !ingredients.includes(ing.name)
    );
    if (missingOptional.length > 0) {
      note = `可直接做，加入${missingOptional.map(m => m.name).join('、')}口感更佳`;
    } else {
      note = '可直接做';
    }
  } else if (missingRequired.length <= 2) {
    category = '顺路买点';
    note = `缺少：${missingRequired.map(m => m.name).join('、')}（顺路购买即可做）`;
  } else {
    return null;
  }
  
  if (adaptedTool) {
    note += ` 厨具已适配：按你现有的${adaptedTool}调整做法`;
  }
  
  const categoryWeight = category === '立即下厨' ? 1000 : (category === '顺路买点' ? 500 : 0);
  
  return {
    name: recipe.name,
    category,
    note,
    totalWeight: weight + categoryWeight
  };
});

const validResults = processedResults.filter(r => r !== null);
validResults.sort((a, b) => b.totalWeight - a.totalWeight);

console.log('有效结果:', validResults.length);
validResults.forEach(r => {
  console.log(`  - ${r.name} [${r.category}] ${r.note} (weight: ${r.totalWeight})`);
});

console.log('');
console.log('分页后:', validResults.slice(0, 10).length);
