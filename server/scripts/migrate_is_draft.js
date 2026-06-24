/**
 * 为数据库表新增 isDraft 字段的迁移脚本
 */
const dbService = require('../lib/db');

function addIsDraftField() {
  console.log('开始执行数据库迁移：新增 isDraft 字段...');
  
  try {
    // 检查 StandardRecipes 表是否已有 isDraft 字段
    const standardCols = dbService.query("PRAGMA table_info(StandardRecipes)");
    if (!standardCols.some(col => col.name === 'isDraft')) {
      dbService.run("ALTER TABLE StandardRecipes ADD COLUMN isDraft INTEGER DEFAULT 0");
      console.log('✅ StandardRecipes 表已成功新增 isDraft 字段');
    } else {
      console.log('ℹ️ StandardRecipes 表已有 isDraft 字段，无需新增');
    }

    // 检查 OutrageousRecipes 表是否已有 isDraft 字段
    const outrageousCols = dbService.query("PRAGMA table_info(OutrageousRecipes)");
    if (!outrageousCols.some(col => col.name === 'isDraft')) {
      dbService.run("ALTER TABLE OutrageousRecipes ADD COLUMN isDraft INTEGER DEFAULT 0");
      console.log('✅ OutrageousRecipes 表已成功新增 isDraft 字段');
    } else {
      console.log('ℹ️ OutrageousRecipes 表已有 isDraft 字段，无需新增');
    }
    
    console.log('🎉 数据库迁移完成！');
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
  }
}

addIsDraftField();
