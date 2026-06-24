const fs = require('fs');
const r = JSON.parse(fs.readFileSync('./data/inventory_report.json', 'utf-8'));

const ing = r.libraries.ingredients.length;
const sea = r.libraries.seasonings.length;
const tool = r.libraries.tools.length;
const small = (r.libraries.smallTools || []).length;

console.log('========================================');
console.log('           三库统计');
console.log('========================================');
console.log('  食材库: ' + ing + ' 种');
console.log('  调料库: ' + sea + ' 种');
console.log('  厨具库: ' + tool + ' 种');
console.log('  小工具: ' + small + ' 种');
console.log('----------------------------------------');
console.log('  合计:   ' + (ing + sea + tool + small) + ' 种');
console.log('========================================');