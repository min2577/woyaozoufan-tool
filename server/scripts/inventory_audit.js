/**
 * 菜谱库资产盘点脚本
 * 扫描数据库，提取并归一化食材/调料/厨具
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/recipes.db');
const db = new Database(DB_PATH);

// ============ 配置 =============
const SEASONING_KEYWORDS = [
  // 油类
  '油', '食用油', '植物油', '花生油', '菜籽油', '玉米油', '葵花籽油', '橄榄油', '香油', '芝麻油', '色拉油', '黄油',
  // 糖类
  '糖', '白糖', '白砂糖', '细砂糖', '绵白糖', '红糖', '冰糖', '糖粉',
  // 酱醋酒抽
  '生抽', '老抽', '酱油', '蚝油', '醋', '料酒', '黄酒', '米酒', '豆瓣酱', '甜面酱', '番茄酱', '辣椒酱', '芝麻酱', '沙拉酱', '烤肉酱', '蒸鱼豉油',
  // 香辛料
  '胡椒', '花椒', '辣椒', '孜然', '八角', '桂皮', '香叶', '五香粉', '十三香', '小茴香', '草果', '陈皮', '山楂', '甘草',
  // 葱姜蒜香菜
  '葱', '大葱', '小葱', '香葱', '姜', '生姜', '蒜', '大蒜', '蒜头', '香菜', '芹菜', '欧芹', '迷迭香', '罗勒', '薄荷',
  // 其他调料
  '盐', '味精', '鸡精', '酵母', '泡打粉', '苏打粉', '淀粉', '生粉', '面粉', '面包屑', '奶粉',
  // 饮品/液体
  '清水', '热水', '温水', '冷水', '牛奶', '酸奶', '豆浆', '椰奶', '茶水', '茶叶', '咖啡',
  // 酒类
  '白酒', '啤酒', '红酒', '葡萄酒', '清酒', '醪糟',
  // 其他
  '蜂蜜', '炼乳', '奶油', '奶酪', '柠檬', '酸梅', '乌梅'
];

const SEAFOOD_KEYWORDS = [
  '鱼', '虾', '蟹', '贝', '螺', '蚌', '蛤', '蚝', '蛎', '鱿鱼', '章鱼', '八爪鱼', '扇贝', '生蚝', '淡菜', 
  '海参', '鲍鱼', '鱼翅', '海带', '紫菜', '海藻', '墨鱼', '乌贼', '三文鱼', '金枪鱼', '鳕鱼', '鲈鱼', '鲷鱼',
  '黄鱼', '带鱼', '鲳鱼', '鳗鱼', '鳝鱼', '泥鳅', '虾仁', '虾皮', '虾米', '干贝', '瑶柱', '花胶', '鱼肚'
];

const MEAT_PARENTS = {
  '猪肉': ['五花肉', '里脊', '排骨', '猪蹄', '猪肘', '猪腿', '猪手', '猪排', '猪骨', '猪血', '猪肝', '猪肚', '猪心', '猪腰', '猪肺', '猪肠', '猪皮', '肉馅', '肉末', '肉丝', '肉片', '肉丁', '瘦肉', '肥肉', '梅花肉', '前腿肉', '后腿肉', '猪前肘', '猪后肘', '棒骨', '腔骨'],
  '鸡肉': ['鸡腿', '鸡翅', '鸡胸', '鸡胸肉', '鸡爪', '鸡脖子', '鸡头', '鸡肝', '鸡心', '鸡胗', '鸡翅根', '鸡翅中', '翅根', '翅中', '鸡块', '整鸡', '母鸡', '公鸡', '鸡', '乌鸡', '乳鸽', '鸽肉'],
  '牛肉': ['牛腩', '牛腱', '牛里脊', '牛排', '牛骨', '牛尾', '牛肝', '牛肚', '牛百叶', '牛筋', '肥牛', '牛肉', '牛霖', '牛上脑', '牛外脊', '牛内裙', '牛腱子'],
  '羊肉': ['羊排', '羊腿', '羊蝎子', '羊骨', '羊肝', '羊肚', '羊肉', '羊里脊', '羊腿肉', '羊肩', '羊腩'],
  '鸭肉': ['鸭腿', '鸭翅', '鸭脖', '鸭肝', '鸭心', '鸭胗', '鸭肉', '整鸭', '鸭块', '老鸭', '仔鸭', '麻鸭'],
  '其他肉类': ['兔肉', '驴肉', '马肉', '骆驼', '鹿肉', '狗肉', '鹌鹑', '鸽蛋', '鸡蛋', '鸭蛋', '鹅蛋', '鹌鹑蛋']
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

function isSeasoning(name) {
  const n = normalizeText(name);
  if (!n) return false;
  // 清水算调料
  if (n === '清水' || n === '水' || n === '温水' || n === '热水' || n === '凉水') return true;
  return SEASONING_KEYWORDS.some(k => n.includes(k) || k.includes(n));
}

function isSeafood(name) {
  const n = normalizeText(name);
  if (!n) return false;
  return SEAFOOD_KEYWORDS.some(k => n.includes(k));
}

function getMeatParent(name) {
  const n = normalizeText(name);
  if (!n) return null;
  for (const [parent, cuts] of Object.entries(MEAT_PARENTS)) {
    if (cuts.includes(n) || n.includes(parent)) return parent;
  }
  // 直接匹配
  if (n.includes('猪') && !n.includes('猪毛')) return '猪肉';
  if (n.includes('鸡')) return '鸡肉';
  if (n.includes('牛')) return '牛肉';
  if (n.includes('羊')) return '羊肉';
  if (n.includes('鸭')) return '鸭肉';
  return null;
}

// ============ 主逻辑 =============

console.log('='.repeat(60));
console.log('开始扫描菜谱库...');
console.log('='.repeat(60));

// 1. 统计菜谱数量
const standardCount = db.prepare('SELECT count(*) as cnt FROM StandardRecipes').get().cnt;
const outrageousCount = db.prepare('SELECT count(*) as cnt FROM OutrageousRecipes').get().cnt;
const totalCount = standardCount + outrageousCount;

// 去重统计
const standardNames = db.prepare('SELECT name FROM StandardRecipes').all().map(r => r.name);
const outrageousNames = db.prepare('SELECT name FROM OutrageousRecipes').all().map(r => r.name);
const allNames = [...standardNames, ...outrageousNames];
const uniqueNames = new Set(allNames.map(n => normalizeText(n)).filter(n => n));

console.log(`\n📊 菜谱统计:`);
console.log(`  StandardRecipes: ${standardCount}`);
console.log(`  OutrageousRecipes: ${outrageousCount}`);
console.log(`  总数: ${totalCount}`);
console.log(`  去重后菜名: ${uniqueNames.size}`);

// 2. 提取所有食材和调料
const ingredients = new Set();
const seasonings = new Set();
const tools = new Set();
const meatCutsMap = {};
const seafoodSet = new Set();
const noiseSet = new Set();

// 工具关键词
const TOOL_KEYWORDS = ['炒锅', '炒勺', '平底锅', '煎锅', '烤箱', '空气炸锅', '蒸锅', '炖锅', '汤锅', '高压锅', '电饭煲', '砂锅', '火锅', '烧烤炉', '烤架', '炭火', '木炭', '微波炉', '料理机', '搅拌机', '破壁机', '榨汁机', '豆浆机', '电饼铛', '三明治机', '吐司炉', '烤面包机', '砧板', '菜刀', '剪刀', '勺子', '铲子', '漏勺', '筛子', '碗', '盆', '碟', '盘', '筷子', '叉子', '勺', '保鲜膜', '锡纸', '烘焙纸', '蒸笼', '篦子', '帘子', '纱布', '滤网'];

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

function processIngredients(ingList, isMain = false) {
  if (!ingList || !Array.isArray(ingList)) return;
  
  for (const ing of ingList) {
    let name;
    if (typeof ing === 'string') {
      name = normalizeText(ing);
    } else if (ing && ing.name) {
      name = normalizeText(ing.name);
    }
    
    if (!name || name.length < 1) {
      noiseSet.add(String(ing).substring(0, 20));
      continue;
    }
    
    // 过滤噪声
    if (name.match(/^[0-9]+$/) || name === '适量' || name === '少许' || name === '若干' || name === '必要') {
      noiseSet.add(name);
      continue;
    }
    
    // 判断是否为海鲜
    if (isSeafood(name)) {
      seafoodSet.add(name);
      continue;
    }
    
    // 判断是否为调料
    if (isSeasoning(name)) {
      seasonings.add(name);
      continue;
    }
    
    // 判断是否为肉类部位
    const meatParent = getMeatParent(name);
    if (meatParent) {
      if (!meatCutsMap[meatParent]) meatCutsMap[meatParent] = new Set();
      meatCutsMap[meatParent].add(name);
      // 食材库只保留父类
      continue;
    }
    
    // 剩余的算主食材
    ingredients.add(name);
  }
}

// 扫描所有菜谱
const tables = [
  { name: 'StandardRecipes', rows: db.prepare('SELECT * FROM StandardRecipes').all() },
  { name: 'OutrageousRecipes', rows: db.prepare('SELECT * FROM OutrageousRecipes').all() }
];

for (const table of tables) {
  console.log(`\n📂 扫描 ${table.name}...`);
  for (const row of table.rows) {
    // 提取主食材
    let mainIngs = [];
    try { mainIngs = JSON.parse(row.mainIngredients || '[]'); } catch {}
    processIngredients(mainIngs, true);
    
    // 提取全部食材
    let allIngs = [];
    try { allIngs = JSON.parse(row.allIngredients || '[]'); } catch {}
    processIngredients(allIngs, false);
    
    // 提取厨具
    let steps = [];
    try { steps = JSON.parse(row.steps || '[]'); } catch {}
    const foundTools = extractToolsFromSteps(steps);
    for (const t of foundTools) {
      tools.add(t);
    }
  }
}

// 工具归一化
const toolNormalization = {
  '炒勺': '炒锅',
  '平底锅': '炒锅',
  '煎锅': '炒锅',
  '炭火': '烧烤炉',
  '木炭': '烧烤炉',
  '烤架': '烧烤炉',
  '漏勺': '勺子',
  '铲子': '勺子',
  '盆': '碗',
  '碟': '盘',
  '筛子': '碗',
  '蒸笼': '蒸锅',
  '篦子': '蒸锅',
  '帘子': '蒸锅',
  '纱布': '碗',
  '滤网': '碗'
};

// 工具计数（先不做，去重即可）
const toolCount = {};
for (const t of tools) {
  const normalized = toolNormalization[t] || t;
  toolCount[normalized] = (toolCount[normalized] || 0) + 1;
}

// ============ 输出结果 =============

// 排序
const sortedIngredients = [...ingredients].sort((a, b) => a.localeCompare(b, 'zh'));
const sortedSeasonings = [...seasonings].sort((a, b) => a.localeCompare(b, 'zh'));

// 格式化工具输出
const sortedTools = Object.keys(toolCount).sort().map(k => ({
  id: k,
  label: k,
  count: toolCount[k]
}));

// 格式化肉类部位
const sortedMeatCuts = {};
for (const [parent, cuts] of Object.entries(meatCutsMap)) {
  sortedMeatCuts[parent] = [...cuts].sort((a, b) => a.localeCompare(b, 'zh'));
}

// 格式化和输出
const result = {
  recipeCounts: {
    standard: standardCount,
    outrageous: outrageousCount,
    total: totalCount,
    uniqueByName: uniqueNames.size
  },
  libraries: {
    ingredients: sortedIngredients,
    seasonings: sortedSeasonings,
    tools: sortedTools
  },
  meatCuts: sortedMeatCuts,
  excluded: {
    seafood: [...seafoodSet].sort((a, b) => a.localeCompare(b, 'zh')),
    noise: [...noiseSet].sort((a, b) => a.localeCompare(b, 'zh'))
  }
};

console.log('\n' + '='.repeat(60));
console.log('统计结果:');
console.log('='.repeat(60));
console.log(`食材库: ${sortedIngredients.length} 项`);
console.log(`调料库: ${sortedSeasonings.length} 项`);
console.log(`厨具库: ${sortedTools.length} 项`);
console.log(`海鲜(排除): ${seafoodSet.size} 项`);
console.log(`噪声(排除): ${noiseSet.size} 项`);

console.log('\n' + '='.repeat(60));
console.log('输出JSON:');
console.log('='.repeat(60));
console.log(JSON.stringify(result, null, 2));

// 保存结果
const outputPath = path.join(__dirname, '../data/inventory_report.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
console.log(`\n📁 已保存到: ${outputPath}`);

db.close();