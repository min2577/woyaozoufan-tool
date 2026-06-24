import { memo, useState, useCallback, useMemo } from 'react';
import { Clock, Users, Flame, ChevronRight, X, ChefHat, CheckCircle2, AlertTriangle, Lightbulb, Share2, Heart, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '') as string;

interface Recipe {
  id: string;
  name: string;
  description: string;
  mainIngredients: string[];
  allIngredients: Array<{ name: string; amount?: string } | string>;
  steps: string[];
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
}

interface RecipeCardProps {
  recipe: Recipe;
  mode: 'standard' | 'outrageous';
  onFavorite?: (id: string) => void;
  onShare?: (id: string) => void;
  onShop?: (id: string) => void;
}

/**
 * 优化的菜谱卡片组件
 * - 使用 React.memo 避免不必要的重渲染
 * - 使用 useMemo 缓存计算结果
 * - 使用 useCallback 缓存事件处理函数
 */
const RecipeCard = memo(function RecipeCard({ recipe, mode, onFavorite, onShare, onShop }: RecipeCardProps) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [isCooked, setIsCooked] = useState(false);
  const [cookedCount, setCookedCount] = useState(recipe.cookedCount || 0);
  const [isFavorite, setIsFavorite] = useState(false);

  // 使用 useMemo 缓存难度配置（避免每次渲染重新创建对象）
  const difficultyConfig = useMemo(() => ({
    '简单': { bg: 'bg-green-900/40', text: 'text-green-400', icon: '😊' },
    '中等': { bg: 'bg-yellow-900/40', text: 'text-yellow-400', icon: '🤔' },
    '复杂': { bg: 'bg-red-900/40', text: 'text-red-400', icon: '😰' },
    '困难': { bg: 'bg-red-900/40', text: 'text-red-400', icon: '😰' }
  }), []);

  const config = difficultyConfig[recipe.difficulty];

  // 使用 useCallback 缓存事件处理函数（避免传递给子组件时导致子组件重渲染）
  const handleMarkCooked = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCooked) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/recipes/${recipe.id}/cooked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOutrageous: mode === 'outrageous' })
      });
      const data = await res.json();
      if (data.success) {
        setIsCooked(true);
        setCookedCount(data.count);
      }
    } catch (e) {
      console.error('Failed to mark cooked', e);
    }
  }, [isCooked, recipe.id, mode]);

  const handleShareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(recipe.id);
  }, [onShare, recipe.id]);

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(prev => !prev);
    onFavorite?.(recipe.id);
  }, [onFavorite, recipe.id]);

  const handleShopClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShop?.(recipe.id);
  }, [onShop, recipe.id]);

  const handleDrawerClose = useCallback(() => {
    setShowDrawer(false);
  }, []);

  // 使用 useMemo 缓存缺失食材文本
  const missingText = useMemo(() => {
    if (!recipe.missing || recipe.missing.length === 0) return null;
    const display = recipe.missing.slice(0, 3).join(',');
    return recipe.missing.length > 3 
      ? `${display} 等${recipe.missing.length} 项`
      : display;
  }, [recipe.missing]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowDrawer(true)}
        className={`relative p-5 rounded-3xl cursor-pointer transition-all border backdrop-blur-sm ${
          recipe.is_expired_warning 
            ? 'bg-red-900/20 border-red-500/50 shadow-lg shadow-red-500/20' 
            : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30 hover:shadow-xl'
        }`}
      >
        {/* 过期预警角标 */}
        {recipe.is_expired_warning && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-lg expired-warning z-10">
            <AlertTriangle className="w-3 h-3" />
            过期预警
          </div>
        )}

        {/* 离谱模式标签 */}
        {mode === 'outrageous' && (
          <div className="absolute -top-2 -left-2 bg-purple-600 text-white text-[10px] px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-lg animate-pulse">
            ✨ 离谱模式
          </div>
        )}

        {/* 头部 */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-black text-white flex items-center gap-2 flex-1">
            <ChefHat className="w-5 h-5 text-orange-400" />
            {recipe.name}
          </h3>
          <span className={`text-[11px] px-3 py-1 rounded-full font-bold ${config.bg} ${config.text}`}>
            {config.icon} {recipe.difficulty}
          </span>
        </div>

        {/* 描述 */}
        <p className="text-xs text-gray-300 line-clamp-2 mb-4 leading-relaxed">
          {recipe.description}
        </p>

        {/* 缺失食材提示 */}
        {missingText && (
          <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
            <div className="text-[10px] text-yellow-400 flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" />
              需要购买：{missingText}
            </div>
          </div>
        )}

        {/* 统计信息 */}
        <div className="flex items-center gap-4 text-[10px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{recipe.cookTime}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            <span>{recipe.calories} kcal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{recipe.servings}</span>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1 text-orange-400/80 text-[10px]">
            <CheckCircle2 className={`w-3.5 h-3.5 ${isCooked ? 'text-green-400' : ''}`} />
            <span>已做 {cookedCount} 次</span>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleFavoriteClick}
              className={`p-2 rounded-full transition-colors ${
                isFavorite ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400 hover:text-red-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleShareClick}
              className="p-2 rounded-full bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleShopClick}
              className="p-2 rounded-full bg-white/10 text-gray-400 hover:text-green-400 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
            </motion.button>
            
            <ChevronRight className="w-4 h-4 text-gray-500" />
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDrawerClose}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            {/* 抽屉面板 */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-2xl bg-gradient-to-b from-gray-900 to-black border-l border-white/10 z-50 overflow-y-auto"
            >
              {/* 抽屉内容 */}
              <div className="p-6">
                {/* 头部 */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
                      <ChefHat className="w-7 h-7 text-orange-400" />
                      {recipe.name}
                    </h2>
                    <p className="text-sm text-gray-400">{recipe.description}</p>
                  </div>
                  <button
                    onClick={handleDrawerClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>

                {/* 快速信息 */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <div className="bg-white/5 rounded-2xl p-3 text-center">
                    <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                    <div className="text-xs text-gray-400">时间</div>
                    <div className="text-sm font-bold text-white">{recipe.cookTime}</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 text-center">
                    <Flame className="w-5 h-5 text-red-400 mx-auto mb-1" />
                    <div className="text-xs text-gray-400">热量</div>
                    <div className="text-sm font-bold text-white">{recipe.calories}</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 text-center">
                    <Users className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <div className="text-xs text-gray-400">份量</div>
                    <div className="text-sm font-bold text-white">{recipe.servings}</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 text-center">
                    <ChefHat className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <div className="text-xs text-gray-400">难度</div>
                    <div className={`text-sm font-bold ${config.text}`}>{recipe.difficulty}</div>
                  </div>
                </div>

                {/* 食材清单 */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    🛒 食材清单
                  </h3>
                  <div className="bg-white/5 rounded-2xl p-4">
                    {recipe.allIngredients?.map((ing, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-gray-300">
                          {typeof ing === 'string' ? ing : ing.name}
                        </span>
                        {typeof ing === 'object' && ing.amount && (
                          <span className="text-xs text-orange-400 font-medium">{ing.amount}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 烹饪步骤 */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    👨‍🍳 烹饪步骤
                  </h3>
                  <div className="space-y-3">
                    {recipe.steps?.map((step, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1 bg-white/5 rounded-2xl p-3">
                          <p className="text-sm text-gray-300 leading-relaxed">{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 小贴士 */}
                {recipe.tips && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-400" />
                      大师贴士
                    </h3>
                    <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-2xl p-4">
                      <p className="text-sm text-gray-300 leading-relaxed">{recipe.tips}</p>
                    </div>
                  </div>
                )}

                {/* 底部操作按钮 */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={handleMarkCooked}
                    disabled={isCooked}
                    className={`flex-1 py-3 rounded-2xl font-bold transition-all ${
                      isCooked
                        ? 'bg-green-500/20 text-green-400 cursor-default'
                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg hover:shadow-green-500/30'
                    }`}
                  >
                    {isCooked ? '✓ 已做过' : '✓ 做过这道菜'}
                  </button>
                  <button
                    onClick={handleShareClick}
                    className="px-6 py-3 rounded-2xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all"
                  >
                    分享
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

export default RecipeCard;
