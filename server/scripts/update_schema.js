const Database = require('better-sqlite3');
const db = new Database('./data/recipes.db');

console.log('=== 添加新字段到数据库 ===');

// 检查并添加新字段
const fieldsToAdd = [
  { name: 'requiredSeasonings', sql: 'TEXT' },
  { name: 'optionalSeasonings', sql: 'TEXT' },
  { name: 'originalTools', sql: 'TEXT' }
];

const tableInfo = db.prepare("PRAGMA table_info(StandardRecipes)").all();
const existingFields = tableInfo.map(c => c.name);

for (const field of fieldsToAdd) {
  if (!existingFields.includes(field.name)) {
    try {
      db.prepare(`ALTER TABLE StandardRecipes ADD COLUMN ${field.name} ${field.sql}`).run();
      console.log(`✅ 添加字段: ${field.name}`);
    } catch (e) {
      console.log(`❌ 添加字段失败: ${field.name} - ${e.message}`);
    }
  } else {
    console.log(`⏭️  字段已存在: ${field.name}`);
  }
}

// 验证
const newTableInfo = db.prepare("PRAGMA table_info(StandardRecipes)").all();
console.log('\n=== 当前表结构 ===');
console.log(newTableInfo.map(c => c.name).join(', '));

db.close();