const fs = require('fs');
const r = JSON.parse(fs.readFileSync('./data/inventory_report.json', 'utf-8'));

// 移除料理机和榨汁机
r.libraries.tools = r.libraries.tools.filter(t => !['料理机', '榨汁机'].includes(t.label));

// 添加小工具分类
r.libraries.smallTools = [];

fs.writeFileSync('./data/inventory_report.json', JSON.stringify(r, null, 2), 'utf-8');

console.log('更新后的厨具库:');
console.log(r.libraries.tools.map(t => t.label).join(', '));

console.log('\n小工具库:');
console.log(r.libraries.smallTools);