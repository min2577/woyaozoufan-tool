const fs = require('fs');
const path = require('path');

/**
 * ⚖️ 契约守护者 Agent (Contract Guardian) 物理落地脚本
 * 
 * 职责：
 * 1. 模拟一次 /api/match 的核心逻辑调用（或直接发请求），拿到生成的 JSON
 * 2. 严格比对 CONTRACTS.md 中定义的必备字段和格式
 * 3. 发现少字段、类型错、或者不符合三关铁律的，直接大声报错（抛出 Error）
 */

// 这里我们做一个轻量级的、针对已有本地 JSON 或测试对象的严格校验器
function validateRecipeContract(recipe) {
  console.log('\n====================================================');
  console.log(`⚖️ [契约守护者] 正在校验菜谱: ${recipe.name || '未知'}`);
  
  let passed = true;
  const errors = [];

  // 1. 必填字段校验
  const requiredFields = [
    'id', 'name', 'description', 'difficulty', 'cookTime', 'servings', 
    'calories', 'mainIngredients', 'requiredSeasonings', 'optionalSeasonings',
    'originalTools', 'allIngredients', 'steps', 'category', 'note', 'totalWeight'
  ];

  for (const field of requiredFields) {
    if (recipe[field] === undefined || recipe[field] === null) {
      errors.push(`缺失必填字段: ${field}`);
      passed = false;
    }
  }

  // 2. allIngredients 强约束校验 (如果有这个字段的话)
  if (recipe.allIngredients && Array.isArray(recipe.allIngredients)) {
    recipe.allIngredients.forEach((ing, idx) => {
      if (!ing.name || ing.amount === undefined || ing.isRequired === undefined) {
        errors.push(`allIngredients[${idx}] 结构不合规 (必须包含 name, amount, isRequired)`);
        passed = false;
      }
      if (typeof ing.amount === 'string' && (ing.amount.includes('适量') || ing.amount.includes('少许'))) {
        errors.push(`致命违规: allIngredients[${idx}].amount 出现了模糊词汇 '${ing.amount}'`);
        passed = false;
      }
    });
  }

  // 3. steps 强约束校验
  if (recipe.steps && Array.isArray(recipe.steps) && recipe.steps.length > 0) {
    recipe.steps.forEach((step, idx) => {
      const stepRequired = ['step', 'stage', 'action', 'heat', 'time', 'sensory', 'fullText'];
      for (const req of stepRequired) {
        if (step[req] === undefined) {
          errors.push(`steps[${idx}] 缺失必填字段: ${req}`);
          passed = false;
        }
      }
    });
  }

  // 4. 分类强校验
  if (recipe.category !== '立即下厨' && recipe.category !== '顺路买点' && recipe.category !== '需要采购') {
    errors.push(`非法分类 category: ${recipe.category}`);
    passed = false;
  }

  if (!passed) {
    console.log('❌ [契约守护者] 校验不通过！这道菜谱违反了 CONTRACTS.md 的规定！');
    errors.forEach(e => console.log(`  - ${e}`));
    console.log('====================================================\n');
    return false;
  }

  console.log('✅ [契约守护者] 校验完美通过，符合 CONTRACTS.md 宪法！');
  console.log('====================================================\n');
  return true;
}

// 提供一个简单的测试入口
function runTest() {
  console.log('⚖️ 契约守护者已激活，开始模拟测试...\n');
  const mockBadRecipe = {
    id: 'test-1',
    name: '测试残缺菜谱',
    allIngredients: [{ name: '盐', amount: '适量' }], // 违规词汇
    steps: [{ fullText: '随便炒炒' }] // 缺失大量结构化字段
  };

  validateRecipeContract(mockBadRecipe);
}

if (require.main === module) {
  runTest();
}

module.exports = { validateRecipeContract };