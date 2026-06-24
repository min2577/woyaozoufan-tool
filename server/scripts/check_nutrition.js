const fs = require('fs');
const nutritionDbPath = 'D:/bianchengchangshi/woyaozoufan/server/data/nutrition-db.json';
const content = fs.readFileSync(nutritionDbPath, 'utf8');

// 检查格式
console.log('File content starts with:', content.substring(0, 50));
console.log('Is array bracket at start:', content.trim().startsWith('['));

const data = JSON.parse(content);
console.log('Type:', typeof data);
console.log('Is Array:', Array.isArray(data));

if (typeof data === 'object' && !Array.isArray(data)) {
  console.log('Keys count:', Object.keys(data).length);
  console.log('Sample keys:', Object.keys(data).slice(0, 10));
}