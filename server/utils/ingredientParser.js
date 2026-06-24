const aliasMap = {
  带皮五花肉: '五花肉',
  西红柿: '番茄',
  马铃薯: '土豆',
  葱: '葱',
  大葱: '葱',
  大葱末: '葱',
  葱段: '葱',
  葱花: '葱',
  葱末: '葱',
  葱白段: '葱',
  香葱段: '葱',
  香葱末: '葱',
  青蒜: '大蒜',
  蒜: '大蒜',
  蒜头: '大蒜',
  蒜瓣: '大蒜',
  蒜末: '大蒜',
  蒜泥: '大蒜',
  蒜片: '大蒜',
  蒜蓉: '大蒜',
  蒜苗: '大蒜',
  蒜苔: '大蒜',
  小葱: '葱',
  香葱: '葱',
  洋葱丝: '洋葱',
  姜: '生姜',
  生姜: '生姜',
  老姜: '生姜',
  嫩姜: '生姜',
  姜片: '生姜',
  姜末: '生姜',
  姜丝: '生姜',
  沙姜: '生姜',
  香菜: '香菜',
  香菜段: '香菜',
  香菜末: '香菜',
  香菜碎: '香菜',
  香菜叶: '香菜',
  清水: '清水',
  温水: '清水',
  热水: '清水',
  凉水: '清水',
  冰水: '清水',
  纯净水: '清水',
  食用油: '食用油',
  植物油: '食用油',
  色拉油: '食用油',
  菜籽油: '食用油',
  花生油: '食用油',
  玉米油: '食用油',
  茶籽油: '食用油',
  葵花籽油: '食用油',
  橄榄油: '食用油',
  特级初榨橄榄油: '食用油',
  油: '食用油',
  蛋清: '鸡蛋',
  蛋黄: '鸡蛋',
  鸡蛋液: '鸡蛋',
  高筋面粉: '面粉',
  低筋面粉: '面粉',
  全麦面粉: '面粉',
  普通面粉: '面粉',
  麻将: '麻酱',
  芝麻酱: '麻酱',
  北豆腐: '豆腐',
  嫩豆腐: '豆腐',
  老豆腐: '豆腐',
  血: '猪血',
  猪红: '猪血',
  鸡胸: '鸡胸',
  鸡腿: '鸡腿',
  鸡翅根: '鸡翅',
  鸡翅中: '鸡翅',
  鸭腿: '鸭腿',
  牛腱: '牛腱',
  牛腱子: '牛腱',
  牛里脊: '牛里脊',
  肥牛: '肥牛卷',
  羊肉卷: '羊肉卷',
  羊肉片: '羊肉卷',
  白胡椒粉: '胡椒粉',
  黑胡椒: '胡椒粉',
  黑胡椒粉: '胡椒粉',
  胡椒: '胡椒粉',
  胡椒粉: '胡椒粉',
  黑胡椒碎: '胡椒粉',
  现磨黑胡椒: '胡椒粉',
  孜然粉: '孜然',
  小茴香: '孜然',
  辣椒粉: '辣椒',
  辣椒面: '辣椒',
  小米辣: '辣椒',
  白糖: '糖',
  细砂糖: '糖',
  白砂糖: '糖',
  绵白糖: '糖',
  冰糖: '糖',
  红糖: '糖',
  黄糖: '糖',
  生粉: '淀粉',
  太白粉: '淀粉',
  地瓜粉: '淀粉',
  番薯粉: '淀粉',
  生抽酱油: '生抽',
  老抽酱油: '老抽',
  蒸鱼豉油: '酱油',
  味极鲜: '酱油',
  米酒: '黄酒',
  料酒去腥: '料酒',
  甜面酱: '豆瓣酱',
  蒸肉粉: '面粉',
  酸豆角: '豆角',
  绿豆芽: '豆芽',
  西葫芦: '西葫芦',
  吐司: '面包',
  酵母: '酵母',
  蜂蜜: '蜂蜜',
  白芝麻: '芝麻',
  熟白芝麻: '芝麻',
  熟芝麻: '芝麻',
  熟黑芝麻: '芝麻',
  黑芝麻: '芝麻',
  糯米: '糯米',
  红枣: '红枣',
  枸杞: '枸杞',
  党参: '党参',
  黄芪: '黄芪',
  陈皮: '陈皮',
  腊肉: '腊肉',
  腊肠: '腊肠',
  金华火腿: '火腿',
  新鲜柠檬汁: '柠檬',
  新鲜欧芹: '芹菜',
  新鲜迷迭香: '迷迭香',
  迷迭香碎: '迷迭香',
  甜菜根: '甜菜',
  乌鸡: '鸡肉',
  乳鸽: '鸽肉',
  鸽蛋: '鹌鹑蛋',
  猪瘦肉: '瘦肉',
  猪梅花肉: '梅花肉',
  猪前肘: '猪肘',
  羊里脊肉: '羊里脊',
  猪肘子: '猪肘',
  前肘: '猪肘',
  后肘: '猪肘',
  猪脚: '猪蹄',
  猪手: '猪蹄',
  猪耳朵: '猪耳',
  腰花: '猪腰',
  羊腿肉: '羊腿',
  牛腱子: '牛腱',
  羊肉片: '羊肉卷'
};

function normalizeText(v) {
  return String(v || '').trim();
}

function chineseToNumber(raw) {
  const s = normalizeText(raw);
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);

  const digitMap = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (s === '半') return 0.5;

  const fraction = s.match(/^(.+?)分之(.+)$/);
  if (fraction) {
    const denom = chineseToNumber(fraction[1]);
    const numer = chineseToNumber(fraction[2]);
    if (typeof denom === 'number' && denom !== 0 && typeof numer === 'number') return numer / denom;
  }

  let total = 0;
  let current = 0;
  const chars = Array.from(s);
  for (const ch of chars) {
    if (ch === '十') {
      total += (current || 1) * 10;
      current = 0;
      continue;
    }
    const d = digitMap[ch];
    if (typeof d === 'number') current = d;
  }
  total += current;
  if (total > 0) return total;
  return null;
}

function normalizeChineseNumberText(raw) {
  let s = normalizeText(raw);
  if (!s) return s;

  s = s.replace(/半/g, '0.5');
  s = s.replace(/([一二两三四五六七八九十零]+)分之([一二两三四五六七八九十零]+)/g, (m, a, b) => {
    const denom = chineseToNumber(a);
    const numer = chineseToNumber(b);
    if (typeof denom === 'number' && denom !== 0 && typeof numer === 'number') return String(numer / denom);
    return m;
  });
  s = s.replace(/[一二两三四五六七八九十零]+/g, (m) => {
    const n = chineseToNumber(m);
    return typeof n === 'number' ? String(n) : m;
  });
  return s;
}

function parseAmountUnit(rawAmount, rawUnit) {
  if (rawAmount === null || rawAmount === undefined) return { amount: null, unit: '' };
  if (typeof rawAmount === 'number' && Number.isFinite(rawAmount)) return { amount: rawAmount, unit: normalizeText(rawUnit) };
  
  // 定义重量单位数组，用于统一处理
  const weightUnits = ['g', '克', 'ml', '毫升', 'kg', '千克'];
  
  let s = normalizeChineseNumberText(rawAmount);
  
  // 处理AI生成的带单位的字符串，如"10g"、"5ml"等
  let amount = null;
  let unit = '';
  
  // 匹配数字+单位格式，如"10g"、"5ml"、"200克"、"50毫升"
  const combinedMatch = s.match(/^([\d.]+)\s*(kg|g|ml|l|克|千克|毫升|升|斤|两|个|只|条|片|块|瓣|勺|汤匙|茶匙|杯|把|份|瓶)/i);
  if (combinedMatch) {
    amount = parseFloat(combinedMatch[1]);
    unit = combinedMatch[2];
  } else {
    // 支持格式："2个（100g）" 或 "2个(100g)" 或 "2个 约100g"
    // 提取括号内或"约"后面的数字+单位作为参考重量
    const extraMatch = s.match(/[（(]\s*([\d.]+)\s*(g|克|ml|毫升|kg|千克)\s*[)）]/);
    const approxMatch = s.match(/约\s*([\d.]+)\s*(g|克|ml|毫升|kg|千克)/);
    
    let extraAmount = null;
    let extraUnit = '';
    if (extraMatch) {
      extraAmount = parseFloat(extraMatch[1]);
      extraUnit = extraMatch[2] === 'g' || extraMatch[2] === '克' ? 'g' : extraMatch[2] === 'ml' || extraMatch[2] === '毫升' ? 'ml' : extraMatch[2] === 'kg' || extraMatch[2] === '千克' ? 'kg' : '';
    } else if (approxMatch) {
      extraAmount = parseFloat(approxMatch[1]);
      extraUnit = approxMatch[2] === 'g' || approxMatch[2] === '克' ? 'g' : approxMatch[2] === 'ml' || approxMatch[2] === '毫升' ? 'ml' : approxMatch[2] === 'kg' || approxMatch[2] === '千克' ? 'kg' : '';
    }
    
    // 提取主要数量和单位
    const m = s.match(/^([\d.]+)\s*(kg|g|ml|l|克|千克|毫升|升|斤|两|个|只|条|片|块|瓣|勺|汤匙|茶匙|杯|把|份|瓶)?/i);
    if (m && m[1]) {
      amount = parseFloat(m[1]);
      unit = normalizeText(rawUnit) || normalizeText(m[2]);
    } else {
      return { amount: null, unit: normalizeText(rawUnit) };
    }
    
    // 如果主要单位不是标准重量单位，但有额外的重量信息，使用额外的重量信息
    if (extraAmount && extraUnit && !weightUnits.includes(unit)) {
      amount = extraAmount;
      unit = extraUnit;
    }
  }
  
  // 统一单位格式
  const unitMap = {
    '克': 'g',
    '毫升': 'ml',
    '千克': 'kg',
    '升': 'l',
    '汤匙': 'tbsp',
    '茶匙': 'tsp'
  };
  unit = unitMap[unit] || unit;
  
  // 确保调料使用标准重量单位
  const isSeasoningLike = s.includes('盐') || s.includes('糖') || s.includes('酱油') || s.includes('醋') || s.includes('油') || s.includes('酱') || s.includes('粉');
  if (isSeasoningLike && !weightUnits.includes(unit.toLowerCase())) {
    // 对于调料，如果没有标准单位，默认使用克
    unit = 'g';
  }
  
  return { 
    amount: Number.isFinite(amount) ? amount : null, 
    unit: normalizeText(unit),
    extraAmount: null, // 简化处理，不再返回额外信息
    extraUnit: ''
  };
}

function normalizeIngredientName(raw) {
  const units = '(kg|g|ml|l|克|千克|毫升|升|斤|两|个|只|条|片|块|瓣|勺|汤匙|茶匙|杯|把|份|瓶)';
  let s = normalizeText(raw)
    .replace(/[（(].*?[)）]/g, '')
    .replace(/\s+/g, '')
    .replace(/[·•・]/g, '');

  s = s.replace(new RegExp(`[0-9]+(\\.[0-9]+)?${units}`, 'gi'), '');
  s = s.replace(new RegExp(`[零一二两三四五六七八九十百]+分之[零一二两三四五六七八九十百]+${units}?`, 'g'), '');
  s = s.replace(new RegExp(`半${units}`, 'g'), '');
  s = s.replace(new RegExp(`[零一二两三四五六七八九十百]+${units}`, 'g'), '');
  s = s.replace(new RegExp(`${units}$`, 'g'), '');

  const mapped = aliasMap[s];
  return mapped || s;
}

module.exports = {
  aliasMap,
  normalizeText,
  chineseToNumber,
  normalizeChineseNumberText,
  parseAmountUnit,
  normalizeIngredientName
};
