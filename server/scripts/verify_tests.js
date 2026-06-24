/**
 * 验证脚本：检查核心功能是否正常
 */
const { calculateTotalCalories, calculateIngredientCaloriesDetailed } = require('../services/calorieCalculator');

console.log('='.repeat(60));
console.log('开始验收测试...');
console.log('='.repeat(60));

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passCount++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failCount++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 测试1: 10人份东坡肉（五花肉2.6kg级别）总热量应在9000 kcal量级
test('10人份东坡肉热量测试', () => {
  const ingredients = [
    { name: '五花肉', amount: 2600, unit: 'g', note: '约10块', isRequired: true },
    { name: '食用油', amount: 50, unit: 'ml', note: '约5汤匙', isRequired: true },
    { name: '冰糖', amount: 100, unit: 'g', note: '约10颗', isRequired: true },
    { name: '生抽', amount: 50, unit: 'ml', note: '约5汤匙', isRequired: true },
    { name: '老抽', amount: 30, unit: 'ml', note: '约3汤匙', isRequired: true },
    { name: '黄酒', amount: 50, unit: 'ml', note: '约5汤匙', isRequired: true },
    { name: '生姜', amount: 30, unit: 'g', note: '约3片', isRequired: true },
    { name: '葱', amount: 50, unit: 'g', note: '约2根', isRequired: true },
  ];
  
  const result = calculateTotalCalories(ingredients);
  console.log(`   热量: ${result.total} kcal`);
  assert(result.total >= 7000 && result.total <= 12000, 
    `期望9000左右，实际${result.total}`);
});

// 测试2: 西兰花 + 15ml 油，油≈135 kcal
test('西兰花+15ml油热量测试', () => {
  const ingredients = [
    { name: '西兰花', amount: 200, unit: 'g', note: '约1小朵', isRequired: true },
    { name: '食用油', amount: 15, unit: 'ml', note: '约1汤匙', isRequired: true },
  ];
  
  const result = calculateTotalCalories(ingredients);
  
  // 找到油的计算结果
  const oilItem = result.details.find(d => d.name.includes('油') || d.name === '食用油');
  console.log(`   油热量: ${oilItem?.calories || '未找到'} kcal`);
  console.log(`   总热量: ${result.total} kcal`);
  
  assert(oilItem && Math.abs(oilItem.calories - 135) < 20, 
    `期望油约135 kcal，实际${oilItem?.calories}`);
});

// 测试3: 白胡椒粉 amount=null 不报错
test('白胡椒粉null量测试', () => {
  const result = calculateTotalCalories([{ name: '白胡椒粉', amount: null, unit: '', note: '适量' }]);
  console.log(`   热量: ${result.total} kcal`);
  console.log(`   missing: ${result.details[0]?.missingNutrition}`);
  assert(typeof result.total === 'number', '应该返回数字');
});

// 测试4: 验证油识别
test('各种油识别测试', () => {
  const oils = ['油', '食用油', '花生油', '玉米油', '橄榄油'];
  for (const oil of oils) {
    const result = calculateTotalCalories([{ name: oil, amount: 10, unit: 'ml' }]);
    assert(result.details[0].calories === 90, `${oil} 期望90 kcal，实际${result.details[0].calories}`);
    console.log(`   ${oil} 10ml = ${result.details[0].calories} kcal ✅`);
  }
});

// 测试5: 验证 parseAmountUnit 支持 "2个（100g）" 格式
test('parseAmountUnit 格式测试', () => {
  const { parseAmountUnit } = require('../utils/ingredientParser');
  
  // 测试 2个（100g）格式
  const result1 = parseAmountUnit('2个（100g）', '');
  console.log(`   "2个（100g）" => amount:${result1.amount}, unit:${result1.unit}, extraAmount:${result1.extraAmount}`);
  assert(result1.amount === 2, '主要数量应为2');
  assert(result1.extraAmount === 100, '额外数量应为100');
  
  // 测试普通格式
  const result2 = parseAmountUnit('300g', '');
  console.log(`   "300g" => amount:${result2.amount}, unit:${result2.unit}`);
  assert(result2.amount === 300, '数量应为300');
  assert(result2.unit === 'g', '单位应为g');
});

// 测试6: 验证 null 安全
test('null安全测试', () => {
  const ingredients = [
    { name: '五花肉', amount: 500, unit: 'g', note: '约2块', isRequired: true },
    { name: '白胡椒粉', amount: null, unit: '', note: '适量', isRequired: false },
    { name: '盐', amount: 3, unit: 'g', note: '约1小撮', isRequired: true },
  ];
  
  const result = calculateTotalCalories(ingredients);
  console.log(`   总热量: ${result.total} kcal`);
  assert(result.total > 0, '总热量应大于0');
});

console.log('\n' + '='.repeat(60));
console.log(`测试结果: ${passCount} 通过, ${failCount} 失败`);
console.log('='.repeat(60));

process.exit(failCount > 0 ? 1 : 0);