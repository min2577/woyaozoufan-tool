const fs = require('fs');
const path = require('path');

const nutritionDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/nutrition-db.json'), 'utf-8'));
const { normalizeIngredientName, normalizeText } = require('../utils/ingredientParser');

function findNutritionWithKey(rawName) {
  const name = normalizeText(rawName);
  if (!name) return { key: null, nutrition: null };

  console.log('  rawName:', rawName, '-> normalized name:', name);
  console.log('  direct lookup in db:', !!nutritionDb[name]);

  if (nutritionDb[name]) return { key: name, nutrition: nutritionDb[name] };

  const n = normalizeIngredientName(name);
  console.log('  normalizeIngredientName result:', n);
  
  if (n === '油' || n === '食用油' || (n && n.includes('油') && n.length <= 6)) {
    return { key: '__OIL__', nutrition: { per_100g: { calories: 900 } } };
  }

  const nutritionKeys = Object.keys(nutritionDb);
  for (const k of nutritionKeys) {
    const nk = normalizeIngredientName(k);
    if (nk === n) {
      console.log('  Found via normalization:', k);
      return { key: k, nutrition: nutritionDb[k] };
    }
  }

  for (const k of nutritionKeys) {
    if (name.includes(k) || k.includes(name)) {
      console.log('  Found via fuzzy:', k);
      return { key: k, nutrition: nutritionDb[k] };
    }
  }

  return { key: null, nutrition: null };
}

console.log('Testing 生抽:');
console.log(JSON.stringify(findNutritionWithKey('生抽'), null, 2));

console.log('\nTesting 老抽:');
console.log(JSON.stringify(findNutritionWithKey('老抽'), null, 2));

console.log('\nTesting 黄酒:');
console.log(JSON.stringify(findNutritionWithKey('黄酒'), null, 2));