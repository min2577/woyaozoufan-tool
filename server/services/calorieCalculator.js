/**
 * 热量计算模块 - 使用模糊匹配
 */

const fs = require('fs');
const path = require('path');
const { normalizeIngredientName, normalizeText, parseAmountUnit } = require('../utils/ingredientParser');

const nutritionDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/nutrition-db.json'), 'utf-8'));

const unitWeightFallback = {
  个: 50,
  只: 50,
  瓣: 5,
  片: 10,
  块: 30,
  条: 50,
  勺: 15,
  汤匙: 15,
  茶匙: 5,
  杯: 250,
  把: 30,
  份: 100,
  瓶: 500
};

const nutritionKeys = Object.keys(nutritionDb);
const normalizedKeyIndex = new Map();
for (const k of nutritionKeys) {
  const nk = normalizeIngredientName(k);
  if (!nk) continue;
  if (!normalizedKeyIndex.has(nk)) normalizedKeyIndex.set(nk, []);
  normalizedKeyIndex.get(nk).push(k);
}

function findNutritionWithKey(rawName) {
  const name = normalizeText(rawName);
  if (!name) return { key: null, nutrition: null };

  if (nutritionDb[name]) return { key: name, nutrition: nutritionDb[name] };

  const n = normalizeIngredientName(name);
  // 油类识别：支持 "油"、"食用油"、"xxx油" 等
  if (n === '油' || n === '食用油' || (n && n.includes('油') && n.length <= 6)) {
    return { key: '__OIL__', nutrition: { per_100g: { calories: 900 } } };
  }
  const exactCandidates = normalizedKeyIndex.get(n);
  if (exactCandidates && exactCandidates.length > 0) {
    const key = exactCandidates[0];
    return { key, nutrition: nutritionDb[key] };
  }

  // 改进的匹配逻辑：优先完全匹配，然后前缀匹配，最后才是包含关系
  // 1. 完全匹配（已在上面处理）
  // 2. 精确匹配 - 食材名称与规范化名称完全相同
  for (const k of nutritionKeys) {
    if (k === n) return { key: k, nutrition: nutritionDb[k] };
  }
  
  // 3. 前缀匹配 - 食材名称以规范化名称开头，且后面没有其他字符或只有量词
  for (const k of nutritionKeys) {
    if (k.startsWith(n) && (k.length === n.length || /^[\d\s\u4e00-\u9fa5]*$/.test(k.slice(n.length)))) {
      return { key: k, nutrition: nutritionDb[k] };
    }
  }
  
  // 4. 反向匹配 - 规范化名称以食材名称开头（处理别名情况）
  for (const k of nutritionKeys) {
    if (n.startsWith(k)) return { key: k, nutrition: nutritionDb[k] };
  }
  
  // 5. 包含关系匹配 - 但只在没有其他匹配时使用，且要避免错误匹配
  for (const k of nutritionKeys) {
    // 避免错误匹配：只有当规范化名称长度大于2且是完整包含时才匹配
    // 同时避免匹配到包含该名称但含义不同的食材（如番茄酱包含番茄）
    if (n.length > 2 && k.includes(n) && !k.includes('酱') && !k.includes('汁') && !k.includes('粉')) {
      return { key: k, nutrition: nutritionDb[k] };
    }
  }

  const prefix = n.slice(0, 2);
  if (prefix && prefix.length === 2) {
    // 前缀匹配 - 只匹配前两个字符，且避免过短的前缀
    for (const k of nutritionKeys) {
      if (k.startsWith(prefix)) return { key: k, nutrition: nutritionDb[k] };
    }
  }

  return { key: null, nutrition: null };
}

function convertAmountToGrams(amountValue, unitValue, nutritionKey) {
  const unitRaw = normalizeText(unitValue).toLowerCase();

  let amount = null;
  let unit = unitRaw;

  if (typeof amountValue === 'number' && Number.isFinite(amountValue)) {
    amount = amountValue;
  } else {
    const parsed = parseAmountUnit(amountValue, unitValue);
    amount = parsed.amount;
    unit = normalizeText(parsed.unit).toLowerCase();
  }

  if (!(typeof amount === 'number' && Number.isFinite(amount) && amount > 0)) return 0;

  if (unit === 'kg' || unit === '千克') return amount * 1000;
  if (unit === 'g' || unit === '克') return amount;
  if (unit === 'ml' || unit === '毫升') return amount;
  if (unit === 'l' || unit === '升') return amount * 1000;
  if (unit === '斤') return amount * 500;
  if (unit === '两') return amount * 50;

  const key = normalizeText(nutritionKey);
  const unitWeight = key && nutritionDb[key] && nutritionDb[key].unit_weight
    ? Number(nutritionDb[key].unit_weight)
    : null;
  if (typeof unitWeight === 'number' && Number.isFinite(unitWeight) && unitWeight > 0) {
    return amount * unitWeight;
  }

  const fallback = unitWeightFallback[unitValue] || unitWeightFallback[unitRaw] || null;
  if (typeof fallback === 'number') return amount * fallback;

  return amount;
}

// 计算热量和营养成分
function calculateIngredientCaloriesDetailed(name, amount, unit, options = {}) {
  const debug = options && options.debug;
  const warnMissing = options && options.warnMissing;
  const normalizedName = normalizeIngredientName(name);
  const found = findNutritionWithKey(name);

  const nutrition = found.nutrition;
  const key = found.key;

  const caloriesPer100g = nutrition && nutrition.per_100g ? nutrition.per_100g.calories : null;
  const proteinPer100g = nutrition && nutrition.per_100g ? nutrition.per_100g.protein : 0;
  const fatPer100g = nutrition && nutrition.per_100g ? nutrition.per_100g.fat : 0;
  const carbsPer100g = nutrition && nutrition.per_100g ? nutrition.per_100g.carbs : 0;
  const grams = convertAmountToGrams(amount, unit, key);
  const amountMissing =
    amount === null ||
    amount === undefined ||
    amount === '' ||
    amount === 'null' ||
    (typeof amount === 'string' && amount.trim() === '');
  const n = normalizedName || '';
  const isSpice =
    n.includes('胡椒') ||
    n.includes('孜然') ||
    n.includes('辣椒粉') ||
    n.endsWith('粉') ||
    n.endsWith('末');

  if (debug) {
    console.log('[CAL]', {
      nameRaw: name,
      nameNormalized: normalizedName,
      amount,
      unit: unit || '',
      grams: Math.round(grams * 100) / 100,
      nutritionKey: key,
      caloriesPer100g,
      proteinPer100g: proteinPer100g || 0,
      fatPer100g: fatPer100g || 0,
      carbsPer100g: carbsPer100g || 0,
      nutrition: nutrition
    });
  }

  if (!nutrition || !nutrition.per_100g || typeof caloriesPer100g !== 'number') {
    if (warnMissing && normalizeText(name)) {
      console.warn('[CAL] missing nutrition', { nameRaw: name, nameNormalized: normalizedName });
    }
    if (amountMissing && isSpice) return { calories: 2, protein: 0, fat: 0, carbs: 0, missingNutrition: true };
    return { calories: 0, protein: 0, fat: 0, carbs: 0, missingNutrition: true };
  }
  if (grams <= 0) {
    if (amountMissing) {
      if (isSpice) return { calories: 2, protein: 0, fat: 0, carbs: 0, missingNutrition: false };
      return { calories: 0, protein: 0, fat: 0, carbs: 0, missingNutrition: false };
    }
    return { calories: 0, protein: 0, fat: 0, carbs: 0, missingNutrition: false };
  }

  const calories = Math.round((grams / 100) * caloriesPer100g);
  const protein = proteinPer100g ? Math.round((grams / 100) * proteinPer100g * 10) / 10 : 0;
  const fat = fatPer100g ? Math.round((grams / 100) * fatPer100g * 10) / 10 : 0;
  const carbs = carbsPer100g ? Math.round((grams / 100) * carbsPer100g * 10) / 10 : 0;

  return { calories, protein, fat, carbs, missingNutrition: false };
}

function calculateIngredientCalories(name, amount, unit, options = {}) {
  return calculateIngredientCaloriesDetailed(name, amount, unit, options).calories;
}

// 计算总热量和营养成分
function calculateTotalCalories(allIngredients, options = {}) {
  if (!allIngredients || !Array.isArray(allIngredients)) {
    return { total: 0, protein: 0, fat: 0, carbs: 0, details: [] };
  }
  
  let total = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  const details = [];
  
  for (const ing of allIngredients) {
    // 支持两种格式：字符串或对象
    let name, amount, unit;
    
    if (typeof ing === 'string') {
      name = ing;
      amount = '';
      unit = '';
    } else {
      name = ing.name || '';
      // 支持 amount 为 number 或 string
      const rawAmount = ing.amount;
      if (typeof rawAmount === 'number' && Number.isFinite(rawAmount)) {
        amount = rawAmount;
      } else if (rawAmount !== null && rawAmount !== undefined) {
        amount = rawAmount;
      } else {
        amount = '';
      }
      unit = ing.unit || '';
    }

    const detail = calculateIngredientCaloriesDetailed(name, amount, unit, options);
    total += detail.calories;
    totalProtein += detail.protein;
    totalFat += detail.fat;
    totalCarbs += detail.carbs;
    
    // 格式化显示
    let amountText;
    if (amount === null || amount === undefined || amount === '') {
      amountText = '适量';
    } else if (typeof amount === 'number') {
      amountText = `${amount}${unit || ''}`;
    } else {
      amountText = String(amount);
    }
    
    details.push({ 
      name, 
      amount: amountText, 
      calories: detail.calories, 
      protein: detail.protein, 
      fat: detail.fat, 
      carbs: detail.carbs, 
      missingNutrition: detail.missingNutrition 
    });
  }
  
  return { 
    total, 
    protein: Math.round(totalProtein * 10) / 10, 
    fat: Math.round(totalFat * 10) / 10, 
    carbs: Math.round(totalCarbs * 10) / 10, 
    details 
  };
}

// ======== 重新加载热量库（补充后调用） ========
function reloadNutritionDb() {
  const dbPath = path.join(__dirname, '../data/nutrition-db.json');
  const newDb = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  
  // 替换整个对象
  Object.keys(newDb).forEach(k => nutritionDb[k] = newDb[k]);
  
  // 重建索引
  const newKeys = Object.keys(nutritionDb);
  normalizedKeyIndex.clear();
  for (const k of newKeys) {
    const nk = normalizeIngredientName(k);
    if (!nk) continue;
    if (!normalizedKeyIndex.has(nk)) normalizedKeyIndex.set(nk, []);
    normalizedKeyIndex.get(nk).push(k);
  }
  
  console.log('[热量库] 已重新加载，共', Object.keys(nutritionDb).length, '条');
}

// ======== 自动补充并计算热量（异步） ========
async function calculateTotalCaloriesAutoSupplement(allIngredients, options = {}) {
  if (!allIngredients || !Array.isArray(allIngredients)) {
    return { total: 0, protein: 0, fat: 0, carbs: 0, details: [], missingIngredients: [], supplemented: [] };
  }
  
  // 第一遍：计算 + 收集缺失
  let total = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  const details = [];
  const missingSet = new Set();
  
  for (const ing of allIngredients) {
    let name, amount, unit;
    
    if (typeof ing === 'string') {
      name = ing;
      amount = '';
      unit = '';
    } else {
      name = ing.name || '';
      const rawAmount = ing.amount;
      if (typeof rawAmount === 'number' && Number.isFinite(rawAmount)) {
        amount = rawAmount;
      } else if (rawAmount !== null && rawAmount !== undefined) {
        amount = rawAmount;
      } else {
        amount = '';
      }
      unit = ing.unit || '';
    }

    const detail = calculateIngredientCaloriesDetailed(name, amount, unit, options);
    total += detail.calories;
    totalProtein += detail.protein;
    totalFat += detail.fat;
    totalCarbs += detail.carbs;
    
    if (detail.missingNutrition) {
      missingSet.add(name);
    }
    
    let amountText;
    if (amount === null || amount === undefined || amount === '') {
      amountText = '适量';
    } else if (typeof amount === 'number') {
      amountText = `${amount}${unit || ''}`;
    } else {
      amountText = String(amount);
    }
    
    details.push({ 
      name, 
      amount: amountText,
      rawAmount: amount,
      rawUnit: unit, 
      calories: detail.calories, 
      protein: detail.protein, 
      fat: detail.fat, 
      carbs: detail.carbs, 
      missingNutrition: detail.missingNutrition 
    });
  }
  
  const missingIngredients = Array.from(missingSet);
  let supplemented = [];
  
  // 如果有缺失且不在等待中，触发 AI 补充
  if (missingIngredients.length > 0 && !pendingSupplement) {
    console.log(`[热量计算] 发现 ${missingIngredients.length} 种未知食材，开始AI查询...`);
    pendingSupplement = true;
    
    try {
      const result = await supplementNutritionDatabase(missingIngredients);
      supplemented = result.added;
      
      // 重新加载热量库
      reloadNutritionDb();
      
      // 重新计算
      if (supplemented.length > 0) {
        console.log(`[热量计算] 重新计算中...`);
        total = 0;
        totalProtein = 0;
        totalFat = 0;
        totalCarbs = 0;
        
        for (let i = 0; i < details.length; i++) {
          const ing = allIngredients[i];
          const detail = calculateIngredientCaloriesDetailed(
            details[i].name, 
            details[i].rawAmount, 
            details[i].rawUnit, 
            options
          );
          total += detail.calories;
          totalProtein += detail.protein;
          totalFat += detail.fat;
          totalCarbs += detail.carbs;
          details[i].calories = detail.calories;
          details[i].protein = detail.protein;
          details[i].fat = detail.fat;
          details[i].carbs = detail.carbs;
          details[i].missingNutrition = detail.missingNutrition;
        }
      }
    } catch (e) {
      console.error('[热量计算] AI补充失败:', e.message);
    } finally {
      pendingSupplement = false;
    }
  }
  
  return { 
    total, 
    protein: Math.round(totalProtein * 10) / 10, 
    fat: Math.round(totalFat * 10) / 10, 
    carbs: Math.round(totalCarbs * 10) / 10, 
    details, 
    missingIngredients, 
    supplemented 
  };
}

// ======== AI 查询补充热量库 ========
let aiService = null;
let pendingSupplement = false;

function getAiService() {
  if (!aiService) {
    aiService = require('./aiService');
  }
  return aiService;
}

// 查询单个食材热量
async function queryCaloriesFromAI(ingredientName) {
  try {
    const prompt = `查询食材"${ingredientName}"的热量。
要求：
1. 返回纯JSON格式，不要任何Markdown标记
2. 格式：{"calories": 数字(每100g的热量), "protein": 数字, "fat": 数字, "carbs": 数字}
3. 如果不确定，返回 {"calories": null}
4. 只返回JSON，不要解释`;

    const result = await getAiService().callAI(
      [{ role: 'user', content: prompt }],
      { maxTokens: 256, temperature: 0.3, useCache: true }
    );

    const raw = result.choices?.[0]?.message?.content || '';
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.calories === null || parsed.calories === undefined) {
      return null;
    }

    return {
      calories: Math.round(parsed.calories),
      protein: Math.round((parsed.protein || 0) * 10) / 10,
      fat: Math.round((parsed.fat || 0) * 10) / 10,
      carbs: Math.round((parsed.carbs || 0) * 10) / 10
    };
  } catch (e) {
    console.error(`[AI查询热量失败] ${ingredientName}:`, e.message);
    return null;
  }
}

// 补充缺失食材到热量库
async function supplementNutritionDatabase(missingIngredients) {
  const dbPath = path.join(__dirname, '../data/nutrition-db.json');
  let db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  let added = [];
  let failed = [];

  for (const name of missingIngredients) {
    // 跳过已有的
    const normalizedName = normalizeIngredientName(name);
    if (db[normalizedName] || db[name]) continue;

    console.log(`[热量库补充] 查询 ${name} 的热量...`);
    const result = await queryCaloriesFromAI(name);

    if (result && result.calories) {
      db[name] = {
        per_100g: {
          calories: result.calories,
          protein: result.protein,
          fat: result.fat,
          carbs: result.carbs
        },
        unit: 'g',
        unit_weight: 100,
        reference_note: 'AI自动补充',
        source: 'ai'
      };
      added.push(name);
      console.log(`[热量库补充] ✓ ${name}: ${result.calories} kcal/100g`);
    } else {
      failed.push(name);
      console.log(`[热量库补充] ✗ ${name}: AI无法查询`);
    }

    // 避免过快，连续查询稍作延迟
    await new Promise(r => setTimeout(r, 500));
  }

  // 写回文件
  if (added.length > 0) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`[热量库补充] 已更新，已添加: ${added.join(', ')}`);
  }

  return { added, failed };
}

module.exports = {
  calculateTotalCalories,
  calculateTotalCaloriesAutoSupplement,
  calculateIngredientCalories,
  nutritionDb,
  queryCaloriesFromAI,
  supplementNutritionDatabase,
  reloadNutritionDb
};
