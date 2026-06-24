const Database = require('better-sqlite3');
const db = new Database('./data/recipes.db');

// 统计所有菜谱中的调料、食材、厨具
const recipes = db.prepare("SELECT * FROM StandardRecipes WHERE requiredSeasonings IS NOT NULL").all();

const allSeasonings = new Set();
const allIngredients = new Set();
const allTools = new Set();
const allMainIng = new Set();

for (const r of recipes) {
  // 必需调料
  try {
    const required = JSON.parse(r.requiredSeasonings || '[]');
    required.forEach(s => allSeasonings.add(s));
  } catch {}
  
  // 可选调料
  try {
    const optional = JSON.parse(r.optionalSeasonings || '[]');
    optional.forEach(s => allSeasonings.add(s));
  } catch {}
  
  // 主料
  try {
    const main = JSON.parse(r.mainIngredients || '[]');
    main.forEach(m => allMainIng.add(m));
  } catch {}
  
  // 厨具
  try {
    const tools = JSON.parse(r.originalTools || '[]');
    tools.forEach(t => allTools.add(t));
  } catch {}
  
  // allIngredients
  try {
    const all = JSON.parse(r.allIngredients || '[]');
    all.forEach(i => {
      if (i.name) allIngredients.add(i.name);
    });
  } catch {}
}

console.log('=== 常用调料 TOP 30 ===');
const seasArr = Array.from(allSeasonings).sort();
console.log(seasArr.join(', '));

console.log('\n=== 常用主料 TOP 30 ===');
const mainArr = Array.from(allMainIng).sort();
console.log(mainArr.join(', '));

console.log('\n=== 常用厨具 ===');
const toolsArr = Array.from(allTools).sort();
console.log(toolsArr.join(', '));

console.log('\n=== 需要添加的调料建议 ===');
// 当前调料库
const currentSeasonings = ['盐', '糖', '生抽', '老抽', '料酒', '醋', '蚝油', '胡椒粉', '花椒粉', '淀粉', '油', '芝麻油', '姜', '葱', '蒜', '辣椒', '八角', '桂皮', '豆瓣酱', '鸡精'];
const missing = seasArr.filter(s => !currentSeasonings.includes(s));
console.log(missing.join(', '));

db.close();