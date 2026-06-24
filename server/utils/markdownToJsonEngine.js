const { normalizeText, normalizeIngredientName } = require('./ingredientParser');
const { validateRecipeContract } = require('./recipeContractV0005');

/**
 * 盐量换算规则：1g盐的体积大约相当于1颗黄豆大小。
 * （厨房常见估算：啤酒瓶盖一平盖约等于6g，一茶匙/一小勺(5ml)的盐约等于5g，
 *  1g盐在视觉上大约只有1颗中等黄豆或者小指甲盖的1/4大小）
 * 糖量换算规则：1g ≈ 1/4茶匙
 */
function convertSeasoningNote(name, amountStr) {
  const amount = parseFloat(amountStr);
  if (isNaN(amount)) return '';
  
  if (name.includes('盐')) {
    // 修正换算比例：1g盐 ≈ 1颗黄豆大小
    const beans = Math.round(amount * 1);
    return `约${beans}颗黄豆大小`;
  }
  if (name.includes('糖')) {
    const spoons = (amount / 4).toFixed(1).replace('.0', '');
    return `约${spoons}茶匙`;
  }
  return '';
}

/**
 * 将结构化 Markdown 转换为 v0005 Recipe JSON
 * @param {string} markdown AI 生成的结构化 Markdown
 * @param {object} baseInfo 基础信息 (id, category, totalWeight 等)
 */
function parseMarkdownToRecipe(markdown, baseInfo = {}) {
  try {
    const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);
    const recipe = {
      id: baseInfo.id || `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: baseInfo.name || '',
      description: '',
      difficulty: '简单',
      cookTime: '',
      servings: '1人份',
      calories: 0,
      mainIngredients: baseInfo.mainIngredients ? [...baseInfo.mainIngredients] : [],
      requiredSeasonings: [],
      optionalSeasonings: [],
      originalTools: baseInfo.tools ? [...baseInfo.tools] : [],
      allIngredients: [],
      steps: [],
      tips: '',
      category: baseInfo.category || '立即下厨',
      note: '',
      totalWeight: baseInfo.totalWeight || 1000,
      cookedCount: 0,
      isDraft: 0
    };

    let currentSection = '';
    let stepCount = 1;

    for (const line of lines) {
      if (line.startsWith('菜名：')) {
        recipe.name = normalizeText(line.replace('菜名：', ''));
      } else if (line.startsWith('简介：')) {
        recipe.description = normalizeText(line.replace('简介：', '')).slice(0, 25);
      } else if (line.startsWith('难度：')) {
        const diff = normalizeText(line.replace('难度：', ''));
        recipe.difficulty = ['简单', '中等', '困难'].includes(diff) ? diff : '简单';
      } else if (line.startsWith('时间：')) {
        recipe.cookTime = normalizeText(line.replace('时间：', ''));
      } else if (line.startsWith('份量：')) {
        recipe.servings = normalizeText(line.replace('份量：', ''));
      } else if (line.startsWith('热量：')) {
        recipe.calories = parseInt(line.replace('热量：', ''), 10) || 0;
      } else if (line.startsWith('厨具：')) {
        const tools = line.replace('厨具：', '').split(/[,，、]/).map(normalizeText).filter(Boolean);
        if (tools.length > 0) recipe.originalTools = tools;
      }
      
      // 切换章节
      else if (line === '食材明细：') {
        currentSection = 'ingredients';
      } else if (line === '烹饪步骤：') {
        currentSection = 'steps';
      } else if (line === '小贴士：') {
        currentSection = 'tips';
      }
      
      // 解析食材: [食材名称]|[用量]|[必须/可选]|[作用或处理备注]
      else if (currentSection === 'ingredients' && line.includes('|') && !line.startsWith('(') && !line.startsWith('（')) {
        const parts = line.split('|').map(normalizeText);
        if (parts.length >= 2) {
          const name = parts[0];
          const amount = parts[1];
          const reqStr = parts[2] || '必须';
          let note = parts[3] || '';

          const isRequired = reqStr.includes('必须') || reqStr.includes('需');
          
          if (!note && (name.includes('盐') || name.includes('糖'))) {
            note = convertSeasoningNote(name, amount);
          }

          if (isRequired && !recipe.mainIngredients.includes(name)) {
            if (recipe.mainIngredients.length < 3 && !name.includes('盐') && !name.includes('油') && !name.includes('抽')) {
              recipe.mainIngredients.push(name);
            } else {
              recipe.requiredSeasonings.push(name);
            }
          } else if (!isRequired) {
            recipe.optionalSeasonings.push(name);
          }

          recipe.allIngredients.push({ name, amount, note, isRequired });
        }
      }
      
      // 解析步骤: [阶段]|[详细动作描述]
      else if (currentSection === 'steps' && line.includes('|') && !line.startsWith('(') && !line.startsWith('（')) {
        const parts = line.split('|').map(normalizeText);
        if (parts.length >= 2) {
          const stageRaw = parts[0];
          const fullText = parts.slice(1).join('|'); // 防止描述里有竖线
          
          const stage = ['准备', '预处理', '烹饪', '装盘'].includes(stageRaw) ? stageRaw : '装盘';

          recipe.steps.push({
            step: stepCount++,
            stage,
            action: fullText,
            heat: fullText.includes('大火') ? '大火' : (fullText.includes('小火') ? '小火' : '中火'),
            time: '依情况而定',
            sensory: stage === '烹饪' ? '香味出来' : '处理完成',
            fullText: `${stageRaw}：${fullText}`
          });
        }
      }
      
      // 解析小贴士
      else if (currentSection === 'tips' && line.startsWith('-')) {
        const tip = normalizeText(line.replace(/^-/, ''));
        if (tip) {
          recipe.tips = recipe.tips ? `${recipe.tips}；${tip}` : tip;
        }
      }
    }

    // 强制规则：如果有清水/水，确保它在列表中
    const hasWater = recipe.allIngredients.some(i => i.name.includes('水') || i.name.includes('汤'));
    if (markdown.includes('水') && !hasWater) {
      recipe.requiredSeasonings.push('清水');
      recipe.allIngredients.push({
        name: '清水',
        amount: '适量',
        note: '按需添加',
        isRequired: true
      });
    }

    // 强制执行校验兜底
    if (!recipe.originalTools || recipe.originalTools.length === 0) {
      recipe.originalTools = ['炒锅'];
    }
    const { ok, errors } = validateRecipeContract(recipe);
    if (!ok) {
      throw new Error(`解析后未能通过契约校验: ${errors.join(', ')}`);
    }

    return recipe;
  } catch (error) {
    console.error('MarkdownToJson 解析失败:', error);
    throw error;
  }
}

module.exports = {
  parseMarkdownToRecipe
};
