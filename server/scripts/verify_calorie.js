/**
 * 验证脚本：测试热量计算是否正确
 * 验收标准：
 * 1. 10人份东坡肉（五花肉2.6kg）总热量应在9000kcal级别
 * 2. 西兰花+15ml油：油≈135kcal
 * 3. 白胡椒粉amount=null不报错
 */

const path = require('path');
const { calculateTotalCalories, calculateIngredientCalories } = require('../services/calorieCalculator');

console.log('='.repeat(60));
console.log('热量计算验证测试');
console.log('='.repeat(60));

// 测试1：10人份东坡肉（2.6kg五花肉）
const dongpoPork = [
  { name: '五花肉', amount: 2600, unit: 'g', note: '约10块', isRequired: true },
  { name: '食用油', amount: 50, unit: 'ml', note: '约5汤匙', isRequired: true },
  { name: '白糖', amount: 80, unit: 'g', note: '约8汤匙', isRequired: true },
  { name: '生抽', amount: 50, unit: 'ml', note: '约5汤匙', isRequired: true },
  { name: '老抽', amount: 30, unit: 'ml', note: '约3汤匙', isRequired: true },
  { name: '黄酒', amount: 50, unit: 'ml', note: '约5汤匙', isRequired: true },
  { name: '生姜', amount: 30, unit: 'g', note: '约3片', isRequired: true },
  { name: '葱', amount: 50, unit: 'g', note: '约2根', isRequired: true },
  { name: '盐', amount: 5, unit: 'g', note: '约1茶匙', isRequired: true }
];

const result1 = calculateTotalCalories(dongpoPork, { warnMissing: true });
console.log('\n【测试1】10人份东坡肉（约2.6kg五花肉）');
console.log('预期：约9000 kcal级别（900 * 26 + 调料 ≈ 9000）');
console.log('实际：', result1.total, 'kcal');
console.log('结果：', result1.total > 6000 && result1.total < 12000 ? '✅ PASS' : '❌ FAIL');

// 测试2：西兰花+15ml油
const broccoliWithOil = [
  { name: '西兰花', amount: 200, unit: 'g', note: '约2朵', isRequired: true },
  { name: '食用油', amount: 15, unit: 'ml', note: '约1汤匙', isRequired: true }
];

const result2 = calculateTotalCalories(broccoliWithOil);
console.log('\n【测试2】西兰花200g + 油15ml');
console.log('预期：油约135 kcal (15ml ≈ 15g × 9 = 135)');
const oilItem = result2.details.find(d => d.name.includes('油') || d.name.includes('食用油'));
console.log('油热量：', oilItem?.calories || '未找到', 'kcal');
console.log('结果：', oilItem && oilItem.calories >= 120 && oilItem.calories <= 150 ? '✅ PASS' : '❌ FAIL');

// 测试3：白胡椒粉 amount=null
const withSpice = [
  { name: '五花肉', amount: 500, unit: 'g', note: '约2块', isRequired: true },
  { name: '白胡椒粉', amount: null, unit: '', note: '1小撮', isRequired: false }
];

console.log('\n【测试3】白胡椒粉 amount=null（香料默认值）');
const result3 = calculateTotalCalories(withSpice);
console.log('预期：香料不报错，热量≈0或2');
console.log('总热量：', result3.total, 'kcal (正常数字，无报错)');
console.log('结果：', typeof result3.total === 'number' && !isNaN(result3.total) ? '✅ PASS' : '❌ FAIL');

console.log('\n' + '='.repeat(60));
console.log('测试完成');
console.log('='.repeat(60));