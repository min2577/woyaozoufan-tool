/**
 * 库存数据迁移脚本
 * 将旧的库存数据转换为新的格式
 */

const db = require('../lib/db');
const { logger } = require('../middleware/logger');
const { normalizeText } = require('../utils/ingredientParser');

async function migrateInventory() {
  try {
    logger.info('开始库存数据迁移...');

    // 检查是否存在旧字段
    const inventoryColumns = db.query('PRAGMA table_info(UserInventory)').map(c => c.name);
    const hasLegacyFields = inventoryColumns.includes('ingredientName') || inventoryColumns.includes('clickFrequency') || inventoryColumns.includes('isExpiring');

    if (!hasLegacyFields) {
      logger.info('库存数据已经是新格式，无需迁移');
      return;
    }

    // 获取所有旧格式的库存数据
    const oldItems = db.query('SELECT * FROM UserInventory');
    logger.info(`找到 ${oldItems.length} 条旧格式库存数据`);

    // 迁移数据
    let migratedCount = 0;
    for (const item of oldItems) {
      const newItem = {
        id: item.id || `${item.type || 'ingredient'}-${normalizeText(item.ingredientName || item.name)}`,
        name: normalizeText(item.ingredientName || item.name),
        type: item.type || 'ingredient',
        frequency: item.clickFrequency || item.frequency || 0,
        status: item.status || (item.isExpiring ? 'yellow' : 'normal'),
        orderIndex: item.orderIndex || 0,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate
      };

      // 插入或更新新格式数据
      db.run(`
        INSERT OR REPLACE INTO UserInventory (
          id, name, type, frequency, status, orderIndex, quantity, unit, expiryDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newItem.id,
        newItem.name,
        newItem.type,
        newItem.frequency,
        newItem.status,
        newItem.orderIndex,
        newItem.quantity,
        newItem.unit,
        newItem.expiryDate
      ]);

      migratedCount++;
    }

    logger.info(`成功迁移 ${migratedCount} 条库存数据`);

    // 清理旧字段（如果存在）
    if (inventoryColumns.includes('ingredientName')) {
      try {
        db.run('ALTER TABLE UserInventory DROP COLUMN ingredientName');
        logger.info('已删除旧字段 ingredientName');
      } catch (error) {
        logger.warn('删除字段 ingredientName 失败:', error.message);
      }
    }

    if (inventoryColumns.includes('clickFrequency')) {
      try {
        db.run('ALTER TABLE UserInventory DROP COLUMN clickFrequency');
        logger.info('已删除旧字段 clickFrequency');
      } catch (error) {
        logger.warn('删除字段 clickFrequency 失败:', error.message);
      }
    }

    if (inventoryColumns.includes('isExpiring')) {
      try {
        db.run('ALTER TABLE UserInventory DROP COLUMN isExpiring');
        logger.info('已删除旧字段 isExpiring');
      } catch (error) {
        logger.warn('删除字段 isExpiring 失败:', error.message);
      }
    }

    logger.info('库存数据迁移完成');
  } catch (error) {
    logger.error('库存数据迁移失败:', error);
  }
}

// 执行迁移
if (require.main === module) {
  migrateInventory();
}

module.exports = migrateInventory;