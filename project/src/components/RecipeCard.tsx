import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Clock,
  Users,
  Flame,
  ChevronRight,
  X,
  ChefHat,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Share2,
  Heart,
  ShoppingCart,
  Minus,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '') as string;

// ==================== 类型定义 ====================

export interface Recipe {
  id: string;
  name: string;
  description: string;
  mainIngredients: string[];
  allIngredients: Array<{ name: string; amount?: string; itemTotalCalories?: number; missingNutrition?: boolean } | string>;
  steps: Array<any> | string[];
  cookTime: string;
  servings: string;
  calories: number;
  difficulty: '简单' | '中等' | '复杂' | '困难';
  tools: string[];
  stepCount: number;
  cookedCount?: number;
  is_expired_warning?: boolean;
  missing?: string[];
  tips?: string;
  note?: string;
  category?: '立即下厨' | '顺路买点';
  isDraft?: boolean;
}

export interface RecipeCardProps {
  recipe: Recipe;
  mode?: 'standard' | 'outrageous';
  onShare?: (recipe: Recipe) => void;
  onFavorite?: (recipe: Recipe) => void;
  onShop?: (recipe: Recipe) => void;
  onUpdateRecipe?: (recipe: Recipe) => void;
}

// ==================== 配置常量 ====================

const DIFFICULTY_CONFIG = {
  '简单': { bg: 'bg-green-900/40', text: 'text-green-400', icon: '😊' },
  '中等': { bg: 'bg-yellow-900/40', text: 'text-yellow-400', icon: '🤔' },
  '复杂': { bg: 'bg-red-900/40', text: 'text-red-400', icon: '😰' },
  '困难': { bg: 'bg-red-900/40', text: 'text-red-400', icon: '😰' },
} as const;

const TOOL_META: Record<string, { label: string; emoji: string }> = {
  'wok': { label: '炒锅', emoji: '🍳' },
  'rice-cooker': { label: '电饭煲', emoji: '🍚' },
  'microwave': { label: '微波炉', emoji: '📻' },
  'air-fryer': { label: '空气炸锅', emoji: '🔥' },
  'blender': { label: '破壁机', emoji: '⚙️' },
  'oven': { label: '烤箱', emoji: '🔆' },
  'pressure-cooker': { label: '高压锅', emoji: '⏱️' },
  'slow-cooker': { label: '慢炖锅', emoji: '🌡️' },
  'steamer': { label: '蒸锅', emoji: '☁️' },
  'induction': { label: '电磁炉', emoji: '⚡' },
  'grill': { label: '烧烤炉', emoji: '♨️' },
};

function normalizeToolId(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s;
}

function renderToolsInline(toolsRaw: unknown) {
  const toolsArray = Array.isArray(toolsRaw) ? toolsRaw.map(normalizeToolId).filter(Boolean) : [];
  const tools = Array.from(new Set(toolsArray)); // 去重，解决显示三遍炒锅的问题
  if (tools.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 ml-2">
      {tools.map((id) => {
        const meta = TOOL_META[id];
        const label = meta ? meta.label : (id === 'wok' ? '炒锅' : id);
        const emoji = meta ? meta.emoji : '🛠️';
        return (
          <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/30 text-[10px] text-gray-100 border border-white/15">
            <span className="text-[11px] leading-none">{emoji}</span>
            <span className="leading-none">{label}</span>
          </span>
        );
      })}
    </div>
  );
}

// ==================== 动画变体 ====================

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  hover: { scale: 1.02, y: -4 },
  tap: { scale: 0.98 },
};

const drawerVariants: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 200 } },
  exit: { x: '100%' },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

type IngredientDetail = {
  name: string;
  amount: number | null;
  unit: string;
  note?: string;
  isRequired?: boolean;
};

type DetailRecipeResponse = {
  id?: string;
  name?: string;
  description?: string;
  cookTime?: string;
  servings?: string;
  difficulty?: string;
  calories?: number;
  mainIngredients?: string[];
  allIngredients?: any[];
  allIngredientsDetailed?: IngredientDetail[];
  steps?: any[];
  tips?: string;
  requiredSeasonings?: string[];
  optionalSeasonings?: string[];
  tools?: string[];
  recipe?: any;
};

type IngredientViewItem = {
  name: string;
  amountValue: number | null;
  unit: string;
  note: string;
  displayAmount: string;
  displayNote: string;
};

function parseServingsCount(servingsText: unknown): number {
  const s = typeof servingsText === 'string' ? servingsText : '';
  const m = s.match(/(\d+)/);
  const n = m ? Number.parseInt(m[1], 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 2;
}

function normalizeUnitAndValue(amountValue: number | null, unitRaw: unknown): { value: number | null; unit: string } {
  if (!(typeof amountValue === 'number' && Number.isFinite(amountValue) && amountValue > 0)) {
    return { value: null, unit: typeof unitRaw === 'string' ? unitRaw.trim() : '' };
  }

  const u = (typeof unitRaw === 'string' ? unitRaw : '').trim().toLowerCase();
  if (!u) return { value: amountValue, unit: 'g' };

  if (u === 'g' || u === '克') return { value: amountValue, unit: 'g' };
  if (u === 'kg' || u === '千克') return { value: amountValue * 1000, unit: 'g' };
  if (u === 'ml' || u === '毫升') return { value: amountValue, unit: 'ml' };
  if (u === 'l' || u === '升') return { value: amountValue * 1000, unit: 'ml' };
  if (u === '斤') return { value: amountValue * 500, unit: 'g' };
  if (u === '两') return { value: amountValue * 50, unit: 'g' };

  return { value: amountValue, unit: typeof unitRaw === 'string' ? unitRaw.trim() : u };
}

function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatNumber(n: number): string {
  const v = roundToOneDecimal(n);
  return Number.isInteger(v) ? String(v) : String(v);
}

function formatAmountWithUnit(amountValue: number | null, unit: string): string {
  if (!(typeof amountValue === 'number' && Number.isFinite(amountValue) && amountValue > 0)) return '适量';
  const u = unit.trim() || 'g';
  const v = roundToOneDecimal(amountValue);
  if (u === 'g' && v >= 1000) {
    const kg = roundToOneDecimal(v / 1000);
    return `${formatNumber(v)}g (${formatNumber(kg)}kg)`;
  }
  return `${formatNumber(v)}${u}`;
}

function stripOuterParens(note: string): string {
  const s = note.trim();
  if (s.length >= 2 && ((s.startsWith('(') && s.endsWith(')')) || (s.startsWith('（') && s.endsWith('）')))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

function getStaticNoteAnchor(nameRaw: unknown, noteRaw: unknown): string {
  const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
  const note = typeof noteRaw === 'string' ? noteRaw : '';
  if (!note) return '';
  if (name.includes('盐')) return '';
  return stripOuterParens(note);
}

function parseAmountFromText(amountText: unknown): { value: number | null; unit: string } {
  const s = typeof amountText === 'string' ? amountText.trim() : '';
  if (!s) return { value: null, unit: '' };
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return { value: null, unit: '' };
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return { value: null, unit: '' };
  const unitPart = s.replace(m[1], '').trim();
  const unit = unitPart || '';
  return { value: n, unit };
}

function parseIngredientLineToDetail(line: string): IngredientDetail {
  const raw = String(line || '').trim();
  if (!raw) return { name: '', amount: null, unit: '', note: '', isRequired: true };

  const noteMatch = raw.match(/[（(]\s*([^）)]+)\s*[)）]/);
  const note = noteMatch ? noteMatch[1].trim() : '';
  const noParen = raw.replace(/[（(].*?[)）]/g, '').trim();

  if (noParen.includes('适量') || noParen.includes('少许')) {
    const name = noParen.replace(/(适量|少许)/g, '').trim() || noParen.trim();
    return { name, amount: null, unit: '', note: note || '适量', isRequired: true };
  }

  const m = noParen.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|克|千克|毫升|升|斤|两)\b/i);
  if (m) {
    const amount = Number(m[1]);
    const unit = m[2];
    const name = noParen.replace(m[0], '').trim();
    return { name: name || noParen.trim(), amount: Number.isFinite(amount) ? amount : null, unit, note, isRequired: true };
  }

  const numOnly = noParen.match(/(\d+(?:\.\d+)?)/);
  if (numOnly) {
    const amount = Number(numOnly[1]);
    const name = noParen.replace(numOnly[1], '').trim();
    return { name: name || noParen.trim(), amount: Number.isFinite(amount) ? amount : null, unit: '', note, isRequired: true };
  }

  return { name: noParen.trim(), amount: null, unit: '', note, isRequired: true };
}

// ==================== 子组件 ====================

/**
 * 统计信息项组件（记忆化）
 */
const StatItem = React.memo(function StatItem({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  colorClass: string;
}) {
  return (
    <div className="bg-gray-100 dark:bg-white/5 rounded-2xl p-3 text-center">
      <Icon className={`w-5 h-5 ${colorClass} mx-auto mb-1`} />
      <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
      <div className="text-sm font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
});

/**
 * 步骤项组件（记忆化）
 */
const StepItem = React.memo(function StepItem({
  step,
  index,
}: {
  step: string;
  index: number;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
        {index + 1}
      </div>
      <div className="flex-1 bg-gray-100 dark:bg-white/5 rounded-2xl p-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{step}</p>
      </div>
    </div>
  );
});

// ==================== 主组件 ====================

export default function RecipeCard({
  recipe,
  mode = 'standard',
  onShare,
  onFavorite,
  onShop,
  onUpdateRecipe,
}: RecipeCardProps) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [isCooked, setIsCooked] = useState(false);
  const [cookedCount, setCookedCount] = useState(recipe.cookedCount || 0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [totalCalories, setTotalCalories] = useState<number | null>(null);
  const [totalProtein, setTotalProtein] = useState<number | null>(null);
  const [totalFat, setTotalFat] = useState<number | null>(null);
  const [totalCarbs, setTotalCarbs] = useState<number | null>(null);
  const [caloriesLoading, setCaloriesLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false); // 新增详情加载状态
  const [errorMsg, setErrorMsg] = useState(''); // 新增错误提示状态
  const [localRecipe, setLocalRecipe] = useState<Recipe>(recipe);

  // 每次外部传入新的 recipe 时，更新本地状态（特别是从列表中重新加载时能获取到后台已补齐的最新状态）
  useEffect(() => {
    setLocalRecipe(recipe);
  }, [recipe]);

  const displayRecipe = localRecipe;
  const isDraft = displayRecipe.isDraft;
  const [calorieDetails, setCalorieDetails] = useState<Array<{ name: string; amount: string; calories: number; protein: number; fat: number; carbs: number; missingNutrition?: boolean }> | null>(null);
  const [detailRecipe, setDetailRecipe] = useState<DetailRecipeResponse | null>(null);
  const [servingCount, setServingCount] = useState<number>(() => {
    // 从 localStorage 读取用户偏好
    const saved = localStorage.getItem('preferredServingCount');
    return saved ? parseInt(saved, 10) : 2;
  });

  // 获取详情数据（当展开抽屉时）
  useEffect(() => {
    // 只有当showDrawer为true，且(recipe.isDraft为true或者detailRecipe为null)时才调用API
    if (!showDrawer || (!recipe.isDraft && detailRecipe)) return;

    const controller = new AbortController();
    
    setDetailLoading(true);
    setErrorMsg('');
    fetch(`${API_BASE_URL}/api/detailJson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: recipe.id,
        dishName: recipe.name,
        ingredients: [],
        seasonings: {},
        tools: [],
        mode,
      }),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        const d = data as DetailRecipeResponse & { ok?: boolean, reason?: string, recipe?: any };
        if (d.ok === false) {
          setErrorMsg(d.reason || '补齐失败');
          return;
        }
        if (d && (d.id || d.recipe?.id)) {
          // 如果后端返回了完整数据，更新详情状态
          const detailData = d.recipe || d;
          setDetailRecipe(detailData);
          
          // 如果原本是草稿，也可以同步更新一下外部对象的属性，避免每次都重新生成
          if (recipe.isDraft) {
            recipe.isDraft = false;
            if (detailData.allIngredientsDetailed || detailData.allIngredients) {
              recipe.allIngredients = detailData.allIngredientsDetailed || detailData.allIngredients;
            }
            if (detailData.steps) {
              recipe.steps = detailData.steps;
            }
            if (detailData.calories) {
              recipe.calories = detailData.calories;
            }
            if (detailData.cookTime) {
              recipe.cookTime = detailData.cookTime;
            }
            if (detailData.difficulty) {
              recipe.difficulty = detailData.difficulty;
            }
            if (detailData.description) {
              recipe.description = detailData.description;
            }
          }
          
          // 更新本地状态
          const updatedRecipe = {
            ...recipe,
            isDraft: false,
            allIngredients: detailData.allIngredientsDetailed || detailData.allIngredients || recipe.allIngredients,
            steps: detailData.steps || recipe.steps,
            calories: detailData.calories || recipe.calories,
            cookTime: detailData.cookTime || recipe.cookTime,
            difficulty: detailData.difficulty || recipe.difficulty,
            description: detailData.description || recipe.description
          };
          
          setLocalRecipe(updatedRecipe);
          
          // 调用父组件回调更新菜谱信息
          onUpdateRecipe?.(updatedRecipe);
        }
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          console.error('Failed to load recipe detail:', e);
          setErrorMsg('主厨补齐做法时遇到了点问题，请重试');
        }
      })
      .finally(() => {
        setDetailLoading(false);
      });

    return () => controller.abort();
  }, [showDrawer, recipe, mode, detailRecipe]);

  // 计算调整后的用量和热量
  const scaledRecipe = useMemo(() => {
    const originalServings = parseServingsCount(detailRecipe?.servings ?? recipe.servings);
    const scaleFactor = servingCount / originalServings;

    // 调整热量
    const scaledCalories = Math.round(recipe.calories * scaleFactor);

    const baseIngredients: IngredientDetail[] = Array.isArray(detailRecipe?.allIngredientsDetailed) && detailRecipe?.allIngredientsDetailed.length > 0
      ? detailRecipe.allIngredientsDetailed.map((x) => ({
          name: typeof x?.name === 'string' ? x.name : '',
          amount: typeof x?.amount === 'number' ? x.amount : null,
          unit: typeof x?.unit === 'string' ? x.unit : '',
          note: typeof x?.note === 'string' ? x.note : '',
          isRequired: typeof x?.isRequired === 'boolean' ? x.isRequired : true,
        }))
      : (Array.isArray(recipe.allIngredients) ? recipe.allIngredients : []).map((ing) => {
          if (typeof ing === 'string') {
            return parseIngredientLineToDetail(ing);
          }
          if (!ing || typeof ing !== 'object') return { name: '', amount: null, unit: '', note: '', isRequired: true };
          const nameValue = (ing as { name?: unknown }).name;
          const amountText = (ing as { amount?: unknown }).amount;
          const parsed = parseAmountFromText(amountText);
          return {
            name: typeof nameValue === 'string' ? nameValue : '',
            amount: parsed.value,
            unit: parsed.unit,
            note: '',
            isRequired: true,
          };
        });

    const viewIngredients: IngredientViewItem[] = baseIngredients
      .filter((x) => typeof x.name === 'string' && x.name.trim())
      .map((x) => {
        const normalized = normalizeUnitAndValue(x.amount, x.unit);
        const scaledAmount = typeof normalized.value === 'number' ? normalized.value * scaleFactor : null;
        const scaledValue = typeof scaledAmount === 'number' ? roundToOneDecimal(scaledAmount) : null;
        const displayAmount = formatAmountWithUnit(scaledValue, normalized.unit);
        const displayNote = getStaticNoteAnchor(x.name, x.note);
        return {
          name: x.name,
          amountValue: scaledValue,
          unit: normalized.unit,
          note: x.note || '',
          displayAmount,
          displayNote,
        };
      });

    const ingredientsForCalories = viewIngredients.map((x) => ({
      name: x.name,
      amount: x.amountValue,
      unit: x.unit,
    }));

    console.log('Ingredients for calories calculation:', ingredientsForCalories);

    const fallbackLines = (Array.isArray(recipe.allIngredients) ? recipe.allIngredients : []).map((ing) => {
      if (typeof ing === 'string') return String(ing);
      if (!ing || typeof ing !== 'object') return '';
      const nameValue = (ing as { name?: unknown }).name;
      const amountText = (ing as { amount?: unknown }).amount;
      const name = typeof nameValue === 'string' ? nameValue : '';
      const amount = typeof amountText === 'string' ? amountText : '';
      return `${name}${amount ? ` ${amount}` : ''}`.trim();
    }).filter(Boolean);

    return {
      calories: scaledCalories,
      viewIngredients,
      ingredientsForCalories,
      fallbackLines,
    };
  }, [recipe, servingCount, detailRecipe]);

  // 测试营养计算API
  useEffect(() => {
    const testIngredients = [
      { name: '五花肉', amount: 600, unit: 'g' },
      { name: '盐', amount: 6, unit: 'g' },
      { name: '生抽', amount: 30, unit: 'ml' },
      { name: '白胡椒粉', amount: 2, unit: 'g' }
    ];
    
    console.log('Testing nutrition calculation with:', testIngredients);
    
    fetch(`${API_BASE_URL}/api/calories/total`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allIngredients: testIngredients, debug: true })
    })
      .then((r) => r.json())
      .then((data) => {
        console.log('Test nutrition data received:', data);
        // 手动设置状态，测试营养信息显示
        setTotalCalories(data.total);
        setTotalProtein(data.protein);
        setTotalFat(data.fat);
        setTotalCarbs(data.carbs);
        setCalorieDetails(data.details);
      })
      .catch((error) => {
        console.error('Error testing nutrition calculation:', error);
      });
  }, []);

  useEffect(() => {
    if (!showDrawer) return;
    let cancelled = false;
    setCaloriesLoading(true);
    setTotalCalories(null);
    setTotalProtein(null);
    setTotalFat(null);
    setTotalCarbs(null);
    setCalorieDetails(null);

    const ingredients = scaledRecipe.ingredientsForCalories;
    console.log('Sending ingredients for calculation:', ingredients);

    fetch(`${API_BASE_URL}/api/calories/total`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allIngredients: ingredients, debug: true })
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        console.log('Nutrition data received:', data);
        if (data && typeof data.total === 'number') setTotalCalories(data.total);
        if (data && typeof data.protein === 'number') setTotalProtein(data.protein);
        if (data && typeof data.fat === 'number') setTotalFat(data.fat);
        if (data && typeof data.carbs === 'number') setTotalCarbs(data.carbs);
        if (data && Array.isArray(data.details)) setCalorieDetails(data.details);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching nutrition data:', error);
      })
      .finally(() => {
        if (cancelled) return;
        setCaloriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showDrawer, scaledRecipe.ingredientsForCalories]);

  useEffect(() => {
    if (!calorieDetails) return;
    for (const d of calorieDetails) {
      if (d && d.missingNutrition) {
        console.warn('[nutrition-db missing]', d.name);
      }
    }
  }, [calorieDetails]);

  const caloriesPerPerson = useMemo(() => {
    const total = totalCalories ?? scaledRecipe.calories;
    const per = servingCount > 0 ? total / servingCount : total;
    return Math.round(per);
  }, [totalCalories, scaledRecipe.calories, servingCount]);

  // 保存用户偏好
  useEffect(() => {
    localStorage.setItem('preferredServingCount', servingCount.toString());
  }, [servingCount]);

  // 使用 useMemo 缓存配置
  const config = useMemo(
    () => DIFFICULTY_CONFIG[recipe.difficulty],
    [recipe.difficulty]
  );

  // 使用 useCallback 缓存事件处理函数
  const handleMarkCooked = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCooked) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/recipes/${recipe.id}/cooked`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isOutrageous: mode === 'outrageous' }),
        });
        const data = await res.json();
        if (data.success) {
          setIsCooked(true);
          setCookedCount(data.count);
        }
      } catch (error) {
        console.error('Failed to mark cooked', error);
      }
    },
    [isCooked, recipe.id, mode]
  );

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onShare?.(recipe);
    },
    [onShare, recipe]
  );

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsFavorite(prev => !prev);
      onFavorite?.(recipe);
    },
    [onFavorite, recipe]
  );

  const handleShop = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onShop?.(recipe);
    },
    [onShop, recipe]
  );

  const handleCloseDrawer = useCallback(() => {
    setShowDrawer(false);
  }, []);

  // 渲染缺失食材提示
  const renderMissingIngredients = () => {
    if (!recipe.missing || recipe.missing.length === 0) return null;

    return (
      <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
        <div className="text-[10px] text-yellow-400 flex items-center gap-1">
          <ShoppingCart className="w-3 h-3" />
          需要购买：{recipe.missing.slice(0, 3).join('、')}
          {recipe.missing.length > 3 && ` 等${recipe.missing.length} 项`}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 卡片主体 */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        whileTap="tap"
        onClick={() => setShowDrawer(true)}
        className="relative p-5 rounded-3xl cursor-pointer transition-all border backdrop-blur-sm bg-white dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 border-gray-300 dark:border-gray-700 hover:bg-white/95 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-xl"
      >
        {/* 离谱模式标签 */}
        {mode === 'outrageous' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="absolute -top-2 -left-2 bg-purple-600 text-white text-[10px] px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-lg animate-pulse"
          >
            ✨ 离谱模式
          </motion.div>
        )}

        {/* 头部 */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 flex-1 flex-wrap">
            <ChefHat className="w-5 h-5 text-orange-400" />
            {recipe.name}
            {renderToolsInline(recipe.tools)}
          </h3>
          <span
            className={`text-[11px] px-3 py-1 rounded-full font-bold ${config.bg} ${config.text}`}
          >
            {config.icon} {recipe.difficulty}
          </span>
        </div>

        {isDraft && (
          <div className="mb-2 mt-1">
            <span className="inline-block px-6 py-2 text-base font-black rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/40 transform hover:scale-105 transition-transform cursor-pointer animate-pulse">
              点击立即生成
            </span>
          </div>
        )}

        {/* 描述 */}
        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-4 leading-relaxed">
          {isDraft ? '' : recipe.description}
        </p>

        {/* 缺失食材提示 */}
        {renderMissingIngredients()}

        {/* 统计信息 */}
        <div className="flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{recipe.cookTime || '20分钟'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-orange-400/80 font-medium">
            <Flame className="w-3.5 h-3.5" />
            <span>{recipe.calories} kcal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{recipe.servings}</span>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="mt-4 pt-3 border-t border-gray-300 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1 text-orange-400/80 text-[10px]">
            <CheckCircle2
              className={`w-3.5 h-3.5 ${isCooked ? 'text-green-400' : ''}`}
            />
            <span>已做 {cookedCount} 次</span>
          </div>

          <div className="flex items-center">
              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-500" />
            </div>
        </div>

        {/* 做过标记 */}
        {isCooked && (
          <div className="absolute top-3 right-3 bg-green-500/20 border border-green-500/50 text-green-400 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            做过
          </div>
        )}
      </motion.div>

      {/* 详情抽屉 */}
      <AnimatePresence>
        {showDrawer && (
          <>
            {/* 遮罩层 */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={handleCloseDrawer}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            />

            {/* 抽屉面板 */}
            <motion.div
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed right-0 top-0 h-full w-full max-w-2xl bg-gradient-to-b from-gray-900 to-black border-l border-white/10 z-50 overflow-y-auto"
            >
              {detailLoading ? (
                <div className="relative h-full">
                  {/* 半透明骨架内容 */}
                  <div className="opacity-30">
                    <div className="p-6">
                      {/* 头部 */}
                      <div className="mb-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2 flex-wrap">
                              <ChefHat className="w-7 h-7 text-orange-400" />
                              {recipe.name}
                            </h2>
                            <p className="text-sm text-gray-400">{recipe.description || '正在生成描述...'}</p>
                          </div>
                          <button
                            onClick={handleCloseDrawer}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            aria-label="关闭"
                          >
                            <X className="w-6 h-6 text-white" />
                          </button>
                        </div>
                      </div>
                       
                      {/* 内容区域 */}
                      <div className="space-y-6">
                        {/* 人数选择滑动条 */}
                        <div className="mb-6 p-4 bg-gray-100 dark:bg-white/5 rounded-2xl">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              用餐人数
                            </span>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">2人</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button className="w-8 h-8 rounded-full bg-white dark:bg-white/10"></button>
                            <input type="range" className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                            <button className="w-8 h-8 rounded-full bg-white dark:bg-white/10"></button>
                          </div>
                        </div>

                        {/* 快速信息 */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                          <div className="bg-gray-100 dark:bg-white/5 rounded-2xl p-3 text-center">
                            <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                            <div className="text-xs text-gray-600 dark:text-gray-400">时间</div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">20分钟</div>
                          </div>
                          <div className="bg-gray-100 dark:bg-white/5 rounded-2xl p-3 text-center">
                            <Flame className="w-5 h-5 text-red-400 mx-auto mb-1" />
                            <div className="text-xs text-gray-600 dark:text-gray-400">热量</div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">计算中</div>
                          </div>
                          <div className="bg-gray-100 dark:bg-white/5 rounded-2xl p-3 text-center">
                            <ChefHat className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                            <div className="text-xs text-gray-600 dark:text-gray-400">难度</div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{recipe.difficulty || '简单'}</div>
                          </div>
                        </div>

                        {/* 营养信息 */}
                        <div className="mb-6 p-4 bg-gray-100 dark:bg-white/5 rounded-2xl">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            📊 营养成分
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white dark:bg-white/10 rounded-xl p-3 text-center">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">热量</div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white">计算中</div>
                            </div>
                            <div className="bg-white dark:bg-white/10 rounded-xl p-3 text-center">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">蛋白质</div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white">计算中</div>
                            </div>
                            <div className="bg-white dark:bg-white/10 rounded-xl p-3 text-center">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">脂肪</div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white">计算中</div>
                            </div>
                            <div className="bg-white dark:bg-white/10 rounded-xl p-3 text-center">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">碳水化合物</div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white">计算中</div>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                            人均：计算中
                          </div>
                        </div>

                        {/* 食材清单 */}
                        <div className="mb-6">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            🛒 食材清单
                          </h3>
                          <div className="bg-gray-100 dark:bg-white/5 rounded-2xl p-4">
                            {recipe.mainIngredients && recipe.mainIngredients.length > 0 ? (
                              recipe.mainIngredients.map((ing, idx) => (
                                <div key={idx} className="py-2 border-b border-gray-200 dark:border-white/10 last:border-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      {ing} 适量
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-white/10 last:border-0">
                                <span className="text-sm text-gray-700 dark:text-gray-300">正在生成食材清单...</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 烹饪步骤 */}
                        <div className="mb-6">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            👨‍🍳 烹饪步骤
                          </h3>
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                                1
                              </div>
                              <div className="flex-1 bg-gray-100 dark:bg-white/5 rounded-2xl p-3">
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">正在生成步骤...</p>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                                2
                              </div>
                              <div className="flex-1 bg-gray-100 dark:bg-white/5 rounded-2xl p-3">
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">正在生成步骤...</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 加载动画 */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-black/50 backdrop-blur-sm">
                    <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 animate-pulse">
                      正在生成专属做法...
                    </div>
                    <p className="text-sm text-gray-400">正在按您的厨具与食材进行智能适配</p>
                  </div>
                </div>
              ) : errorMsg ? (
                <div className="flex flex-col items-center justify-center h-full space-y-6 px-6 text-center">
                  <AlertTriangle className="w-16 h-16 text-red-500" />
                  <div className="text-xl font-bold text-red-400">
                    做法补齐失败
                  </div>
                  <p className="text-sm text-gray-400">{errorMsg}</p>
                  <button onClick={handleCloseDrawer} className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
                    返回
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  {/* 头部 */}
                  <div className="mb-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2 flex-wrap">
                          <ChefHat className="w-7 h-7 text-orange-400" />
                          {recipe.name}
                          {renderToolsInline(recipe.tools)}
                        </h2>
                        <p className="text-sm text-gray-400">{detailRecipe?.description || recipe.description}</p>
                        {/* 重新生成菜谱按钮 */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setDetailLoading(true);
                              setErrorMsg('');
                              // 使用与获取详情相同的API，但添加regenerate参数指示重新生成
                              fetch(`${API_BASE_URL}/api/detailJson`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  id: recipe.id,
                                  dishName: recipe.name,
                                  ingredients: [],
                                  seasonings: {},
                                  tools: [],
                                  mode,
                                  regenerate: true // 添加重新生成参数
                                })
                              })
                                .then(async (r) => {
                                  if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
                                  return r.json();
                                })
                                .then((data: any) => {
                                  if (data.ok === false) {
                                    setErrorMsg(data.reason || '重新生成失败');
                                    return;
                                  }
                                  if (data.recipe || (data && (data.id || data.name))) {
                                    const recipeData = data.recipe || data;
                                    setDetailRecipe(recipeData);
                                    // 更新本地状态
                                    setLocalRecipe(prev => ({ ...prev, ...recipeData }));
                                  }
                                })
                                .catch((e) => {
                                  console.error('Failed to regenerate recipe:', e);
                                  setErrorMsg('重新生成失败，请重试');
                                })
                                .finally(() => {
                                  setDetailLoading(false);
                                });
                            }}
                            className="mt-2 px-4 py-1.5 bg-orange-500/10 dark:bg-orange-500/20 hover:bg-orange-500/20 dark:hover:bg-orange-500/30 text-orange-600 dark:text-orange-400 text-sm font-medium rounded-full transition-colors border border-orange-500/30 flex items-center gap-1"
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            重新生成菜谱
                          </button>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">如果生成失败可以点击这里重新生成</p>
                        </div>
                      </div>
                      <button
                        onClick={handleCloseDrawer}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        aria-label="关闭"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  </div>
                  
                  {/* 内容区域 */}
                  <div className="space-y-6">
                    {/* 人数选择滑动条 */}
                    <div className="mb-6 p-4 bg-gray-100 dark:bg-white/5 rounded-2xl">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          用餐人数
                        </span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">{servingCount}人</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setServingCount(Math.max(1, servingCount - 1))}
                          className="w-8 h-8 rounded-full bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4 text-gray-900 dark:text-white" />
                        </button>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={servingCount}
                          onChange={(e) => setServingCount(parseInt(e.target.value, 10))}
                          className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <button
                          onClick={() => setServingCount(Math.min(10, servingCount + 1))}
                          className="w-8 h-8 rounded-full bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4 text-gray-900 dark:text-white" />
                        </button>
                      </div>
                    </div>

                    {/* 快速信息 */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <StatItem
                        icon={Clock}
                        label="时间"
                        value={detailRecipe?.cookTime || recipe.cookTime || '20分钟'}
                        colorClass="text-blue-400"
                      />
                      <StatItem
                        icon={Flame}
                        label="热量"
                        value={caloriesLoading ? '计算中' : `${caloriesPerPerson} kcal/人`}
                        colorClass="text-red-400"
                      />
                      <StatItem
                        icon={ChefHat}
                        label="难度"
                        value={recipe.difficulty}
                        colorClass={config.text}
                      />
                    </div>

                    {/* 营养信息 */}
                    <div className="mb-6 p-4 bg-gray-100 dark:bg-white/5 rounded-2xl">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        📊 营养成分
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white dark:bg-white/10 rounded-xl p-3 text-center">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">热量</div>
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {caloriesLoading ? '计算中' : `${totalCalories ?? scaledRecipe.calories} kcal`}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-white/10 rounded-xl p-3 text-center">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">蛋白质</div>
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {caloriesLoading ? '计算中' : `${totalProtein || 0} g`}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-white/10 rounded-xl p-3 text-center">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">脂肪</div>
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {caloriesLoading ? '计算中' : `${totalFat || 0} g`}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-white/10 rounded-xl p-3 text-center">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">碳水化合物</div>
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {caloriesLoading ? '计算中' : `${totalCarbs || 0} g`}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                        人均：{caloriesLoading ? '计算中' : `${caloriesPerPerson} kcal`}
                      </div>
                    </div>

                    {/* 缺少食材提示 */}
                    {recipe.missing && recipe.missing.length > 0 && (
                      <div className="mb-6 p-4 bg-yellow-900/20 dark:bg-yellow-900/30 border border-yellow-500/30 rounded-2xl">
                        <h3 className="text-lg font-bold text-yellow-600 dark:text-yellow-400 mb-3 flex items-center gap-2">
                          <ShoppingCart className="w-5 h-5" />
                          顺路购买
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {recipe.missing.slice(0, 6).map((item, idx) => (
                            <span key={idx} className="px-3 py-1 bg-yellow-500/20 dark:bg-yellow-500/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm">
                              {item}
                            </span>
                          ))}
                          {recipe.missing.length > 6 && (
                            <span className="text-yellow-600 dark:text-yellow-400 text-sm">等{recipe.missing.length}项</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 食材清单（根据人数动态调整） */}
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        🛒 食材清单
                      </h3>
                      <div className="bg-gray-100 dark:bg-white/5 rounded-2xl p-4">
                        {scaledRecipe.viewIngredients.length > 0 ? (
                          scaledRecipe.viewIngredients.map((ing, idx: number) => {
                            const detail = calorieDetails && calorieDetails[idx] ? calorieDetails[idx] : null;
                            const kcalText = detail ? `${detail.calories} kcal` : '';
                            const proteinText = detail && detail.protein ? `${detail.protein}g` : '';
                            const fatText = detail && detail.fat ? `${detail.fat}g` : '';
                            const carbsText = detail && detail.carbs ? `${detail.carbs}g` : '';
                            const noteText = ing.displayNote ? ` (${ing.displayNote})` : '';
                            return (
                              <div key={idx} className="py-2 border-b border-gray-200 dark:border-white/10 last:border-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {ing.name} {ing.displayAmount}{noteText}
                                  </span>
                                  {kcalText && <span className="text-xs text-gray-500 dark:text-gray-400">{kcalText}</span>}
                                </div>
                                {detail && (proteinText || fatText || carbsText) && (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {proteinText && <span className="text-xs text-blue-600 dark:text-blue-400">蛋白质: {proteinText}</span>}
                                    {fatText && <span className="text-xs text-yellow-600 dark:text-yellow-400">脂肪: {fatText}</span>}
                                    {carbsText && <span className="text-xs text-green-600 dark:text-green-400">碳水: {carbsText}</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          (scaledRecipe.fallbackLines.length > 0 ? scaledRecipe.fallbackLines : ['（暂无食材数据）']).map((line, idx) => (
                            <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-white/10 last:border-0">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{line}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 烹饪步骤 */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          👨‍🍳 烹饪步骤
                        </h3>
                        {((detailRecipe?.steps || recipe.steps || []).some((s: any) => s && typeof s === 'object' && s.isMissing) || (detailRecipe?.steps || recipe.steps || []).length === 0) && (
                          <div className="flex flex-col items-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // 强制触发重新生成
                                setLocalRecipe({ ...localRecipe, isDraft: true });
                                setDetailRecipe(null);
                              }}
                              className="px-3 py-1 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 dark:hover:bg-orange-500/30 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <Flame className="w-3 h-3" />
                              重新生成此菜谱
                            </button>
                            <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">如果没有合理烹饪步骤可以点击此按钮</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {detailRecipe?.steps && detailRecipe.steps.length > 0 ? detailRecipe.steps.map((step: any, idx: number) => (
                          <StepItem key={idx} step={typeof step === 'string' ? step : (step?.fullText || '')} index={idx} />
                        )) : recipe.steps && recipe.steps.length > 0 ? recipe.steps.map((step: any, idx: number) => (
                          <StepItem key={idx} step={typeof step === 'string' ? step : (step?.fullText || '')} index={idx} />
                        )) : (
                          <div className="text-sm text-gray-600 dark:text-gray-400 p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-center">
                            暂无具体步骤
                          </div>
                        )}
                      </div>
                    </div>

                    {recipe.note && (
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-orange-400" />
                          重要提示
                        </h3>
                        <div className="bg-gray-100 dark:bg-white/5 rounded-2xl p-4 border border-gray-300 dark:border-white/10">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {recipe.note}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 小贴士 */}
                    {(detailRecipe?.tips || recipe.tips) && (
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                          大师贴士
                        </h3>
                        <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 dark:bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-2xl p-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {detailRecipe?.tips || recipe.tips}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 底部操作按钮 */}
                    <div className="flex gap-3 pt-4 border-t border-gray-300 dark:border-white/10">
                      <button
                        onClick={handleMarkCooked}
                        disabled={isCooked}
                        className={`flex-1 py-3 rounded-2xl font-bold transition-all ${
                          isCooked
                            ? 'bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 cursor-default'
                            : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg hover:shadow-green-500/30'
                        }`}
                      >
                        {isCooked ? '✓ 已做过' : '✓ 做过这道菜'}
                      </button>
                      <button
                        onClick={handleShare}
                        className="px-6 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                      >
                        分享
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
