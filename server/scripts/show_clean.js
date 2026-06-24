const fs = require('fs');
const r = JSON.parse(fs.readFileSync('./data/inventory_report.json', 'utf-8'));

console.log('========== 清理后盘点结果 ==========\n');

console.log('📊 菜谱统计:');
console.log(`  StandardRecipes: ${r.recipeCounts.standard}`);
console.log(`  OutrageousRecipes: ${r.recipeCounts.outrageous}`);
console.log(`  总数: ${r.recipeCounts.total}`);
console.log(`  去重后菜名: ${r.recipeCounts.uniqueByName}`);

console.log('\n🥩 食材库: ' + r.libraries.ingredients.length + ' 项');
console.log('  (前20项):', r.libraries.ingredients.slice(0, 20).join(', '));

console.log('\n🧂 调料库: ' + r.libraries.seasonings.length + ' 项');
console.log(r.libraries.seasonings.join(', '));

console.log('\n🍳 厨具库: ' + r.libraries.tools.length + ' 项');
console.log(r.libraries.tools.map(t => t.label).join(', '));

console.log('\n🦐 海鲜排除: ' + r.excluded.seafood.length + ' 项');

console.log('\n🥩 肉类部位映射:');
console.log(JSON.stringify(r.meatCuts, null, 2));