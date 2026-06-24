/**
 * 菜谱匹配路由模块
 * 根据食材、调料、厨具匹配菜谱
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const aiService = require('../services/aiService');
const { logger } = require('../middleware/logger');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { normalizeIngredientName, normalizeText } = require('../utils/ingredientParser');

// 匹配结果缓存（用于避免重复调用AI）
const matchCache = new Map();

// 主要调料定义 - 影响菜品核心味道的调料
const MAIN_SEASONINGS = new Set([
  '盐', '糖', '生抽', '老抽', '料酒',
  '葱', '姜', '蒜', '醋', '蚝油',
  '食用油', '鸡精', '味精', '辣椒', '花椒'
]);

function normalizeForMatch(raw) {
  return normalizeText(raw)
    .replace(/[（(].*?[)）]/g, '')
    .replace(/\s+/g, '')
    .replace(/[·•・]/g, '');
}

const MEAT_CUTS = {
  猪肉: [
    { canonical: '五花肉', aliases: ['五花', '三层肉', '肋条肉', '带皮五花肉'] },
    { canonical: '里脊', aliases: ['里脊肉', '猪里脊', '小里脊'] },
    { canonical: '排骨', aliases: ['猪排骨', '肋排', '小排', '大排'] },
    { canonical: '猪蹄', aliases: ['蹄膀', '猪脚', '猪手'] },
    { canonical: '猪肘', aliases: ['肘子', '猪肘子', '前肘', '后肘'] },
    { canonical: '猪耳', aliases: ['猪耳朵'] },
    { canonical: '猪头肉', aliases: ['头肉'] },
    { canonical: '猪皮', aliases: [] },
    { canonical: '猪腰', aliases: ['腰花'] },
    { canonical: '猪肝', aliases: [] },
    { canonical: '猪心', aliases: [] },
    { canonical: '猪肚', aliases: [] },
    { canonical: '肉末', aliases: ['猪肉末', '猪绞肉', '绞肉', '肉馅', '猪肉馅'] },
    { canonical: '猪血', aliases: ['血旺', '猪红'] },
    { canonical: '梅花肉', aliases: ['猪梅花'] },
    { canonical: '前腿肉', aliases: ['前腿'] },
    { canonical: '后腿肉', aliases: ['后腿'] },
  ],
  牛肉: [
    { canonical: '牛腩', aliases: [] },
    { canonical: '牛里脊', aliases: ['里脊', '里脊肉'] },
    { canonical: '牛腱', aliases: ['牛腱子'] },
    { canonical: '牛筋', aliases: [] },
    { canonical: '肥牛', aliases: ['肥牛卷', '牛肉卷'] },
    { canonical: '牛排', aliases: [] },
    { canonical: '牛骨', aliases: ['牛骨头'] },
    { canonical: '牛尾', aliases: ['牛尾巴'] },
  ],
  羊肉: [
    { canonical: '羊排', aliases: [] },
    { canonical: '羊腿肉', aliases: ['羊腿'] },
    { canonical: '羊里脊', aliases: ['里脊', '里脊肉'] },
    { canonical: '羊蝎子', aliases: [] },
    { canonical: '羊肉卷', aliases: ['羊肉片'] },
  ],
  鸡肉: [
    { canonical: '鸡胸', aliases: ['鸡胸肉'] },
    { canonical: '鸡腿', aliases: ['鸡腿肉', '琵琶腿'] },
    { canonical: '鸡翅', aliases: ['鸡翅中', '鸡翅根', '鸡全翅'] },
    { canonical: '鸡爪', aliases: ['凤爪'] },
    { canonical: '鸡胗', aliases: [] },
    { canonical: '鸡肝', aliases: [] },
    { canonical: '鸡心', aliases: [] },
    { canonical: '整鸡', aliases: ['全鸡', '土鸡', '三黄鸡'] },
    { canonical: '鸡架', aliases: ['鸡骨架'] },
  ],
  鸭肉: [
    { canonical: '鸭腿', aliases: ['鸭腿肉'] },
    { canonical: '鸭胸', aliases: ['鸭胸肉'] },
    { canonical: '鸭翅', aliases: ['鸭翅膀'] },
    { canonical: '鸭掌', aliases: [] },
    { canonical: '鸭胗', aliases: [] },
    { canonical: '整鸭', aliases: ['全鸭'] },
  ],
};

const MEAT_PARENTS = Object.keys(MEAT_CUTS);

const meatAliasEntries = (() => {
  const entries = [];
  for (const parent of MEAT_PARENTS) {
    for (const item of MEAT_CUTS[parent]) {
      const allAliases = new Set([item.canonical, ...(item.aliases || [])]);
      for (const alias of allAliases) {
        const key = normalizeForMatch(alias);
        if (!key) continue;
        entries.push({ aliasKey: key, parent, canonical: item.canonical });
      }
    }
  }
  return entries.sort((a, b) => b.aliasKey.length - a.aliasKey.length);
})();

function extractMeatTokens(rawText) {
  const s = normalizeForMatch(rawText);
  if (!s) return [];

  const tokens = [];
  for (const entry of meatAliasEntries) {
    if (s.includes(entry.aliasKey)) {
      tokens.push({ parent: entry.parent, cut: entry.canonical });
    }
  }
  if (tokens.length > 0) return tokens;

  for (const parent of MEAT_PARENTS) {
    const p = normalizeForMatch(parent);
    if (p && s.includes(p)) return [{ parent, cut: null }];
  }
  return [];
}

function normalizeToolToken(raw) {
  const s = normalizeForMatch(raw).toLowerCase();
  if (!s) return '';
  if (s === 'wok' || s.includes('炒锅') || s.includes('锅')) return 'wok';
  if (s === 'rice-cooker' || s.includes('电饭煲') || s.includes('电饭锅')) return 'rice-cooker';
  if (s === 'air-fryer' || s.includes('空气炸锅')) return 'air-fryer';
  if (s === 'oven' || s.includes('烤箱')) return 'oven';
  if (s === 'microwave' || s.includes('微波炉')) return 'microwave';
  if (s === 'blender' || s.includes('破壁机') || s.includes('料理机') || s.includes('搅拌机')) return 'blender';
  if (s === 'pressure-cooker' || s.includes('高压锅') || s.includes('压力锅')) return 'pressure-cooker';
  if (s === 'slow-cooker' || s.includes('慢炖锅')) return 'slow-cooker';
  if (s === 'steamer' || s.includes('蒸锅')) return 'steamer';
  if (s.includes('木炭') || s.includes('炭')) return 'charcoal';
  if (s.includes('烧烤') || s.includes('烤架') || s.includes('烤炉') || s.includes('bbq')) return 'grill';
  return s;
}

function inferRequiredToolsFromSteps(recipe) {
  // 优先读取菜谱自身的tools
  if (recipe && Array.isArray(recipe.tools) && recipe.tools.length > 0) {
    return recipe.tools.map(tool => normalizeToolToken(tool)).filter(Boolean);
  }
  
  // 没有tools则读取originalTools
  if (recipe && Array.isArray(recipe.originalTools) && recipe.originalTools.length > 0) {
    return recipe.originalTools.map(tool => normalizeToolToken(tool)).filter(Boolean);
  }
  
  // 都没有才通过步骤关键词推断
  const nameText = normalizeForMatch(recipe && recipe.name);
  const steps = Array.isArray(recipe && recipe.steps) ? recipe.steps : [];
  const stepText = normalizeForMatch(steps.join(' '));
  const text = `${nameText} ${stepText}`.trim();

  const required = new Set();
  if (!text) return [];

  if (text.includes('电饭煲') || text.includes('电饭锅')) required.add('rice-cooker');
  if (text.includes('空气炸锅')) required.add('air-fryer');
  if (text.includes('烤箱')) required.add('oven');
  if (text.includes('微波炉')) required.add('microwave');
  if (text.includes('破壁机') || text.includes('料理机') || text.includes('搅拌机')) required.add('blender');
  if (text.includes('高压锅') || text.includes('压力锅')) required.add('pressure-cooker');
  if (text.includes('慢炖锅')) required.add('slow-cooker');
  if (text.includes('蒸锅') || text.includes('上锅蒸') || text.includes('蒸制')) required.add('steamer');

  const charcoalHit = text.includes('炭烤') || text.includes('炭火') || text.includes('木炭') || text.includes('烧烤炉') || text.includes('烤架');
  if (charcoalHit) {
    required.add('charcoal');
    required.add('grill');
  }

  const stovetopHit =
    text.includes('炒') ||
    text.includes('翻炒') ||
    text.includes('爆香') ||
    text.includes('煎') ||
    text.includes('热锅') ||
    text.includes('大火') ||
    text.includes('小火') ||
    text.includes('煮') ||
    text.includes('炖') ||
    text.includes('焖');
  if (stovetopHit) required.add('wok');

  return Array.from(required);
}

function extractIngredientName(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') {
    const s = normalizeText(entry);
    if (!s) return '';
    const trimmed = s.trim();
    const firstPart = trimmed.split(/\s+/)[0];
    return firstPart || trimmed;
  }
  if (typeof entry === 'object' && typeof entry.name === 'string') return entry.name;
  return '';
}

function computeUserInventory(reqBody) {
  const ingredients = Array.isArray(reqBody.ingredients) ? reqBody.ingredients : [];
  const ingredientSelections = reqBody && typeof reqBody.ingredientSelections === 'object' && reqBody.ingredientSelections !== null
    ? reqBody.ingredientSelections
    : null;

  const normalizedIngredientSet = new Set();
  for (const ing of ingredients) {
    const n = normalizeIngredientName(ing);
    if (n) normalizedIngredientSet.add(n);
  }

  const genericMeatParents = new Set();
  const meatCutsByParent = {};
  for (const parent of MEAT_PARENTS) meatCutsByParent[parent] = new Set();

  for (const ing of ingredients) {
    const meatTokens = extractMeatTokens(ing);
    for (const t of meatTokens) {
      if (t.cut) meatCutsByParent[t.parent].add(t.cut);
      else genericMeatParents.add(t.parent);
    }
  }

  if (ingredientSelections) {
    for (const [rawParent, rawCuts] of Object.entries(ingredientSelections)) {
      const parentKey = MEAT_PARENTS.find((p) => normalizeForMatch(p) === normalizeForMatch(rawParent));
      if (!parentKey) continue;
      if (!Array.isArray(rawCuts)) continue;
      for (const rawCut of rawCuts) {
        const cutTokens = extractMeatTokens(rawCut);
        const hit = cutTokens.find((x) => x.parent === parentKey && x.cut);
        if (hit && hit.cut) meatCutsByParent[parentKey].add(hit.cut);
      }
    }
  }

  return {
    normalizedIngredientSet,
    meatCutsByParent,
    genericMeatParents,
  };
}

function isMeatRequirementSatisfied(reqToken, userInv) {
  const { parent, cut } = reqToken;
  if (!MEAT_PARENTS.includes(parent)) return false;
  const selectedCuts = userInv.meatCutsByParent[parent];
  if (cut) {
    return selectedCuts && selectedCuts.has(cut);
  }
  return (selectedCuts && selectedCuts.size > 0) || userInv.genericMeatParents.has(parent);
}

/**
 * 生成包含缺少次要调料的大师贴士
 * @param {Array} secondarySeasoningsMissing - 缺少的次要调料列表
 * @param {string} originalTips - 原始贴士
 * @returns {string} 增强后的贴士
 */
function generateTipsWithMissingSeasonings(secondarySeasoningsMissing, originalTips) {
  if (!secondarySeasoningsMissing || secondarySeasoningsMissing.length === 0) {
    return originalTips;
  }
  
  const seasoningsText = secondarySeasoningsMissing.join('、');
  const additionalTip = `加入${seasoningsText}后味道更丰富哦~`;
  
  if (!originalTips) {
    return additionalTip;
  }
  
  return `${originalTips} ${additionalTip}`;
}

function classifyRecipe(recipe, userInv, userSeasoningsAvailable, seasoningUniverse, userToolTokens) {
  const mainIngredients = Array.isArray(recipe.mainIngredients) ? recipe.mainIngredients : [];
  const allIngredients = Array.isArray(recipe.allIngredients) ? recipe.allIngredients : [];

  // 1. 匹配核心食材
  const coreMeatCutTokens = new Map();
  for (const entry of allIngredients) {
    const rawName = extractIngredientName(entry);
    if (!rawName) continue;
    const meatTokens = extractMeatTokens(rawName);
    for (const t of meatTokens) {
      if (t.cut) coreMeatCutTokens.set(`${t.parent}:${t.cut}`, t);
    }
  }
  
  const missingCore = [];
  let meatMismatch = false;
  
  // 检查主要食材匹配
  for (const ing of mainIngredients) {
    const meatTokens = extractMeatTokens(ing);
    if (meatTokens.length > 0) {
      const ok = meatTokens.some((t) => isMeatRequirementSatisfied(t, userInv));
      if (!ok) {
        meatMismatch = true;
        missingCore.push(ing);
      }
    }
    const n = normalizeIngredientName(ing);
    if (n && !userInv.normalizedIngredientSet.has(n)) {
      missingCore.push(ing);
    }
  }

  for (const t of coreMeatCutTokens.values()) {
    if (!isMeatRequirementSatisfied(t, userInv)) {
      meatMismatch = true;
      missingCore.push(t.cut);
    }
  }

  if (meatMismatch) return null;

  // 2. 匹配厨具
  const requiredTools = inferRequiredToolsFromSteps(recipe);
  for (const t of requiredTools) {
    if (!userToolTokens.has(t)) return null;
  }

  // 3. 匹配调料 - 区分主要调料和次要调料
  const mainSeasoningsMissing = [];
  const secondarySeasoningsMissing = [];
  
  for (const entry of allIngredients) {
    const rawName = extractIngredientName(entry);
    if (!rawName) continue;
    const normalized = normalizeIngredientName(rawName);
    if (!normalized) continue;
    if (!seasoningUniverse.has(normalized)) continue;
    if (!userSeasoningsAvailable.has(normalized)) {
      // 区分主要调料和次要调料
      if (MAIN_SEASONINGS.has(normalized)) {
        mainSeasoningsMissing.push(normalized);
      } else {
        secondarySeasoningsMissing.push(normalized);
      }
    }
  }

  // 4. 分类逻辑
  let category;
  const missing = Array.from(new Set([...missingCore, ...mainSeasoningsMissing, ...secondarySeasoningsMissing]));
  
  if (missingCore.length === 0) {
    if (mainSeasoningsMissing.length === 0) {
      // 核心食材全匹配 + 主要调料全匹配 → 立即下厨
      category = '立即下厨';
    } else if (mainSeasoningsMissing.length <= 3) {
      // 核心食材全匹配 + 主要调料缺少1-3种 → 顺路买点
      category = '顺路买点';
    } else {
      // 核心食材全匹配 + 主要调料缺少3种以上 → 顺路买点
      category = '顺路买点';
    }
  } else {
    // 核心食材缺失 → 顺路买点
    category = '顺路买点';
  }

  return { 
    category, 
    missing, 
    requiredTools,
    mainSeasoningsMissing,  // 新增：缺少的主要调料
    secondarySeasoningsMissing  // 新增：缺少的次要调料
  };
}

/**
 * POST /api/match
 * 根据食材匹配菜谱
 * Body: { ingredients, seasonings, tools, mode, page }
 */
router.post('/', asyncHandler(async (req, res) => {
  const { ingredients, seasonings, tools, mode = 'standard', page = 1 } = req.body;
  
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    throw new AppError('食材列表不能为空', 400, 'BAD_REQUEST');
  }
  
  const MAX_INGREDIENTS = 20;
  const MAX_INGREDIENT_LENGTH = 50;
  
  if (ingredients.length > MAX_INGREDIENTS) {
    throw new AppError(`食材数量不能超过${MAX_INGREDIENTS}种`, 400, 'BAD_REQUEST');
  }
  
  for (const ing of ingredients) {
    if (typeof ing !== 'string') {
      throw new AppError('食材名称必须是字符串', 400, 'BAD_REQUEST');
    }
    if (ing.length > MAX_INGREDIENT_LENGTH) {
      throw new AppError(`食材名称不能超过${MAX_INGREDIENT_LENGTH}个字符`, 400, 'BAD_REQUEST');
    }
  }

  // 生成请求缓存key（基于食材、厨具和模式）
  const cacheKey = `${mode}_${JSON.stringify(ingredients.sort())}_${JSON.stringify(tools.sort())}`;
  const cacheExpireTime = 60 * 1000; // 1分钟缓存
  
  // 检查缓存（只对第一页请求生效）
  if (page === 1 && matchCache.has(cacheKey)) {
    const cached = matchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < cacheExpireTime) {
      console.log(`[匹配缓存命中] 直接返回缓存结果`);
      return res.json(cached.data);
    }
  }
  
  const pageSize = 10;
  const offset = (page - 1) * pageSize;
  
  // 选择表
  const table = mode === 'outrageous' ? 'OutrageousRecipes' : 'StandardRecipes';
  
  const userInv = computeUserInventory(req.body || {});

  const seasoningRaw = seasonings && typeof seasonings === 'object' ? seasonings : {};
  const seasoningUniverse = new Set(Object.keys(seasoningRaw).map((k) => normalizeIngredientName(k)).filter(Boolean));
  const userSeasoningsAvailable = new Set(
    Object.entries(seasoningRaw)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => normalizeIngredientName(k))
      .filter(Boolean)
  );

  const userToolTokens = new Set(
    (Array.isArray(tools) ? tools : [])
      .map((t) => normalizeToolToken(t))
      .filter(Boolean)
  );

  const rows = db.query(`SELECT * FROM ${table} ORDER BY cookedCount DESC, id`);
  const totalRecipes = rows.length;
  
  // 先检查数据库中是否已有匹配用户食材的骨架菜谱
  const userIngSet = new Set(ingredients.map(normalizeIngredientName).filter(Boolean));
  const existingDrafts = [];
  
  if (userIngSet.size > 0) {
    for (const r of rows) {
      if (r.isDraft === 1) {
        try {
          const mainIngs = JSON.parse(r.mainIngredients || '[]');
          const recipeIngSet = new Set(mainIngs.map(normalizeIngredientName).filter(Boolean));
          
          // 检查骨架的主要食材是否都在用户选择的食材中
          let allMatch = true;
          for (const ing of recipeIngSet) {
            if (!userIngSet.has(ing)) {
              allMatch = false;
              break;
            }
          }
          
          if (allMatch && recipeIngSet.size > 0) {
            existingDrafts.push(r);
          }
        } catch (e) {
          // 解析失败，跳过
        }
      }
    }
  }
  
  console.log(`📋 开始食谱匹配`);
  console.log(`   模式: ${mode}`);
  console.log(`   表名: ${table}`);
  console.log(`   总食谱数: ${totalRecipes}`);
  console.log(`   已有骨架数: ${existingDrafts.length}`);
  console.log(`   食材数: ${ingredients.length}`);
  console.log(`   厨具数: ${tools.length}`);
  console.log(`   可用调料数: ${Object.values(seasonings || {}).filter(Boolean).length}`);
  console.log('');
  
  logger.info('开始食谱匹配', {
    mode,
    table,
    totalRecipes,
    ingredientsCount: ingredients.length,
    toolsCount: tools.length,
    availableSeasoningsCount: Object.values(seasonings || {}).filter(Boolean).length
  });
  
  // 匹配过程统计
  const matchingStats = {
    totalRecipes: totalRecipes,
    matchedIngredients: 0,
    matchedTools: 0,
    matchedSeasonings: {
      immediate: 0,
      nearby: 0
    }
  };

  // 第一步：匹配食材
  const recipesAfterIngredientMatch = [];
  for (const r of rows) {
    const recipeObj = {
      id: r.id,
      name: r.name,
      description: r.description || '',
      calories: r.calories || 0,
      cookTime: r.cookTime || '',
      servings: r.servings || '',
      difficulty: r.difficulty || '简单',
      mainIngredients: JSON.parse(r.mainIngredients || '[]'),
      allIngredients: JSON.parse(r.allIngredients || '[]'),
      steps: JSON.parse(r.steps || '[]'),
      tips: r.tips || '',
      cookedCount: r.cookedCount || 0,
      tools: JSON.parse(r.tools || '[]'),
      originalTools: JSON.parse(r.originalTools || '[]'),
    };

    // 只检查食材匹配（简化版，复用部分classifyRecipe逻辑）
    const mainIngredients = Array.isArray(recipeObj.mainIngredients) ? recipeObj.mainIngredients : [];
    const allIngredients = Array.isArray(recipeObj.allIngredients) ? recipeObj.allIngredients : [];

    const coreMeatCutTokens = new Map();
    for (const entry of allIngredients) {
      const rawName = extractIngredientName(entry);
      if (!rawName) continue;
      const meatTokens = extractMeatTokens(rawName);
      for (const t of meatTokens) {
        if (t.cut) coreMeatCutTokens.set(`${t.parent}:${t.cut}`, t);
      }
    }
    
    let meatMismatch = false;
    for (const ing of mainIngredients) {
      const meatTokens = extractMeatTokens(ing);
      if (meatTokens.length > 0) {
        const ok = meatTokens.some((t) => isMeatRequirementSatisfied(t, userInv));
        if (!ok) {
          meatMismatch = true;
          break;
        }
      }
      const n = normalizeIngredientName(ing);
      if (n && !userInv.normalizedIngredientSet.has(n)) {
        meatMismatch = true;
        break;
      }
    }

    for (const t of coreMeatCutTokens.values()) {
      if (!isMeatRequirementSatisfied(t, userInv)) {
        meatMismatch = true;
        break;
      }
    }

    if (!meatMismatch) {
      recipesAfterIngredientMatch.push(recipeObj);
    }
  }
  matchingStats.matchedIngredients = recipesAfterIngredientMatch.length;
  
  // 直接控制台输出
  console.log('✅ 食材匹配完成');
  console.log(`   匹配成功: ${matchingStats.matchedIngredients} 道`);
  console.log(`   成功率: ${(matchingStats.matchedIngredients / totalRecipes * 100).toFixed(1)}%`);
  console.log('');
  
  logger.info('食材匹配完成', {
    matchedIngredients: matchingStats.matchedIngredients,
    successRate: (matchingStats.matchedIngredients / totalRecipes * 100).toFixed(1) + '%'
  });

  // 第二步：匹配厨具
  // 直接控制台输出
  console.log('🔪 正在匹配厨具...');
  console.log(`   输入食谱数: ${matchingStats.matchedIngredients} 道`);
  
  logger.info('正在匹配厨具...', {
    inputRecipes: matchingStats.matchedIngredients
  });
  const recipesAfterToolMatch = [];
  for (const recipeObj of recipesAfterIngredientMatch) {
    const requiredTools = inferRequiredToolsFromSteps(recipeObj);
    let toolMatch = true;
    for (const t of requiredTools) {
      if (!userToolTokens.has(t)) {
        toolMatch = false;
        break;
      }
    }
    if (toolMatch) {
      recipesAfterToolMatch.push({
        ...recipeObj,
        requiredTools
      });
    }
  }
  matchingStats.matchedTools = recipesAfterToolMatch.length;
  
  // 直接控制台输出
  console.log('✅ 厨具匹配完成');
  console.log(`   匹配成功: ${matchingStats.matchedTools} 道`);
  console.log(`   成功率: ${(matchingStats.matchedTools / matchingStats.matchedIngredients * 100).toFixed(1)}%`);
  console.log('');
  
  logger.info('厨具匹配完成', {
    matchedTools: matchingStats.matchedTools,
    successRate: (matchingStats.matchedTools / matchingStats.matchedIngredients * 100).toFixed(1) + '%'
  });

  // 第三步：匹配调料并分类
  // 直接控制台输出
  console.log('🧂 正在匹配调料并分类...');
  console.log(`   输入食谱数: ${matchingStats.matchedTools} 道`);
  
  logger.info('正在匹配调料并分类...', {
    inputRecipes: matchingStats.matchedTools
  });
  const filtered = [];
  for (const recipeObj of recipesAfterToolMatch) {
    const info = classifyRecipe(
      recipeObj, 
      userInv, 
      userSeasoningsAvailable, 
      seasoningUniverse, 
      userToolTokens
    );
    if (!info) continue;
    
    // 增强大师贴士 - 添加缺少的次要调料提示
    const enhancedTips = generateTipsWithMissingSeasonings(
      info.secondarySeasoningsMissing, 
      recipeObj.tips
    );
    
    const recipeWithDetails = {
      ...recipeObj,
      tools: info.requiredTools,
      category: info.category,
      missing: info.missing,
      tips: enhancedTips,
      // 添加调料匹配详情
      seasoningMatch: {
        mainSeasoningsMissing: info.mainSeasoningsMissing,
        secondarySeasoningsMissing: info.secondarySeasoningsMissing
      }
    };
    
    filtered.push(recipeWithDetails);
    
    // 更新统计信息
    if (info.category === '立即下厨') {
      matchingStats.matchedSeasonings.immediate++;
    } else if (info.category === '顺路买点') {
      matchingStats.matchedSeasonings.nearby++;
    }
  }

  let total = filtered.length;
  let paged = filtered.slice(offset, offset + pageSize);
  
  // 如果有匹配的骨架菜谱，将它们添加到结果中（但不重复）
  if (existingDrafts.length > 0) {
    const existingIds = new Set(filtered.map(r => r.id));
    for (const draft of existingDrafts) {
      if (!existingIds.has(draft.id)) {
        const draftObj = {
          id: draft.id,
          name: draft.name,
          description: draft.description || '',
          calories: draft.calories || 0,
          cookTime: draft.cookTime || '',
          servings: draft.servings || '',
          difficulty: draft.difficulty || '简单',
          mainIngredients: JSON.parse(draft.mainIngredients || '[]'),
          allIngredients: JSON.parse(draft.allIngredients || '[]'),
          steps: JSON.parse(draft.steps || '[]'),
          tips: draft.tips || '',
          cookedCount: draft.cookedCount || 0,
          tools: JSON.parse(draft.tools || '[]'),
          originalTools: JSON.parse(draft.originalTools || '[]'),
          category: '立即下厨',
          isDraft: true,
          seasoningMatch: {
            mainSeasoningsMissing: [],
            secondarySeasoningsMissing: []
          }
        };
        filtered.push(draftObj);
      }
    }
    
    // 重新分页
    total = filtered.length;
    paged = filtered.slice(offset, offset + pageSize);
    
    console.log(`📥 添加了 ${existingDrafts.length} 道匹配的骨架菜谱`);
  }
  
  // 直接控制台输出
  console.log('✅ 调料匹配和分类完成');
  console.log(`   总匹配数: ${filtered.length} 道`);
  console.log(`   立即下厨: ${matchingStats.matchedSeasonings.immediate} 道`);
  console.log(`   顺路买点: ${matchingStats.matchedSeasonings.nearby} 道`);
  console.log(`   立即下厨占比: ${matchingStats.matchedSeasonings.immediate > 0 ? 
      (matchingStats.matchedSeasonings.immediate / matchingStats.matchedTools * 100).toFixed(1) + '%' : '0%'}`);
  console.log(`   顺路买点占比: ${matchingStats.matchedSeasonings.nearby > 0 ? 
      (matchingStats.matchedSeasonings.nearby / matchingStats.matchedTools * 100).toFixed(1) + '%' : '0%'}`);
  console.log('');
  
  console.log('📤 匹配结果返回');
  console.log(`   页码: ${page}`);
  console.log(`   每页条数: ${pageSize}`);
  console.log(`   总条数: ${total}`);
  console.log(`   是否有更多: ${offset + paged.length < total ? '是' : '否'}`);
  console.log('============================================================');
  console.log('');
  
  logger.info('调料匹配和分类完成', {
    totalMatched: filtered.length,
    immediate: matchingStats.matchedSeasonings.immediate,
    nearby: matchingStats.matchedSeasonings.nearby,
    immediateRate: matchingStats.matchedSeasonings.immediate > 0 ? 
      (matchingStats.matchedSeasonings.immediate / matchingStats.matchedTools * 100).toFixed(1) + '%' : '0%',
    nearbyRate: matchingStats.matchedSeasonings.nearby > 0 ? 
      (matchingStats.matchedSeasonings.nearby / matchingStats.matchedTools * 100).toFixed(1) + '%' : '0%'
  });
  
  logger.info('匹配结果返回', {
    page,
    pageSize,
    total,
    hasMore: offset + paged.length < total,
    matchingStats
  });
  
  // ====== 骨架补位逻辑：如果返回的菜谱数量不足，调用 AI 生成骨架并入库 ======
  // 1. 第1页：立即下厨不足10道时补位
  // 2. 任何页码：返回的菜谱数量不足 pageSize 时补位
  const matchedDraftCount = existingDrafts.length;
  const totalImmediateWithDrafts = matchingStats.matchedSeasonings.immediate + matchedDraftCount;
  const firstPageNeedBackfill = totalImmediateWithDrafts < 10 && ingredients && ingredients.length > 0;
  
  // 任何页码：如果当前页返回的菜谱数量不足 pageSize，说明数据库中没有更多了，需要AI生成
  const currentPageNeedBackfill = paged.length < pageSize && ingredients && ingredients.length > 0;
  const needBackfill = firstPageNeedBackfill || currentPageNeedBackfill;
  
  if (needBackfill) {
    try {
      // 计算需要生成的数量
      let backfillCount;
      if (firstPageNeedBackfill) {
        backfillCount = 10 - totalImmediateWithDrafts;
      } else {
        // 当前页不足 pageSize，需要生成足够的菜谱填充当前页
        backfillCount = pageSize - paged.length + (pageSize - 1); // 多生成一页的量，避免频繁触发
        backfillCount = Math.max(3, Math.min(backfillCount, 10)); // 至少3道，最多10道
      }
      console.log(`[骨架补位] 第${page}页 ${firstPageNeedBackfill ? '首屏' : '分页'}补位：当前${paged.length}道，需要生成${backfillCount}道骨架...`);
      
      // 调用 Agent A 生成骨架
      const drafts = await aiService.generateDraftRecipes({
        kind: 'ready',
        ingredients,
        seasonings: seasonings || {},
        tools: tools || [],
        count: backfillCount,
        isOutrageous: mode === 'outrageous'
      });
      
      if (drafts && drafts.length > 0) {
        // 骨架入库
        const table = mode === 'outrageous' ? 'OutrageousRecipes' : 'StandardRecipes';
        const stmt = db.db.prepare(`
          INSERT OR REPLACE INTO ${table} (
            id, name, mainIngredients, requiredSeasonings, optionalSeasonings, tools, originalTools,
            allIngredients, steps, category, isDraft, cookedCount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
        `);
        
        for (const draft of drafts) {
          try {
            stmt.run(
              draft.id,
              draft.name,
              JSON.stringify(draft.mainIngredients || []),
              JSON.stringify(draft.requiredSeasonings || []),
              JSON.stringify(draft.optionalSeasonings || []),
              JSON.stringify(draft.tools || []),
              JSON.stringify(draft.originalTools || draft.tools || []),
              JSON.stringify([]),
              JSON.stringify([]),
              draft.category || '立即下厨'
            );
          } catch (e) {
            console.error(`[骨架补位] 保存失败: ${draft.name}`, e.message);
          }
        }
        
        console.log(`[骨架补位] 完成，已入库 ${drafts.length} 道骨架菜谱`);
        
        // 重新查询刚入库的骨架菜谱，追加到返回结果
        const newDrafts = db.db.prepare(`
          SELECT * FROM ${table} WHERE isDraft = 1 ORDER BY RANDOM() LIMIT ?
        `).all(backfillCount);
        
        if (newDrafts && newDrafts.length > 0) {
          const formattedDrafts = newDrafts.map(r => ({
            id: r.id,
            name: r.name,
            mainIngredients: JSON.parse(r.mainIngredients || '[]'),
            requiredSeasonings: JSON.parse(r.requiredSeasonings || '[]'),
            optionalSeasonings: JSON.parse(r.optionalSeasonings || '[]'),
            tools: JSON.parse(r.tools || '[]'),
            originalTools: JSON.parse(r.originalTools || '[]'),
            category: r.category,
            isDraft: true,
            allIngredients: [],
            steps: [],
            description: '',
            difficulty: '',
            cookTime: '',
            servings: '',
            calories: null,
            tips: '',
            note: ''
          }));
          
          // 追加到返回结果
          paged = [...paged, ...formattedDrafts];
          total = total + formattedDrafts.length;
          // 分页补位时，hasMore 保持不变（可以让用户继续加载更多）
          // 首屏补位时，设置 hasMore = false（避免重复触发）
          if (!firstPageNeedBackfill) {
            hasMore = true;
          }
        }
      }
    } catch (e) {
      console.error(`[骨架补位] 失败:`, e.message);
    }
  }
  // ====== 骨架补位逻辑结束 ======
  
  const responseData = {
    success: true,
    recipes: paged,
    total,
    page,
    pageSize,
    hasMore: offset + paged.length < total,
    matchingStats
  };
  
  // 存储缓存（只对第一页请求生效）
  if (page === 1) {
    matchCache.set(cacheKey, {
      timestamp: Date.now(),
      data: responseData
    });
    console.log(`[匹配缓存存储] 缓存已更新`);
  }
  
  res.json(responseData);
}));

/**
 * POST /api/match/ai-generate
 * 使用 AI 生成菜谱
 */
router.post('/ai-generate', asyncHandler(async (req, res) => {
  const { ingredients, seasonings, tools, mode = 'standard' } = req.body;
  
  if (!ingredients || ingredients.length === 0) {
    throw new AppError('食材列表不能为空', 400, 'BAD_REQUEST');
  }
  
  logger.info('AI 生成菜谱请求', { ingredients, mode });
  
  // 调用 AI 服务
  const result = await aiService.generateRecipe({
    ingredients,
    seasonings: Object.keys(seasonings || {}).filter(k => seasonings[k]),
    tools: tools || [],
    mode,
  });
  
  res.json({
    success: true,
    recipes: result.recipes || [],
  });
}));

module.exports = router;
