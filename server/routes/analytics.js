/**
 * 统计分析路由模块
 * 提供数据统计和监控功能
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { logger } = require('../middleware/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/analytics
 * 获取综合统计数据
 */
router.get('/', asyncHandler(async (req, res) => {
  const stats = {
    recipes: {
      standard: db.get('SELECT COUNT(*) as count FROM StandardRecipes').count,
      outrageous: db.get('SELECT COUNT(*) as count FROM OutrageousRecipes').count,
      total: db.get(`
        SELECT 
          (SELECT COUNT(*) FROM StandardRecipes) + 
          (SELECT COUNT(*) FROM OutrageousRecipes) as total
      `).total
    },
    inventory: {
      total: db.get('SELECT COUNT(*) as count FROM UserInventory').count,
      byStatus: {
        normal: db.get("SELECT COUNT(*) as count FROM UserInventory WHERE status = 'normal'").count,
        yellow: db.get("SELECT COUNT(*) as count FROM UserInventory WHERE status = 'yellow'").count,
        red: db.get("SELECT COUNT(*) as count FROM UserInventory WHERE status = 'red'").count
      },
      byType: {
        ingredient: db.get("SELECT COUNT(*) as count FROM UserInventory WHERE type = 'ingredient'").count,
        seasoning: db.get("SELECT COUNT(*) as count FROM UserInventory WHERE type = 'seasoning'").count,
        tool: db.get("SELECT COUNT(*) as count FROM UserInventory WHERE type = 'tool'").count
      }
    },
    popular: db.query(`
      SELECT name, cookedCount, difficulty, cookTime 
      FROM StandardRecipes
      WHERE cookedCount > 0
      ORDER BY cookedCount DESC
      LIMIT 10
    `),
    recent: db.query(`
      SELECT name, lastCookedDate, difficulty 
      FROM StandardRecipes
      WHERE lastCookedDate IS NOT NULL
      ORDER BY lastCookedDate DESC
      LIMIT 5
    `),
    cooking: {
      total: db.get(`
        SELECT SUM(cookedCount) as total FROM (
          SELECT cookedCount FROM StandardRecipes
          UNION ALL
          SELECT cookedCount FROM OutrageousRecipes
        )
      `).total,
      thisWeek: db.get(`
        SELECT SUM(cookedCount) as total FROM (
          SELECT cookedCount FROM StandardRecipes WHERE lastCookedDate >= datetime('now', '-7 days')
          UNION ALL
          SELECT cookedCount FROM OutrageousRecipes WHERE lastCookedDate >= datetime('now', '-7 days')
        )
      `).total || 0
    }
  };
  
  res.json({
    success: true,
    stats,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/analytics/recipes
 * 菜谱详细统计
 */
router.get('/recipes', asyncHandler(async (req, res) => {
  const { type = 'all' } = req.query;
  
  let query;
  if (type === 'standard') {
    query = `SELECT * FROM StandardRecipes`;
  } else if (type === 'outrageous') {
    query = `SELECT * FROM OutrageousRecipes`;
  } else {
    query = `
      SELECT 'standard' as type, * FROM StandardRecipes
      UNION ALL
      SELECT 'outrageous' as type, * FROM OutrageousRecipes
    `;
  }
  
  const recipes = db.query(query);
  
  // 计算统计
  const stats = {
    total: recipes.length,
    byDifficulty: {
      '简单': recipes.filter(r => r.difficulty === '简单').length,
      '中等': recipes.filter(r => r.difficulty === '中等').length,
      '困难': recipes.filter(r => r.difficulty === '困难').length
    },
    avgCalories: recipes.reduce((sum, r) => sum + (r.calories || 0), 0) / recipes.length || 0,
    avgCookTime: recipes.reduce((sum, r) => {
      const match = (r.cookTime || '').match(/(\d+)/);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0) / recipes.length || 0
  };
  
  res.json({
    success: true,
    count: recipes.length,
    stats,
    recipes: recipes.slice(0, 50) // 限制返回数量
  });
}));

/**
 * GET /api/analytics/inventory
 * 库存详细统计
 */
router.get('/inventory', asyncHandler(async (req, res) => {
  const items = db.query('SELECT * FROM UserInventory ORDER BY frequency DESC');
  
  const stats = {
    total: items.length,
    expiringSoon: items.filter(i => i.status === 'red' || i.status === 'yellow').length,
    topIngredients: items.slice(0, 10).map(i => ({
      name: i.name,
      frequency: i.frequency,
      type: i.type
    }))
  };
  
  res.json({
    success: true,
    stats,
    items
  });
}));

/**
 * GET /api/analytics/trends
 * 获取趋势数据（最近 7 天）
 */
router.get('/trends', asyncHandler(async (req, res) => {
  const days = 7;
  const trends = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const cooked = db.get(`
      SELECT COUNT(*) as count FROM StandardRecipes 
      WHERE DATE(lastCookedDate) = ?
    `, [dateStr]).count || 0;
    
    trends.push({
      date: dateStr,
      cooked
    });
  }
  
  res.json({
    success: true,
    trends
  });
}));

/**
 * GET /api/analytics/export
 * 导出数据（CSV 格式）
 */
router.get('/export', asyncHandler(async (req, res) => {
  const { type = 'recipes' } = req.query;
  
  let data;
  let filename;
  
  if (type === 'recipes') {
    data = db.query('SELECT * FROM StandardRecipes');
    filename = 'recipes-export.csv';
  } else if (type === 'inventory') {
    data = db.query('SELECT * FROM UserInventory');
    filename = 'inventory-export.csv';
  } else {
    data = [];
  }
  
  // 转换为 CSV
  if (data.length > 0) {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(v => 
        typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } else {
    res.json({ success: true, message: '无数据可导出' });
  }
}));

module.exports = router;
