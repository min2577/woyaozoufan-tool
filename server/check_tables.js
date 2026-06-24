const db = require('./lib/db');
const tables = db.query("SELECT name FROM sqlite_master WHERE type = 'table'");
console.log('=== TABLES ===');
tables.forEach(t => console.log(t.name));

console.log('\n=== StandardRecipes Columns ===');
const cols = db.query("PRAGMA table_info(StandardRecipes)");
cols.forEach(c => console.log(c.name + ' - ' + c.type));