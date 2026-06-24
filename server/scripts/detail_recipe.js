const Database = require('better-sqlite3');
const db = new Database('./data/recipes.db');

// 抽查一道完整的菜谱
const r = db.prepare("SELECT * FROM StandardRecipes WHERE requiredSeasonings IS NOT NULL AND (name LIKE '%回锅肉%' OR name LIKE '%红烧%') LIMIT 1").get();

if (!r) {
  console.log('肉菜不存在，抽查其他...');
}

const recipe = r || db.prepare("SELECT * FROM StandardRecipes WHERE requiredSeasonings IS NOT NULL LIMIT 1").get();

console.log(`\n========== 【${recipe.name}】详细信息 ==========\n`);

console.log('📋 基本信息：');
console.log(`  菜名: ${recipe.name}`);
console.log(`  简介: ${recipe.description}`);
console.log(`  难度: ${recipe.difficulty}`);
console.log(`  烹饪时间: ${recipe.cookTime}`);
console.log(`  份量: ${recipe.servings}`);
console.log(`  热量: ${recipe.calories} kcal\n`);

console.log('🥩 主料：');
const main = JSON.parse(recipe.mainIngredients || '[]');
main.forEach(m => console.log(`  - ${m}`));

console.log('\n🧂 必需调料：');
const required = JSON.parse(recipe.requiredSeasonings || '[]');
required.forEach(s => console.log(`  - ${s}`));

console.log('\n✨ 可选调料：');
const optional = JSON.parse(recipe.optionalSeasonings || '[]');
optional.forEach(s => console.log(`  - ${s}`));

console.log('\n🔧 原始厨具：');
const tools = JSON.parse(recipe.originalTools || '[]');
tools.forEach(t => console.log(`  - ${t}`));

console.log('\n📦 食材清单（含用量）：');
const allIng = JSON.parse(recipe.allIngredients || '[]');
allIng.forEach(ing => {
  const req = ing.isRequired ? '✅' : '○';
  console.log(`  ${req} ${ing.name}: ${ing.amount} (${ing.note})`);
});

console.log('\n👨‍🍳 烹饪步骤：');
const steps = JSON.parse(recipe.steps || '[]');
steps.forEach(s => {
  console.log(`  步骤${s.step} [${s.stage}]`);
  console.log(`    动作: ${s.action}`);
  console.log(`    火候: ${s.heat || '无'}`);
  console.log(`    时间: ${s.time || '待定'}`);
  console.log(`    感官: ${s.sensory || '无'}`);
  console.log(`    完整描述: ${s.fullText}`);
  console.log('');
});

console.log('💡 小贴士：');
console.log(`  ${recipe.tips || '无'}`);

db.close();