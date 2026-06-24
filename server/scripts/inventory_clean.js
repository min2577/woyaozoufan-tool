/**
 * 菜谱库资产盘点 - 清理后版本
 * 按确认方案执行清理
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { normalizeIngredientName } = require('../utils/ingredientParser');

const DB_PATH = path.join(__dirname, '../data/recipes.db');
const db = new Database(DB_PATH);

// ============ 配置 - 清理规则 =============

// 厨具：保留列表
const KEEP_TOOLS = [
  '炒锅', '蒸锅', '烤箱', '空气炸锅', '高压锅', 
  '砂锅', '电饭煲', '烧烤炉', '火锅', '料理机', '破壁机',
  '榨汁机', '微波炉'
];

// 调料：归一化映射
const SEASONING_NORMALIZE = {
  // 葱系列
  '葱': '葱', '大葱': '葱', '小葱': '葱', '香葱': '葱', '葱段': '葱', '葱花': '葱', '葱末': '葱', '葱白': '葱', '葱白段': '葱', '葱白丝': '葱', '葱丝': '葱', '葱结': '葱', '香葱段': '葱', '香葱末': '葱', '大葱段': '葱',
  // 蒜系列
  '大蒜': '大蒜', '蒜': '大蒜', '蒜瓣': '大蒜', '蒜末': '大蒜', '蒜泥': '大蒜', '蒜片': '大蒜', '蒜蓉': '大蒜', '蒜苗': '大蒜', '蒜苔': '大蒜', '蒜汁': '大蒜', '蒜苗段': '大蒜', '蒜水': '大蒜',
  // 姜系列
  '生姜': '生姜', '姜': '生姜', '老姜': '生姜', '嫩姜': '生姜', '姜片': '生姜', '沙姜': '生姜', '老姜片': '生姜', '鲜生姜': '生姜', '嫩生姜': '生姜', '生姜片': '生姜',
  // 香菜
  '香菜': '香菜', '香菜段': '香菜', '香菜末': '香菜', '香菜碎': '香菜', '香菜叶': '香菜',
  // 油类
  '食用油': '食用油', '油': '食用油', '植物油': '食用油', '花生油': '食用油', '菜籽油': '食用油', '玉米油': '食用油', '葵花籽油': '食用油', '橄榄油': '食用油', '香油': '食用油', '芝麻油': '食用油', '色拉油': '食用油', '茶籽油': '食用油', '特级初榨橄榄油': '食用油', '木姜子油': '食用油', '藤椒油': '食用油', '麻油': '食用油', '熟油': '食用油', '熟花生油': '食用油', '牛油': '食用油', '酥油': '食用油', '无盐黄油': '食用油', '黄油': '食用油',
  // 糖类
  '糖': '糖', '白糖': '糖', '白砂糖': '糖', '细砂糖': '糖', '绵白糖': '糖', '红糖': '糖', '冰糖': '糖', '糖粉': '糖',
  // 面粉
  '面粉': '面粉', '普通面粉': '面粉', '高筋面粉': '面粉', '低筋面粉': '面粉', '全麦面粉': '面粉', '中筋面粉': '面粉', '自发粉': '面粉',
  // 酱油类
  '生抽': '生抽', '老抽': '老抽', '酱油': '酱油', '生抽酱油': '生抽', '老抽酱油': '老抽', '蒸鱼豉油': '酱油', '味极鲜': '酱油',
  // 酒类
  '料酒': '料酒', '黄酒': '黄酒', '米酒': '米酒', '啤酒': '啤酒', '白酒': '白酒',
  // 盐/味精
  '盐': '盐', '食盐': '盐', '粗海盐': '盐', '海盐': '盐',
  '味精': '味精', '鸡精': '味精', '味精/鸡精': '味精',
  // 醋
  '醋': '醋', '白醋': '醋', '陈醋': '醋', '米醋': '醋', '香醋': '醋', '苹果醋': '醋', '镇江香醋': '醋',
  // 酱类
  '豆瓣酱': '豆瓣酱', '郫县豆瓣酱': '豆瓣酱', '甜面酱': '甜面酱', '番茄酱': '番茄酱', '辣椒酱': '豆瓣酱', '芝麻酱': '芝麻酱', '沙拉酱': '沙拉酱', '烤肉酱': '烤肉酱',
  // 香辛料
  '胡椒粉': '胡椒粉', '白胡椒粉': '胡椒粉', '黑胡椒': '胡椒粉', '黑胡椒粉': '胡椒粉', '现磨黑胡椒': '胡椒粉', '花椒': '花椒', '花椒粉': '花椒', '辣椒': '辣椒', '辣椒粉': '辣椒', '辣椒面': '辣椒', '孜然': '孜然', '八角': '八角', '桂皮': '桂皮', '香叶': '香叶', '五香粉': '五香粉', '十三香': '十三香', '小茴香': '孜然', '草果': '草果', '陈皮': '陈皮',
  // 删除项（不计入调料）
  '清水': null, '水': null, '温水': null, '热水': null, '凉水': null, '冰水': null, '纯净水': null, '沸水': null, '高汤': null, '清水或高汤': null, '温热水': null
};

// 食材：删除列表
const DELETE_INGREDIENTS = [
  '阿胶块', '阿胶', '党参', '黄芪', '当归', '茯苓', '丹参', '白芷', '川贝母', '丁香', '陈皮', '山楂', '甘草',
  '干燕窝', '干虫草花', '干石斛', '干樟树叶', '干玫瑰花', '干玫瑰花瓣', '干桂花', '桂花', '桂花酱', '桂花蜜',
  '冰块', '冰水', '沸水', '纯净水', '清水',
  '方便面', '方便面饼', '方便面调味包', '春卷皮', '抄手皮', '锅贴皮', '叉烧肉', '低脂火腿片', '广式腊肠', '鲜猪肉香肠', '蛋挞皮', '蛋挞液',
  '高汤', '猪骨高汤', '牛骨高汤', '鸭汤底', '自制鸭汤底',
  '白吉馍面团', '肠粉米浆', '澄面', '糯米粉', '粘米粉', '小米粉', '大米粉', '红薯淀粉', '绿豆淀粉', '水淀粉',
  '干香菇8朵', '干燕窝', '干虫草花', '干石斛', '干樟树叶'
];

const SEAFOOD_KEYWORDS = ['鱼', '虾', '蟹', '贝', '螺', '蚌', '蛤', '蚝', '蛎', '鱿鱼', '章鱼', '八爪鱼', '扇贝', '生蚝', '淡菜', '海参', '鲍鱼', '鱼翅', '海带', '紫菜', '墨鱼', '三文鱼', '金枪鱼', '鳕鱼', '鲈鱼', '鲷鱼', '黄鱼', '带鱼', '鲳鱼', '鳗鱼', '鳝鱼', '泥鳅', '鲢', '鲫', '鲤', '鲶', '鳜', '鲟', '鳟'];

const WATER_WORDS = new Set(['清水', '水', '温水', '热水', '凉水', '冰水', '纯净水', '沸水', '温热水']);
const EGG_WORDS = new Set(['鸡蛋', '鸭蛋', '鹌鹑蛋']);
const EGG_FORMS = new Set(['蛋清', '蛋黄', '鸡蛋清', '鸡蛋黄', '鸡蛋液', '蛋白', '蛋液']);

const MEAT_PARENTS = {
  '猪肉': ['五花肉', '里脊', '排骨', '猪蹄', '猪肘', '猪腿', '猪手', '猪排', '猪骨', '猪血', '猪肝', '猪肚', '猪心', '猪腰', '猪肺', '猪肠', '猪皮', '肉馅', '肉末', '肉丝', '肉片', '肉丁', '瘦肉', '肥肉', '梅花肉', '前腿肉', '后腿肉', '猪前肘', '猪后肘', '棒骨', '腔骨', '猪绞肉', '猪瘦肉', '猪五花肉', '猪小排', '猪筒骨', '猪蹄筋'],
  '鸡肉': ['鸡腿', '鸡翅', '鸡胸', '鸡胸肉', '鸡爪', '鸡脖子', '鸡头', '鸡肝', '鸡心', '鸡胗', '鸡翅根', '鸡翅中', '翅根', '翅中', '鸡块', '整鸡', '母鸡', '公鸡', '鸡', '乌鸡', '乳鸽', '鸽肉'],
  '牛肉': ['牛腩', '牛腱', '牛里脊', '牛排', '牛骨', '牛尾', '牛肝', '牛肚', '牛百叶', '牛筋', '肥牛', '牛肉', '牛霖', '牛上脑', '牛外脊', '牛内裙', '牛腱子', '牛蛙', '牛蛙腿肉'],
  '羊肉': ['羊排', '羊腿', '羊蝎子', '羊骨', '羊肝', '羊肚', '羊肉', '羊里脊', '羊腿肉', '羊肩', '羊腩'],
  '鸭肉': ['鸭腿', '鸭翅', '鸭脖', '鸭肝', '鸭心', '鸭胗', '鸭肉', '整鸭', '鸭块', '老鸭', '仔鸭', '麻鸭', '净鸭', '鸭血'],
  '其他肉类': ['兔肉', '驴肉', '马肉', '骆驼', '鹿肉', '狗肉', '鹌鹑', '鸽肉']
};

// ============ 辅助函数 =============

function normalizeText(s) {
  if (!s) return '';
  return String(s)
    .replace(/[（(].*?[)）]/g, '')
    .replace(/[0-9]+(\.[0-9]+)?(g|克|ml|毫升|kg|千克|斤|两|个|只|条|片|块|瓣|勺|汤匙|茶匙|杯|把|份|瓶)/gi, '')
    .replace(/[·•・]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function canonicalizeName(raw) {
  const n = normalizeText(raw);
  if (!n) return '';
  const c = normalizeIngredientName(n);
  return c || n;
}

function splitAlternatives(raw) {
  const s = normalizeText(raw);
  if (!s) return [];
  const parts = s
    .replace(/或者/g, '或')
    .split(/[或/|、]/g)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [s];
}

function isSeafood(name) {
  const n = canonicalizeName(name);
  if (!n) return false;
  return SEAFOOD_KEYWORDS.some(k => n.includes(k));
}

function getMeatParent(name) {
  const n = canonicalizeName(name);
  if (!n) return null;
  if (EGG_WORDS.has(n) || EGG_FORMS.has(n)) return null;
  if (n.includes('牛奶') || n.includes('酸奶') || n.includes('牛油果')) return null;
  if (n.includes('奶酪')) return null;
  if (n.includes('面包') || n.includes('馍') || n.includes('饼') || n.includes('包')) return null;
  for (const [parent, cuts] of Object.entries(MEAT_PARENTS)) {
    if (cuts.includes(n) || (n.includes(parent) && !n.includes('其他'))) return parent;
  }
  if (n.includes('猪') && !n.includes('猪毛')) return '猪肉';
  if (n.includes('鸡') && !n.includes('鸡蛋')) return '鸡肉';
  if (n.includes('牛')) return '牛肉';
  if (n.includes('羊')) return '羊肉';
  if (n.includes('鸭')) return '鸭肉';
  return null;
}

function isSeasoningName(name) {
  const n = canonicalizeName(name);
  if (!n) return false;
  if (WATER_WORDS.has(n)) return false;
  if (n === '面粉') return false;
  const hitWords = [
    '生抽','老抽','酱油','蚝油','醋','料酒','黄酒','米酒','白酒','啤酒',
    '豆瓣','郫县','甜面酱','黄豆酱','番茄酱','沙拉酱','芥末','蜂蜜','芝麻酱','花生酱','咖喱',
    '胡椒','花椒','辣椒','孜然','八角','桂皮','香叶','陈皮','草果','丁香','小茴香','五香粉','十三香',
    '盐','糖','味精','鸡精','香油','芝麻油','淀粉','小苏打','泡打粉','酵母',
    '葱','生姜','大蒜','香菜',
    '高汤','浓汤宝','汤底','豉','豆豉','红油','辣子',
    '食用油'
  ];
  return hitWords.some((w) => n.includes(w));
}

// ============ 主逻辑 =============

console.log('='.repeat(60));
console.log('开始清理扫描...');
console.log('='.repeat(60));

// 统计
const standardCount = db.prepare('SELECT count(*) as cnt FROM StandardRecipes').get().cnt;
const outrageousCount = db.prepare('SELECT count(*) as cnt FROM OutrageousRecipes').get().cnt;
const standardNames = db.prepare('SELECT name FROM StandardRecipes').all().map(r => r.name);
const allNames = [...standardNames];
const uniqueNames = new Set(allNames.map(n => normalizeText(n)).filter(n => n));

console.log(`\n📊 菜谱统计:`);
console.log(`  StandardRecipes: ${standardCount}`);
console.log(`  OutrageousRecipes: ${outrageousCount}`);
console.log(`  总数: ${standardCount + outrageousCount}`);
console.log(`  去重后菜名: ${uniqueNames.size}`);

// 提取
const ingredients = new Set();
const seasonings = new Set();
const tools = new Set();
const meatCutsMap = {};
const seafoodSet = new Set();

const TOOL_KEYWORDS = ['炒锅', '炒勺', '平底锅', '煎锅', '烤箱', '空气炸锅', '蒸锅', '炖锅', '汤锅', '高压锅', '电饭煲', '砂锅', '火锅', '烧烤炉', '烤架', '炭火', '木炭', '微波炉', '料理机', '搅拌机', '破壁机', '榨汁机', '豆浆机', '电饼铛', '三明治机', '吐司炉', '烤面包机', '砧板', '菜刀', '剪刀'];

function extractToolsFromSteps(steps) {
  const found = new Set();
  if (!steps) return found;
  for (const step of steps) {
    const text = typeof step === 'string' ? step : (step.fullText || step.action || '');
    for (const tool of TOOL_KEYWORDS) {
      if (text.includes(tool)) {
        found.add(tool);
      }
    }
  }
  return found;
}

function processIngredients(ingList) {
  if (!ingList || !Array.isArray(ingList)) return;
  
  for (const ing of ingList) {
    const raw =
      typeof ing === 'string'
        ? ing
        : ing && typeof ing === 'object' && typeof ing.name === 'string'
          ? ing.name
          : '';

    const parts = splitAlternatives(raw);
    for (const p of parts) {
      let name = canonicalizeName(p);
      if (!name || name.length < 1) continue;
      if (name.match(/^[0-9]+$/) || name === '适量' || name === '少许' || name === '若干' || name === '必要') continue;

      if (WATER_WORDS.has(name)) continue;

      if (EGG_FORMS.has(name)) name = '鸡蛋';

      if (name.includes('或')) continue;

      if (DELETE_INGREDIENTS.includes(name)) continue;

      if (isSeasoningName(name)) {
        const normalized = SEASONING_NORMALIZE[name] !== undefined ? SEASONING_NORMALIZE[name] : name;
        if (normalized) seasonings.add(normalized);
        continue;
      }

      if (isSeafood(name)) {
        seafoodSet.add(name);
        continue;
      }

      const meatParent = getMeatParent(name);
      if (meatParent) {
        if (!meatCutsMap[meatParent]) meatCutsMap[meatParent] = new Set();
        meatCutsMap[meatParent].add(name);
        continue;
      }

      ingredients.add(name);
    }
  }
}

// 扫描
const tables = [
  { name: 'StandardRecipes', rows: db.prepare('SELECT * FROM StandardRecipes').all() },
  { name: 'OutrageousRecipes', rows: db.prepare('SELECT * FROM OutrageousRecipes').all() }
];

for (const table of tables) {
  for (const row of table.rows) {
    let allIngs = [];
    try { allIngs = JSON.parse(row.allIngredients || '[]'); } catch {}
    processIngredients(allIngs);
    
    let steps = [];
    try { steps = JSON.parse(row.steps || '[]'); } catch {}
    const foundTools = extractToolsFromSteps(steps);
    for (const t of foundTools) {
      tools.add(t);
    }
  }
}

// 厨具过滤
const filteredTools = new Set();
for (const t of tools) {
  if (KEEP_TOOLS.includes(t)) {
    filteredTools.add(t);
  }
}

// 输出
const sortedIngredients = [...ingredients].sort((a, b) => a.localeCompare(b, 'zh'));
const sortedSeasonings = [...seasonings].sort((a, b) => a.localeCompare(b, 'zh'));
const sortedTools = [...filteredTools].sort((a, b) => a.localeCompare(b, 'zh'));

const sortedMeatCuts = {};
for (const [parent, cuts] of Object.entries(meatCutsMap)) {
  sortedMeatCuts[parent] = [...cuts].sort((a, b) => a.localeCompare(b, 'zh'));
}

const result = {
  recipeCounts: {
    standard: standardCount,
    outrageous: outrageousCount,
    total: standardCount + outrageousCount,
    uniqueByName: uniqueNames.size
  },
  libraries: {
    ingredients: sortedIngredients,
    seasonings: sortedSeasonings,
    tools: sortedTools.map(t => ({ id: t, label: t }))
  },
  meatCuts: sortedMeatCuts,
  excluded: {
    seafood: [...seafoodSet].sort((a, b) => a.localeCompare(b, 'zh'))
  }
};

console.log('\n' + '='.repeat(60));
console.log('清理后统计:');
console.log('='.repeat(60));
console.log(`食材库: ${sortedIngredients.length} 项`);
console.log(`调料库: ${sortedSeasonings.length} 项`);
console.log(`厨具库: ${sortedTools.length} 项`);

const outputPath = path.join(__dirname, '../data/inventory_report.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
console.log(`\n📁 已保存到: ${outputPath}`);

console.log('\n厨具库内容:', sortedTools);
console.log('\n调料库样例:', sortedSeasonings.slice(0, 20));

db.close();
