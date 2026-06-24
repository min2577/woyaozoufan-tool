const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./data/woyaozoufan.db');

const recipes = db.prepare('SELECT * FROM StandardRecipes').all();

// 转换为JSON
const output = {
  exportDate: new Date().toISOString(),
  totalCount: recipes.length,
  recipes: recipes.map(r => ({
    ...r,
    mainIngredients: JSON.parse(r.mainIngredients || '[]'),
    allIngredients: JSON.parse(r.allIngredients || '[]'),
    steps: JSON.parse(r.steps || '[]')
  }))
};

fs.writeFileSync('./data/recipes_backup.json', JSON.stringify(output, null, 2), 'utf8');
console.log(`已导出 ${recipes.length} 道菜谱到 recipes_backup.json`);

// 同时备份数据库文件
const dbPath = './data/woyaozoufan.db';
const backupPath = `./data/woyaozoufan_backup_${Date.now()}.db`;
fs.copyFileSync(dbPath, backupPath);
console.log(`数据库已备份到 ${backupPath}`);

db.close();