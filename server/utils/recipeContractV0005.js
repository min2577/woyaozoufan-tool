const { normalizeText, normalizeIngredientName } = require('./ingredientParser');

const ALLOWED_DIFFICULTY = new Set(['简单', '中等', '困难']);
const ALLOWED_CATEGORY = new Set(['立即下厨', '顺路买点']);
const ALLOWED_STAGE = new Set(['准备', '预处理', '烹饪', '装盘']);

const LIQUID_HINTS = [
  '水', '清水', '高汤', '汤', '牛奶', '椰奶', '料酒', '黄酒', '啤酒', '白酒',
  '酱油', '生抽', '老抽', '醋', '米醋', '陈醋', '蚝油', '鱼露',
  '香油', '食用油', '橄榄油', '花生油', '菜籽油', '玉米油', '芝麻油'
];

function defaultAmountForName(name) {
  const n = normalizeIngredientName(name);
  if (!n) return '';
  if (n === '盐') return '3g';
  if (n === '糖') return '5g';
  if (n.includes('胡椒')) return '1g';
  if (n.includes('孜然')) return '2g';
  if (n.includes('辣椒')) return '2g';
  if (n.endsWith('粉') || n.endsWith('末')) return '2g';
  if (n.includes('油')) return '10ml';
  if (n.includes('酱油') || n.includes('生抽') || n.includes('老抽')) return '10ml';
  if (n.includes('醋')) return '10ml';
  if (n.includes('料酒') || n.includes('黄酒')) return '10ml';
  if (n.includes('水') || n.includes('高汤') || n.includes('汤')) return '200ml';
  return '10g';
}

function safeJsonParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

function toStringArray(v) {
  const arr = Array.isArray(v) ? v : safeJsonParse(v, Array.isArray(v) ? v : []);
  const out = [];
  const seen = new Set();
  for (const it of arr || []) {
    const s = normalizeText(it);
    if (!s) continue;
    const n = normalizeIngredientName(s);
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(s);
  }
  return out;
}

function inferUnit(name, note) {
  const n = normalizeIngredientName(name);
  const t = normalizeText(note);
  if (/\bml\b/i.test(t) || t.includes('毫升')) return 'ml';
  if (/\bg\b/i.test(t) || t.includes('克')) return 'g';
  if (LIQUID_HINTS.some(k => n.includes(normalizeIngredientName(k)))) return 'ml';
  return 'g';
}

function coerceAmountToString(amount, unitHint) {
  if (typeof amount === 'string') return normalizeText(amount);
  if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
    const num = Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
    const u = normalizeText(unitHint);
    return u ? `${num}${u}` : num;
  }
  return '';
}

function normalizeAllIngredients(allIngredients, mainIngredients, requiredSeasonings, optionalSeasonings) {
  const raw = Array.isArray(allIngredients) ? allIngredients : safeJsonParse(allIngredients, []);
  const byNorm = new Map();

  for (const it of raw || []) {
    if (!it) continue;
    if (typeof it === 'string') {
      const name = normalizeText(it);
      const key = normalizeIngredientName(name);
      if (!name || byNorm.has(key)) continue;
      byNorm.set(key, { name, amount: '', note: '', isRequired: true });
      continue;
    }

    if (typeof it !== 'object') continue;
    const name = normalizeText(it.name);
    const key = normalizeIngredientName(name);
    if (!name) continue;

    const unit = normalizeText(it.unit) || inferUnit(name, it.note);
    const amount = coerceAmountToString(it.amount, unit);
    const note = normalizeText(it.note);
    const isRequired = it.isRequired !== false;

    const existing = byNorm.get(key);
    const merged = {
      name,
      amount: amount || existing?.amount || '',
      note: note || existing?.note || '',
      isRequired: isRequired && existing ? existing.isRequired : isRequired
    };
    byNorm.set(key, merged);
  }

  const mainSet = new Set((mainIngredients || []).map(normalizeIngredientName));
  const reqSet = new Set((requiredSeasonings || []).map(normalizeIngredientName));
  const optSet = new Set((optionalSeasonings || []).map(normalizeIngredientName));

  for (const n of mainSet) {
    const existing = byNorm.get(n);
    if (existing) {
      byNorm.set(n, { ...existing, isRequired: true });
    } else {
      byNorm.set(n, { name: n, amount: '', note: '', isRequired: true });
    }
  }

  for (const n of reqSet) {
    const existing = byNorm.get(n);
    if (existing) {
      byNorm.set(n, { ...existing, isRequired: true });
    } else {
      byNorm.set(n, { name: n, amount: '', note: '', isRequired: true });
    }
  }

  for (const n of optSet) {
    const existing = byNorm.get(n);
    if (existing) {
      byNorm.set(n, { ...existing, isRequired: false });
    } else {
      byNorm.set(n, { name: n, amount: '', note: '', isRequired: false });
    }
  }

  const out = Array.from(byNorm.values()).map(it => ({
    name: normalizeText(it.name),
    amount: normalizeText(it.amount) || defaultAmountForName(it.name),
    note: normalizeText(it.note),
    isRequired: it.isRequired === true
  }));

  return out.filter(it => it.name);
}

function normalizeSteps(steps) {
  const raw = Array.isArray(steps) ? steps : safeJsonParse(steps, []);
  if (!Array.isArray(raw) || raw.length === 0) return [];

  if (typeof raw[0] === 'string') {
    return [];
  }

  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    if (!s || typeof s !== 'object') return [];
    const step = Number.isFinite(s.step) ? s.step : i + 1;
    const stageRaw = normalizeText(s.stage) || '烹饪';
    const stage = ALLOWED_STAGE.has(stageRaw) ? stageRaw : '烹饪';
    const fullTextRaw = normalizeText(s.fullText);
    const action = normalizeText(s.action) || (fullTextRaw ? fullTextRaw.split(/[，。；;]/)[0] : '');
    const heat = normalizeText(s.heat) || (stage === '烹饪' ? '中火' : '无');
    const time = normalizeText(s.time) || (stage === '烹饪' ? '2 分钟' : '1 分钟');
    const sensory = normalizeText(s.sensory) || (stage === '烹饪' ? '香味出来' : '处理完成');
    const fullText = fullTextRaw || action || `${stage}步骤`;
    out.push({ step, stage, action, heat, time, sensory, fullText });
  }
  return out;
}

function normalizeTools(originalTools, toolsFallback) {
  const raw = toStringArray(originalTools || toolsFallback || []);
  const out = [];
  const seen = new Set();
  for (const t of raw) {
    let v = normalizeText(t);
    if (!v) continue;
    if (v === '平底锅') v = '炒锅';
    const key = v;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out.length > 0 ? out : ['炒锅'];
}

function normalizeDescription(description) {
  const s = normalizeText(description);
  if (!s) return '家常菜，简单好做';
  return s.length > 25 ? s.slice(0, 25) : s;
}

function normalizeCookTime(v) {
  const s = normalizeText(v);
  return s || '20 分钟';
}

function normalizeServings(v) {
  const s = normalizeText(v);
  return s || '1-2 人份';
}

function normalizeDifficulty(v) {
  const s = normalizeText(v);
  return ALLOWED_DIFFICULTY.has(s) ? s : '简单';
}

function normalizeCalories(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.round(v));
  const n = Number(String(v || '').match(/-?\d+/)?.[0]);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function normalizeCategory(v) {
  const s = normalizeText(v);
  return ALLOWED_CATEGORY.has(s) ? s : '立即下厨';
}

function buildNote(category, optionalSeasonings, tools) {
  const opt = (optionalSeasonings || []).slice(0, 2).filter(Boolean);
  let base = category === '顺路买点' ? '顺路买点即可做' : '可直接做';
  if (category !== '顺路买点' && opt.length > 0) {
    base = `可直接做，加入 ${opt.join('、')} 口感更佳`;
  }
  const tool = normalizeText(tools?.[0]);
  if (tool) return `${base}；厨具已适配：按你现有的${tool}调整做法`;
  return base;
}

function computeTotalWeight(category, cookedCount) {
  const base = category === '立即下厨' ? 1000 : 500;
  const cooked = typeof cookedCount === 'number' && Number.isFinite(cookedCount) ? cookedCount : 0;
  return base + cooked * 5;
}

function validateRecipeContract(recipe) {
  const errors = [];
  if (!recipe || typeof recipe !== 'object') return { ok: false, errors: ['不是对象'] };

  const requiredTop = [
    'id','name','description','difficulty','cookTime','servings','calories',
    'mainIngredients','requiredSeasonings','optionalSeasonings','originalTools',
    'allIngredients','steps','tips','category','note','totalWeight','cookedCount'
  ];
  for (const k of requiredTop) {
    if (!(k in recipe)) errors.push(`缺字段:${k}`);
  }

  if (normalizeText(recipe.description).length > 25) errors.push('description 超过 25 字');
  if (!ALLOWED_DIFFICULTY.has(normalizeText(recipe.difficulty))) errors.push('difficulty 不合法');
  if (!ALLOWED_CATEGORY.has(normalizeText(recipe.category))) errors.push('category 不合法');

  const main = Array.isArray(recipe.mainIngredients) ? recipe.mainIngredients : null;
  const req = Array.isArray(recipe.requiredSeasonings) ? recipe.requiredSeasonings : null;
  const opt = Array.isArray(recipe.optionalSeasonings) ? recipe.optionalSeasonings : null;
  const tools = Array.isArray(recipe.originalTools) ? recipe.originalTools : null;
  const all = Array.isArray(recipe.allIngredients) ? recipe.allIngredients : null;
  const steps = Array.isArray(recipe.steps) ? recipe.steps : null;

  if (!main || main.length === 0) errors.push('mainIngredients 为空');
  if (!req) errors.push('requiredSeasonings 非数组');
  if (!opt) errors.push('optionalSeasonings 非数组');
  if (!tools || tools.length === 0) errors.push('originalTools 为空');
  if (!all) errors.push('allIngredients 非数组');
  if (!steps || steps.length === 0) errors.push('steps 为空');

  if (all) {
    const normMain = new Set((main || []).map(normalizeIngredientName));
    const normReq = new Set((req || []).map(normalizeIngredientName));
    const normOpt = new Set((opt || []).map(normalizeIngredientName));
    const normAll = new Set(all.map(it => normalizeIngredientName(it?.name)));

    for (const n of normMain) if (n && !normAll.has(n)) errors.push(`allIngredients 缺主料:${n}`);
    for (const n of normReq) if (n && !normAll.has(n)) errors.push(`allIngredients 缺必需:${n}`);
    for (const n of normOpt) if (n && !normAll.has(n)) errors.push(`allIngredients 缺可选:${n}`);

    for (const it of all) {
      if (!it || typeof it !== 'object') { errors.push('allIngredients 存在非对象'); continue; }
      const keys = Object.keys(it);
      if (keys.some(k => !['name','amount','note','isRequired'].includes(k))) errors.push(`allIngredients 存在多余字段:${normalizeText(it.name)}`);
      if (!normalizeText(it.name)) errors.push('allIngredients.name 为空');
      if (typeof it.amount !== 'string' || !normalizeText(it.amount)) errors.push(`allIngredients.amount 不合法:${normalizeText(it.name)}`);
      if (typeof it.note !== 'string') errors.push(`allIngredients.note 非字符串:${normalizeText(it.name)}`);
      if (typeof it.isRequired !== 'boolean') errors.push(`allIngredients.isRequired 非布尔:${normalizeText(it.name)}`);

      const n = normalizeIngredientName(it.name);
      if (normOpt.has(n) && it.isRequired !== false) errors.push(`可选物料标注错误:${normalizeText(it.name)}`);
      if ((normMain.has(n) || normReq.has(n)) && it.isRequired !== true) errors.push(`必需物料标注错误:${normalizeText(it.name)}`);
    }
  }

  if (steps) {
    for (const s of steps) {
      if (!s || typeof s !== 'object') { errors.push('steps 存在非对象'); continue; }
      const keys = Object.keys(s);
      if (keys.some(k => !['step','stage','action','heat','time','sensory','fullText'].includes(k))) errors.push('steps 存在多余字段');
      if (!Number.isFinite(s.step)) errors.push('steps.step 非数字');
      if (!ALLOWED_STAGE.has(normalizeText(s.stage))) errors.push(`steps.stage 不合法:${normalizeText(s.stage)}`);
      for (const k of ['action','heat','time','sensory','fullText']) {
        if (!normalizeText(s[k])) errors.push(`steps.${k} 为空`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function buildContractRecipeFromDbRow(row) {
  const id = normalizeText(row.id);
  const name = normalizeText(row.name);
  const description = normalizeDescription(row.description);
  const difficulty = normalizeDifficulty(row.difficulty);
  const cookTime = normalizeCookTime(row.cookTime);
  const servings = normalizeServings(row.servings);
  const calories = normalizeCalories(row.calories);

  const mainIngredients = toStringArray(row.mainIngredients);
  let requiredSeasonings = toStringArray(row.requiredSeasonings);
  let optionalSeasonings = toStringArray(row.optionalSeasonings);

  const originalTools = normalizeTools(row.originalTools, row.tools);

  const steps = normalizeSteps(row.steps);

  if (!Array.isArray(requiredSeasonings) || requiredSeasonings.length === 0) {
    const rawAll = safeJsonParse(row.allIngredients, []);
    const inferredReq = (Array.isArray(rawAll) ? rawAll : []).filter(it => it && typeof it === 'object' && it.isRequired === true)
      .map(it => normalizeText(it.name))
      .filter(Boolean)
      .map(normalizeIngredientName)
      .filter(n => n && !new Set(mainIngredients.map(normalizeIngredientName)).has(n));
    requiredSeasonings = Array.from(new Set(inferredReq));
  }

  if (!Array.isArray(optionalSeasonings) || optionalSeasonings.length === 0) {
    const rawAll = safeJsonParse(row.allIngredients, []);
    const inferredOpt = (Array.isArray(rawAll) ? rawAll : []).filter(it => it && typeof it === 'object' && it.isRequired === false)
      .map(it => normalizeText(it.name))
      .filter(Boolean)
      .map(normalizeIngredientName)
      .filter(Boolean);
    optionalSeasonings = Array.from(new Set(inferredOpt));
  }

  requiredSeasonings = requiredSeasonings.filter(n => !new Set(mainIngredients.map(normalizeIngredientName)).has(normalizeIngredientName(n)));
  optionalSeasonings = optionalSeasonings.filter(n => !new Set(mainIngredients.map(normalizeIngredientName)).has(normalizeIngredientName(n)));
  optionalSeasonings = optionalSeasonings.filter(n => !new Set(requiredSeasonings.map(normalizeIngredientName)).has(normalizeIngredientName(n)));

  const allIngredients = normalizeAllIngredients(row.allIngredients, mainIngredients, requiredSeasonings, optionalSeasonings);

  const tips = normalizeText(row.tips) || '趁热食用口感更佳';

  const category = normalizeCategory(row.category);
  const cookedCount = typeof row.cookedCount === 'number' && Number.isFinite(row.cookedCount) ? Math.max(0, Math.floor(row.cookedCount)) : 0;
  const totalWeight = Number.isFinite(row.totalWeight) ? Math.floor(row.totalWeight) : computeTotalWeight(category, cookedCount);
  const note = normalizeText(row.note) || buildNote(category, optionalSeasonings, originalTools);

  return {
    id,
    name,
    description,
    difficulty,
    cookTime,
    servings,
    calories,
    mainIngredients,
    requiredSeasonings,
    optionalSeasonings,
    originalTools,
    allIngredients,
    steps,
    tips,
    category,
    note,
    totalWeight,
    cookedCount
  };
}

function recipeToDbUpdateFields(contractRecipe, keepLegacyTools) {
  const mainIngredients = JSON.stringify(contractRecipe.mainIngredients || []);
  const requiredSeasonings = JSON.stringify(contractRecipe.requiredSeasonings || []);
  const optionalSeasonings = JSON.stringify(contractRecipe.optionalSeasonings || []);
  const originalTools = JSON.stringify(contractRecipe.originalTools || []);
  const allIngredients = JSON.stringify(contractRecipe.allIngredients || []);
  const steps = JSON.stringify(contractRecipe.steps || []);
  const tools = keepLegacyTools ? JSON.stringify(contractRecipe.originalTools || []) : undefined;

  return {
    name: contractRecipe.name,
    description: contractRecipe.description,
    calories: contractRecipe.calories,
    cookTime: contractRecipe.cookTime,
    servings: contractRecipe.servings,
    difficulty: contractRecipe.difficulty,
    mainIngredients,
    requiredSeasonings,
    optionalSeasonings,
    originalTools,
    tools,
    allIngredients,
    steps,
    tips: contractRecipe.tips,
    category: contractRecipe.category,
    note: contractRecipe.note,
    totalWeight: contractRecipe.totalWeight,
    cookedCount: contractRecipe.cookedCount
  };
}

module.exports = {
  validateRecipeContract,
  buildContractRecipeFromDbRow,
  recipeToDbUpdateFields
};
