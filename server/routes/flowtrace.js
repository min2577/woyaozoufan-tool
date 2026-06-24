/**
 * 流程追踪 API 路由
 * 提供流程记录查询、详情、导出、节点配置等功能
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// ========== 流程追踪列表 API ==========

router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 20, sessionId = '', status = '', step = '' } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    let where = '1=1';
    const params = [];

    if (sessionId) {
      where += ' AND sessionId LIKE ?';
      params.push(`%${sessionId}%`);
    }
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    if (step) {
      where += ' AND step = ?';
      params.push(parseInt(step));
    }

    // 获取总数
    const countResult = db.get(
      `SELECT COUNT(*) as count FROM FlowTrace WHERE ${where}`,
      params
    );

    // 获取列表
    const list = db.query(`
      SELECT id, sessionId, step, status, duration, errorMessage, createdAt
      FROM FlowTrace
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
    console.error('FlowTrace List API error:', error);
    res.status(500).json({ error: '获取流程追踪列表失败' });
  }
});

// ========== 流程追踪详情 API ==========

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const trace = db.get('SELECT * FROM FlowTrace WHERE id = ?', [id]);

    if (!trace) {
      return res.status(404).json({ error: '流程记录不存在' });
    }

    // 解析JSON字段
    if (trace.inputData) {
      try { trace.inputData = JSON.parse(trace.inputData); } catch {}
    }
    if (trace.outputData) {
      try { trace.outputData = JSON.parse(trace.outputData); } catch {}
    }

    res.json(trace);
  } catch (error) {
    console.error('FlowTrace Detail API error:', error);
    res.status(500).json({ error: '获取流程详情失败' });
  }
});

// ========== 导出流程记录 API ==========

router.post('/export', (req, res) => {
  try {
    const { ids = [], format = 'json' } = req.body;

    let records;
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(', ');
      records = db.query(`SELECT * FROM FlowTrace WHERE id IN (${placeholders})`, ids);
    } else {
      records = db.query('SELECT * FROM FlowTrace ORDER BY createdAt DESC LIMIT 1000');
    }

    // 解析JSON字段
    records = records.map(r => {
      if (r.inputData) {
        try { r.inputData = JSON.parse(r.inputData); } catch {}
      }
      if (r.outputData) {
        try { r.outputData = JSON.parse(r.outputData); } catch {}
      }
      return r;
    });

    if (format === 'csv') {
      // 导出为CSV
      const headers = ['id', 'sessionId', 'step', 'status', 'duration', 'errorMessage', 'createdAt'];
      const csvRows = [headers.join(',')];
      for (const r of records) {
        const row = headers.map(h => {
          let val = r[h] || '';
          if (typeof val === 'string' && val.includes(',')) {
            val = `"${val}"`;
          }
          return val;
        });
        csvRows.push(row.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=flowtrace_export.csv');
      return res.send(csvRows.join('\n'));
    }

    res.json({ records, total: records.length });
  } catch (error) {
    console.error('FlowTrace Export API error:', error);
    res.status(500).json({ error: '导出流程记录失败' });
  }
});

// ========== 节点配置 API ==========

router.get('/nodes', (req, res) => {
  try {
    const nodes = db.query('SELECT * FROM NodeConfig');

    // 如果没有配置，创建默认配置
    if (!nodes || nodes.length === 0) {
      const defaultNodes = [
        { nodeName: 'userInput', enabled: 1, timeout: 30000, retryCount: 3 },
        { nodeName: 'filterResult', enabled: 1, timeout: 30000, retryCount: 3 },
        { nodeName: 'classifyResult', enabled: 1, timeout: 30000, retryCount: 3 },
        { nodeName: 'aiSkeleton', enabled: 1, timeout: 60000, retryCount: 2 },
        { nodeName: 'skeletonSave', enabled: 1, timeout: 30000, retryCount: 3 },
        { nodeName: 'aiDetail', enabled: 1, timeout: 90000, retryCount: 2 },
        { nodeName: 'detailSave', enabled: 1, timeout: 30000, retryCount: 3 }
      ];

      for (const node of defaultNodes) {
        db.prepare(`
          INSERT INTO NodeConfig (nodeName, enabled, timeout, retryCount)
          VALUES (?, ?, ?, ?)
        `).run(node.nodeName, node.enabled, node.timeout, node.retryCount);
      }

      return res.json(defaultNodes);
    }

    res.json(nodes);
  } catch (error) {
    console.error('NodeConfig GET API error:', error);
    res.status(500).json({ error: '获取节点配置失败' });
  }
});

router.post('/nodes', (req, res) => {
  try {
    const { nodes = [] } = req.body;

    for (const node of nodes) {
      db.prepare(`
        INSERT OR REPLACE INTO NodeConfig (nodeName, enabled, timeout, retryCount, updatedAt)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(node.nodeName, node.enabled ? 1 : 0, node.timeout || 30000, node.retryCount || 3);
    }

    res.json({ ok: true, message: '节点配置保存成功' });
  } catch (error) {
    console.error('NodeConfig POST API error:', error);
    res.status(500).json({ error: '保存节点配置失败' });
  }
});

// ========== 记录流程调用（在匹配流程中调用）==========

/**
 * 记录流程步骤
 * @param {Object} traceData - 流程数据
 */
function recordTrace(traceData) {
  try {
    const id = traceData.id || `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const inputData = traceData.inputData ? JSON.stringify(traceData.inputData) : null;
    const outputData = traceData.outputData ? JSON.stringify(traceData.outputData) : null;

    db.prepare(`
      INSERT INTO FlowTrace (id, sessionId, step, status, inputData, outputData, duration, errorMessage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      traceData.sessionId || null,
      traceData.step || 1,
      traceData.status || 'success',
      inputData,
      outputData,
      traceData.duration || 0,
      traceData.errorMessage || null
    );

    return id;
  } catch (error) {
    console.error('Record trace error:', error);
    return null;
  }
}

module.exports = router;
module.exports.recordTrace = recordTrace;