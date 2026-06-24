const path = require('path');
const fs = require('fs');
const dbPath = path.join(__dirname, '../data/nutrition-db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const keys = Object.keys(db).sort();
console.log(keys.join(', '));