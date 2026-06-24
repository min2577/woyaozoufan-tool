const fs = require('fs');
const r = JSON.parse(fs.readFileSync('./data/inventory_report.json', 'utf-8'));

console.log('========== 菜谱库资产盘点报告 ==========\n');

console.log('📊 菜谱统计:');
console.log(`  StandardRecipes: ${r.recipeCounts.standard}`);
console.log(`  OutrageousRecipes: ${r.recipeCounts.outrageous}`);
console.log(`  总数: ${r.recipeCounts.total}`);
console.log(`  去重后菜名: ${r.recipeCounts.uniqueByName}`);

console.log('\n🥩 肉类部位映射 (meatCuts):');
console.log(JSON.stringify(r.meatCuts, null, 2));

console.log('\n🧂 调料库 (前30项):');
console.log(r.libraries.seasonings.slice(0, 30).join(', '));
console.log(`... 共 ${r.libraries.seasonings.length} 项`);

console.log('\n🍳 厨具库:');
console.log(JSON.stringify(r.libraries.tools, null, 2));

console.log('\n🦐 海鲜排除清单 (前20项):');
console.log(r.excluded.seafood.slice(0, 20).join(', '));
console.log(`... 共 ${r.excluded.seafood.length} 项`);