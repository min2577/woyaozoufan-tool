import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Plus, X, Search, Flame, Ghost, Ban } from 'lucide-react';
import {
  SEASONINGS,
  KITCHEN_TOOLS_EXPANDED,
  BANNED_INGREDIENTS,
  INGREDIENT_CATEGORY_MAP,
  SEASONING_CATEGORIES,
  DEFAULT_BASE_WEIGHT,
  SEASONING_BASE_WEIGHT,
  INGREDIENT_BASE_WEIGHT,
  TOOL_BASE_WEIGHT,
  MEAT_SUBTYPES,
  FUNGI_PARENT,
  FUNGI_SUBTYPES,
} from '../utils/recipeLogic';
import { buildAnalysisSteps, fetchMatchRecipes, updateInventoryStatus, fetchInventory, type InventoryItem, type GeneratedRecipe, type IngredientSelections } from '../utils/aiEngine';
import RecipeCard from './RecipeCard';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '') as string;

function parentOfTag(tag: string): string {
  const idx = tag.indexOf('（');
  if (idx > 0) return tag.slice(0, idx);
  return tag;
}

function buildSubtypeTag(parent: string, subtypes: string[]): string {
  if (!Array.isArray(subtypes) || subtypes.length === 0) return parent;
  return `${parent}（${subtypes.join('、')}）`;
}

function normalizeKey(input: string): string {
  return (input || '')
    .normalize('NFKC')
    .replace(/[​-‍﻿]/g, '')
    .trim();
}

// 拼音首字母映射表，包含常见食材
const PINYIN_MAP: Record<string, string> = {
  '鸡蛋': 'jd',
  '番茄': 'fq',
  '米饭': 'mf',
  '土豆': 'td',
  '鸡胸肉': 'jxm',
  '虾': 'x',
  '西兰花': 'xlh',
  '豆腐': 'df',
  '牛肉': 'nr',
  '猪肉': 'zhur',
  '青菜': 'qc',
  '白菜': 'bc',
  '洋葱': 'yc',
  '黄瓜': 'hg',
  '胡萝卜': 'hlu',
  '玉米': 'ym',
  '蘑菇': 'mg',
  '黑木耳': 'hem',
  '海带': 'hd',
  '豆芽': 'dy',
  '南瓜': 'ng',
  '冬瓜': 'dg',
  '茄子': 'qz',
  '辣椒': 'lj',
  '青椒': 'qj',
  '鱼': 'y',
  '腊肠': 'lc',
  '午餐肉': 'wcr',
  '豆类': 'dl',
  '黑豆': 'hd',
  '绿豆': 'ld',
  '花豆': 'hd',
  '馄饨': 'ht',
  '面条': 'mt',
  '面粉': 'fm',
  '米': 'm',
  '糙米': 'cm',
  '玉米粒': 'yml',
  '豌豆': 'wd',
  '毛豆': 'md',
  '羊肉': 'yr',
  '兔肉': 'tr',
  '鸭肉': 'yr',
  '鹅肉': 'er',
  '火鸡': 'hj',
  '鸽肉': 'gr',
  '青豆': 'qd',
  '蚕豆': 'cd',
  '红豆': 'hd',
  '黑芝麻': 'hzm',
  '白芝麻': 'bzm',
  '香菜': 'xc',
  '小葱': 'xc',
  '大葱': 'dc',
  '韭菜': 'jc',
  '芹菜': 'qc',
  '苦菜': 'kc',
  '油菜': 'yc',
  '生菜': 'sc',
  '菠菜': 'bc',
  '莴笋': 'ws',
  '竹笋': 'zs',
  '春笋': 'cs',
  '冬笋': 'ds',
  '荸荠': 'bq',
  '芋头': 'yt',
  '山药': 'sy',
  '红薯': 'hs',
  '紫薯': 'zs',
  '洋芋': 'yy',
  '番瓜': 'fg',
  '丝瓜': 'sg',
  '苦瓜': 'kg',
  '节瓜': 'jg',
  '沙葛': 'sg',
  '黄花菜': 'hhc',
  '银耳': 'ye',
  '石耳': 'se',
  '雪耳': 'xe',
  '鹿茸菜': 'lrc',
  '紫菜': 'zc',
  '昆布': 'kb',
  '鹿角菜': 'ljc',
  '海白菜': 'hbc',
  '番茄酱': 'fqj',
  '蚝油': 'hy',
  '豆瓣酱': 'dbj',
  '腐乳': 'fr',
  '咸菜': 'xc',
  '白木耳': 'bem',
  '金针菜': 'jzc',
  '龙须菜': 'lxc',
  '芦笋': 'ls',
  '五花肉': 'whr',
  '猪里脊': 'zlj',
  '排骨': 'pg',
  '猪蹄': 'zt',
  '猪肘': 'zz',
  '猪后肘': 'zhz',
  '肉末': 'rm',
  '猪耳': 'ze',
  '猪头肉': 'zt',
  '猪皮': 'zp',
  '猪腰': 'zy',
  '腰花': 'yh',
  '猪肝': 'zg',
  '猪心': 'zx',
  '猪肚': 'zd',
  '猪血': 'zx',
  '梅花肉': 'mhr',
  '前腿肉': 'qtr',
  '后腿肉': 'htr',
  '牛腩': 'nn',
  '牛里脊': 'nlj',
  '牛腱': 'nj',
  '牛腱子': 'njz',
  '牛筋': 'nj',
  '肥牛': 'fn',
  '肥牛卷': 'fnj',
  '牛排': 'np',
  '牛骨': 'ng',
  '牛尾巴': 'nwb',
  '羊排': 'yp',
  '羊腿肉': 'ytm',
  '羊里脊': 'ylj',
  '羊蝎子': 'yxz',
  '羊肉卷': 'yrj',
  '羊肉片': 'yrp',
  '鸡腿肉': 'jtm',
  '琵琶腿': 'ptt',
  '鸡翅': 'jc',
  '鸡翅中': 'jcz',
  '鸡翅根': 'jcg',
  '鸡爪': 'jz',
  '鸡胗': 'jz',
  '鸡肝': 'jg',
  '鸡心': 'jx',
  '整鸡': 'zj',
  '三黄鸡': 'shj',
  '鸡架': 'jj',
  '鸭腿肉': 'ytm',
  '鸭胸肉': 'yxm',
  '鸭翅': 'yc',
  '鸭掌': 'yz',
  '鸭胗': 'yz',
  '整鸭': 'zy',
};

// 获取食材的拼音首字母
function getPinyinFirstLetter(text: string): string {
  return PINYIN_MAP[text] || '';
}

// 检查搜索关键词是否匹配食材（支持拼音首字母）
function matchesSearch(query: string, ingredient: string): boolean {
  if (!query || !ingredient) return false;
  
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedIngredient = ingredient.toLowerCase().trim();
  
  // 完全匹配（忽略空格和特殊字符）
  const cleanQuery = normalizedQuery.replace(/\s+/g, '');
  const cleanIngredient = normalizedIngredient.replace(/\s+/g, '');
  if (cleanIngredient.includes(cleanQuery)) {
    return true;
  }
  
  // 拼音首字母匹配
  const pinyin = getPinyinFirstLetter(normalizedIngredient);
  if (pinyin.includes(normalizedQuery)) {
    return true;
  }
  
  // 部分匹配
  if (normalizedQuery.length > 1 && normalizedIngredient.includes(normalizedQuery)) {
    return true;
  }
  
  // 拼音首字母的部分匹配
  if (normalizedQuery.length > 1 && pinyin.startsWith(normalizedQuery)) {
    return true;
  }
  
  // 同义词匹配
  const synonyms: Record<string, string[]> = {
    '土豆': ['马铃薯', '洋芋'],
    '西红柿': ['番茄'],
    '茄子': ['茄子', '紫茄', '青茄'],
    '豆角': ['四季豆', '长豆角', '豇豆'],
    '洋葱': ['圆葱', '葱头'],
    '大蒜': ['蒜头', '蒜'],
    '生姜': ['姜'],
    '香菜': ['芫荽', '香荽'],
    '菠菜': ['菠薐', '菠棱菜'],
    '白菜': ['大白菜', '黄芽菜'],
    '青菜': ['小白菜', '油菜'],
    '黄瓜': ['胡瓜', '青瓜'],
    '胡萝卜': ['红萝卜', '胡罗卜'],
    '辣椒': ['辣子', '红椒', '青椒'],
    '蘑菇': ['香菇', '平菇', '金针菇'],
    '豆腐': ['豆花', '豆腐脑'],
    '鸡蛋': ['鸡子', '蛋'],
    '鸭蛋': ['鸭卵'],
    '鹌鹑蛋': ['鹑蛋'],
    '皮蛋': ['松花蛋', '变蛋'],
    '咸蛋': ['咸鸭蛋', '盐蛋'],
    '鹅蛋': ['鹅卵'],
    '鸽蛋': ['鸽卵'],
    '牛肉': ['牛柳', '牛排', '牛腩'],
    '猪肉': ['猪排', '五花肉', '瘦肉', '肥肉'],
    '鸡肉': ['鸡胸肉', '鸡腿', '鸡翅'],
    '鸭肉': ['鸭胸肉', '鸭腿', '鸭翅'],
    '羊肉': ['羊排', '羊腿', '羊肉串'],
    '鱼肉': ['鱼', '鱼片', '鱼块'],
    '虾': ['虾仁', '鲜虾', '海虾'],
    '米饭': ['白饭', '饭'],
    '面条': ['面', '挂面', '拉面'],
    '馒头': ['馍', '馍馍'],
    '包子': ['小笼包', '肉包', '菜包'],
    '饺子': ['水饺', '蒸饺', '煎饺'],
    '馄饨': ['云吞', '抄手'],
    '烧麦': ['烧卖'],
    '粽子': ['棕子'],
    '汤圆': ['元宵'],
    '年糕': ['糍粑'],
    '豆腐': ['豆浆', '豆腐干', '豆腐皮', '腐竹'],
    '食用油': ['油', '植物油', '动物油'],
    '盐': ['食盐', '海盐', '岩盐'],
    '糖': ['白糖', '红糖', '冰糖'],
    '生抽': ['酱油', '生抽酱油'],
    '老抽': ['老抽酱油'],
    '料酒': ['黄酒', '料酒'],
    '醋': ['米醋', '陈醋', '香醋'],
    '蚝油': ['耗油'],
    '豆瓣酱': ['豆瓣', '辣酱'],
    '胡椒粉': ['胡椒', '白胡椒', '黑胡椒'],
    '花椒': ['川椒', '蜀椒'],
    '八角': ['大料', '大茴香'],
    '桂皮': ['肉桂', '桂树皮'],
    '香叶': ['月桂叶'],
    '干辣椒': ['辣椒干', '干椒'],
    '辣椒粉': ['辣椒面', '辣粉'],
    '葱': ['大葱', '小葱', '香葱'],
    '生姜': ['姜', '老姜', '子姜'],
    '大蒜': ['蒜', '蒜头', '蒜瓣'],
    '香菜': ['芫荽', '香荽'],
    '香油': ['芝麻油', '麻油'],
    '淀粉': ['生粉', '太白粉'],
    '鸡精': ['鸡粉', '鸡味料'],
    '味精': ['味素', '谷氨酸钠']
  };
  
  // 检查同义词匹配
  for (const [key, syns] of Object.entries(synonyms)) {
    if (syns.includes(normalizedQuery) && (key === normalizedIngredient || syns.includes(normalizedIngredient))) {
      return true;
    }
  }
  
  return false;
}

function normalizeSubtypeRecord(input: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [parent, cuts] of Object.entries(input || {})) {
    const p = normalizeKey(parent);
    if (!p) continue;
    const labels = (Array.isArray(cuts) ? cuts : [])
      .map((x) => normalizeKey(String(x)))
      .filter(Boolean);
    out[p] = Array.from(new Set(labels));
  }
  return out;
}

function difficultyRank(input: string): number {
  if (input === '简单') return 1;
  if (input === '中等') return 2;
  if (input === '复杂') return 3;
  if (input === '困难') return 4;
  return 99;
}

function parseCookTimeMinutes(input: string): number {
  const raw = (input || '').replace(/\s+/g, '');
  if (!raw) return Number.POSITIVE_INFINITY;

  const hourMatch = raw.match(/(\d+(?:\.\d+)?)小时/);
  const minuteMatch = raw.match(/(\d+(?:\.\d+)?)分钟/);

  const hours = hourMatch ? Number.parseFloat(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number.parseFloat(minuteMatch[1]) : 0;

  const total = hours * 60 + minutes;
  if (total > 0) return total;

  const numberOnly = raw.match(/(\d+(?:\.\d+)?)/);
  if (numberOnly) return Number.parseFloat(numberOnly[1]);

  return Number.POSITIVE_INFINITY;
}

const MEAT_SUBTYPES_NORM = normalizeSubtypeRecord(MEAT_SUBTYPES);

const EGG_PARENT = '蛋类';
const EGG_SUBTYPES = ['鸡蛋', '鸭蛋', '鹌鹑蛋', '皮蛋', '咸蛋', '鹅蛋', '鸽蛋', '鸵鸟蛋', '火鸡蛋', '鹧鸪蛋', '孔雀蛋'];

export default function RecipeGenerator(props: { onSuccess?: (msg: string) => void; onError?: (msg: string) => void; onInfo?: (msg: string) => void }) {
  const { onSuccess, onError, onInfo } = props;
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [customTools, setCustomTools] = useState<string[]>([]);
  const [newToolInput, setNewToolInput] = useState('');
  const [toolLibrary, setToolLibrary] = useState<{ id: string; label: string; emoji: string }[]>(KITCHEN_TOOLS_EXPANDED);
  const [ingredientLibraryAll, setIngredientLibraryAll] = useState<string[]>(() => Object.values(INGREDIENT_CATEGORY_MAP).flat());
  const [ingredientLibraryShown, setIngredientLibraryShown] = useState<string[]>(() => Object.values(INGREDIENT_CATEGORY_MAP).flat());
  const [meatSubtypeOptions, setMeatSubtypeOptions] = useState<Record<string, string[]>>(() => ({ ...MEAT_SUBTYPES_NORM }));
  const [seasonings, setSeasonings] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('seasonings');
    if (saved) {
      try {
        const savedSeasonings = JSON.parse(saved);
        // 检查是否是有效的对象
        if (typeof savedSeasonings === 'object' && savedSeasonings !== null) {
          // 保留老用户的调料选择
          return savedSeasonings;
        }
      } catch (e) {
        // 如果解析失败，使用默认值
      }
    }
    // 默认只激活常见的几十种，不要全部激活
    const defaultActive = ['食用油', '盐', '糖', '生抽', '老抽', '料酒', '醋', '蚝油', '葱', '生姜', '大蒜'];
    return Object.fromEntries(SEASONINGS.map(s => [s, defaultActive.includes(s)]));
  });
  const [customSeasonings, setCustomSeasonings] = useState<string[]>(() => {
    const saved = localStorage.getItem('customSeasonings');
    return saved ? JSON.parse(saved) : [];
  });
  const [newSeasoningInput, setNewSeasoningInput] = useState('');
  const [expandSeasonings, setExpandSeasonings] = useState(false);
  const [seasoningOptions, setSeasoningOptions] = useState<string[]>(SEASONINGS);
  const [seasoningSearchQuery, setSeasoningSearchQuery] = useState('');
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'肉' | '菜' | '主食' | '水果' | '豆制品' | '其他'>('肉');
  const [activeSeasoningCategory, setActiveSeasoningCategory] = useState<string>('全部');
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([]);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [namesLoading, setNamesLoading] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : {};
  });
  const [showFav, setShowFav] = useState(false);
  const [outrageousMode, setOutrageousMode] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [inventory, setInventory] = useState<Record<string, InventoryItem>>({});
  const [menuSort, setMenuSort] = useState<
    | { mode: 'default'; dir: 'asc' }
    | { mode: 'difficulty' | 'time'; dir: 'asc' | 'desc' }
  >({ mode: 'default', dir: 'asc' });
  const [ingredientSelections, setIngredientSelections] = useState<IngredientSelections>(() => {
    const saved = localStorage.getItem('ingredientSelections');
    if (!saved) return {};
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return parsed as IngredientSelections;
    } catch {
      void 0;
    }
    return {};
  });
  const [subtypePicker, setSubtypePicker] = useState<{
    parent: string;
    options: Array<{ group?: string; label: string }>;
    selected: string[];
    search: string;
  } | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [deletedItems, setDeletedItems] = useState<{ingredients: string[], tools: string[], seasonings: string[]}>(() => {
    const saved = localStorage.getItem('deletedItems');
    return saved ? JSON.parse(saved) : {ingredients: [], tools: [], seasonings: []};
  });

  const [userClickCounts, setUserClickCounts] = useState<{
    ingredients: Record<string, number>;
    seasonings: Record<string, number>;
    tools: Record<string, number>;
  }>(() => {
    const saved = localStorage.getItem('userClickCounts');
    if (!saved) return { ingredients: {}, seasonings: {}, tools: {} };
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          ingredients: (parsed.ingredients && typeof parsed.ingredients === 'object') ? parsed.ingredients : {},
          seasonings: (parsed.seasonings && typeof parsed.seasonings === 'object') ? parsed.seasonings : {},
          tools: (parsed.tools && typeof parsed.tools === 'object') ? parsed.tools : {},
        };
      }
    } catch {
      void 0;
    }
    return { ingredients: {}, seasonings: {}, tools: {} };
  });

  const groupedMenu = useMemo(() => {
    const isReady = (r: GeneratedRecipe) => (r.category || '') === '立即下厨';

    const ready: GeneratedRecipe[] = [];
    const buy: GeneratedRecipe[] = [];
    for (const r of recipes) {
      if (isReady(r)) ready.push(r);
      else buy.push(r);
    }

    const baseIndex = new Map<string, number>();
    recipes.forEach((r, idx) => baseIndex.set(r.id, idx));

    const getKey = (r: GeneratedRecipe) => {
      if (menuSort.mode === 'difficulty') return difficultyRank(r.difficulty);
      if (menuSort.mode === 'time') return parseCookTimeMinutes(r.cookTime);
      return baseIndex.get(r.id) ?? 0;
    };

    const sortDir = menuSort.mode === 'default' ? 'asc' : menuSort.dir;
    const factor = sortDir === 'asc' ? 1 : -1;
    const sortList = (list: GeneratedRecipe[]) =>
      list
        .slice()
        .sort((a, b) => {
          const aKey = getKey(a);
          const bKey = getKey(b);
          const aBad = !Number.isFinite(aKey);
          const bBad = !Number.isFinite(bKey);
          if (aBad && !bBad) return 1;
          if (!aBad && bBad) return -1;
          return (aKey - bKey) * factor || ((baseIndex.get(a.id) ?? 0) - (baseIndex.get(b.id) ?? 0));
        });

    return { ready: sortList(ready), buy: sortList(buy) };
  }, [recipes, menuSort]);

  useEffect(() => {
    localStorage.setItem('deletedItems', JSON.stringify(deletedItems));
  }, [deletedItems]);

  useEffect(() => {
    localStorage.setItem('seasonings', JSON.stringify(seasonings));
  }, [seasonings]);

  useEffect(() => {
    localStorage.setItem('customSeasonings', JSON.stringify(customSeasonings));
  }, [customSeasonings]);

  useEffect(() => {
    const savedTools = localStorage.getItem('selectedTools');
    const savedCustomTools = localStorage.getItem('customTools');
    if (savedTools) {
      try {
        const parsed = JSON.parse(savedTools);
        if (Array.isArray(parsed)) {
          const mapped = parsed.map((x) => (x === 'charcoal' ? 'grill' : x));
          setSelectedTools(Array.from(new Set(mapped)));
        }
      } catch { void 0; }
    } else {
      setSelectedTools(['wok','rice-cooker','air-fryer']);
    }
    if (savedCustomTools) {
      try { setCustomTools(JSON.parse(savedCustomTools)); } catch { void 0; }
    }
    
    // 加载库存
    fetchInventory().then(items => {
      const invMap: Record<string, InventoryItem> = {};
      items.forEach(item => { invMap[item.name] = item; });
      setInventory(invMap);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedTools', JSON.stringify(selectedTools));
  }, [selectedTools]);

  useEffect(() => {
    localStorage.setItem('customTools', JSON.stringify(customTools));
  }, [customTools]);
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('ingredientSelections', JSON.stringify(ingredientSelections));
  }, [ingredientSelections]);

  useEffect(() => {
    localStorage.setItem('userClickCounts', JSON.stringify(userClickCounts));
  }, [userClickCounts]);

  const bumpClick = useCallback((kind: 'ingredients' | 'seasonings' | 'tools', key: string) => {
    const k = key.trim();
    if (!k) return;
    setUserClickCounts((prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        [k]: (prev[kind][k] || 0) + 1,
      },
    }));
    const type = kind === 'tools' ? 'tool' : kind === 'seasonings' ? 'seasoning' : 'ingredient';
    fetch(`${API_BASE_URL}/api/inventory/bumpClick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: k, type })
    }).catch(() => {});
  }, []);

  const getScore = useCallback((kind: 'ingredients' | 'seasonings' | 'tools', key: string) => {
    const clicks = userClickCounts[kind][key] || 0;
    const base =
      kind === 'ingredients'
        ? (INGREDIENT_BASE_WEIGHT[key] ?? DEFAULT_BASE_WEIGHT)
        : kind === 'seasonings'
          ? (SEASONING_BASE_WEIGHT[key] ?? DEFAULT_BASE_WEIGHT)
          : (TOOL_BASE_WEIGHT[key] ?? DEFAULT_BASE_WEIGHT);
    return base + clicks;
  }, [userClickCounts]);

  useEffect(() => {
    // 动态库提取功能已废弃，回归纯静态本地库模式
    // 只使用本地配置和用户自定义的调料
    
    // 初始化时合并本地静态 SEASONINGS 和用户自定义的调料
    setSeasoningOptions(Array.from(new Set([...SEASONINGS, ...customSeasonings])));
    
    // 对于新增加的调料（不在现有 seasonings 状态里的），默认关闭
    setSeasonings((prev) => {
      const next = { ...prev };
      SEASONINGS.forEach(s => {
        if (next[s] === undefined) {
          next[s] = false; // 新加载的调料默认不勾选
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then(r => r.json())
      .then(data => console.log('后端联通:', data))
      .catch(err => console.error('后端连接失败:', err));
  }, []);

  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/ai/status`)
      .then((r) => r.json())
      .then((data) => {
        const ok = !!(data && ((data.volcengine && data.volcengine.configured) || (data.qwen && data.qwen.configured)));
        setAiConfigured(ok);
        if (!ok) {
          onInfo?.('老板，请在 server/.env 中填入你的火山引擎 Key（VOLCENGINE_API_KEY）或 Qwen Key（QWEN_API_KEY）才能开启 AI 补位');
        }
      })
      .catch(() => {});
  }, [onInfo]);

  const handleToolToggle = (toolId: string) => {
    bumpClick('tools', toolId);
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
  };

  const addCustomTool = () => {
    if (newToolInput.trim() && !customTools.includes(newToolInput.trim())) {
      const toolId = newToolInput.trim();
      const updated = [...customTools, toolId];
      setCustomTools(updated);
      setToolLibrary(prev => {
        if (!prev.some(t => t.id === toolId)) {
          return [...prev, { id: toolId, label: toolId, emoji: '🛠️' }];
        }
        return prev;
      });
      setSelectedTools(prev => [...prev, toolId]);
      setNewToolInput('');
    }
  };

  const removeCustomTool = (tool: string) => {
    setCustomTools(customTools.filter(t => t !== tool));
    setSelectedTools(selectedTools.filter(t => t !== tool));
  };

  const addIngredient = (ingredientRaw: string) => {
    const ingredient = normalizeKey(ingredientRaw);
    if (!ingredient) return;
    if (BANNED_INGREDIENTS.includes(ingredient)) {
      alert('你别揍饭了，我想揍人！建议先把危险物品锁起来。');
      return;
    }
    if (!selectedIngredients.includes(ingredient)) {
      bumpClick('ingredients', ingredient);
      setSelectedIngredients([...selectedIngredients, ingredient]);
    }
    setIngredientSearchQuery('');
  };

  const openSubtypePicker = (parentRaw: string, options: Array<{ group?: string; label: string }>) => {
    const parent = normalizeKey(parentRaw);
    if (!parent) return;
    const current = Array.isArray(ingredientSelections[parent]) ? ingredientSelections[parent] : (Array.isArray(ingredientSelections[parentRaw]) ? ingredientSelections[parentRaw] : []);
    const normalizedOptions = options
      .map((o) => ({ ...o, label: normalizeKey(o.label) }))
      .filter((o) => o.label.length > 0);
    setSubtypePicker({ parent, options: normalizedOptions, selected: current.slice().map((x) => normalizeKey(String(x))).filter(Boolean), search: '' });
  };

  const handleIngredientClick = (ingRaw: string) => {
    const ing = normalizeKey(ingRaw);
    if (!ing) return;
    if (ing === EGG_PARENT) {
      openSubtypePicker(EGG_PARENT, EGG_SUBTYPES.map((label) => ({ label })));
      return;
    }
    const meatOptions = meatSubtypeOptions[ing] || MEAT_SUBTYPES_NORM[ing];
    if (Array.isArray(meatOptions) && meatOptions.length > 0) {
      openSubtypePicker(ing, meatOptions.map((label) => ({ label })));
      return;
    }
    if (ing === FUNGI_PARENT) {
      const allowed = new Set(ingredientLibraryAll);
      const base = FUNGI_SUBTYPES.flatMap((g) => g.items.map((label) => ({ group: g.group, label: normalizeKey(label) })));
      const opts = base.filter((o) => allowed.has(o.label));
      openSubtypePicker(FUNGI_PARENT, opts.length > 0 ? opts : base);
      return;
    }
    addIngredient(ing);
  };

  const applySubtypeSelection = () => {
    if (!subtypePicker) return;
    const parent = subtypePicker.parent;
    const selected = subtypePicker.selected.slice();
    for (const x of selected) bumpClick('ingredients', x);
    // 不再将母类添加到 ingredients，只通过 ingredientSelections 传递

    setIngredientSelections((prev) => {
      const next = { ...prev };
      if (selected.length === 0) delete next[parent];
      else next[parent] = selected;
      return next;
    });

    setSelectedIngredients((prev) => {
      const next = prev.filter((t) => normalizeKey(parentOfTag(t)) !== parent);
      if (selected.length > 0) next.push(buildSubtypeTag(parent, selected.map((x) => normalizeKey(x)).filter(Boolean)));
      return next;
    });

    setSubtypePicker(null);
  };

  const clearSubtypeSelection = () => {
    if (!subtypePicker) return;
    const parent = subtypePicker.parent;
    setIngredientSelections((prev) => {
      const next = { ...prev };
      delete next[parent];
      return next;
    });
    setSelectedIngredients((prev) => prev.filter((t) => normalizeKey(parentOfTag(t)) !== parent));
    setSubtypePicker(null);
  };



  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ingredientSearchQuery.trim()) {
      const q = normalizeKey(ingredientSearchQuery);
      if (!q) return;
      // 直接添加食材到选中列表，跳过库检查
      addIngredient(q);
      onInfo?.(`${q} 已加入食材库中的【${activeTab}】栏`);
      setIngredientSearchQuery('');
    }
  };

  const removeIngredient = (ingredientRaw: string) => {
    const ingredient = normalizeKey(ingredientRaw);
    const parent = normalizeKey(parentOfTag(ingredientRaw));
    if (parent && ingredientSelections[parent]) {
      setIngredientSelections((prev) => {
        const next = { ...prev };
        delete next[parent];
        return next;
      });
    }
    setSelectedIngredients((prev) => prev.filter((i) => normalizeKey(i) !== ingredient));
  };

  const handleIngredientDoubleClick = async (ingredientRaw: string) => {
    const ingredient = normalizeKey(ingredientRaw);
    if (!ingredient) return;
    const isExpiring = inventory[ingredient]?.status === 'normal';
    await updateInventoryStatus(ingredient, isExpiring);
    setInventory(prev => ({
      ...prev,
      [ingredient]: {
        ...(prev[ingredient] || { id: `ingredient-${ingredient}`, name: ingredient, type: 'ingredient', frequency: 0, status: 'normal', orderIndex: 0 }),
        status: isExpiring ? 'yellow' : 'normal'
      }
    }));
  };

  const toggleSeasoning = (seasoning: string) => {
    bumpClick('seasonings', seasoning);
    setSeasonings(prev => ({
      ...prev,
      [seasoning]: !prev[seasoning]
    }));
  };

  const addCustomSeasoning = () => {
    if (newSeasoningInput.trim() && !customSeasonings.includes(newSeasoningInput.trim())) {
      const updated = [...customSeasonings, newSeasoningInput.trim()];
      setCustomSeasonings(updated);
      setSeasoningOptions(prev => Array.from(new Set([newSeasoningInput.trim(), ...prev])));
      setSeasonings(prev => ({ ...prev, [newSeasoningInput.trim()]: true }));
      setNewSeasoningInput('');
    }
  };

  const removeCustomSeasoning = (seasoning: string) => {
    setCustomSeasonings(customSeasonings.filter(s => s !== seasoning));
  };

  const handleGenerate = async (resetPage = true, opts?: { silent?: boolean }) => {
    if (selectedIngredients.length === 0) {
      if (opts?.silent) return;
      alert('请至少选择一种食材');
      return;
    }
    const banned = selectedIngredients.find(i => BANNED_INGREDIENTS.includes(i));
    if (banned) {
      if (!opts?.silent) alert('别揍饭了，我想揍你！建议去药店看看。');
      return;
    }

    const allTools = [...selectedTools, ...customTools];
    if (allTools.length === 0) {
      if (!opts?.silent) onError?.('请先选择厨具，否则无法匹配菜谱');
      return;
    }

    // 取消上一次正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const payloadIngredients = (() => {
      const out: string[] = [];
      const tags = selectedIngredients.slice();
      const selectedParents = new Set(Object.keys(ingredientSelections || {}).map((x) => normalizeKey(x)).filter(Boolean));
      
      for (const tag of tags) {
        const parentRaw = parentOfTag(tag);
        const parent = normalizeKey(parentRaw);
        
        // **修复：不再将父级名称（如猪肉）发给后端，只发送具体选择的子项（如猪耳）**
        // 之前发了父级名称，导致后端精确匹配时认为用户选了"猪肉"，从而匹配出各种猪肉菜谱。
        if (selectedParents.has(parent)) {
          if (parent === EGG_PARENT) {
            const arr = (ingredientSelections[parent] || ingredientSelections[parentRaw] || []) as unknown[];
            out.push(...arr.map((x) => normalizeKey(String(x))).filter(Boolean));
            continue;
          }
          if (meatSubtypeOptions[parent]) {
            const arr = (ingredientSelections[parent] || ingredientSelections[parentRaw] || []) as unknown[];
            if (arr.length > 0) {
              out.push(...arr.map((x) => normalizeKey(String(x))).filter(Boolean));
            } else {
              // 如果只选了父级没有选子级，才把父级发过去
              out.push(parent);
            }
            continue;
          }
          if (parent === FUNGI_PARENT) {
            const arr = (ingredientSelections[parent] || ingredientSelections[parentRaw] || []) as unknown[];
            out.push(...arr.map((x) => normalizeKey(String(x))).filter(Boolean));
            continue;
          }
        }
        
        // 如果当前 tag 既不是被选中的父级，也不是被选中的子级，并且它的父级被选中了子级，
        // 说明这个 tag 其实是个纯父级占位符（比如用户点了猪肉，弹出了抽屉选了猪耳，此时 selectedIngredients 依然包含 "猪肉" 这个主 tag）
        // 我们必须拦截这个占位符！
        if (meatSubtypeOptions[tag]) {
            const arr = (ingredientSelections[tag] || []) as unknown[];
            if (arr.length > 0) {
                // 如果这个父级（如猪肉）下有具体子项（如猪耳），绝对不把父级压进去
                // 连子项都已经推入过 out 了（在前面的逻辑里），所以这里直接跳过！
                continue; 
            }
        }

        out.push(normalizeKey(tag));
      }
        // 最终兜底拦截：如果你选了具体的猪肉部位（猪耳），但前端由于某种原因还是把 "猪肉" 这个词塞进了请求数组
        // 那我们就直接在这里把它删掉！
        const finalIngredients = Array.from(new Set(out.filter(Boolean)));
        
        // 扫描 finalIngredients，看是否有具体的子项（比如包含“耳”、“肉片”）
        const hasSpecificPork = finalIngredients.some(item => item !== '猪肉' && (item.includes('猪') || item.includes('耳') || item.includes('肉丝')));
        if (hasSpecificPork) {
            // 如果有具体子项，强制移除“猪肉”这个宽泛父级
            const index = finalIngredients.indexOf('猪肉');
            if (index !== -1) {
                finalIngredients.splice(index, 1);
            }
        }
        
        return finalIngredients;
    })();

    const currentPage = resetPage ? 1 : page + 1;
    if (resetPage) {
      setPage(1);
      setRecipes([]);
    } else {
      setPage(currentPage);
    }

    setNamesLoading(true);
    if (!opts?.silent) onInfo?.('正在匹配菜谱并补位生成…');
    
    if (resetPage && !opts?.silent) {
      const activeSeasoningsForAnalysis = Object.fromEntries(
        Object.entries(seasonings).filter(([k, v]) => v && !deletedItems.seasonings.includes(k))
      );
      const activeToolsForAnalysis = allTools.filter(t => !deletedItems.tools.includes(t));
      const steps = buildAnalysisSteps(selectedIngredients, activeSeasoningsForAnalysis, activeToolsForAnalysis);
      let idx = 0;
      setAnalysisText(steps[0]);
      const analysisInterval = setInterval(() => {
        idx++;
        if (idx < steps.length) {
          setAnalysisText(steps[idx]);
        } else {
          clearInterval(analysisInterval);
        }
      }, 500);
    }

    try {
      const activeSeasonings = Object.fromEntries(
        Object.entries(seasonings).filter(([k, v]) => v && !deletedItems.seasonings.includes(k))
      );
      const activeTools = allTools.filter(t => !deletedItems.tools.includes(t));
      const activeIngredients = payloadIngredients.filter(i => !deletedItems.ingredients.includes(i));

      // **修复：不再将包含父级和子级的复杂数组直接传给后端，只传最终的字符串数组**
      const finalActiveIngredients = activeIngredients.map(i => typeof i === 'string' ? i : i).filter(Boolean);

      const result = await fetchMatchRecipes(
        finalActiveIngredients,
        activeSeasonings, 
        activeTools, 
        outrageousMode ? 'outrageous' : 'standard',
        currentPage,
        ingredientSelections,
        { signal: abortController.signal }
      );
      
      setRecipes(prev => resetPage ? result.recipes : [...prev, ...result.recipes]);
      setTotalRecipes(result.total);
      setHasMore(result.hasMore);
      if (resetPage && !opts?.silent) onSuccess?.(`已生成 ${result.recipes.length} 道（可加载更多）`);
    } catch (err) {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
        onInfo?.('已取消菜谱生成');
        return;
      }
      if (err && typeof err === 'object' && 'code' in err) {
        const code = (err as { code?: unknown }).code;
        if (code === 'ABORTED') {
          onInfo?.('已取消菜谱生成');
          return;
        }
      }
      console.error('匹配失败:', err);
      if (!opts?.silent) onError?.('匹配失败，请稍后重试');
    } finally {
      setNamesLoading(false);
      setAnalysisText(null);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleCancelGenerate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setNamesLoading(false);
      setAnalysisText(null);
    }
  };

  // 自动触发逻辑已移除，改为纯手动触发

  // 旧的生成更多/收藏/菜单函数已移除
  const filteredIngredients = (() => {
    // 简化版：直接从 INGREDIENT_CATEGORY_MAP 获取对应分类的食材
    let pool: string[] = [];
    
    if (activeTab === '肉') {
      // 肉类分类：包含肉类食材 + 肉类父级 + 蛋类
      const meatIngredients = INGREDIENT_CATEGORY_MAP['肉'] || [];
      const meatParents = Object.keys(meatSubtypeOptions);
      pool = Array.from(new Set([...meatIngredients, ...meatParents, EGG_PARENT]));
    } else {
      // 其他分类：直接从分类映射中获取
      pool = INGREDIENT_CATEGORY_MAP[activeTab] || [];
    }
    
    // 过滤掉已删除的食材
    let filteredPool = pool.filter(ing => !deletedItems.ingredients.includes(ing));
    
    // 搜索过滤
    if (ingredientSearchQuery.trim()) {
      filteredPool = filteredPool.filter(ing => matchesSearch(ingredientSearchQuery, ing));
    }
    
    // 先规范化处理，再去重：确保每个食材只出现一次
    const normalizedMap = new Map<string, string>();
    filteredPool.forEach(ing => {
      const normalized = normalizeKey(ing);
      if (normalized) {
        normalizedMap.set(normalized, ing);
      }
    });
    filteredPool = Array.from(normalizedMap.values());
    
    // 按使用频率排序
    return filteredPool.sort((a, b) => getScore('ingredients', b) - getScore('ingredients', a));
  })();

  const availableSeasoningCount = Object.values(seasonings).filter(Boolean).length;
  const sortedToolLibrary = useMemo(() => {
    const list = toolLibrary.filter(t => !deletedItems.tools.includes(t.id));
    return list.sort((a, b) => getScore('tools', b.id) - getScore('tools', a.id));
  }, [toolLibrary, getScore, deletedItems.tools]);

  const filteredSeasoningOptions = useMemo(() => {
    const q = seasoningSearchQuery.trim();
    let base = seasoningOptions;
    
    // 按分类过滤
    if (activeSeasoningCategory !== '全部') {
      const categorySeasonings = SEASONING_CATEGORIES[activeSeasoningCategory as keyof typeof SEASONING_CATEGORIES];
      if (categorySeasonings) {
        // 只显示该分类下的调料
        base = base.filter(s => categorySeasonings.includes(s));
      }
    }
    
    // 按搜索词过滤
    if (q) {
      base = base.filter((s) => s.includes(q));
    }
    
    const list = base.filter(s => !deletedItems.seasonings.includes(s));
    return list.sort((a, b) => getScore('seasonings', b) - getScore('seasonings', a));
  }, [seasoningOptions, seasoningSearchQuery, activeSeasoningCategory, getScore, deletedItems.seasonings]);
  // 能量总结变量已移除

  return (
    <div className="space-y-6">
      {subtypePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 dark:bg-black/90" onClick={() => setSubtypePicker(null)} />
          <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-gray-800 dark:text-white">{subtypePicker.parent}部位/品类</div>
              <button onClick={() => setSubtypePicker(null)} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700">
                <X className="w-4 h-4 text-gray-800 dark:text-gray-200" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                value={subtypePicker.search}
                onChange={(e) => setSubtypePicker((prev) => prev ? { ...prev, search: e.target.value } : prev)}
                placeholder="搜索..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-200 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {(() => {
                const q = subtypePicker.search.trim();
                const items = q
                  ? subtypePicker.options.filter((o) => o.label.includes(q))
                  : subtypePicker.options;
                const byGroup = new Map<string, Array<{ group?: string; label: string }>>();
                for (const it of items) {
                  const g = it.group || '';
                  if (!byGroup.has(g)) byGroup.set(g, []);
                  byGroup.get(g)!.push(it);
                }
                const orderedGroups = Array.from(byGroup.keys());
                return orderedGroups.map((g) => (
                  <div key={g || 'all'}>
                    {g && <div className="text-xs text-gray-400 mb-2">{g}</div>}
                    <div className="grid grid-cols-3 gap-2">
                      {byGroup.get(g)!.map((o) => {
                        const checked = subtypePicker.selected.includes(o.label);
                        return (
                          <button
                            key={o.label}
                            onClick={() => setSubtypePicker((prev) => {
                              if (!prev) return prev;
                              const next = new Set(prev.selected);
                              if (next.has(o.label)) next.delete(o.label);
                              else next.add(o.label);
                              return { ...prev, selected: Array.from(next) };
                            })}
                            className={`px-3 py-2 rounded-lg text-sm border ${checked ? 'bg-orange-900/30 border-orange-500 text-orange-300' : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'}`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="flex items-center justify-between mt-4">
              <button onClick={clearSubtypeSelection} className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm">
                清空
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setSubtypePicker(null)} className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm">
                  取消
                </button>
                <button onClick={applySubtypeSelection} className="px-3 py-2 rounded-lg bg-orange-700 hover:bg-orange-600 text-white text-sm">
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 space-y-6 border border-gray-300 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
            我的厨房
          </label>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3 py-1 text-xs rounded-full border transition-all ${isEditMode ? 'bg-red-900/30 border-red-500 text-red-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'}`}
          >
            {isEditMode ? '完成管理' : '✏️ 管理库'}
          </button>
        </div>

        {isEditMode && (
          <div className="text-xs text-red-400 bg-red-900/20 dark:bg-red-900/30 p-2 rounded mb-2">
            点击右上角带有 × 的标签，即可将其永久从库中移除。如果误删，可以点击最下方的“恢复默认”按钮。
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            选择食材
          </label>
          <div className="space-y-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={ingredientSearchQuery}
                onChange={(e) => setIngredientSearchQuery(e.target.value)}
                placeholder="搜索/输入食材，回车加入"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </form>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {(['肉','菜','主食','水果','豆制品','其他'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-full text-xs border ${activeTab === tab ? 'bg-orange-600 text-white border-orange-500/40' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-200 border-gray-300 dark:border-gray-700'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-28 overflow-y-auto">
              {filteredIngredients.map((ing) => {
                const label = normalizeKey(ing);
                if (!label) return null;
                const hasMeatSubtypes = (Array.isArray(meatSubtypeOptions[label]) && meatSubtypeOptions[label].length > 0) || (Array.isArray(MEAT_SUBTYPES_NORM[label]) && MEAT_SUBTYPES_NORM[label].length > 0);
                const isSubtypeParent = label === EGG_PARENT || label === FUNGI_PARENT || hasMeatSubtypes;
                const isPicked = selectedIngredients.some((t) => normalizeKey(parentOfTag(t)) === label) || selectedIngredients.includes(label);
                const disabled = !isSubtypeParent && isPicked;
                const className = `px-3 py-2 rounded-lg text-sm relative overflow-hidden ${isPicked ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'} ${disabled ? 'opacity-60' : ''}`;
                return (
                  <div key={label} className="relative group">
                    <button
                      onClick={() => handleIngredientClick(label)}
                      onDoubleClick={() => handleIngredientDoubleClick(label)}
                      disabled={disabled && !isEditMode}
                      className={`w-full h-full ${className}`}
                    >
                      {label}
                    </button>
                    {isEditMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletedItems(prev => ({ ...prev, ingredients: [...prev.ingredients, label] }));
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 z-10 shadow-sm border border-gray-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedIngredients.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedIngredients.map((ing) => (
                <div
                  key={ing}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-orange-900/20 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 rounded-lg text-sm"
                >
                  {ing}
                  <button
                    onClick={() => removeIngredient(ing)}
                    className="hover:text-orange-400 dark:hover:text-orange-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
            厨具库
          </label>
          <div className="grid grid-cols-5 gap-2 mb-4 max-h-44 overflow-y-auto">
            {sortedToolLibrary.map((tool) => (
              <div key={tool.id} className="relative group">
                <button
                  onClick={() => handleToolToggle(tool.id)}
                  disabled={isEditMode}
                  className={`w-full px-2 py-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 text-xs ${
                    selectedTools.includes(tool.id)
                      ? 'border-orange-500 bg-orange-900/10 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300'
                      : 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  } ${isEditMode ? 'opacity-50' : ''}`}
                  title={tool.label}
                >
                  <span className="text-lg">{tool.emoji}</span>
                  <span className="line-clamp-1">{tool.label}</span>
                </button>
                {isEditMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletedItems(prev => ({ ...prev, tools: [...prev.tools, tool.id] }));
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 z-10 shadow-sm border border-gray-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">自定义厨具</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newToolInput}
                onChange={(e) => setNewToolInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomTool()}
                placeholder="如：破壁机"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
              />
              <button
                onClick={addCustomTool}
                className="px-3 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-600 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {customTools.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customTools.map((tool) => (
                  <div
                    key={tool}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-green-900/20 dark:bg-green-900/30 text-green-600 dark:text-green-300 rounded-lg text-sm"
                  >
                    {tool}
                    <button
                      onClick={() => removeCustomTool(tool)}
                      className="hover:text-green-400 dark:hover:text-green-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-300 dark:border-gray-800 pt-4">
          <button
            onClick={() => setExpandSeasonings(!expandSeasonings)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
              调料库 ({availableSeasoningCount + customSeasonings.length}种)
            </span>
            {expandSeasonings ? (
              <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </button>

          {expandSeasonings && (
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => setActiveSeasoningCategory('全部')}
                    className={`px-3 py-1 rounded-full text-xs border ${activeSeasoningCategory === '全部' ? 'bg-orange-600 text-white border-orange-500/40' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-300 dark:border-gray-600'}`}
                  >
                    全部
                  </button>
                  {Object.keys(SEASONING_CATEGORIES).map((category) => (
                    <button
                      key={category}
                      onClick={() => setActiveSeasoningCategory(category)}
                      className={`px-3 py-1 rounded-full text-xs border ${activeSeasoningCategory === category ? 'bg-orange-600 text-white border-orange-500/40' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-300 dark:border-gray-600'}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="relative flex-1 mr-2">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={seasoningSearchQuery}
                    onChange={(e) => setSeasoningSearchQuery(e.target.value)}
                    placeholder="搜索调料..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // 全选所有调料
                      const allSeasonings = [...seasoningOptions];
                      const newSeasonings = { ...seasonings };
                      allSeasonings.forEach(seasoning => {
                        newSeasonings[seasoning] = true;
                      });
                      setSeasonings(newSeasonings);
                    }}
                    className="px-3 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-600 transition-all text-xs"
                  >
                    全选调料
                  </button>
                  <button
                    onClick={() => {
                      // 取消全选所有调料
                      const newSeasonings = { ...seasonings };
                      Object.keys(newSeasonings).forEach(key => {
                        newSeasonings[key] = false;
                      });
                      setSeasonings(newSeasonings);
                    }}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all text-xs"
                  >
                    取消全选
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
                {filteredSeasoningOptions.map((seasoning) => (
                  <div key={seasoning} className="relative group">
                    <label
                      className={`flex items-center gap-2 cursor-pointer py-1 ${isEditMode ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={seasonings[seasoning]}
                        onChange={() => toggleSeasoning(seasoning)}
                        className="w-4 h-4 rounded text-orange-500 cursor-pointer"
                        disabled={isEditMode}
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">{seasoning}</span>
                    </label>
                    {isEditMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletedItems(prev => ({ ...prev, seasonings: [...prev.seasonings, seasoning] }));
                        }}
                        className="absolute right-0 top-1/2 -translate-y-1/2 bg-red-500 text-white rounded-full p-0.5 z-10 shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {customSeasonings.length > 0 && (
                <div className="border-t border-gray-300 dark:border-gray-700 pt-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">自定义调料</p>
                  <div className="flex flex-wrap gap-2">
                    {customSeasonings.map((s) => (
                      <div
                        key={s}
                        className="inline-flex items-center gap-2 px-2 py-1 bg-purple-900/20 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded text-xs"
                      >
                        {s}
                        <button
                          onClick={() => removeCustomSeasoning(s)}
                          className="hover:text-purple-400 dark:hover:text-purple-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-300 dark:border-gray-700 pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSeasoningInput}
                    onChange={(e) => setNewSeasoningInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomSeasoning()}
                    placeholder="自定义调料..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-xs outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={addCustomSeasoning}
                    className="px-3 py-2 bg-orange-700 text-white rounded hover:bg-orange-600 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {isEditMode && (
          <div className="pt-4 border-t border-gray-300 dark:border-gray-800 flex justify-center">
            <button
              onClick={() => {
                if (window.confirm('确定要恢复所有被删除的默认项吗？你的自定义项会保留。')) {
                  setDeletedItems({ ingredients: [], tools: [], seasonings: [] });
                  setIsEditMode(false);
                }
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white rounded-lg text-sm transition-colors"
            >
              🔄 恢复默认库
            </button>
          </div>
        )}
      </div>

      {/* 脑洞模式开关 */}
      <div className="flex items-center gap-3 px-2 py-4">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="relative w-12 h-6">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={outrageousMode}
              onChange={(e) => setOutrageousMode(e.target.checked)}
            />
            <div className="w-12 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:bg-orange-600 transition-all"></div>
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-all shadow-md"></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center gap-1.5">
              {outrageousMode ? (
                <Ghost className="w-4 h-4 text-orange-400 animate-pulse" />
              ) : (
                <Flame className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
              脑洞模式 (离谱菜谱)
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
              未开发
            </span>
          </div>
        </label>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handleGenerate(true)}
          disabled={namesLoading || selectedIngredients.length === 0}
          className="flex-1 py-4 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 rounded-2xl font-bold text-white shadow-lg shadow-orange-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {namesLoading ? (
            <div className="flex items-center gap-3">
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                <Flame className="absolute inset-0 w-full h-full text-white scale-50 animate-pulse" />
              </div>
              <span>{analysisText || '主厨正在爆炒专属菜谱 (约需10秒)...'}</span>
            </div>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>开始揍饭</span>
            </>
          )}
        </button>
        {namesLoading && (
          <button
            onClick={handleCancelGenerate}
            className="px-6 py-4 bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:text-red-300 border border-red-500/30 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Ban className="w-5 h-5" />
            取消
          </button>
        )}
      </div>

      {aiConfigured === false && (
        <div className="mt-3 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-300/20 rounded-xl px-3 py-2">
          老板，请在 server/.env 中填入你的火山引擎 Key（VOLCENGINE_API_KEY）或 Qwen Key（QWEN_API_KEY）才能开启 AI 补位。
        </div>
      )}

      {/* 菜谱结果展示 */}
      {recipes.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="px-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-400" />
                今日菜单 ({totalRecipes} 道)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMenuSort((prev) => {
                    if (prev.mode !== 'difficulty') return { mode: 'difficulty', dir: 'asc' };
                    if (prev.dir === 'asc') return { mode: 'difficulty', dir: 'desc' };
                    return { mode: 'default', dir: 'asc' };
                  });
                }}
                className={`px-3 py-2 rounded-xl text-sm font-extrabold border transition-colors ${
                  menuSort.mode === 'difficulty'
                    ? 'bg-white text-black border-white/30'
                    : 'bg-white/10 text-white border-white/15 hover:bg-white/15'
                }`}
              >
                按难度排序{menuSort.mode === 'difficulty' ? (menuSort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuSort((prev) => {
                    if (prev.mode !== 'time') return { mode: 'time', dir: 'asc' };
                    if (prev.dir === 'asc') return { mode: 'time', dir: 'desc' };
                    return { mode: 'default', dir: 'asc' };
                  });
                }}
                className={`px-3 py-2 rounded-xl text-sm font-extrabold border transition-colors ${
                  menuSort.mode === 'time'
                    ? 'bg-white text-black border-white/30'
                    : 'bg-white/10 text-white border-white/15 hover:bg-white/15'
                }`}
              >
                按耗费时间排序{menuSort.mode === 'time' ? (menuSort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-black/40 border border-emerald-400/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-black text-emerald-300">立即下厨</div>
                <div className="text-xs font-bold text-emerald-200/70">{groupedMenu.ready.length} 道</div>
              </div>
              {groupedMenu.ready.length === 0 ? (
                <div className="text-sm text-gray-400 py-6 text-center">暂无</div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {groupedMenu.ready.map((recipe) => (
                    <RecipeCard 
                      key={recipe.id} 
                      recipe={recipe} 
                      mode={outrageousMode ? 'outrageous' : 'standard'} 
                      onUpdateRecipe={(updatedRecipe) => {
                        // 更新菜谱列表中的菜谱信息
                        setRecipes(prev => {
                          const index = prev.findIndex(r => r.id === updatedRecipe.id);
                          if (index !== -1) {
                            const newRecipes = [...prev];
                            newRecipes[index] = updatedRecipe;
                            return newRecipes;
                          }
                          return prev;
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {hasMore && (
            <button
              onClick={() => handleGenerate(false)}
              disabled={namesLoading}
              className="w-full py-3 bg-white hover:bg-gray-100 disabled:bg-gray-700 text-black disabled:text-gray-200 rounded-xl text-sm font-extrabold transition-colors flex items-center justify-center gap-2 border border-white/20"
            >
              {namesLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              点击加载更多菜谱
            </button>
          )}
        </div>
      )}

      {/* 今日菜单与能量总结已移除，以简化“先列清单，后出详情”模式 */}
    </div>
  );
}

// 旧的 Section 菜名列表已移除，改用 RecipeCard 展示完整菜谱
