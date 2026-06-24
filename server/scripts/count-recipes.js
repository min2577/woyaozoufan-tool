const sqlite3 = require('sqlite3').verbose();

// 检查 woyaozoufan.db
const db1 = new sqlite3.Database('./data/woyaozoufan.db');
db1.get('SELECT COUNT(*) as c FROM recipes', (e, r) => {
  console.log('woyaozoufan.db 菜谱数:', r.c);
  db1.close();
});