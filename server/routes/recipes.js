/**
 * 菜谱路由模块
 * 处理菜谱相关的 CRUD 和匹配操作
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const aiService = require('../services/aiService');
const { logger } = require('../middleware/logger');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

/**
 * 保存菜谱到库
 */
function saveToLibrary(recipe, isOutrageous = false) {
  try {
    const table = isOutrageous ? 'OutrageousRecipes' : 'StandardRecipes';
    const id = recipe.id || `${isOutrageous ? 'out' : 'std'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const stmt = db.db.prepare(`
      INSERT OR REPLACE INTO ${table} (
        id, name, description, calories, cookTime, servings,
        difficulty, mainIngredients, allIngredients, steps, tips,
        professionalAnalysis, cookedCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      recipe.name,
      recipe.description || '',
      recipe.calories || 0,
      recipe.cookTime || '',
      recipe.servings || '',
      recipe.difficulty || '简单',
      JSON.stringify(recipe.mainIngredients || []),
      JSON.stringify(recipe.allIngredients || []),
      JSON.stringify(recipe.steps || []),
      recipe.tips || '',
      recipe.professionalAnalysis || '',
      0
    );
    
    logger.db(`保存菜谱：${recipe.name}`, { id, isOutrageous });
    return id;
  } catch (error) {
    logger.error('保存菜谱失败', { recipe: recipe.name, error: error.message });
    return null;
  }
}

/**
 * 三段式分发算法（优化版）
 */
function matchRecipes(userIngredients, userSeasonings, isOutrageous = false) {
  const table = isOutrageous ? 'OutrageousRecipes' : 'StandardRecipes';
  
  // 使用索引优化的查询
  const recipes = db.query(`SELECT * FROM ${table} ORDER BY cookedCount DESC`);
  
  // 获取过期警告食材
  const inventory = db.query(`SELECT name FROM UserInventory WHERE status = 'red'`);
  const redIngredients = new Set(inventory.map(i => i.name));

  const result = {
    ready: [],
    simpleBuy: [],
    difficultBuy: []
  };

  for (const r of recipes) {
    const mainIngs = JSON.parse(r.mainIngredients || '[]');
    const seasonings = JSON.parse(r.seasonings || r.allIngredients || '[]');
    
    let missingCore = [];
    let missingNonCore = [];
    let hasExpiredWarning = false;

    // 检查主料
    mainIngs.forEach(ing => {
      if (!userIngredients.includes(ing)) {
        missingCore.push(ing);
      }
      if (redIngredients.has(ing)) {
        hasExpiredWarning = true;
      }
    });

    // 检查调料
    seasonings.forEach(s => {
      if (s.isRequired) {
        const sName = s.name.split(' ')[0];
        if (!userSeasonings.includes(sName)) {
          missingNonCore.push(sName);
        }
      }
    });

    const recipeInfo = {
      ...r,
      ingredients: JSON.parse(r.ingredients || r.allIngredients || '[]'),
      seasonings,
      steps: JSON.parse(r.steps || '[]'),
      mainIngredients: mainIngs,
      is_expired_warning: hasExpiredWarning
    };

    // 分类逻辑
    if (missingCore.length === 0) {
      if (missingNonCore.length === 0) {
        result.ready.push(recipeInfo);
      } else if (missingNonCore.length <= 2) {
        recipeInfo.missing = missingNonCore;
        result.simpleBuy.push(recipeInfo);
      } else {
        recipeInfo.missing = missingNonCore;
        result.difficultBuy.push(recipeInfo);
      }
    } else {
      recipeInfo.missing = [...missingCore, ...missingNonCore];
      result.difficultBuy.push(recipeInfo);
    }
  }

  // 排序：过期警告优先
  const sortByExpired = (a, b) => (b.is_expired_warning ? 1 : 0) - (a.is_expired_warning ? 1 : 0);
  result.ready.sort(sortByExpired);
  result.simpleBuy.sort(sortByExpired);
  result.difficultBuy.sort(sortByExpired);

  return result;
}

// ==================== 路由定义 ====================

/**
 * GET /api/recipes
 * 获取菜谱库
 * 查询参数：type (standard|outrageous), limit, difficulty, search
 */
router.get('/', asyncHandler(async (req, res) => {
  const { 
    type = 'standard', 
    limit = 100, 
    difficulty,
    search 
  } = req.query;
  
  const table = type === 'outrageous' ? 'OutrageousRecipes' : 'StandardRecipes';
  
  // 构建查询
  let query = `SELECT * FROM ${table}`;
  const params = [];
  const conditions = [];

  if (difficulty) {
    conditions.push('difficulty = ?');
    params.push(difficulty);
  }

  if (search) {
    conditions.push('name LIKE ?');
    params.push(`%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY cookedCount DESC LIMIT ?';
  params.push(parseInt(limit));

  const recipes = db.query(query, params);

  res.json({
    success: true,
    count: recipes.length,
    recipes: recipes.map(r => ({
      ...r,
      ingredients: JSON.parse(r.ingredients || r.allIngredients || '[]'),
      seasonings: JSON.parse(r.seasonings || '[]'),
      steps: JSON.parse(r.steps || '[]'),
      mainIngredients: JSON.parse(r.mainIngredients || '[]')
    }))
  });
}));

/**
 * GET /api/recipes/:id
 * 获取单个菜谱详情
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type = 'standard' } = req.query;
  
  const table = type === 'outrageous' ? 'OutrageousRecipes' : 'StandardRecipes';
  
  const recipe = db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  
  if (!recipe) {
    throw AppError.notFound('菜谱不存在');
  }

  res.json({
    success: true,
    recipe: {
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients || recipe.allIngredients || '[]'),
      seasonings: JSON.parse(recipe.seasonings || '[]'),
      steps: JSON.parse(recipe.steps || '[]'),
      mainIngredients: JSON.parse(recipe.mainIngredients || '[]')
    }
  });
}));

/**
 * POST /api/match
 * 匹配菜谱（核心算法）
 */
router.post('/match', asyncHandler(async (req, res) => {
  const { 
    ingredients = [], 
    seasonings = {}, 
    tools = [],
    isOutrageous = false 
  } = req.body;
  
  logger.info('匹配菜谱请求', { 
    ingredients: ingredients.length,
    isOutrageous 
  });
  
  // 更新食材点击频率（批量优化）
  if (ingredients.length > 0) {
    db.transaction(() => {
      const updateFreq = db.db.prepare(`
        INSERT OR REPLACE INTO UserInventory (id, name, type, frequency, status)
        VALUES (?, ?, 'ingredient', 
          COALESCE((SELECT frequency FROM UserInventory WHERE name = ?), 0) + 1,
          COALESCE((SELECT status FROM UserInventory WHERE name = ?), 'normal')
        )
      `);
      
      for (const name of ingredients) {
        updateFreq.run(`${name}-${Date.now()}`, name, name, name);
      }
    });
  }

  // 检索本地库
  const localResult = matchRecipes(ingredients, Object.keys(seasonings), isOutrageous);
  const totalLocal = localResult.ready.length + localResult.simpleBuy.length + localResult.difficultBuy.length;

  // 如果本地库不足，调用 AI 生成
  if (totalLocal < 5) {
    logger.info('本地库不足，调用 AI 补充', { local: totalLocal });
    
    try {
      const aiRecipes = await aiService.generateRecipe(ingredients, seasonings, isOutrageous);
      
      aiRecipes.forEach(recipe => {
        const id = saveToLibrary(recipe, isOutrageous);
        if (id) {
          localResult.ready.push({
            ...recipe,
            id,
            is_expired_warning: false
          });
        }
      });
      
      logger.info('AI 生成菜谱成功', { count: aiRecipes.length });
    } catch (aiError) {
      logger.warn('AI 生成失败，仅返回本地库', { error: aiError.message });
      // 不中断请求，继续返回本地结果
    }
  }

  res.json({
    success: true,
    recipes: localResult,
    stats: {
      ready: localResult.ready.length,
      simpleBuy: localResult.simpleBuy.length,
      difficultBuy: localResult.difficultBuy.length,
      total: totalLocal
    }
  });
}));

/**
 * POST /api/recipes/:id/cooked
 * 标记菜谱已烹饪
 */
router.post('/:id/cooked', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isOutrageous = false } = req.body;
  
  const table = isOutrageous ? 'OutrageousRecipes' : 'StandardRecipes';
  
  const result = db.run(`
    UPDATE ${table}
    SET cookedCount = cookedCount + 1, lastCookedDate = ?
    WHERE id = ?
  `, [new Date().toISOString(), id]);

  if (result.changes === 0) {
    throw AppError.notFound('菜谱不存在');
  }
  
  const recipe = db.get(`SELECT cookedCount FROM ${table} WHERE id = ?`, [id]);
  
  logger.info('标记菜谱已烹饪', { id, count: recipe?.cookedCount });
  
  res.json({
    success: true,
    count: recipe?.cookedCount || 1
  });
}));

/**
 * DELETE /api/recipes/:id
 * 删除菜谱
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type = 'standard' } = req.query;
  
  const table = type === 'outrageous' ? 'OutrageousRecipes' : 'StandardRecipes';
  
  const result = db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  
  if (result.changes === 0) {
    throw AppError.notFound('菜谱不存在');
  }
  
  logger.info('删除菜谱', { id, type });
  
  res.json({
    success: true,
    message: '菜谱已删除'
  });
}));

/**
 * POST /api/regenerate-recipe
 * 重新生成菜谱
 */
router.post('/regenerate-recipe', asyncHandler(async (req, res) => {
  const { id, name, mode } = req.body;
  
  logger.info('重新生成菜谱请求', { id, name });
  
  // 查询原菜谱信息
  const table = mode === 'outrageous' ? 'OutrageousRecipes' : 'StandardRecipes';
  const originalRecipe = db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  
  if (!originalRecipe) {
    throw AppError.notFound('菜谱不存在');
  }
  
  try {
    // 使用AI生成新的菜谱详情，使用第二段提示词
    const result = await aiService.generateRecipeDetail(
      {
        name: originalRecipe.name,
        mainIngredients: JSON.parse(originalRecipe.mainIngredients || '[]'),
        tools: JSON.parse(originalRecipe.tools || '[]'),
        category: originalRecipe.category || '立即下厨'
      },
      {
        ingredients: JSON.parse(originalRecipe.mainIngredients || '[]'),
        seasonings: {}, // 从原菜谱中提取调料
        tools: JSON.parse(originalRecipe.tools || '[]')
      }
    );
    
    if (!result.ok) {
      logger.error('重新生成菜谱失败', { id, reason: result.reason });
      return res.json({
        ok: false,
        reason: result.reason || '重新生成失败'
      });
    }
    
    const regeneratedRecipe = result.recipe;
    
    // 更新数据库
    const stmt = db.db.prepare(`
      UPDATE ${table} SET 
        description = ?, 
        difficulty = ?, 
        cookTime = ?, 
        servings = ?, 
        calories = ?, 
        allIngredients = ?, 
        steps = ?, 
        tips = ?, 
        mainIngredients = ?, 
        requiredSeasonings = ?, 
        optionalSeasonings = ?, 
        tools = ?
      WHERE id = ?
    `);
    
    stmt.run(
      regeneratedRecipe.description || '',
      regeneratedRecipe.difficulty || '中等',
      regeneratedRecipe.cookTime || '未知',
      regeneratedRecipe.servings || '1-2 人份',
      regeneratedRecipe.calories || 0,
      JSON.stringify(regeneratedRecipe.allIngredients || []),
      JSON.stringify(regeneratedRecipe.steps || []),
      regeneratedRecipe.tips || '',
      JSON.stringify(regeneratedRecipe.mainIngredients || JSON.parse(originalRecipe.mainIngredients || '[]')),
      JSON.stringify(regeneratedRecipe.requiredSeasonings || []),
      JSON.stringify(regeneratedRecipe.optionalSeasonings || []),
      JSON.stringify(regeneratedRecipe.originalTools || JSON.parse(originalRecipe.tools || '[]')),
      id
    );
    
    logger.info('重新生成菜谱成功', { id, name: regeneratedRecipe.name });
    
    // 返回更新后的菜谱
    const updatedRecipe = db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    
    res.json({
      ok: true,
      recipe: {
        ...updatedRecipe,
        ingredients: JSON.parse(updatedRecipe.ingredients || updatedRecipe.allIngredients || '[]'),
        seasonings: JSON.parse(updatedRecipe.seasonings || '[]'),
        steps: JSON.parse(updatedRecipe.steps || '[]'),
        mainIngredients: JSON.parse(updatedRecipe.mainIngredients || '[]')
      }
    });
  } catch (error) {
    logger.error('重新生成菜谱出错', { id, error: error.message });
    return res.json({
      ok: false,
      reason: `重新生成失败: ${error.message}`
    });
  }
}));

/**
 * POST /api/recipes/debug
 * 调试专用：获取AgentA和AgentB的原始输出
 */
router.post('/debug', asyncHandler(async (req, res) => {
  const { 
    ingredients = [], 
    seasonings = {}, 
    tools = [] 
  } = req.body;
  
  logger.info('调试菜谱生成请求', { 
    ingredients: ingredients.length,
    seasonings: Object.keys(seasonings).length
  });
  
  try {
    const debugInfo = await aiService.generateDebugInfo({ ingredients, seasonings, tools });
    
    res.json(debugInfo);
  } catch (error) {
    logger.error('调试菜谱生成失败', { error: error.message });
    res.json({
      "调试说明": "生成失败",
      "错误信息": error.message,
      "agent_a_原始骨架": [],
      "agent_b_最终菜谱": null
    });
  }
}));

module.exports = router;
