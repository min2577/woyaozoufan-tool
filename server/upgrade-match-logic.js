/**
 * 升级脚本：修改匹配逻辑
 * 1. 主料缺失→过滤
 * 2. 厨具自动替换
 * 3. note 动态填充
 * 4. 移除 expiryWarning
 * 5. AI 生成最多 30 道
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. 修改匹配逻辑部分
const oldMatchLogic = `// 核心食材缺失
      const missingCore = mainIngs.filter(ing => !ingredients.includes(ing));
      
      // 非核心但必选食材缺失
      const missingRequiredNonCore = allIngs.filter(ing => 
        ing.isRequired && 
        !mainIngs.includes(ing.name) && 
        !ingredients.includes(ing.name) &&
        !(seasonings && typeof seasonings === 'object' && seasonings[ing.name])
      );

      // 计算权重
      let weight = 0;
      let hasExpiring = false;
      mainIngs.forEach(ing => {
        const inv = inventoryMap[ing];
        if (inv) {
          if (inv.status === 'red') {
            weight += 100;
            hasExpiring = true;
          }
          weight += (inv.frequency || 0) * 2;
        }
      });

      let category = '专门采购';
      let note = '';

      if (missingCore.length === 0) {
        if (missingRequiredNonCore.length === 0) {
          category = '立即下厨';
          // 检查是否有非必选调料缺失
          const missingOptional = allIngs.filter(ing => !ing.isRequired && !(seasonings && typeof seasonings === 'object' && seasonings[ing.name]));
          if (missingOptional.length > 0) note = '不加亦可';
        } else if (missingRequiredNonCore.length <= 2) {
          category = '顺路买点';
        }
      }

      // 类别权重
      const categoryWeight = category === '立即下厨' ? 1000 : (category === '顺路买点' ? 500 : 0);
      
      return {
        ...recipe,
        mainIngredients: mainIngs,
        allIngredients: allIngs,
        steps: JSON.parse(recipe.steps),
        category,
        note,
        expiryWarning: hasExpiring,
        totalWeight: weight + categoryWeight
      };`;

const newMatchLogic = `// 核心食材缺失（主料缺失直接过滤）
      const missingCore = mainIngs.filter(ing => !ingredients.includes(ing));
      if (missingCore.length > 0) {
        return null; // 主料缺失，直接过滤
      }
      
      // 检查必需调料/辅料缺失
      const missingRequired = allIngs.filter(ing => 
        ing.isRequired && 
        !ingredients.includes(ing.name) &&
        !(seasonings && typeof seasonings === 'object' && seasonings[ing.name])
      );

      // 厨具适配检查
      const recipeTools = recipe.tools || [];
      const userTools = tools || [];
      const toolMismatch = recipeTools.some(t => !userTools.includes(t));
      let adaptedTool = null;

      if (toolMismatch) {
        adaptedTool = applyToolReplacement(recipeTools, userTools);
        if (!adaptedTool) {
          return null; // 无法替换，过滤
        }
      }

      // 计算权重（移除过期预警）
      let weight = 0;
      mainIngs.forEach(ing => {
        const inv = inventoryMap[ing];
        if (inv) {
          weight += (inv.clickFrequency || 0) * 2;
        }
      });

      // 分类判定（仅 2 类）
      let category = null;
      let note = '';

      if (missingRequired.length === 0) {
        category = '立即下厨';
        const missingOptional = allIngs.filter(ing => 
          !ing.isRequired && 
          !ingredients.includes(ing.name)
        );
        if (missingOptional.length > 0) {
          note = \`可直接做，加入\${missingOptional.map(m => m.name).join('、')}口感更佳\`;
        } else {
          note = '可直接做';
        }
      } else if (missingRequired.length <= 2) {
        category = '顺路买点';
        note = \`缺少：\${missingRequired.map(m => m.name).join('、')}（顺路购买即可做）\`;
      } else {
        return null; // 缺太多，过滤
      }

      // 厨具适配说明
      if (adaptedTool) {
        note += \` 厨具已适配：按你现有的\${adaptedTool}调整做法\`;
      }

      // 类别权重
      const categoryWeight = category === '立即下厨' ? 1000 : (category === '顺路买点' ? 500 : 0);
      
      return {
        ...recipe,
        mainIngredients: mainIngs,
        allIngredients: allIngs,
        steps: JSON.parse(recipe.steps),
        category,
        note,
        totalWeight: weight + categoryWeight
      };`;

content = content.replace(oldMatchLogic, newMatchLogic);

// 2. 修改 AI 生成数量逻辑
const oldAILogic = `// 如果立即下厨不足 10 条，且是第一页，同步补位并把结果直接返回（充数 + 入库）
    if (readyToCook.length < 10 && page === 1) {
      const countNeeded = 10 - readyToCook.length;
      const newOnes = await backfillRecipes(ingredients, seasonings, tools, isOutrageous, countNeeded);`;

const newAILogic = `// 如果菜谱不足 10 条，且是第一页，触发 AI 生成（最多 30 道）
    const TARGET_COUNT = 10;
    const MAX_AI_GENERATE = 30;
    
    if (processedResults.length < TARGET_COUNT && page === 1) {
      const countNeeded = Math.min(MAX_AI_GENERATE, TARGET_COUNT * 3 - processedResults.length);
      const newOnes = await backfillRecipes(ingredients, seasonings, tools, isOutrageous, countNeeded);`;

content = content.replace(oldAILogic, newAILogic);

// 3. 修改 AI 生成结果处理（移除 expiryWarning）
const oldAIResult = `processedResults.unshift({
            ...r,
            category: '立即下厨',
            note: 'AI 补位',
            expiryWarning: false,
            totalWeight: 9999
          });`;

const newAIResult = `processedResults.unshift({
            ...r,
            category: '立即下厨',
            note: 'AI 补位',
            totalWeight: 9999
          });`;

content = content.replace(oldAIResult, newAIResult);

// 保存修改
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ 匹配逻辑升级完成！');
console.log('修改内容：');
console.log('1. 主料缺失→直接过滤');
console.log('2. 厨具自动替换逻辑已集成');
console.log('3. note 字段动态填充');
console.log('4. 移除 expiryWarning 字段');
console.log('5. AI 生成最多 30 道');
