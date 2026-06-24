/**
 * 库存路由模块
 * 处理用户食材库存管理
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { logger } = require('../middleware/logger');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { normalizeText } = require('../utils/ingredientParser');

/**
 * GET /api/inventory
 * 获取库存列表
 * 查询参数：type (ingredient|seasoning|tool), status, limit
 */
router.get('/', asyncHandler(async (req, res) => {
  const { type, status, limit = 1000 } = req.query;
  
  const parsedLimit = parseInt(limit);

  let query = 'SELECT * FROM UserInventory';
  const params = [];
  const conditions = [];

  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY frequency DESC, name ASC LIMIT ?';
  params.push(parsedLimit);

  const items = db.query(query, params);
  
  res.json({
    success: true,
    count: items.length,
    items
  });
}));

/**
 * GET /api/inventory/expiring
 * 获取即将过期的食材
 */
router.get('/expiring', asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + parseInt(days));
  
  const items = db.query(`
    SELECT * FROM UserInventory 
    WHERE expiryDate IS NOT NULL 
      AND expiryDate <= ?
      AND status != 'red'
    ORDER BY expiryDate ASC
  `, [expiryDate.toISOString()]);
  
  res.json({
    success: true,
    count: items.length,
    items
  });
}));

/**
 * POST /api/inventory/status
 * 标记临期（前端双击食材使用）
 * Body: { ingredientName: string, isExpiring: boolean }
 */
router.post('/status', asyncHandler(async (req, res) => {
  const { ingredientName, isExpiring } = req.body;

  if (!ingredientName || typeof ingredientName !== 'string') {
    throw AppError.badRequest('ingredientName 必须是字符串');
  }

  const statusValue = isExpiring ? 'yellow' : 'normal';
  const normalizedName = normalizeText(ingredientName);

  const updated = db.run(
    'UPDATE UserInventory SET status = ?, updatedAt = datetime("now") WHERE name = ?',
    [statusValue, normalizedName]
  );

  if (updated.changes === 0) {
    db.run(
      `INSERT INTO UserInventory (id, name, type, frequency, status)
       VALUES (?, ?, 'ingredient', 0, ?)`,
      [`ingredient-${normalizedName}`, normalizedName, statusValue]
    );
  }

  res.json({ success: true });
}));

/**
 * POST /api/inventory/bumpClick
 * 更新食材点击频率
 * Body: { name: string, type: string }
 */
router.post('/bumpClick', asyncHandler(async (req, res) => {
  const { name, type = 'ingredient' } = req.body || {};
  const normalizedName = normalizeText(name).trim();
  
  if (!normalizedName) {
    throw AppError.badRequest('name 不能为空');
  }

  const normalizedType = normalizeText(type).trim() || 'ingredient';
  
  // 使用 INSERT OR REPLACE 来处理新增和更新
  db.run(`
    INSERT INTO UserInventory (id, name, type, frequency, status)
    VALUES (?, ?, ?, 1, 'normal')
    ON CONFLICT(name) DO UPDATE SET 
      frequency = frequency + 1,
      type = excluded.type,
      updatedAt = datetime('now')
  `, [`${normalizedType}-${normalizedName}`, normalizedName, normalizedType]);

  res.json({ success: true });
}));

/**
 * POST /api/inventory/update
 * 批量更新库存
 */
router.post('/update', asyncHandler(async (req, res) => {
  const { items } = req.body;
  
  if (!Array.isArray(items) || items.length === 0) {
    throw AppError.badRequest('库存数据必须是非空数组');
  }

  const insert = db.db.prepare(`
    INSERT OR REPLACE INTO UserInventory (
      id, name, type, frequency, status, quantity, unit, expiryDate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const runTransaction = db.db.transaction((itemList) => {
    let inserted = 0;
    for (const item of itemList) {
      insert.run(
        item.id || `${item.type}-${item.name}`,
        normalizeText(item.name),
        item.type || 'ingredient',
        item.frequency || 0,
        item.status || 'normal',
        item.quantity || null,
        item.unit || null,
        item.expiryDate || null
      );
      inserted++;
    }
    return inserted;
  });

  const count = runTransaction(items);
  
  logger.info('更新库存', { count });
  
  res.json({ 
    success: true,
    count
  });
}));

/**
 * POST /api/inventory/bulk-delete
 * 批量删除库存
 */
router.post('/bulk-delete', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    throw AppError.badRequest('ID 列表必须是非空数组');
  }

  const placeholders = ids.map(() => '?').join(',');

  const result = db.run(
    `DELETE FROM UserInventory WHERE id IN (${placeholders})`,
    ids
  );

  logger.info('批量删除库存', { requested: ids.length, deleted: result.changes });

  res.json({
    success: true,
    deleted: result.changes
  });
}));

/**
 * PUT /api/inventory/:id
 * 更新单个库存项
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, type, status, quantity, unit, expiryDate } = req.body;

  const updates = [];
  const params = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(normalizeText(name));
  }
  if (type !== undefined) {
    updates.push('type = ?');
    params.push(type);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (quantity !== undefined) {
    updates.push('quantity = ?');
    params.push(quantity);
  }
  if (unit !== undefined) {
    updates.push('unit = ?');
    params.push(unit);
  }
  if (expiryDate !== undefined) {
    updates.push('expiryDate = ?');
    params.push(expiryDate);
  }
  
  if (updates.length === 0) {
    throw AppError.badRequest('没有提供要更新的字段');
  }
  
  updates.push('updatedAt = datetime("now")');
  params.push(id);
  
  const result = db.run(
    `UPDATE UserInventory SET ${updates.join(', ')} WHERE id = ?`,
    params
  );
  
  if (result.changes === 0) {
    throw AppError.notFound('库存项不存在');
  }
  
  logger.info('更新库存项', { id, updates: updates.length });
  
  res.json({
    success: true,
    message: '更新成功'
  });
}));

/**
 * DELETE /api/inventory/:id
 * 删除单个库存项
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = db.run(`DELETE FROM UserInventory WHERE id = ?`, [id]);
  
  if (result.changes === 0) {
    throw AppError.notFound('库存项不存在');
  }
  
  logger.info('删除库存项', { id });
  
  res.json({
    success: true,
    message: '删除成功'
  });
}));

/**
 * POST /api/inventory/check-expiry
 * 检查并更新过期状态
 */
router.post('/check-expiry', asyncHandler(async (req, res) => {
  db.run(`
    UPDATE UserInventory 
    SET status = CASE
      WHEN expiryDate < datetime('now') THEN 'red'
      WHEN expiryDate < datetime('now', '+7 days') THEN 'yellow'
      ELSE 'normal'
    END
    WHERE expiryDate IS NOT NULL
  `);
  
  const stats = {
    red: db.get("SELECT COUNT(*) as count FROM UserInventory WHERE status = 'red'").count || 0,
    yellow: db.get("SELECT COUNT(*) as count FROM UserInventory WHERE status = 'yellow'").count || 0,
    normal: db.get("SELECT COUNT(*) as count FROM UserInventory WHERE status = 'normal'").count || 0
  };
  
  logger.info('检查过期状态', stats);
  
  res.json({
    success: true,
    stats
  });
}));

module.exports = router;
