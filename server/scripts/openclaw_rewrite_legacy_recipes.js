/**
 * 批处理脚本：批量改写旧菜谱为结构化版本
 * 用法: node scripts/openclaw_rewrite_legacy_recipes.js
 * 
 * 功能：
 * 1. 检测并改写不符合新规则的菜谱
 * 2. 重新计算热量并回写到数据库
 * 3. 输出统计报告和缺失营养库清单
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { normalizeIngredientName, normalizeText, parseAmountUnit, chineseToNumber } = require('../utils/ingredientParser');
const { calculateTotalCalories } = require('../services/calorieCalculator');

const DB_PATH = path.join(__dirname, '../data/recipes.db');
const db = new Database(DB_PATH);

// 收集缺失营养的食材
const missingNutritionItems = new Set();

// 解析人数
function parseServings(servingsStr) {
  if (!servingsStr) return 1;
  const match = String(servingsStr).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

// 解析食材
function parseIngredients(ing) {
  if (typeof ing === 'string') {
    return { name: normalizeText(ing), amount: null, unit: '', note: '', isRequired: true };
  }
  if (!ing || typeof ing !== 'object') {
    return { name: '', amount: null, unit: '', note: '', isRequired: true };
  }
  
  const name = normalizeText(ing.name);
  let { amount, unit } = parseAmountUnit(ing.amount, ing.unit);
  
  // 如果 amount 为 null，给默认值（针对香料类）
  const n = normalizeIngredientName(name);
  const isSpice = n.includes('胡椒') || n.includes('孜然') || n.includes('辣椒粉') || n.endsWith('粉') || n.endsWith('末');
  if (amount === null && isSpice) {
    amount = 2; // 给默认值 2g
  }
  
  return {
    name,
    amount,
    unit: unit || '',
    note: normalizeText(ing.note) || (isSpice ? '适量' : ''),
    isRequired: ing.isRequired !== false
  };
}

// 解析步骤
function parseSteps(steps) {
  if (!Array.isArray(steps)) return [];
  
  // 如果已经是对象数组
  if (steps.length > 0 && typeof steps[0] === 'object') {
    return steps.map((s, idx) => ({
      step: s.step || (idx + 1),
      stage: s.stage || '',
      action: s.action || '',
      heat: s.heat || '',
      time: s.time || '',
      sensory: s.sensory || '',
      fullText: s.fullText || (s.action && s.heat && s.time ? `${s.action}，${s.heat}，${s.time}` : '')
    }));
  }
  
  // 字符串数组转为对象
  return steps.map((s, idx) => ({
    step: idx + 1,
    stage: '',
    action: s,
    heat: '',
    time: '',
    sensory: '',
    fullText: s
  }));
}

// 判断是否需要改写
function needsRewrite(allIngredients, steps) {
  if (!Array.isArray(allIngredients) || allIngredients.length === 0) return true;
  
  // 检查是否有不合规的食材
  const ings = allIngredients.map(parseIngredients);
  const hasInvalidAmount = ings.some(i => i.isRequired && i.amount === null && !i.name.includes('胡椒') && !i.name.includes('孜然') && !i.name.endsWith('粉') && !i.name.endsWith('末'));
  const hasEmptyNote = ings.some(i => i.isRequired && !i.note);
  
  if (hasInvalidAmount || hasEmptyNote) return true;
  
  // 检查步骤
  if (!Array.isArray(steps) || steps.length === 0) return true;
  const firstStep = steps[0];
  if (!firstStep || typeof firstStep !== 'object') return true;
  if (!firstStep.action && !firstStep.fullText) return true;
  
  return false;
}

// 改写菜谱
function rewriteRecipe(recipe) {
  let allIngs = [];
  let stepsRaw = [];
  let mainIngs = [];
  
  try { mainIngs = JSON.parse(recipe.mainIngredients || '[]'); } catch {}
  try { allIngs = JSON.parse(recipe.allIngredients || '[]'); } catch {}
  try { stepsRaw = JSON.parse(recipe.steps || '[]'); } catch {}
  
  // 解析食材
  const normalizedIngs = allIngs.map(parseIngredients);
  
  // 解析步骤
  const normalizedSteps = parseSteps(stepsRaw);
  
  // 确保至少有 4 步
  while (normalizedSteps.length < 4) {
    normalizedSteps.push({
      step: normalizedSteps.length + 1,
      stage: '',
      action: '继续烹饪',
      heat: '中火',
      time: '适量',
      sensory: '根据实际情况调整',
      fullText: '继续完成烹饪'
    });
  }
  
  // 计算热量
  const calorieResult = calculateTotalCalories(normalizedIngs, { warnMissing: true });
  const totalCalories = calorieResult.total;
  
  // 记录缺失营养的食材
  if (calorieResult.details) {
    for (const d of calorieResult.details) {
      if (d.missingNutrition) {
        missingNutritionItems.add(d.name);
      }
    }
  }
  
  return {
    mainIngredients: mainIngs,
    allIngredients: normalizedIngs,
    steps: normalizedSteps,
    calories: totalCalories
  };
}

// 主函数
function main() {
  console.log('='.repeat(60));
  console.log('开始批量改写旧菜谱...');
  console.log('='.repeat(60));
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  // 读取所有 StandardRecipes
  const recipes = db.prepare('SELECT * FROM StandardRecipes').all();
  console.log(`\n共读取 ${recipes.length} 条菜谱\n`);
  
  const updateStmt = db.prepare(`
    UPDATE StandardRecipes 
    SET mainIngredients = ?, allIngredients = ?, steps = ?, calories = ?, updatedAt = ?
    WHERE id = ?
  `);
  
  const now = new Date().toISOString();
  
  for (const recipe of recipes) {
    try {
      let allIngs = [];
      let stepsRaw = [];
      
      try { allIngs = JSON.parse(recipe.allIngredients || '[]'); } catch {}
      try { stepsRaw = JSON.parse(recipe.steps || '[]'); } catch {}
      
      if (!needsRewrite(allIngs, stepsRaw)) {
        skipCount++;
        continue;
      }
      
      const rewritten = rewriteRecipe(recipe);
      
      updateStmt.run(
        JSON.stringify(rewritten.mainIngredients),
        JSON.stringify(rewritten.allIngredients),
        JSON.stringify(rewritten.steps),
        rewritten.calories,
        now,
        recipe.id
      );
      
      successCount++;
      
      if (successCount <= 10) {
        console.log(`[改写] ${recipe.name}`);
      }
    } catch (err) {
      failCount++;
      console.error(`[失败] ${recipe.name}: ${err.message}`);
    }
  }
  
  // 输出报告
  console.log('\n' + '='.repeat(60));
  console.log('改写完成报告');
  console.log('='.repeat(60));
  console.log(`✅ 成功改写: ${successCount} 条`);
  console.log(`⏭️  跳过（已合规）: ${skipCount} 条`);
  console.log(`❌ 失败: ${failCount} 条`);
  
  // 输出缺失营养库清单
  console.log('\n' + '='.repeat(60));
  console.log('建议添加到营养库的食材:');
  console.log('='.repeat(60));
  
  if (missingNutritionItems.size === 0) {
    console.log('（无）');
  } else {
    const arr = Array.from(missingNutritionItems).sort();
    console.log(arr.join(', '));
  }
  
  console.log(`\n共 ${missingNutritionItems.size} 项\n`);
  
  db.close();
}

// 运行
main();