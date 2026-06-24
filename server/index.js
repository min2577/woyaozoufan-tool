require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');
const config = require('./config');
const aiService = require('./services/aiService');

// 导入路由
const inventoryRoutes = require('./routes/inventory');
const recipesRoutes = require('./routes/recipes');
const analyticsRoutes = require('./routes/analytics');
const flowtraceRoutes = require('./routes/flowtrace');
const aiStatsRoutes = require('./routes/aiStats');
const adminRoutes = require('./routes/admin');
const { normalizeText, normalizeIngredientName, parseAmountUnit } = require('./utils/ingredientParser');
const { calculateTotalCalories, calculateTotalCaloriesAutoSupplement, nutritionDb } = require('./services/calorieCalculator');
const { logger, requestLogger } = require('./middleware/logger');
const { eventStreamMiddleware, createEventLogger } = require('./middleware/eventStream');

// 替换为支持事件流的 logger
const eventLogger = createEventLogger(logger);

const app = express();
const API_URL = config.ai.apiUrl;
const MODEL_ID = config.ai.modelId;
const API_KEY = config.ai.apiKey;
const SYSTEM_PROMPT = config.systemPrompt;

function normalizeAllIngredients(allIngredients) {
  const arr = Array.isArray(allIngredients) ? allIngredients : [];
  return arr.map((it) => {
    if (typeof it === 'string') {
      const name = normalizeText(it);
      // 对于字符串类型的食材，判断是否是调料，不是调料的话默认isRequired: false
      const isSeasoning = isSeasoningName(name);
      return { name, amount: null, unit: '', note: '', isRequired: false };
    }
    const name = normalizeText(it.name);
    const parsed = parseAmountUnit(it.amount, it.unit);
    return {
      name,
      amount: parsed.amount,
      unit: parsed.unit,
      note: normalizeText(it.note),
      isRequired: it.isRequired === true
    };
  });
}

function getReferenceAnchorNote(name) {
  const raw = normalizeText(name);
  if (!raw) return '';
  const direct = nutritionDb && nutritionDb[raw];
  if (direct && normalizeText(direct.reference_note)) return normalizeText(direct.reference_note);
  const n = normalizeIngredientName(raw);
  const byNorm = nutritionDb && nutritionDb[n];
  if (byNorm && normalizeText(byNorm.reference_note)) return normalizeText(byNorm.reference_note);
  return '';
}

// 厨具映射表 - 增强版
const toolMapping = {
  '炒锅': ['炒勺', '炒菜锅', '平底锅', '煎锅', 'wok', 'pan', 'skillet'],
  '蒸锅': ['蒸笼', '蒸屉', '蒸格', 'steamer'],
  '炖锅': ['砂锅', '煲汤锅', '焖锅', 'casserole'],
  '烤箱': ['烤炉', '电烤箱', 'oven'],
  '微波炉': ['光波炉', 'microwave'],
  '搅拌机': ['料理机', '破壁机', '榨汁机', 'blender', 'mixer'],
  '煮锅': ['汤锅', '锅', 'pot', 'soup-pot'],
  '空气炸锅': ['空气炸炉', 'air-fryer', 'airfryer'],
  '电饭煲': ['电饭锅', 'rice-cooker']
};

function canonicalizeTool(raw) {
  const norm = normalizeText(raw).toLowerCase();
  if (!norm) return raw;
  
  // 直接匹配
  for (const [standard, aliases] of Object.entries(toolMapping)) {
    if (standard === norm) return standard;
  }
  
  // 映射表匹配
  for (const [standard, aliases] of Object.entries(toolMapping)) {
    if (aliases.includes(norm)) return standard;
  }
  
  return raw;
}

function applyToolReplacement(userTools) {
  const set = new Set((Array.isArray(userTools) ? userTools : []).map(canonicalizeTool));
  const pick = (candidates) => candidates.find(x => set.has(x)) || candidates[candidates.length - 1];
  return {
    oven: pick(['空气炸锅', '炒锅']),
    steamer: pick(['煮锅']),
    casserole: pick(['汤锅'])
  };
}

function adaptStepsForTools(steps, replacement) {
  const replaceInText = (text) => {
    let s = String(text || '');
    if (replacement.oven) s = s.replace(/烤箱/g, replacement.oven);
    if (replacement.steamer) s = s.replace(/蒸锅/g, replacement.steamer);
    if (replacement.casserole) s = s.replace(/砂锅/g, replacement.casserole);
    return s;
  };

  if (!Array.isArray(steps)) return steps;
  return steps.map((step) => {
    if (typeof step === 'string') return replaceInText(step);
    if (!step || typeof step !== 'object') return step;
    return {
      ...step,
      stage: replaceInText(step.stage),
      action: replaceInText(step.action),
      heat: replaceInText(step.heat),
      time: replaceInText(step.time),
      sensory: replaceInText(step.sensory),
      fullText: replaceInText(step.fullText)
    };
  });
}

function isCompliantIngredients(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  // 放宽严格的数字校验，只要有名称和基本字段即可
  const normalized = normalizeAllIngredients(arr);
  return normalized.every(i => normalizeText(i.name));
}

function isCompliantSteps(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const first = arr[0];
  if (!first || typeof first !== 'object') return false;
  return ['action', 'heat', 'time', 'sensory', 'fullText'].every(k => normalizeText(first[k]));
}

function normalizeForMatch(raw) {
  return normalizeText(raw)
    .replace(/[（(].*?[)）]/g, '')
    .replace(/\s+/g, '')
    .replace(/[·•・]/g, '');
}

const MEAT_CUTS = {
  猪肉: [
    { canonical: '五花肉', aliases: ['五花', '三层肉', '肋条肉', '带皮五花肉'] },
    { canonical: '里脊', aliases: ['里脊肉', '猪里脊', '小里脊'] },
    { canonical: '排骨', aliases: ['猪排骨', '肋排', '小排', '大排'] },
    { canonical: '猪蹄', aliases: ['蹄膀', '猪脚', '猪手'] },
    { canonical: '猪肘', aliases: ['肘子', '猪肘子', '前肘', '后肘', '猪前肘', '猪后肘'] },
    { canonical: '猪耳', aliases: ['猪耳朵'] },
    { canonical: '猪头肉', aliases: ['头肉'] },
    { canonical: '猪皮', aliases: [] },
    { canonical: '猪腰', aliases: ['腰花'] },
    { canonical: '猪肝', aliases: [] },
    { canonical: '猪心', aliases: [] },
    { canonical: '猪肚', aliases: [] },
    { canonical: '肉末', aliases: ['猪肉末', '猪绞肉', '绞肉', '肉馅', '猪肉馅', '五花肉末'] },
    { canonical: '猪血', aliases: ['血旺', '猪红'] },
    { canonical: '梅花肉', aliases: ['猪梅花肉', '猪梅花'] },
    { canonical: '前腿肉', aliases: ['前腿', '猪前腿'] },
    { canonical: '后腿肉', aliases: ['后腿', '猪后腿'] },
  ],
  牛肉: [
    { canonical: '牛腩', aliases: [] },
    { canonical: '牛里脊', aliases: ['里脊', '里脊肉'] },
    { canonical: '牛腱', aliases: ['牛腱子'] },
    { canonical: '牛筋', aliases: [] },
    { canonical: '肥牛', aliases: ['肥牛卷', '牛肉卷'] },
    { canonical: '牛排', aliases: [] },
    { canonical: '牛骨', aliases: ['牛骨头'] },
    { canonical: '牛尾', aliases: ['牛尾巴'] },
  ],
  羊肉: [
    { canonical: '羊排', aliases: [] },
    { canonical: '羊腿肉', aliases: ['羊腿'] },
    { canonical: '羊里脊', aliases: ['里脊', '里脊肉'] },
    { canonical: '羊蝎子', aliases: [] },
    { canonical: '羊肉卷', aliases: ['羊肉片'] },
  ],
  鸡肉: [
    { canonical: '鸡胸', aliases: ['鸡胸肉'] },
    { canonical: '鸡腿', aliases: ['鸡腿肉', '琵琶腿'] },
    { canonical: '鸡翅', aliases: ['鸡翅中', '鸡翅根', '鸡全翅'] },
    { canonical: '鸡爪', aliases: ['凤爪'] },
    { canonical: '鸡胗', aliases: [] },
    { canonical: '鸡肝', aliases: [] },
    { canonical: '鸡心', aliases: [] },
    { canonical: '整鸡', aliases: ['全鸡', '土鸡', '三黄鸡'] },
    { canonical: '鸡架', aliases: ['鸡骨架'] },
  ],
  鸭肉: [
    { canonical: '鸭腿', aliases: ['鸭腿肉'] },
    { canonical: '鸭胸', aliases: ['鸭胸肉'] },
    { canonical: '鸭翅', aliases: ['鸭翅膀'] },
    { canonical: '鸭掌', aliases: [] },
    { canonical: '鸭胗', aliases: [] },
    { canonical: '整鸭', aliases: ['全鸭'] },
  ],
};

const MEAT_PARENTS = Object.keys(MEAT_CUTS);

const meatAliasEntries = (() => {
  const entries = [];
  for (const parent of MEAT_PARENTS) {
    for (const item of MEAT_CUTS[parent]) {
      const allAliases = new Set([item.canonical, ...(item.aliases || [])]);
      for (const alias of allAliases) {
        const key = normalizeForMatch(alias);
        if (!key) continue;
        entries.push({ aliasKey: key, parent, canonical: item.canonical });
      }
    }
  }
  return entries.sort((a, b) => b.aliasKey.length - a.aliasKey.length);
})();

function extractMeatTokens(rawText) {
  const s = normalizeForMatch(rawText);
  if (!s) return [];
  const tokens = [];
  for (const entry of meatAliasEntries) {
    if (s.includes(entry.aliasKey)) tokens.push({ parent: entry.parent, cut: entry.canonical });
  }
  if (tokens.length > 0) return tokens;
  for (const parent of MEAT_PARENTS) {
    const p = normalizeForMatch(parent);
    if (p && s.includes(p)) return [{ parent, cut: null }];
  }
  return [];
}

function normalizeToolToken(raw) {
  const s = normalizeForMatch(raw).toLowerCase();
  if (!s) return '';
  if (s === 'wok' || s.includes('炒锅') || s.includes('锅')) return 'wok';
  if (s === 'rice-cooker' || s.includes('电饭煲') || s.includes('电饭锅')) return 'rice-cooker';
  if (s === 'air-fryer' || s.includes('空气炸锅')) return 'air-fryer';
  if (s === 'oven' || s.includes('烤箱')) return 'oven';
  if (s === 'microwave' || s.includes('微波炉')) return 'microwave';
  if (s === 'blender' || s.includes('破壁机') || s.includes('料理机') || s.includes('搅拌机')) return 'blender';
  if (s === 'pressure-cooker' || s.includes('高压锅') || s.includes('压力锅')) return 'pressure-cooker';
  if (s === 'slow-cooker' || s.includes('慢炖锅')) return 'slow-cooker';
  if (s === 'steamer' || s.includes('蒸锅')) return 'steamer';
  if (s.includes('木炭') || s.includes('炭')) return 'grill';
  if (s.includes('烧烤') || s.includes('烤架') || s.includes('烤炉') || s.includes('bbq')) return 'grill';
  return s;
}

function inferRequiredToolsFromText(name, steps) {
  const nameText = normalizeForMatch(name);
  const stepText = normalizeForMatch(Array.isArray(steps) ? steps.join(' ') : '');
  const text = `${nameText} ${stepText}`.trim();
  if (!text) return [];

  const required = new Set();
  if (text.includes('电饭煲') || text.includes('电饭锅')) required.add('rice-cooker');
  if (text.includes('空气炸锅')) required.add('air-fryer');
  if (text.includes('烤箱')) required.add('oven');
  if (text.includes('微波炉')) required.add('microwave');
  if (text.includes('破壁机') || text.includes('料理机') || text.includes('搅拌机')) required.add('blender');
  if (text.includes('高压锅') || text.includes('压力锅')) required.add('pressure-cooker');
  if (text.includes('慢炖锅')) required.add('slow-cooker');
  if (text.includes('蒸锅') || text.includes('上锅蒸') || text.includes('蒸制')) required.add('steamer');

  const charcoalHit = text.includes('炭烤') || text.includes('炭火') || text.includes('木炭') || text.includes('烧烤炉') || text.includes('烤架');
  if (charcoalHit) {
    required.add('grill');
  }

  const stovetopHit =
    text.includes('炒') ||
    text.includes('翻炒') ||
    text.includes('爆香') ||
    text.includes('煎') ||
    text.includes('热锅') ||
    text.includes('大火') ||
    text.includes('小火') ||
    text.includes('煮') ||
    text.includes('炖') ||
    text.includes('焖');
  if (stovetopHit) required.add('wok');

  return Array.from(required);
}

function extractIngredientName(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') {
    const s = normalizeText(entry);
    if (!s) return '';
    const trimmed = s.trim();
    const firstPart = trimmed.split(/\s+/)[0];
    return firstPart || trimmed;
  }
  if (typeof entry === 'object' && typeof entry.name === 'string') return entry.name;
  return '';
}

function computeUserMeatInventory(body) {
  const ingredients = Array.isArray(body && body.ingredients) ? body.ingredients : [];
  const ingredientSelections = body && typeof body.ingredientSelections === 'object' && body.ingredientSelections !== null
    ? body.ingredientSelections
    : null;

  const genericMeatParents = new Set();
  const meatCutsByParent = {};
  for (const parent of MEAT_PARENTS) meatCutsByParent[parent] = new Set();

  for (const ing of ingredients) {
    const meatTokens = extractMeatTokens(ing);
    for (const t of meatTokens) {
      if (t.cut) meatCutsByParent[t.parent].add(t.cut);
      else genericMeatParents.add(t.parent);
    }
  }

  if (ingredientSelections) {
    for (const [rawParent, rawCuts] of Object.entries(ingredientSelections)) {
      const parentKey = MEAT_PARENTS.find((p) => normalizeForMatch(p) === normalizeForMatch(rawParent));
      if (!parentKey) continue;
      if (!Array.isArray(rawCuts)) continue;
      for (const rawCut of rawCuts) {
        const meatTokens = extractMeatTokens(rawCut);
        const hit = meatTokens.find((x) => x.parent === parentKey && x.cut);
        if (hit && hit.cut) meatCutsByParent[parentKey].add(hit.cut);
      }
    }
  }

  return { genericMeatParents, meatCutsByParent };
}

function isMeatRequirementSatisfied(reqToken, userMeat) {
  const { parent, cut } = reqToken;
  if (!MEAT_PARENTS.includes(parent)) return false;
  const selectedCuts = userMeat.meatCutsByParent[parent];
  if (cut) return selectedCuts && selectedCuts.has(cut);
  return (selectedCuts && selectedCuts.size > 0) || userMeat.genericMeatParents.has(parent);
}

function saveToLibrary(recipe, isOutrageous = false) {
  const table = isOutrageous ? 'OutrageousRecipes' : 'StandardRecipes';
  
  // 先检查是否已存在该菜谱
  let existingCookedCount = 0;
  let existingId = null;
  
  // 1. 按ID检查
  if (recipe.id) {
    const existing = db.prepare(`SELECT cookedCount FROM ${table} WHERE id = ?`).get(recipe.id);
    if (existing) {
      existingCookedCount = existing.cookedCount || 0;
      existingId = recipe.id;
    }
  }
  
  // 2. 如果按ID没找到，按菜名检查
  if (!existingId && recipe.name) {
    const existingByName = db.prepare(`SELECT id, cookedCount FROM ${table} WHERE name = ?`).get(recipe.name);
    if (existingByName) {
      existingCookedCount = existingByName.cookedCount || 0;
      existingId = existingByName.id;
      return existingId; // 菜名已存在，直接返回现有ID，不重复保存
    }
  }
  
  // 如果是新生成的菜谱，且不是草稿，将cookedCount设置为1，表示已经生成过一次
  const cookedCount = recipe.isDraft ? existingCookedCount : (existingCookedCount || 1);
  
  const stmt = isOutrageous
    ? db.prepare(`
        INSERT OR REPLACE INTO ${table} (
          id, name, description, calories, cookTime, servings, difficulty,
          mainIngredients, requiredSeasonings, optionalSeasonings, tools, originalTools,
          allIngredients, steps, tips, professionalAnalysis, category, note, totalWeight, cookedCount, isDraft
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
    : db.prepare(`
        INSERT OR REPLACE INTO ${table} (
          id, name, description, calories, cookTime, servings, difficulty,
          mainIngredients, requiredSeasonings, optionalSeasonings, tools, originalTools,
          allIngredients, steps, tips, category, note, totalWeight, cookedCount, isDraft
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

  const id = recipe.id || `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const mainIngredients = JSON.stringify(recipe.mainIngredients || []);
  const requiredSeasonings = JSON.stringify(recipe.requiredSeasonings || []);
  const optionalSeasonings = JSON.stringify(recipe.optionalSeasonings || []);
  const tools = JSON.stringify(recipe.tools || []);
  const originalTools = JSON.stringify(recipe.originalTools || recipe.tools || []);
  const allIngredients = JSON.stringify(normalizeAllIngredients(recipe.allIngredients));
  const steps = JSON.stringify(recipe.steps || []);
  const isDraft = recipe.isDraft ? 1 : 0;

  if (isOutrageous) {
    stmt.run(
      id,
      recipe.name,
      recipe.description || '',
      recipe.calories || 0,
      recipe.cookTime || '',
      recipe.servings || '1人份',
      recipe.difficulty || '简单',
      mainIngredients,
      requiredSeasonings,
      optionalSeasonings,
      tools,
      originalTools,
      allIngredients,
      steps,
      recipe.tips || '',
      recipe.professionalAnalysis || '',
      recipe.category || '',
      recipe.note || '',
      Number.isFinite(recipe.totalWeight) ? recipe.totalWeight : 0,
      cookedCount,
      isDraft
    );
  } else {
    stmt.run(
      id,
      recipe.name,
      recipe.description || '',
      recipe.calories || 0,
      recipe.cookTime || '',
      recipe.servings || '1人份',
      recipe.difficulty || '简单',
      mainIngredients,
      requiredSeasonings,
      optionalSeasonings,
      tools,
      originalTools,
      allIngredients,
      steps,
      recipe.tips || '',
      recipe.category || '',
      recipe.note || '',
      Number.isFinite(recipe.totalWeight) ? recipe.totalWeight : 0,
      cookedCount,
      isDraft
    );
  }
  return id;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const configured = config.cors?.origin;
    // Wildcard allows any origin
    if (configured === '*' || configured === true) return callback(null, true);
    // Array of allowed origins
    if (Array.isArray(configured) && configured.includes(origin)) return callback(null, true);
    // Always allow localhost for dev
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    // Fallback: allow (we trust public origins for this demo)
    return callback(null, true);
  },
  methods: Array.isArray(config.cors?.methods) ? config.cors.methods : ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: Array.isArray(config.cors?.allowedHeaders) ? config.cors.allowedHeaders : ['Content-Type'],
  exposedHeaders: Array.isArray(config.cors?.exposedHeaders) ? config.cors.exposedHeaders : [],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// 使用路由
app.use('/api/inventory', inventoryRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/flowtrace', flowtraceRoutes);
app.use('/api/ai-stats', aiStatsRoutes);
app.use('/api/admin', adminRoutes);

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', 'public')));

// 添加实时事件流端点
app.get('/api/event-stream', eventStreamMiddleware);

// 添加日志页面路由
app.get('/logs', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'logs.html'));
});

// 添加调试工具页面路由
app.get('/debug', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'debug.html'));
});

// 加载菜谱路由
const recipesRouter = require('./routes/recipes');
app.use('/api/recipes', recipesRouter);

// 加载管理后台路由
const adminRouter = require('./routes/admin');
app.use('/api/admin', adminRouter);

// 加载流程追踪路由
const flowtraceRouter = require('./routes/flowtrace');
app.use('/api/admin/flowtrace', flowtraceRouter);

// 加载AI统计路由
const aiStatsRouter = require('./routes/aiStats');
app.use('/api/admin/ai', aiStatsRouter);

const PORT = process.env.PORT || config.server.port;

app.get('/health', (req, res) => {
  res.json({ ok: true, model: MODEL_ID });
});

app.get('/api/ai/status', (req, res) => {
  res.json({
    volcengine: { configured: !!config.ai?.apiKey, modelId: config.ai?.modelId || '' },
    qwen: { configured: !!config.qwen?.apiKey, modelId: config.qwen?.modelId || '' }
  });
});

function safeJsonParse(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function normalizeSeasoningDisplayName(name) {
  const s = normalizeText(name).replace(/[（(].*?[)）]/g, '').trim();
  if (!s) return '';
  const m = s.match(/^(.+?)(\d+(?:\.\d+)?)(克|g|ml|毫升|千克|kg|颗|根|汤匙|茶匙|勺|片|段|把|个|只|条|块|滴|杯|碗).*/i);
  if (m && m[1]) return m[1].trim();
  return s;
}

// Enhanced seasoning regex pattern
const seasoningHintRegex = /(盐|糖|抽|酱油|醋|酒|蚝油|豆瓣|甜面酱|黄豆酱|番茄酱|沙拉酱|芥末|蜂蜜|芝麻酱|花生酱|咖喱|味精|鸡精|胡椒|花椒|辣椒|孜然|八角|桂皮|香叶|陈皮|五香粉|十三香|香油|芝麻油|淀粉|小苏打|泡打粉|酵母|高汤|浓汤宝|葱|姜|蒜|豉|酱|粉|油|汁|膏|生抽|老抽|料酒|食用油|白醋|陈醋|米醋|白酒|黄酒|米酒|啤酒|豆瓣酱|辣椒酱|辣椒油|花椒油|藤椒油|芥末油|橄榄油|菜籽油|花生油|大豆油|玉米油|葵花籽油|黄油|猪油|鸡油|香油|淀粉|生粉|玉米淀粉|土豆淀粉|红薯淀粉|太白粉|小苏打|泡打粉|酵母粉|干酵母|鲜酵母|高汤精|浓汤宝|浓缩汤料|鸡精|味精|味素)$/;

// Improved seasoning name recognition function
function isSeasoningName(name) {
  const s = normalizeSeasoningDisplayName(name).replace(/[（(].*?[)）]/g, '').trim();
  if (!s) return false;
  if (['清水', '温水', '热水', '凉水', '冰水', '纯净水'].includes(s)) return false;
  if (s === '茶叶' || s === '红茶' || s === '绿茶') return true;
  if (seasoningHintRegex.test(s)) return true;
  const hitWords = [
    '生抽','老抽','酱油','蚝油','醋','料酒','黄酒','米酒','白酒','啤酒',
    '豆瓣','郫县','甜面酱','黄豆酱','番茄酱','沙拉酱','芥末','蜂蜜','芝麻酱','花生酱','咖喱',
    '胡椒','花椒','辣椒','孜然','八角','桂皮','香叶','陈皮','草果','丁香','小茴香','五香粉','十三香',
    '盐','糖','味精','鸡精','香油','芝麻油','淀粉','小苏打','泡打粉','酵母',
    '葱','姜','生姜','蒜','大蒜','蒜末','姜末','葱花','葱段','葱结','姜片','蒜片','香菜',
    '高汤','浓汤宝','汤底','豉','豆豉','红油','辣子','食用油','白醋','陈醋','米醋',
    '豆瓣酱','辣椒酱','辣椒油','花椒油','藤椒油','芥末油','橄榄油','菜籽油','花生油',
    '大豆油','玉米油','葵花籽油','黄油','猪油','鸡油','淀粉','生粉','玉米淀粉',
    '土豆淀粉','红薯淀粉','太白粉','小苏打','泡打粉','酵母粉','干酵母','鲜酵母',
    '高汤精','浓汤宝','浓缩汤料','鸡精','味精','味素'
  ];
  return hitWords.some((w) => s.includes(w));
}

// （动态库提取接口已废弃，相关代码移至 backup/redundant_api.js）


// 这里原本是错误的 detailJson，现已删除，统一由下方处理

// 库存API接口已移至 routes/inventory.js

// 核心匹配接口 V2.0
app.post('/api/match', async (req, res) => {
  try {
    const { ingredients = [], seasonings = {}, tools = [], mode = 'standard', page = 1 } = req.body || {};
    
    // 详细匹配过程日志 - 确保所有日志都显示在后端窗口
    console.log('\n📋 开始食谱匹配');
    console.log(`   模式: ${mode}`);
    console.log(`   食材数: ${ingredients.length}`);
    console.log(`   食材列表: ${ingredients.join(', ')}`);
    console.log(`   厨具数: ${tools.length}`);
    console.log(`   厨具列表: ${tools.join(', ')}`);
    console.log(`   可用调料数: ${Object.keys(seasonings || {}).filter(k => seasonings[k]).length}`);
    console.log(`   可用调料列表: ${Object.keys(seasonings || {}).filter(k => seasonings[k]).join(', ')}`);
    console.log('');
    
    // 同时使用 process.stderr.write 确保立即输出
    process.stderr.write('\n📋 开始食谱匹配\n');
    process.stderr.write(`   模式: ${mode}\n`);
    process.stderr.write(`   食材数: ${ingredients.length}\n`);
    process.stderr.write(`   食材列表: ${ingredients.join(', ')}\n`);
    process.stderr.write(`   厨具数: ${tools.length}\n`);
    process.stderr.write(`   厨具列表: ${tools.join(', ')}\n`);
    process.stderr.write(`   可用调料数: ${Object.keys(seasonings || {}).filter(k => seasonings[k]).length}\n`);
    process.stderr.write(`   可用调料列表: ${Object.keys(seasonings || {}).filter(k => seasonings[k]).join(', ')}\n`);
    process.stderr.write('\n');
    
    // 新增日志：打印后端真正收到的 ingredients 参数
    process.stderr.write(`[Match API] 接收到的食材: ${ingredients.join(', ')}\n`);

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'ingredients_required' });
    }
    if (!Array.isArray(tools) || tools.length === 0) {
      return res.status(400).json({ error: 'tools_required' });
    }

    const isOutrageous = mode === 'outrageous';
    const table = isOutrageous ? 'OutrageousRecipes' : 'StandardRecipes';

    // 完全废弃 userMeat 相关的计算，切断所有跨肉类匹配的可能性
    const userIng = new Set(ingredients.map(normalizeIngredientName).filter(Boolean));
    const userSe = new Set(Object.keys(seasonings || {}).filter(k => seasonings[k]).map(normalizeIngredientName).filter(Boolean));
    const seasoningUniverse = new Set(Object.keys(seasonings || {}).map(normalizeIngredientName).filter(Boolean));
    const userToolTokens = new Set((Array.isArray(tools) ? tools : []).map(normalizeToolToken).filter(Boolean));
    
    // 查询用户库存频率数据
    eventLogger.db('查询用户库存频率数据', { table: 'UserInventory', filter: 'clickFrequency > 0' });
    const freqRows = db.prepare('SELECT ingredientName, clickFrequency FROM UserInventory WHERE clickFrequency > 0').all();
    const freqMap = new Map();
    for (const r of freqRows) {
      const k = normalizeText(r.ingredientName).trim();
      if (!k) continue;
      const v = Number(r.clickFrequency) || 0;
      if (v > 0) freqMap.set(k, v);
    }
    eventLogger.db('用户库存频率数据查询完成', { count: freqRows.length });

    // 查询食谱库
    console.log('🔍 查询食谱库');
    console.log(`   表名: ${table}`);
    process.stderr.write('🔍 查询食谱库\n');
    process.stderr.write(`   表名: ${table}\n`);
    eventLogger.db(`查询${table}食谱库`, { table });
    const allRecipes = db.prepare(`SELECT * FROM ${table}`).all();
    eventLogger.db('食谱库查询完成', { count: allRecipes.length });
    console.log(`   食谱总数: ${allRecipes.length} 道`);
    console.log('');
    process.stderr.write(`   食谱总数: ${allRecipes.length} 道\n`);
    process.stderr.write('\n');

    const formatRow = (row) => {
      let mainIngs = [];
      let requiredSeasoningsRaw = [];
      let allIngsRaw = [];
      let stepsRaw = [];
      let originalToolsRaw = [];
      try { mainIngs = JSON.parse(row.mainIngredients || '[]'); } catch {}
      try { requiredSeasoningsRaw = JSON.parse(row.requiredSeasonings || '[]'); } catch {}
      try { allIngsRaw = JSON.parse(row.allIngredients || '[]'); } catch {}
      try { stepsRaw = JSON.parse(row.steps || '[]'); } catch {}
      try { originalToolsRaw = JSON.parse(row.originalTools || row.tools || '[]'); } catch {}

      const mainNorm = mainIngs.map(normalizeIngredientName).filter(Boolean);
      if (mainNorm.length === 0) return null;

      // 【第一关：食材匹配】菜谱主料必须完全存在于用户选择的食材中，不包含任何未选食材。
      const matchStep = `食材匹配：检查菜谱 '${row.name}'`;
      console.log(`   ${matchStep}`);
      console.log(`     开始检查菜谱主料是否完全存在于用户选择的食材中`);
      process.stderr.write(`   ${matchStep}\n`);
      process.stderr.write(`     开始检查菜谱主料是否完全存在于用户选择的食材中\n`);
      
      const userIngredients = Array.from(userIng);
      const recipeMainIngredients = mainNorm;
      console.log(`     用户选择的食材: [${userIngredients.join(', ')}]`);
      console.log(`     菜谱所需主料: [${recipeMainIngredients.join(', ')}]`);
      process.stderr.write(`     用户选择的食材: [${userIngredients.join(', ')}]\n`);
      process.stderr.write(`     菜谱所需主料: [${recipeMainIngredients.join(', ')}]\n`);
      
      let isMainMatched = true;
      let missingMainIngs = [];
      for (const ing of recipeMainIngredients) {
          if (!userIng.has(ing)) {
              isMainMatched = false;
              missingMainIngs.push(ing);
              console.log(`     ❌ 缺少主料：${ing}`);
              process.stderr.write(`     ❌ 缺少主料：${ing}\n`);
              break;
          } else {
              console.log(`     ✅ 主料匹配：${ing}`);
              process.stderr.write(`     ✅ 主料匹配：${ing}\n`);
          }
      }
      
      if (isMainMatched) {
          console.log(`     ✅ 食材匹配成功`);
          process.stderr.write(`     ✅ 食材匹配成功\n`);
      } else {
          console.log(`     ❌ 食材匹配失败：缺少主料 ${missingMainIngs.join(', ')}`);
          process.stderr.write(`     ❌ 食材匹配失败：缺少主料 ${missingMainIngs.join(', ')}\n`);
      }
      
      // 如果主料匹配，检查其他食材是否缺失（用于分类判断）
      let missingOtherIngs = [];
      if (isMainMatched) {
        const allIngs = normalizeAllIngredients(allIngsRaw);
        for (const ing of allIngs) {
          const n = normalizeIngredientName(ing.name);
          if (!n || n === '清水') continue;
          // 跳过主料（已经检查过）和调料（后续检查）
          if (mainNorm.includes(n) || isSeasoningName(n)) continue;
          if (!userIng.has(n)) {
            missingOtherIngs.push(ing.name);
            console.log(`     ⚠️  缺少其他食材：${ing.name}`);
            process.stderr.write(`     ⚠️  缺少其他食材：${ing.name}\n`);
          }
        }
      }
      
      if (!isMainMatched) return null; // 直接丢弃

      // 【第二关：厨具匹配】在食材全中的前提下，你家里的锅必须能做这道菜（允许烤箱降级为空气炸锅等安全替换）。
      const toolMatchStep = `厨具匹配：检查菜谱 '${row.name}'`;
      console.log(`   ${toolMatchStep}`);
      console.log(`     开始检查用户是否有合适的厨具，支持安全替换`);
      process.stderr.write(`   ${toolMatchStep}\n`);
      process.stderr.write(`     开始检查用户是否有合适的厨具，支持安全替换\n`);
      
      const requiredToolsBase = (() => {
        const fromRow = (Array.isArray(originalToolsRaw) ? originalToolsRaw : [])
          .map((x) => normalizeToolToken(x))
          .filter(Boolean);
        if (fromRow.length > 0) {
          const tools = Array.from(new Set(fromRow));
          console.log(`     菜谱所需厨具(从数据中获取): [${tools.join(', ')}]`);
          process.stderr.write(`     菜谱所需厨具(从数据中获取): [${tools.join(', ')}]\n`);
          return tools;
        }
        const inferredTools = inferRequiredToolsFromText(row.name, stepsRaw);
        console.log(`     菜谱所需厨具(自动推断): [${inferredTools.join(', ')}]`);
        process.stderr.write(`     菜谱所需厨具(自动推断): [${inferredTools.join(', ')}]\n`);
        return inferredTools;
      })();
      
      const userTools = Array.from(userToolTokens);
      console.log(`     用户拥有的厨具: [${userTools.join(', ')}]`);
      process.stderr.write(`     用户拥有的厨具: [${userTools.join(', ')}]\n`);

      const substitutions = [];
      let missingTool = false;
      const missingToolList = [];
      const requiredTools = requiredToolsBase.map((t) => {
        if (userToolTokens.has(t)) {
          console.log(`     ✅ 厨具匹配成功：${t}`);
          process.stderr.write(`     ✅ 厨具匹配成功：${t}\n`);
          return t;
        }
        if (t === 'oven' && userToolTokens.has('air-fryer')) { 
          substitutions.push({ from: '烤箱', to: '空气炸锅' }); 
          console.log(`     ✅ 厨具匹配成功(替换): 烤箱 → 空气炸锅`);
          process.stderr.write(`     ✅ 厨具匹配成功(替换): 烤箱 → 空气炸锅\n`);
          return 'air-fryer'; 
        }
        if (t === 'oven' && userToolTokens.has('wok')) { 
          substitutions.push({ from: '烤箱', to: '炒锅' }); 
          console.log(`     ✅ 厨具匹配成功(替换): 烤箱 → 炒锅`);
          process.stderr.write(`     ✅ 厨具匹配成功(替换): 烤箱 → 炒锅\n`);
          return 'wok'; 
        }
        if (t === 'steamer' && userToolTokens.has('wok')) { 
          substitutions.push({ from: '蒸锅', to: '炒锅' }); 
          console.log(`     ✅ 厨具匹配成功(替换): 蒸锅 → 炒锅`);
          process.stderr.write(`     ✅ 厨具匹配成功(替换): 蒸锅 → 炒锅\n`);
          return 'wok'; 
        }
        if (t === 'casserole' && userToolTokens.has('soup-pot')) { 
          substitutions.push({ from: '砂锅', to: '汤锅' }); 
          console.log(`     ✅ 厨具匹配成功(替换): 砂锅 → 汤锅`);
          process.stderr.write(`     ✅ 厨具匹配成功(替换): 砂锅 → 汤锅\n`);
          return 'soup-pot'; 
        }
        missingTool = true;
        missingToolList.push(t);
        console.log(`     ❌ 厨具匹配失败：缺少 ${t}`);
        process.stderr.write(`     ❌ 厨具匹配失败：缺少 ${t}\n`);
        return t;
      });

      if (missingTool) {
          console.log(`   ❌ 厨具匹配失败：缺少必需厨具 ${missingToolList.join(', ')}`);
          process.stderr.write(`   ❌ 厨具匹配失败：缺少必需厨具 ${missingToolList.join(', ')}\n`);
          return null; // 直接丢弃
      } else {
          if (substitutions.length > 0) {
              console.log(`   ✅ 厨具匹配成功，包含 ${substitutions.length} 个替换`);
              process.stderr.write(`   ✅ 厨具匹配成功，包含 ${substitutions.length} 个替换\n`);
          } else {
              console.log(`   ✅ 厨具匹配成功`);
              process.stderr.write(`   ✅ 厨具匹配成功\n`);
          }
      }

      // 【第三关：调料匹配】在锅也能用的前提下，这道菜必须的调料你必须全都有。
      const seasoningMatchStep = `调料匹配：检查菜谱 '${row.name}'`;
      console.log(`   ${seasoningMatchStep}`);
      console.log(`     开始检查用户是否有必须的调料，支持降级分类`);
      process.stderr.write(`   ${seasoningMatchStep}\n`);
      process.stderr.write(`     开始检查用户是否有必须的调料，支持降级分类\n`);
      
      let isSeasoningMatched = true;
      const missingRequiredSeasonings = [];
      
      // 我们从 requiredSeasonings 字段和 allIngredients 里的 isRequired 综合判断调料
      const allIngs = normalizeAllIngredients(allIngsRaw);
      const reqSeasoningNames = new Set(requiredSeasoningsRaw.map(normalizeIngredientName).filter(Boolean));
      
      const userSeasonings = Array.from(userSe);
      console.log(`     用户拥有的调料: [${userSeasonings.join(', ')}]`);
      process.stderr.write(`     用户拥有的调料: [${userSeasonings.join(', ')}]\n`);
      
      console.log(`     菜谱明确要求的调料: [${requiredSeasoningsRaw.join(', ')}]`);
      process.stderr.write(`     菜谱明确要求的调料: [${requiredSeasoningsRaw.join(', ')}]\n`);
      
      // 收集所有必须的调料信息
      const allRequiredSeasonings = [];
      allIngs.forEach(i => {
        if (!i.isRequired) return;
        const n = normalizeIngredientName(i.name);
        if (!n || n === '清水' || mainNorm.includes(n)) return;
        if (isSeasoningName(n)) {
          allRequiredSeasonings.push({ original: i.name, normalized: n });
        }
      });
      
      console.log(`     从配料中提取的必须调料: [${allRequiredSeasonings.map(s => s.original).join(', ')}]`);
      process.stderr.write(`     从配料中提取的必须调料: [${allRequiredSeasonings.map(s => s.original).join(', ')}]\n`);
      
      // 1. 检查所有标记为必须的调料是否都被用户选择
      allIngs.forEach(i => {
        if (!i.isRequired) return;
        const n = normalizeIngredientName(i.name);
        if (!n || n === '清水' || mainNorm.includes(n)) return;
        // 只要是调料，不管是否在requiredSeasonings中，都必须检查
        if (isSeasoningName(n)) {
          if (userSe.has(n)) {
            console.log(`     ✅ 调料匹配成功：${i.name} (${n})`);
            process.stderr.write(`     ✅ 调料匹配成功：${i.name} (${n})\n`);
          } else {
            console.log(`     ❌ 调料匹配失败：缺少必须调料 ${i.name} (${n})`);
            process.stderr.write(`     ❌ 调料匹配失败：缺少必须调料 ${i.name} (${n})\n`);
            missingRequiredSeasonings.push(i);
          }
        }
      });
      
      // 2. 额外检查requiredSeasonings中的调料，确保所有明确要求的调料都被用户选择
      requiredSeasoningsRaw.forEach(seasoning => {
        const n = normalizeIngredientName(seasoning);
        if (n) {
          if (userSe.has(n)) {
            console.log(`     ✅ 明确要求调料匹配成功：${seasoning} (${n})`);
            process.stderr.write(`     ✅ 明确要求调料匹配成功：${seasoning} (${n})\n`);
          } else {
            // 查找对应的配料信息，用于错误提示
            const matchingIng = allIngs.find(i => normalizeIngredientName(i.name) === n);
            if (matchingIng) {
              console.log(`     ❌ 明确要求调料匹配失败：缺少 ${seasoning} (${n})`);
              process.stderr.write(`     ❌ 明确要求调料匹配失败：缺少 ${seasoning} (${n})\n`);
              missingRequiredSeasonings.push(matchingIng);
            } else {
              console.log(`     ❌ 明确要求调料匹配失败：缺少 ${seasoning} (${n})`);
              process.stderr.write(`     ❌ 明确要求调料匹配失败：缺少 ${seasoning} (${n})\n`);
              missingRequiredSeasonings.push({ name: seasoning, isRequired: true });
            }
          }
        }
      });
      
      // 3. 过滤掉用户已经拥有的调料，避免重复添加到 missing 列表中
      const filteredMissingRequiredSeasonings = missingRequiredSeasonings.filter(i => {
        const n = normalizeIngredientName(i.name);
        return !userSe.has(n);
      });
      
      // 根据过滤后的结果更新 isSeasoningMatched
      isSeasoningMatched = filteredMissingRequiredSeasonings.length === 0;
      
      // 3. 处理特殊情况：如果allIngredients是空的，我们无法确定调料需求，保守处理
      if (allIngs.length === 0) {
        console.log(`     ⚠️  注意：菜谱缺少配料信息，使用保守判断`);
        process.stderr.write(`     ⚠️  注意：菜谱缺少配料信息，使用保守判断\n`);
        // 如果没有配料信息，我们假设它需要基本调料
        // 只有当用户选择了足够多的调料时，才可能匹配
        const seList = Object.keys(seasonings || {}).filter((k) => seasonings[k]);
        console.log(`     用户选择的调料数量：${seList.length} 种`);
        process.stderr.write(`     用户选择的调料数量：${seList.length} 种\n`);
        // 如果用户选择的调料少于3种，保守分类为顺路买点
        if (seList.length < 3) {
          console.log(`     ⚠️  调料数量少于3种，保守分类为顺路买点`);
          process.stderr.write(`     ⚠️  调料数量少于3种，保守分类为顺路买点\n`);
          isSeasoningMatched = false;
        }
      }
      
      // 4. 去重filteredMissingRequiredSeasonings
      const uniqueMissing = [];
      const seenNames = new Set();
      filteredMissingRequiredSeasonings.forEach(ms => {
        const normalizedName = normalizeIngredientName(ms.name);
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          uniqueMissing.push(ms);
        }
      });
      
      // 根据去重后的结果再次更新 isSeasoningMatched
      isSeasoningMatched = uniqueMissing.length === 0;
      
      // 5. 处理草稿状态：如果是草稿，我们根据用户调料数量进行保守判断
      const isDraft = !!row.isDraft;
      if (isDraft) {
        console.log(`     ⚠️  注意：菜谱是草稿状态，使用保守判断`);
        process.stderr.write(`     ⚠️  注意：菜谱是草稿状态，使用保守判断\n`);
        // 对于草稿，我们假设它可能需要基本调料
        // 如果用户的调料非常少，我们保守地将其分类为顺路买点
        const seList = Object.keys(seasonings || {}).filter((k) => seasonings[k]);
        console.log(`     用户选择的调料数量：${seList.length} 种`);
        process.stderr.write(`     用户选择的调料数量：${seList.length} 种\n`);
        if (seList.length < 3 && isSeasoningMatched) {
          // 用户调料太少，即使看起来匹配，我们也保守处理
          console.log(`     ⚠️  草稿菜谱且调料数量少于3种，降级为顺路买点`);
          process.stderr.write(`     ⚠️  草稿菜谱且调料数量少于3种，降级为顺路买点\n`);
          isSeasoningMatched = false;
        }
      }
      
      // 6. 最终判断：如果缺少任何必须的调料，降级为"顺路买点"
      // 但只保留缺1-2样常见调料的菜谱，否则直接丢弃
      if (!isSeasoningMatched) {
          console.log(`     ⚠️  缺少必须调料，进行降级判断`);
          process.stderr.write(`     ⚠️  缺少必须调料，进行降级判断\n`);
          console.log(`     缺少的调料数量：${uniqueMissing.length} 种`);
          process.stderr.write(`     缺少的调料数量：${uniqueMissing.length} 种\n`);
          // 如果只缺 1-2 样常见调料，降级为顺路买点
          if (uniqueMissing.length <= 2) {
              console.log(`     缺少调料数量在可接受范围内（1-2种）`);
              process.stderr.write(`     缺少调料数量在可接受范围内（1-2种）\n`);
              // 判断是否是常见调料
              const commonSeasons = ['盐', '糖', '生抽', '老抽', '料酒', '葱', '姜', '蒜', '油', '食用油', '醋', '鸡精', '味精', '淀粉'];
              const isAllCommon = uniqueMissing.every(s => {
                const normalizedName = normalizeIngredientName(s.name);
                const result = commonSeasons.includes(normalizedName) || commonSeasons.includes(s.name);
                console.log(`     ${s.name} (${normalizedName}) 是否为常见调料：${result}`);
                process.stderr.write(`     ${s.name} (${normalizedName}) 是否为常见调料：${result}\n`);
                return result;
              });
              if (!isAllCommon) {
                console.log(`     ❌ 包含非常见调料，直接丢弃`);
                process.stderr.write(`     ❌ 包含非常见调料，直接丢弃\n`);
                return null; // 包含非常见调料，直接丢弃
              }
          } else {
              console.log(`     ❌ 缺少调料数量过多（超过2种），直接丢弃`);
              process.stderr.write(`     ❌ 缺少调料数量过多（超过2种），直接丢弃\n`);
              return null; // 缺太多，直接丢弃
          }
      }
      
      // 7. 如果缺少其他食材（非主料非调料），直接丢弃
      if (missingOtherIngs.length > 0) {
        console.log(`     ❌ 缺少非主料食材 ${missingOtherIngs.join(', ')}，直接丢弃`);
        process.stderr.write(`     ❌ 缺少非主料食材 ${missingOtherIngs.join(', ')}，直接丢弃\n`);
        return null;
      }
      
      const category = '立即下厨';
      const finalMissingRequired = uniqueMissing;
      
      console.log(`   调料匹配结果：${isSeasoningMatched ? '✅ 所有必须调料都已拥有' : '⚠️  缺少部分常见调料'}`);
      console.log(`   最终分类：${category}`);
      process.stderr.write(`   调料匹配结果：${isSeasoningMatched ? '✅ 所有必须调料都已拥有' : '⚠️  缺少部分常见调料'}\n`);
      process.stderr.write(`   最终分类：${category}\n`);
      
      // 如果缺少调料，直接丢弃
      if (finalMissingRequired.length > 0) {
        console.log(`     ❌ 缺少调料 ${finalMissingRequired.map(s => s.name).join(', ')}，直接丢弃`);
        process.stderr.write(`     ❌ 缺少调料 ${finalMissingRequired.map(s => s.name).join(', ')}，直接丢弃\n`);
        return null;
      }

      const missingRequired = finalMissingRequired;

      const missingOptional = allIngs
        .filter(i => i.isRequired === false)
        .filter(i => {
          const n = normalizeIngredientName(i.name);
          if (!n) return false;
          if (n === '清水') return false;
          return !userIng.has(n) && !userSe.has(n);
        })
        .map(i => i.name)
        .slice(0, 3);

      let stepsText = Array.isArray(stepsRaw)
        ? stepsRaw.map(s => (typeof s === 'string' ? s : (s.fullText || ''))).filter(Boolean)
        : [];
      if (substitutions.length > 0) {
        stepsText = stepsText.map((s) => {
          let out = String(s);
          for (const sub of substitutions) {
            if (sub.from && sub.to) out = out.replaceAll(sub.from, sub.to);
          }
          return out;
        });
      }

      const noteParts = [];
      if (category === '立即下厨') {
        if (missingOptional.length === 0) noteParts.push('可直接做');
        else noteParts.push(`可直接做，加入 ${missingOptional.join('、')} 口感更佳`);
      } else {
        noteParts.push(`缺少：${missingRequired.map(x => x.name).join('、')}（顺路购买即可做）`);
      }
      if (substitutions.length > 0) {
        const toNames = Array.from(new Set(substitutions.map((x) => normalizeText(x.to)).filter(Boolean)));
        const toDisplay = toNames.length > 0 ? toNames.join('、') : '现有厨具';
        noteParts.push(`厨具已适配：按你现有的${toDisplay}调整做法`);
      }

      const categoryWeight = category === '立即下厨' ? 1000 : 500;
      const clickKeys = new Set();
      for (const x of mainIngs) {
        const k = normalizeText(x).trim();
        if (k) clickKeys.add(k);
      }
      for (const t of requiredTools) {
        const k = normalizeText(t).trim();
        if (k) clickKeys.add(k);
      }
      let clickScoreRaw = 0;
      for (const k of clickKeys) clickScoreRaw += (freqMap.get(k) || 0);
      const cookedScore = (row.cookedCount || 0) * 5;
      const clickScore = clickScoreRaw * 50;
      const totalWeight = categoryWeight + cookedScore + clickScore;

      // 生成missing字段，显示具体需要购买的食材或调料
      // 过滤掉用户已经拥有的调料，确保只显示真正缺少的东西
      // 对于"立即下厨"分类，只显示必须的缺少调料；对于"顺路买点"分类，显示所有缺少的调料
      const missing = isSeasoningMatched 
        ? [] // 立即下厨：不显示缺少的调料，因为所有必须的调料都已拥有
        : [...finalMissingRequired.map(i => i.name), ...missingOptional]
            .filter(Boolean)
            .filter(item => {
              const normalizedName = normalizeIngredientName(item);
              // 检查用户是否已经拥有该调料
              return !userSe.has(normalizedName);
            });

      const calorieResult = calculateTotalCalories(allIngs, { warnMissing: true });
      const totalCalories = calorieResult.total || row.calories || 0;
      const calorieDetails = Array.isArray(calorieResult.details) ? calorieResult.details : [];

      return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        calories: totalCalories,
        cookTime: row.cookTime || '',
        servings: row.servings || '1人份',
        difficulty: row.difficulty || '简单',
        mainIngredients: mainIngs,
        allIngredients: allIngs.map((i, idx) => ({
          name: i.name,
          amount: `${i.amount}${i.unit}`,
          note: i.note || '', // 落实契约：返回 note
          isRequired: i.isRequired, // 落实契约：返回 isRequired
          itemTotalCalories: (calorieDetails[idx] && typeof calorieDetails[idx].calories === 'number') ? calorieDetails[idx].calories : 0,
          missingNutrition: !!(calorieDetails[idx] && calorieDetails[idx].missingNutrition)
        })),
        steps: stepsRaw, // 落实契约：返回结构化的 steps 对象，而不仅是纯文本数组
        stepCount: stepsText.length,
        tools: requiredTools,
        tips: row.tips || '',
        cookedCount: row.cookedCount || 0,
        category,
        note: noteParts.join('；'),
        missing: missing.slice(0, 5), // 最多显示5个缺失项
        totalWeight,
        isDraft: !!row.isDraft
      };
    };

    // 开始匹配处理
    console.log('✅ 开始匹配处理');
    process.stderr.write('✅ 开始匹配处理\n');
    let processed = allRecipes.map(formatRow).filter(Boolean);
    
    // 统计匹配结果
    const immediateCookCount = processed.filter(r => r.category === '立即下厨').length;
    const nearbyBuyCount = processed.filter(r => r.category === '顺路买点').length;
    
    console.log(`   匹配成功总数: ${processed.length} 道`);
    console.log(`   立即下厨: ${immediateCookCount} 道`);
    console.log(`   顺路买点: ${nearbyBuyCount} 道`);
    console.log('');
    process.stderr.write(`   匹配成功总数: ${processed.length} 道\n`);
    process.stderr.write(`   立即下厨: ${immediateCookCount} 道\n`);
    process.stderr.write(`   顺路买点: ${nearbyBuyCount} 道\n`);
    process.stderr.write('\n');
    
    // 匹配统计已通过console.log输出到终端
    
    const debugMode = !!(req.body && req.body.debug);
    let debug = null;
    if (debugMode) {
      const counters = {
        table,
        allRecipes: allRecipes.length,
        mainEmpty: 0,
        mainNotCovered: 0,
        missingTooMany: 0,
        okBeforePaging: 0,
        userIng: Array.from(userIng),
        userSe: Array.from(userSe),
      };

      for (const row of allRecipes) {
        let mainIngs = [];
        let allIngsRaw = [];
        try { mainIngs = JSON.parse(row.mainIngredients || '[]'); } catch {}
        try { allIngsRaw = JSON.parse(row.allIngredients || '[]'); } catch {}
        const mainNorm = mainIngs.map(normalizeIngredientName).filter(Boolean);
        if (mainNorm.length === 0) { counters.mainEmpty++; continue; }

        let isStrictlyMatched = true;
        for (const ing of mainIngs) {
            const n = normalizeIngredientName(ing);
            if (n && !userIng.has(n)) {
                isStrictlyMatched = false;
                break;
            }
        }
        if (!isStrictlyMatched) { counters.mainNotCovered++; continue; }

        const allIngs = normalizeAllIngredients(allIngsRaw);
        const mainNormSet = new Set(mainNorm);
        const missingRequired = allIngs.filter(i => {
          if (!i.isRequired) return false;
          const n = normalizeIngredientName(i.name);
          if (!n) return false;
          if (n === '清水') return false;
          if (mainNormSet.has(n)) return false;

          if (userIng.has(n)) return false;
          if (userSe.has(n)) return false;
          return true;
        });

        if (missingRequired.length > 2) { counters.missingTooMany++; continue; }
        counters.okBeforePaging++;
      }
      debug = counters;
    }

    // AI 生成补充逻辑
    if (Number(page) === 1) {
      process.stderr.write('🤖 检查是否需要 AI 生成补充\n');
      const readyCount = processed.filter((r) => r.category === '立即下厨').length;
      const buyCount = processed.filter((r) => r.category === '顺路买点').length;
      
      // 检查数据库中已有多少匹配当前食材的骨架（只统计主料匹配的）
      const allDrafts = db.query(`SELECT * FROM ${table} WHERE isDraft = 1`);
      let existingReadyDrafts = 0;
      let existingBuyDrafts = 0;
      
      for (const draft of allDrafts) {
        try {
          const draftMainIngs = JSON.parse(draft.mainIngredients || '[]');
          let isMatch = true;
          
          for (const ing of draftMainIngs) {
            const n = normalizeIngredientName(ing);
            if (n && !userIng.has(n)) {
              isMatch = false;
              break;
            }
          }
          
          if (isMatch && draftMainIngs.length > 0) {
            if (draft.category === '立即下厨') {
              existingReadyDrafts++;
            } else if (draft.category === '顺路买点') {
              existingBuyDrafts++;
            }
          }
        } catch (e) {
          // 解析失败，跳过
        }
      }
      
      const needReady = Math.max(0, 10 - readyCount - existingReadyDrafts); // 严格补齐到 10 道
      
      process.stderr.write(`   现有立即下厨: ${readyCount} 道（含匹配骨架 ${existingReadyDrafts} 道），还需: ${needReady} 道\n`);
      process.stderr.write('\n');

      const appendAiRecipes = (aiOnes, defaultCat) => {
        for (const r of aiOnes) {
          // AI 越界拦截器 2.0：不仅拦截主料，还要拦截菜名中明显包含的未选主食/肉类
          let isStrictlyMatched = true;
          const rMainIngs = r.mainIngredients || [];
          
          // 1. 检查主料是否越界
          for (const ing of rMainIngs) {
            const n = normalizeIngredientName(ing);
            if (n && !userIng.has(n)) {
              isStrictlyMatched = false;
              console.log(`[Match API] 拦截 AI 越界生成 (主料越界): 菜名=${r.name}, 违规食材=${n}`);
              break;
            }
          }
          
          // 2. 检查菜名是否包含未选的主食/敏感词 (暴力拦截)
          if (isStrictlyMatched) {
             const sensitiveWords = ['饭', '面条', '粉', '米线', '粥', '饺', '包子', '饼'];
             for (const word of sensitiveWords) {
                if (r.name.includes(word)) {
                   // 如果菜名里有这些字，检查用户有没有真的选相关的食材
                   let hasMatch = false;
                   for (const u of userIng) {
                      if (u.includes(word) || word.includes(u) || (word === '饭' && u === '米')) {
                         hasMatch = true; break;
                      }
                   }
                   if (!hasMatch) {
                      isStrictlyMatched = false;
                      console.log(`[Match API] 拦截 AI 越界生成 (菜名越界): 菜名=${r.name}, 触发词=${word}`);
                      break;
                   }
                }
             }
          }
          
          if (!isStrictlyMatched) continue; // 直接丢弃这个越界的 AI 菜谱

          // 骨架生成后的严格分类检查：即使 AI 标了分类，我们也要根据用户提供的调料进行验证
          // 对于草稿骨架，我们先根据用户的调料情况进行初步分类判断
          const skeletonCategory = (() => {
            // 对于草稿，我们假设它可能需要基本调料
            // 如果用户的调料非常少（少于3种），我们保守地将其分类为顺路买点
            const seList = Object.keys(seasonings || {}).filter((k) => seasonings[k]);
            if (seList.length < 3 && defaultCat === '立即下厨') {
              // 用户调料太少，即使AI说能立即下厨，我们也保守处理
              return '顺路买点';
            }
            // 否则使用AI建议的分类
            return defaultCat;
          })();

          r.category = skeletonCategory;
          r.isDraft = true; // 强制打上 draft 标记
          
          const exists = db.prepare(`SELECT 1 FROM ${table} WHERE name = ? LIMIT 1`).get(r.name);
          if (!exists) {
            const id = saveToLibrary(r, isOutrageous); // 强制存入本地库
            r.id = id;
          } else {
            // 这里如果是老数据，我们不能直接跳过，应该复用已有的
            // 但是为了防止把老数据强制当成 draft，我们直接用老数据的状态
            continue;
          }
          const formatted = formatRow({
            id: r.id,
            name: r.name,
            description: r.description || '',
            calories: r.calories || 0,
            cookTime: r.cookTime || '',
            servings: r.servings || '1人份',
            difficulty: r.difficulty || '简单',
            mainIngredients: JSON.stringify(r.mainIngredients || []),
            requiredSeasonings: JSON.stringify(r.requiredSeasonings || []),
            optionalSeasonings: JSON.stringify(r.optionalSeasonings || []),
            tools: JSON.stringify(r.tools || []),
            originalTools: JSON.stringify(r.originalTools || []),
            allIngredients: JSON.stringify(r.allIngredients || []),
            steps: JSON.stringify(r.steps || []),
            tips: r.tips || '',
            category: defaultCat || r.category || '立即下厨',
            note: r.note || '',
            totalWeight: Number.isFinite(r.totalWeight) ? r.totalWeight : 0,
            cookedCount: 0,
            isDraft: 1
          });
          if (formatted) processed.push(formatted);
        }
      };

      if (needReady > 0) {
        try {
          console.log(`[Match API] 需要补充 ${needReady} 道立即下厨骨架，正在调用 AI...`);
          
          const result = await aiService.generateDraftRecipes({
            kind: 'ready',
            ingredients,
            seasonings,
            tools,
            isOutrageous,
            count: needReady
          });
          
          if (result && result.length > 0) {
            appendAiRecipes(result, '立即下厨');
          } else {
            console.log('[Match API] AI 补充生成返回空数组。');
          }
        } catch (error) {
          console.error('[Match API] AI 补充生成失败:', error);
        }
      }
    }

    // 第一优先级：已转正（isDraft: false）的排前面；第二优先级：按cookedCount（生成次数）降序；第三优先级：按权重降序
    processed.sort((a, b) => {
      const aDraft = a.isDraft ? 1 : 0;
      const bDraft = b.isDraft ? 1 : 0;
      if (aDraft !== bDraft) return aDraft - bDraft; // 0 (false) 排在 1 (true) 前面
      
      // 第二优先级：生成次数（cookedCount）降序
      const aCookedCount = a.cookedCount || 0;
      const bCookedCount = b.cookedCount || 0;
      if (aCookedCount !== bCookedCount) return bCookedCount - aCookedCount;
      
      // 第三优先级：按权重降序
      return b.totalWeight - a.totalWeight;
    });
    
    const seenNames = new Set();
    processed = processed.filter((r) => {
      const key = normalizeText(r && r.name);
      if (!key) return false;
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    // 移除强制生成立即下厨菜谱的逻辑，让匹配结果自然呈现
    // 匹配成功就显示，匹配不成功就算了

    if (Number(page) > 1) {
      // 翻页逻辑：如果本地分页后数据不足 10 道，触发 AI 生成补充
      const pageSize = 10;
      const start = (Number(page) - 1) * pageSize;
      const localPaged = processed.slice(start, start + pageSize);
      
      if (localPaged.length < pageSize) {
        const needMore = pageSize - localPaged.length;
        try {
          console.log(`[Match API] 第 ${page} 页本地数据不足，触发 AI 补充生成 ${needMore} 道`);
          const aiMore = await aiService.generateDraftRecipes({
            kind: 'ready',
            ingredients,
            seasonings,
            tools,
            isOutrageous,
            count: needMore
          });
          
          const appendAiRecipes = (aiOnes) => {
            for (const r of aiOnes) {
              // AI 越界拦截器 2.0 (用于加载更多)
              let isStrictlyMatched = true;
              const rMainIngs = r.mainIngredients || [];
              for (const ing of rMainIngs) {
                const n = normalizeIngredientName(ing);
                if (n && !userIng.has(n)) {
                  isStrictlyMatched = false;
                  break;
                }
              }
              if (isStrictlyMatched) {
                 const sensitiveWords = ['饭', '面条', '粉', '米线', '粥', '饺', '包子', '饼'];
                 for (const word of sensitiveWords) {
                    if (r.name.includes(word)) {
                       let hasMatch = false;
                       for (const u of userIng) {
                          if (u.includes(word) || word.includes(u) || (word === '饭' && u === '米')) {
                             hasMatch = true; break;
                          }
                       }
                       if (!hasMatch) {
                          isStrictlyMatched = false;
                          break;
                       }
                    }
                 }
              }
              if (!isStrictlyMatched) continue;
    
              const exists = db.prepare(`SELECT 1 FROM ${table} WHERE name = ? LIMIT 1`).get(r.name);
              if (!exists) {
                r.isDraft = true;
                const id = saveToLibrary(r, isOutrageous);
                r.id = id;
              } else {
                continue;
              }
              const formatted = formatRow({
                id: r.id,
                name: r.name,
                description: r.description || '',
                calories: r.calories || 0,
                cookTime: r.cookTime || '',
                servings: r.servings || '1人份',
                difficulty: r.difficulty || '简单',
                mainIngredients: JSON.stringify(r.mainIngredients || []),
                requiredSeasonings: JSON.stringify(r.requiredSeasonings || []),
                optionalSeasonings: JSON.stringify(r.optionalSeasonings || []),
                tools: JSON.stringify(r.tools || []),
                originalTools: JSON.stringify(r.originalTools || []),
                allIngredients: JSON.stringify(r.allIngredients || []),
                steps: JSON.stringify(r.steps || []),
                tips: r.tips || '',
                category: defaultCat || r.category || '立即下厨',
                note: r.note || '',
                totalWeight: Number.isFinite(r.totalWeight) ? r.totalWeight : 0,
                cookedCount: 0,
                isDraft: 1
              });
              if (formatted) processed.push(formatted);
            }
          };
          
          appendAiRecipes(aiMore);
          // 重新排序去重（应用新排序规则）
          processed.sort((a, b) => {
            const aDraft = a.isDraft ? 1 : 0;
            const bDraft = b.isDraft ? 1 : 0;
            if (aDraft !== bDraft) return aDraft - bDraft;
            return b.totalWeight - a.totalWeight;
          });
          const seenNames = new Set();
          processed = processed.filter((r) => {
            const key = normalizeText(r && r.name);
            if (!key) return false;
            if (seenNames.has(key)) return false;
            seenNames.add(key);
            return true;
          });
        } catch (e) {
          console.error('AI Draft More Error:', e?.message || String(e));
        }
      }
    }

    const pageSize = 10;
    const start = (Number(page) - 1) * pageSize;
    const end = start + pageSize;
    
    // 返回前移除那些卡住的死循环修复状态，或者干脆只把处理过的数据扔出去
    const paged = processed.slice(start, end);

    // 如果是请求后续页，只要 AI 服务正常，我们总是认为有下一页（无限生成）
    const hasMore = (processed.length > end) || (config.ai?.apiKey ? true : false);
    
    res.json({
      recipes: paged,
      total: processed.length,
      hasMore: hasMore,
      ...(debugMode ? { debug } : {})
    });

  } catch (err) {
    console.error('Match Error:', err.message, err.stack);
    res.status(500).json({ error: 'match_failed', detail: err.message, stack: err.stack });
  }
});


// 记录已做接口
app.post('/api/recipes/:id/cooked', (req, res) => {
  const { id } = req.params;
  const { isOutrageous = false } = req.body || {};
  const table = isOutrageous ? 'OutrageousRecipes' : 'StandardRecipes';

  const stmt = db.prepare(`
    UPDATE ${table}
    SET cookedCount = cookedCount + 1, lastCookedDate = ?
    WHERE id = ?
  `);
  stmt.run(new Date().toISOString(), id);

  const row = db.prepare(`SELECT cookedCount FROM ${table} WHERE id = ?`).get(id);
  res.json({ success: true, count: row ? row.cookedCount : 0 });
});

app.post('/api/mark-cooked', (req, res) => {
  const { id, mode = 'standard' } = req.body;
  const table = mode === 'outrageous' ? 'OutrageousRecipes' : 'StandardRecipes';
  
  const stmt = db.prepare(`
    UPDATE ${table} 
    SET cookedCount = cookedCount + 1, lastCookedDate = ? 
    WHERE id = ?
  `);
  stmt.run(new Date().toISOString(), id);
  
  const row = db.prepare(`SELECT cookedCount FROM ${table} WHERE id = ?`).get(id);
  res.json({ cookedCount: row ? row.cookedCount : 0 });
});


app.post('/api/dishes', async (req, res) => {
  try {
    const { ingredients = [], seasonings = {}, tools = [], mode = 'common' } = req.body || {};
    const seList = seasonings && typeof seasonings === 'object'
      ? Object.keys(seasonings).filter(k => seasonings[k]).slice(0, 8)
      : [];
    const tlList = Array.isArray(tools) ? tools.slice(0, 6) : [];
    const userContent = [
      `模式：${mode === 'creative' ? 'creative' : 'common'}（common：仅市面常见家常菜；creative：允许创意菜名）`,
      `用户食材：${ingredients.join('、') || '空空如也'}`,
      `可用调料：${seList.join('、') || '基础调料'}`,
      `可用厨具：${tlList.join('、') || '常规厨具'}`,
      `返回一个 JSON 对象，包含三个数组：ready、simpleBuy、difficultBuy。`,
      `每个数组元素为对象：{ "name": "<菜名>", "missing": ["<缺少的食材或调料>", ...] }。`,
      `${mode === 'creative' ? '' : '只生成市面常见家常菜，不允许非常规/创意菜名。'}`,
      `分类严格：ready（missing 为空，完全可做）；simpleBuy（仅缺 1 项且为常见易买：葱/姜/蒜/鸡蛋/豆腐/青菜/盐/生抽/油）；difficultBuy（缺 1–2 项且至少包含不易购买主材：生蚝/扇贝/螃蟹/淡菜/八爪鱼/鹅肉/火鸡）。`,
      `必须只返回纯 JSON（不包含任何解释文字）。`
    ].join('\n');
    const payload = {
      model: MODEL_ID,
      stream: false,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ]
    };
    const headers = {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    };
    const r = await axios.post(API_URL, payload, { headers, timeout: 30000 });
    const rawContent = r.data?.choices?.[0]?.message?.content ?? r.data?.output_text ?? '';
    let obj = null;
    try { obj = JSON.parse(rawContent); } catch {
      const m = rawContent.match(/\{[\s\S]*\}/);
      if (m) { try { obj = JSON.parse(m[0]); } catch {} }
    }
    if (!obj || !obj.ready || !obj.simpleBuy || !obj.difficultBuy) {
      const baseIng = Array.isArray(ingredients) && ingredients.length ? ingredients.slice(0, 3) : ['鸡蛋','番茄','米饭'];
      const mk = (n, miss=[]) => ({ name: String(n), missing: miss.map(String) });
      const ready = [
        mk(`家常${baseIng[0]}小炒`),
        mk(`蒜蓉${baseIng[0]}`),
        mk(`清炒${baseIng[1]}`),
        mk(`${baseIng[0]}${/米|饭|面/.test(baseIng[1]||'') ? '炒饭' : '小炒'}`),
        mk(`香煎${baseIng[0]}`),
        mk(`黄金${baseIng[0]}`),
        mk(`椒盐${baseIng[0]}`),
        mk(`蚝油${baseIng[1]||baseIng[0]}`),
        mk(`微辣${baseIng[0]}`),
        mk(`家常${baseIng[1]||baseIng[0]}小炒`),
      ].slice(0, 10);
      const simpleBuy = [
        mk(`葱香${baseIng[0]}`, ['葱']),
        mk(`蛋香${baseIng[1]||baseIng[0]}`, ['鸡蛋']),
        mk(`豆腐${baseIng[0]}煲`, ['豆腐']),
      ];
      const difficultBuy = [];
      return res.json({ ready, simpleBuy, difficultBuy });
    }
    const norm = (arr) => Array.isArray(arr) ? arr.map(it => ({
      name: String(it?.name || it),
      missing: Array.isArray(it?.missing) ? it.missing.map(String) : []
    })) : [];
    const RARE = ['生蚝','扇贝','螃蟹','淡菜','八爪鱼','鹅肉','火鸡'];
    const COMMON = ['葱','姜','蒜','鸡蛋','豆腐','青菜','盐','生抽','油'];
    const HOT_VERBS = ['炒','煮','炖','焖','烤','蒸','煎','炸','焗'];
    const EXCLUDE_COLD = ['凉拌','拌','沙拉','冷盘','粥','糊'];
    const MAIN_TOKENS = ['猪','牛','鸡','鸡腿','鸡蛋','虾','鱼','豆腐','羊','五花肉','米饭','面条'];

    const allReady = norm(obj.ready);
    const allSimple = norm(obj.simpleBuy);
    const allDifficult = norm(obj.difficultBuy);

    const isCold = (name) => EXCLUDE_COLD.some(k => String(name).includes(k));
    const isHot = (name) => HOT_VERBS.some(k => String(name).includes(k));
    const hasMain = (name) => MAIN_TOKENS.some(k => String(name).includes(k));

    let ready = allReady
      .filter(it => Array.isArray(it.missing) ? it.missing.length === 0 : true)
      .filter(it => !isCold(it.name))
      .sort((a, b) => {
        const sa = (isHot(a.name) ? -1 : 0) + (hasMain(a.name) ? -1 : 0);
        const sb = (isHot(b.name) ? -1 : 0) + (hasMain(b.name) ? -1 : 0);
        return sa - sb;
      })
      .slice(0, 20);

    const simpleBuy = allSimple
      .filter(it => Array.isArray(it.missing) && it.missing.length === 1 && COMMON.includes(String(it.missing[0])))
      .slice(0, 20);

    const difficultBuy = allDifficult
      .filter(it => {
        const miss = Array.isArray(it.missing) ? it.missing : [];
        return miss.length >= 1 && miss.length <= 2 && miss.some(m => RARE.includes(String(m)));
      })
      .slice(0, 20);

    res.json({ ready, simpleBuy, difficultBuy });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('Dishes API error:', detail);
    res.status(500).json({ error: 'dishes_failed', detail });
  }
});

app.post('/dishes', async (req, res) => {
  req.url = '/api/dishes';
  app._router.handle(req, res, () => {});
});

app.post('/api/dishDetail', async (req, res) => {
  try {
    const { dishName, ingredients = [], seasonings = {}, tools = [] } = req.body || {};
    const seList = seasonings && typeof seasonings === 'object'
      ? Object.keys(seasonings).filter(k => seasonings[k]).slice(0, 8)
      : [];
    const tlList = Array.isArray(tools) ? tools.slice(0, 6) : [];
    const userContent = [
      `菜名：${dishName || '未知菜'}`,
      `用户食材：${ingredients.join('、') || '空空如也'}`,
      `可用调料：${seList.join('、') || '基础调料'}`,
      `可用厨具：${tlList.join('、') || '常规厨具'}`,
      `请以中文详细给出厨具、食材（调料给出克/毫升等标准计量即可，不要生活化比喻）、步骤。`,
      `使用分段文本输出，适合流式传输，避免代码块或复杂结构。`
    ].join('\n');
    const payload = {
      model: MODEL_ID,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ]
    };
    const headers = {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();
    let heartbeat = setInterval(() => {
      try { res.write(': ping\n\n'); } catch {}
    }, 15000);

    const r = await axios.post(API_URL, payload, { headers, responseType: 'stream', timeout: 0 });
    r.data.on('data', chunk => res.write(chunk));
    r.data.on('end', () => { clearInterval(heartbeat); res.end(); });
    r.data.on('error', err => { console.error('Stream error:', err.message); clearInterval(heartbeat); res.end(); });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('DishDetail API error:', detail);
    res.status(500).json({ error: 'detail_failed', detail });
  }
});

app.post('/dishDetail', async (req, res) => {
  try {
    const { dishName, ingredients = [], seasonings = {}, tools = [] } = req.body || {};
    const seList = seasonings && typeof seasonings === 'object'
      ? Object.keys(seasonings).filter(k => seasonings[k]).slice(0, 8)
      : [];
    const tlList = Array.isArray(tools) ? tools.slice(0, 6) : [];
    const userContent = [
      `菜名：${dishName || '未知菜'}`,
      `用户食材：${ingredients.join('、') || '空空如也'}`,
      `可用调料：${seList.join('、') || '基础调料'}`,
      `可用厨具：${tlList.join('、') || '常规厨具'}`,
      `请以中文详细给出厨具、食材（调料给出克/毫升等标准计量即可，不要生活化比喻）、步骤。`,
      `使用分段文本输出，适合流式传输，避免代码块或复杂结构。`
    ].join('\n');
    const payload = {
      model: MODEL_ID,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ]
    };
    const headers = {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();
    let heartbeat = setInterval(() => {
      try { res.write(': ping\n\n'); } catch {}
    }, 15000);

    const r = await axios.post(API_URL, payload, { headers, responseType: 'stream', timeout: 0 });
    r.data.on('data', chunk => res.write(chunk));
    r.data.on('end', () => { clearInterval(heartbeat); res.end(); });
    r.data.on('error', err => { console.error('Stream error:', err.message); clearInterval(heartbeat); res.end(); });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('DishDetail API error:', detail);
    res.status(500).json({ error: 'detail_failed', detail });
  }
});
// 骨架详情懒加载及详情获取接口
app.post('/api/detailJson', async (req, res) => {
  try {
    const { id, dishName, ingredients = [], seasonings = {}, tools = [], mode = 'standard', regenerate = false } = req.body || {};
    const isOutrageous = mode === 'outrageous';
    const table = isOutrageous ? 'OutrageousRecipes' : 'StandardRecipes';
    
    // 优先通过 id 查找，其次通过 dishName
    let row = null;
    if (id) {
      row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    }
    const targetName = normalizeText(dishName) || (row ? row.name : '') || (Array.isArray(ingredients) ? ingredients.join('炒') : '家常菜');
    
    if (!row && targetName) {
      row = db.prepare(`SELECT * FROM ${table} WHERE name = ? LIMIT 1`).get(targetName);
      if (!row && targetName.length > 1) {
        row = db.prepare(`SELECT * FROM ${table} WHERE name LIKE ? ORDER BY cookedCount DESC LIMIT 1`).get(`%${targetName}%`);
      }
    }

    // 新增：如果还没找到，根据食材匹配已有的菜谱（修复重复调用AI的问题）
    if (!row && Array.isArray(ingredients) && ingredients.length > 0) {
      const userIngSet = new Set(ingredients.map(normalizeIngredientName).filter(Boolean));
      if (userIngSet.size > 0) {
        const recipes = db.query(`SELECT * FROM ${table} WHERE isDraft = 0`);
        for (const recipe of recipes) {
          try {
            const mainIngs = JSON.parse(recipe.mainIngredients || '[]');
            const recipeIngSet = new Set(mainIngs.map(normalizeIngredientName).filter(Boolean));
            
            // 检查菜谱的主要食材是否都在用户选择的食材中
            let allMatch = true;
            for (const ing of recipeIngSet) {
              if (!userIngSet.has(ing)) {
                allMatch = false;
                break;
              }
            }
            
            if (allMatch && recipeIngSet.size > 0) {
              row = recipe;
              console.log(`[食材匹配成功] 通过食材匹配到已有菜谱: ${recipe.name}`);
              break;
            }
          } catch (e) {
            // 解析失败，跳过这个菜谱
          }
        }
      }
    }

    const replacement = applyToolReplacement(tools);
    const buildToolNote = (stepsRaw) => {
      const raw = JSON.stringify(stepsRaw || []);
      const parts = [];
      if (raw.includes('烤箱')) parts.push(`烤箱→${replacement.oven}`);
      if (raw.includes('蒸锅')) parts.push(`蒸锅→${replacement.steamer}`);
      if (raw.includes('砂锅')) parts.push(`砂锅→${replacement.casserole}`);
      return parts.length ? `厨具已适配：使用 ${parts.join('；')} 替代` : '';
    };

    const formatStructured = async (recipe, toolNote, stepsRaw) => {
      let allIngs = [];
      try {
        allIngs = normalizeAllIngredients(recipe.allIngredients).map((i) => {
          const note = normalizeText(i.note);
          if (note) return { ...i, note };
          const anchor = getReferenceAnchorNote(i.name);
          return { ...i, note: anchor };
        });
      } catch (e) {
        console.error('formatStructured ingredients error:', e);
      }
      
      let stepsDetailed = [];
      try {
        stepsDetailed = adaptStepsForTools(recipe.steps || stepsRaw, replacement);
      } catch (e) {
        console.error('formatStructured steps error:', e);
      }
      
      const stepsText = Array.isArray(stepsDetailed)
        ? stepsDetailed.map(s => (typeof s === 'string' ? s : (s.fullText || ''))).filter(Boolean)
        : [];

      // 自动计算热量（使用 nutrition-db.json）+ AI 自动补充
      const calorieResult = await calculateTotalCaloriesAutoSupplement(allIngs);
      const calculatedCalories = calorieResult.total;
      const hasMissingNutrition = calorieResult.details.some(d => d.missingNutrition);

      return {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description || '',
        calories: calculatedCalories,
        caloriesWarning: hasMissingNutrition ? '含未知食材，热量可能不准确' : null,
        cookTime: recipe.cookTime || '',
        servings: recipe.servings || '1人份',
        difficulty: recipe.difficulty || '简单',
        tools: Array.isArray(recipe.tools) ? recipe.tools : (Array.isArray(recipe.originalTools) ? recipe.originalTools : []),
        mainIngredients: Array.isArray(recipe.mainIngredients) ? recipe.mainIngredients : [],
        allIngredients: allIngs.map(i => ({ name: i.name, amount: `${i.amount}${i.unit}`, note: i.note, isRequired: i.isRequired })),
        allIngredientsDetailed: allIngs,
        steps: stepsText,
        stepsDetailed,
        stepCount: stepsText.length,
        tips: recipe.tips || '',
        note: toolNote || buildToolNote(stepsRaw)
      };
    };

    // 拦截器：如果这道菜是草稿 (isDraft=true)，或者用户要求重新生成，才需要调用 AI 生成详情。
    // 如果 isDraft=0，代表它已经“盖上了校验成功的标签”，下次遇到绝不再校验！
    const needsRepair = row && (row.isDraft === 1 || regenerate);

    // 动态重算分类的方法（复用外面的严苛逻辑）
      const recalculateCategory = (recipeData, userIngSet, userSeSet) => {
        const allIngs = normalizeAllIngredients(recipeData.allIngredients || []);
        const mainNorm = (recipeData.mainIngredients || []).map(normalizeIngredientName).filter(Boolean);
        
        // 1. 先查有没有越界主料
        for (const entry of allIngs) {
          if (!entry.isRequired) continue;
          const ingName = normalizeIngredientName(entry.name);
          if (!ingName || ingName === '清水' || mainNorm.includes(ingName)) continue;
          
          // 发现它偷偷用了肉类/海鲜/主食当配料，且用户没选
          const strictKeywords = ['肉', '排', '鸡', '鸭', '鱼', '牛', '羊', '猪', '虾', '蟹', '贝', '翅', '肝', '饭', '面', '粉', '米线'];
          if (!userIngSet.has(ingName) && strictKeywords.some(kw => ingName.includes(kw))) {
             return '越界毒药'; // 这种属于完全越界，不可救药
          }
        }

        // 2. 算调料缺多少
        const missingRequiredSeasonings = [];
        const reqSeasoningNames = new Set((recipeData.requiredSeasonings || []).map(normalizeIngredientName).filter(Boolean));
        
        // 检查所有标记为必须的调料是否都被用户选择
        allIngs.forEach(i => {
          if (!i.isRequired) return;
          const n = normalizeIngredientName(i.name);
          if (!n || n === '清水' || mainNorm.includes(n)) return;
          // 只要是调料，不管是否在requiredSeasonings中，都必须检查
          if (isSeasoningName(n)) {
            if (!userSeSet.has(n)) {
              missingRequiredSeasonings.push(i);
            }
          }
        });
        
        // 额外检查requiredSeasonings中的调料，确保所有明确要求的调料都被用户选择
        (recipeData.requiredSeasonings || []).forEach(seasoning => {
          const n = normalizeIngredientName(seasoning);
          if (n && !userSeSet.has(n)) {
            // 查找对应的配料信息，用于错误提示
            const matchingIng = allIngs.find(i => normalizeIngredientName(i.name) === n);
            if (matchingIng) {
              missingRequiredSeasonings.push(matchingIng);
            } else {
              missingRequiredSeasonings.push({ name: seasoning, isRequired: true });
            }
          }
        });
        
        // 去重missingRequiredSeasonings
        const uniqueMissing = [];
        const seenNames = new Set();
        missingRequiredSeasonings.forEach(ms => {
          const normalizedName = normalizeIngredientName(ms.name);
          if (!seenNames.has(normalizedName)) {
            seenNames.add(normalizedName);
            uniqueMissing.push(ms);
          }
        });

        if (uniqueMissing.length > 0) {
            return '顺路买点'; // 缺任何调料，都降级为顺路买点
        }
        return '立即下厨';
      };

    if (row && needsRepair) {
      console.log(`[按需修复触发] 正在实时抢救菜谱: ${row.name} (${row.id}), isDraft: ${row.isDraft}`);
      
      let recipeData = {
        ...row,
        mainIngredients: safeJsonParse(row.mainIngredients) || [],
        requiredSeasonings: safeJsonParse(row.requiredSeasonings) || [],
        optionalSeasonings: safeJsonParse(row.optionalSeasonings) || [],
        tools: safeJsonParse(row.tools) || [],
        originalTools: safeJsonParse(row.originalTools) || [],
        allIngredients: safeJsonParse(row.allIngredients) || [],
        steps: safeJsonParse(row.steps) || [],
        isDraft: true
      };

      const repairResult = await aiService.generateRecipeDetail(recipeData, {
        ingredients: ingredients || [],
        seasonings: seasonings || {},
        tools: tools || [],
        isOutrageous
      });

      if (repairResult && repairResult.ok === false) {
        console.log(`[按需修复失败] ${recipeData.name} 无法挽救，执行物理删除。原因: ${repairResult.reason}`);
        db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(row.id);
        return res.json({ ok: false, reason: repairResult.reason || '该菜谱过于残缺或不符合逻辑，已被系统清理。' });
      }

      if (repairResult && repairResult.recipe) {
        // 二次校验并动态降级
        const userIngSet = new Set(ingredients.map(normalizeIngredientName).filter(Boolean));
        const userSeSet = new Set(Object.keys(seasonings || {}).filter(k => seasonings[k]).map(normalizeIngredientName).filter(Boolean));
        
        const newCat = recalculateCategory(repairResult.recipe, userIngSet, userSeSet);
        
        let finalCat = newCat;
        if (newCat === '越界毒药') {
            console.log(`[动态降级] ${recipeData.name} AI偷偷加了敏感食材，执行柔性降级为"需要采购"`);
            finalCat = '需要采购'; // 不再斩杀，而是降级为需要采购
        }

        // 后端兜底：如果 AI 没生成 cookTime，给个默认值
        if (!repairResult.recipe.cookTime || String(repairResult.recipe.cookTime).trim() === '') {
          repairResult.recipe.cookTime = '15 分钟';
        }
        if (!repairResult.recipe.description || String(repairResult.recipe.description).trim() === '') {
          repairResult.recipe.description = '一道美味的家常菜，做法简单，营养丰富。';
        }
        if (!repairResult.recipe.tips || String(repairResult.recipe.tips).trim() === '') {
          repairResult.recipe.tips = '火候是关键，注意观察食材状态，根据个人口味适量调整调料。';
        }

        recipeData = { 
          ...recipeData, 
          ...repairResult.recipe, 
          category: finalCat, // 覆盖分类
          isDraft: false 
        };
        // 覆盖回写数据库，摘掉 isDraft 标签
        saveToLibrary(recipeData, isOutrageous);
        console.log(`[按需修复成功] ${recipeData.name} 已转正，当前分类被定为: ${finalCat}`);
        
        return res.json({
          ok: true,
          recipe: await formatStructured(recipeData, '', recipeData.steps)
        });
      }
    }

    // 如果找到记录，且不是草稿（带有成功标签），完全信任数据库，直接返回！
    if (row && !row.isDraft) {
      let allIngsRaw = [];
      let stepsRaw = [];
      let mainIngs = [];
      try { allIngsRaw = JSON.parse(row.allIngredients || '[]'); } catch {}
      try { stepsRaw = JSON.parse(row.steps || '[]'); } catch {}
      try { mainIngs = JSON.parse(row.mainIngredients || '[]'); } catch {}

      // 不再做任何 isCompliant 的拦截，直接返回，做到秒开！
      const finalSteps = stepsRaw.length > 0 ? stepsRaw : [{ 
        step: 1, 
        stage: '烹饪', 
        action: '自由发挥', 
        heat: '适中', 
        time: '适量', 
        sensory: '熟透', 
        fullText: '这是一道老菜谱，暂无具体步骤，请根据经验烹饪。',
        isMissing: true // 给前端的特殊标记，告诉前端这是老菜谱缺步骤
      }];

      return res.json({
        ok: true,
        recipe: await formatStructured({
          id: row.id,
          name: row.name,
          description: row.description,
          calories: row.calories,
          cookTime: row.cookTime,
          servings: row.servings,
          difficulty: row.difficulty,
          tools: safeJsonParse(row.tools) || safeJsonParse(row.originalTools) || [],
          mainIngredients: mainIngs,
          allIngredients: allIngsRaw,
          steps: finalSteps,
          tips: row.tips
        }, buildToolNote(stepsRaw), finalSteps)
      });
    }

    // 如果是全新草稿，或者内容完全不存在，调用 Agent B 进行补位生成
    let recipeDraft = { name: targetName, mainIngredients: [], tools: [], category: '立即下厨' };
    if (row) {
      try { recipeDraft.mainIngredients = JSON.parse(row.mainIngredients || '[]'); } catch {}
      try { recipeDraft.tools = JSON.parse(row.tools || '[]'); } catch {}
      recipeDraft.category = row.category || '立即下厨';
    } else {
      recipeDraft.mainIngredients = Array.isArray(ingredients) ? ingredients.slice(0, 3) : [];
      recipeDraft.tools = Array.isArray(tools) ? tools.slice(0, 2) : [];
    }

    const detailResult = await aiService.generateRecipeDetail(recipeDraft, {
      ingredients,
      seasonings,
      tools
    });

    if (!detailResult || !detailResult.ok || !detailResult.recipe) {
      throw new Error(detailResult?.reason || 'AI 生成详情失败');
    }

    // 全新生成的也需要过一次校验
    const userIngSet = new Set(ingredients.map(normalizeIngredientName).filter(Boolean));
    const userSeSet = new Set(Object.keys(seasonings || {}).filter(k => seasonings[k]).map(normalizeIngredientName).filter(Boolean));
    const newCat = recalculateCategory(detailResult.recipe, userIngSet, userSeSet);

    let finalCat = newCat;
    if (newCat === '越界毒药') {
        console.log(`[动态降级] 全新生成的 ${targetName} AI偷偷加了敏感食材，执行柔性降级为"需要采购"`);
        finalCat = '需要采购';
    }

    // 后端兜底：如果 AI 没生成必要字段，给个默认值
    if (!detailResult.recipe.cookTime || String(detailResult.recipe.cookTime).trim() === '') {
      detailResult.recipe.cookTime = '15 分钟';
    }
    if (!detailResult.recipe.description || String(detailResult.recipe.description).trim() === '') {
      detailResult.recipe.description = '一道美味的家常菜，做法简单，营养丰富。';
    }
    if (!detailResult.recipe.tips || String(detailResult.recipe.tips).trim() === '') {
      detailResult.recipe.tips = '火候是关键，注意观察食材状态，根据个人口味适量调整调料。';
    }
    // 热量已改为由后端自动计算，不再依赖 AI 返回值

    const finalRecipe = {
      ...recipeDraft,
      ...detailResult.recipe,
      id: row ? row.id : `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: targetName,
      category: finalCat, // 覆盖为真实算出来的分类
      totalWeight: row ? row.totalWeight : 1000,
      isDraft: false,
      cookedCount: row ? row.cookedCount : 0
    };

    // 强制保存到数据库（如果原来有则更新，没有则插入）
    saveToLibrary(finalRecipe, isOutrageous);
    console.log(`[动态补齐成功并入库] ${finalRecipe.name} 已转正并保存至数据库`);

    return res.json({
      ok: true,
      recipe: await formatStructured(finalRecipe, buildToolNote(finalRecipe.steps), finalRecipe.steps)
    });
    
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('Detail JSON error:', detail);
    res.status(500).json({
      error: 'detail_failed',
      detail,
      id: '',
      name: '',
      description: '',
      calories: 0,
      cookTime: '',
      servings: '2人份',
      difficulty: '简单',
      tools: [],
      mainIngredients: [],
      allIngredients: [],
      allIngredientsDetailed: [],
      steps: [],
      stepsDetailed: [],
      stepCount: 0,
      tips: '',
      note: ''
    });
  }
});

app.post('/api/calories/total', (req, res) => {
  try {
    const { allIngredients = [], debug = false } = req.body || {};
    const result = calculateTotalCalories(allIngredients, { debug: !!debug });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'calories_failed', detail: err.message });
  }
});
app.post('/detailJson', async (req, res) => {
  req.url = '/api/detailJson';
  app._router.handle(req, res, () => {});
});
// ==================== 启动服务器 ====================
// SPA fallback: serve index.html for any non-API route
app.get(/^(?!\/api\/|\/logs$|\/debug\/).*/, (req, res) => {
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built. Run: cd project && npm install && npm run build');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  // backgroundRepairQueue.start(); // 废弃后台静默排队补齐，改为纯按需生成
});
