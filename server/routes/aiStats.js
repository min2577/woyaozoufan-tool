/**
 * AI调用统计 API 路由
 * 提供AI调用统计、日志查询等功能
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// ========== AI统计概览 API ==========

router.get('/stats', (req, res) => {
  try {
    // 今日调用次数
    const todayCalls = db.get(`
      SELECT COUNT(*) as count
      FROM AILLMCalls
      WHERE date(createdAt) = date('now')
    `);

    // 今日成功次数
    const todaySuccess = db.get(`
      SELECT COUNT(*) as count
      FROM AILLMCalls
      WHERE date(createdAt) = date('now') AND status = 'success'
    `);

    // 今日错误次数
    const todayErrors = db.get(`
      SELECT COUNT(*) as count
      FROM AILLMCalls
      WHERE date(createdAt) = date('now') AND status = 'error'
    `);

    // 今日平均响应时间
    const avgDuration = db.get(`
      SELECT AVG(duration) as avg
      FROM AILLMCalls
      WHERE date(createdAt) = date('now') AND status = 'success'
    `);

    // 今日总消耗Token
    const todayTokens = db.get(`
      SELECT 
        COALESCE(SUM(promptTokens), 0) as promptTokens,
        COALESCE(SUM(completionTokens), 0) as completionTokens
      FROM AILLMCalls
      WHERE date(createdAt) = date('now')
    `);

    // 按模型统计调用量
    const byModel = db.query(`
      SELECT 
        model,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successCount,
        AVG(duration) as avgDuration
      FROM AILLMCalls
      WHERE date(createdAt) = date('now')
      GROUP BY model
    `);

    // 成功率
    const successRate = todayCalls?.count > 0 
      ? Math.round((todaySuccess?.count || 0) / todayCalls?.count * 100) 
      : 0;

    res.json({
      today: {
        calls: todayCalls?.count || 0,
        success: todaySuccess?.count || 0,
        errors: todayErrors?.count || 0,
        successRate,
        avgDuration: Math.round(avgDuration?.avg || 0),
        promptTokens: todayTokens?.promptTokens || 0,
        completionTokens: todayTokens?.completionTokens || 0,
        totalTokens: (todayTokens?.promptTokens || 0) + (todayTokens?.completionTokens || 0)
      },
      byModel: byModel || []
    });
  } catch (error) {
    console.error('AI Stats API error:', error);
    res.status(500).json({ error: '获取AI统计失败' });
  }
});

// ========== AI调用日志列表 API ==========

router.get('/logs', (req, res) => {
  try {
    const { page = 1, limit = 50, status = '', model = '' } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const offset = (pageNum - 1) * limitNum;

    let where = '1=1';
    const params = [];

    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    if (model) {
      where += ' AND model LIKE ?';
      params.push(`%${model}%`);
    }

    // 获取总数
    const countResult = db.get(
      `SELECT COUNT(*) as count FROM AILLMCalls WHERE ${where}`,
      params
    );

    // 获取列表
    const list = db.query(`
      SELECT id, model, promptTokens, completionTokens, duration, status, errorMessage, createdAt
      FROM AILLMCalls
      WHERE ${where}
      ORDER BY createdAt DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `, params);

    res.json({
      list: list || [],
      total: countResult?.count || 0,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    console.error('AI Logs API error:', error);
    res.status(500).json({ error: '获取AI调用日志失败' });
  }
});

// ========== AI调用详情 API ==========

router.get('/logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const log = db.get('SELECT * FROM AILLMCalls WHERE id = ?', [id]);

    if (!log) {
      return res.status(404).json({ error: '调用记录不存在' });
    }

    res.json(log);
  } catch (error) {
    console.error('AI Log Detail API error:', error);
    res.status(500).json({ error: '获取调用详情失败' });
  }
});

// ========== 记录AI调用（在AI服务中调用）==========

/**
 * 记录AI调用
 * @param {Object} callData - 调用数据
 */
function recordAICall(callData) {
  try {
    const id = callData.id || `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    db.prepare(`
      INSERT INTO AILLMCalls (id, model, promptTokens, completionTokens, prompt, response, duration, status, errorMessage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      callData.model || '',
      callData.promptTokens || 0,
      callData.completionTokens || 0,
      callData.prompt || null,
      callData.response || null,
      callData.duration || 0,
      callData.status || 'success',
      callData.errorMessage || null
    );

    return id;
  } catch (error) {
    console.error('Record AI call error:', error);
    return null;
  }
}

module.exports = router;
module.exports.recordAICall = recordAICall;