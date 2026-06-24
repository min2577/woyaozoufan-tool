const fs = require('fs');
const db = JSON.parse(fs.readFileSync('./data/nutrition-db.json', 'utf-8'));
console.log('生抽:', !!db['生抽']);
console.log('老抽:', !!db['老抽']);
console.log('黄酒:', !!db['黄酒']);
console.log('总计:', Object.keys(db).length);