/**
 * types.ts - 全局类型定义
 * 提供项目共用的类型和接口
 */

// ==================== 通用类型 ====================

/**
 * 可选的 Promise 类型
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * 异步函数类型
 */
export type AsyncFunction<T = void, A extends unknown[] = unknown[]> = (
  ...args: A
) => Promise<T>;

/**
 * 部分深拷贝类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 只读深拷贝类型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 排除 null 和 undefined
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * 提取对象的值类型
 */
export type ValueOf<T> = T[keyof T];

// ==================== API 响应类型 ====================

/**
 * 标准 API 响应结构
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp?: number;
}

/**
 * 分页响应结构
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// ==================== 食材相关类型 ====================

/**
 * 食材分类
 */
export type IngredientCategory = '肉' | '菜' | '主食' | '水果' | '其他';

/**
 * 食材信息
 */
export interface Ingredient {
  name: string;
  category: IngredientCategory;
  amount?: string;
  isExpired?: boolean;
  expiryDate?: string;
}

/**
 * 食材分类映射
 */
export type IngredientCategoryMap = Record<IngredientCategory, string[]>;

// ==================== 菜谱相关类型 ====================

/**
 * 菜谱难度
 */
export type RecipeDifficulty = '简单' | '中等' | '复杂';

/**
 * 菜谱分类
 */
export type RecipeCategory = '立即下厨' | '顺路买点' | '需要采购';

/**
 * 基础菜谱接口
 */
export interface BaseRecipe {
  id: string;
  name: string;
  description: string;
  difficulty: RecipeDifficulty;
  cookTime: string;
  servings: string;
  calories: number;
  stepCount: number;
}

/**
 * 完整菜谱接口
 */
export interface Recipe extends BaseRecipe {
  mainIngredients: string[];
  allIngredients: Array<{ name: string; amount?: string; itemTotalCalories?: number; missingNutrition?: boolean } | string>;
  steps: string[];
  tools: string[];
  cookedCount?: number;
  is_expired_warning?: boolean;
  missing?: string[];
  tips?: string;
  category?: RecipeCategory;
  isDraft?: boolean;
}

/**
 * 菜谱生成参数
 */
export interface RecipeGenerationParams {
  ingredients: string[];
  seasonings: Record<string, boolean>;
  tools: string[];
  mode?: 'standard' | 'outrageous';
  page?: number;
}

/**
 * 菜谱匹配结果
 */
export interface RecipeMatchResult {
  recipes: Recipe[];
  total: number;
  hasMore: boolean;
}

// ==================== 厨具相关类型 ====================

/**
 * 厨具信息
 */
export interface KitchenTool {
  id: string;
  label: string;
  emoji: string;
}

/**
 * 厨具库
 */
export type KitchenToolLibrary = KitchenTool[];

// ==================== 调料相关类型 ====================

/**
 * 调料状态映射
 */
export type SeasoningState = Record<string, boolean>;

/**
 * 调料列表
 */
export type SeasoningList = string[];

// ==================== 库存相关类型 ====================

/**
 * 库存项
 */
export interface InventoryItem {
  ingredientName: string;
  clickFrequency: number;
  orderIndex: number;
  isExpiring: number;
}

/**
 * 库存映射
 */
export type InventoryMap = Record<string, InventoryItem>;

/**
 * 库存更新参数
 */
export interface InventoryUpdateParams {
  ingredientName: string;
  isExpiring: boolean;
}

// ==================== Hooks 相关类型 ====================

/**
 * useLocalStorage 返回值
 */
export type UseLocalStorageReturn<T> = [
  T,
  (value: T | ((prev: T) => T)) => void,
  () => void
];

/**
 * useDebounce 选项
 */
export interface UseDebounceOptions {
  delay?: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * useInfiniteScroll 选项
 */
export interface UseInfiniteScrollOptions {
  threshold?: number;
  loadImmediately?: boolean;
  hasMore?: boolean;
  isLoading?: boolean;
  root?: Element | null;
  rootMargin?: string;
}

/**
 * useInfiniteScroll 返回值
 */
export interface UseInfiniteScrollReturn {
  ref: (node: HTMLDivElement | null) => void;
  isLoading: boolean;
  hasMore: boolean;
  isIntersecting: boolean;
}

// ==================== 事件处理类型 ====================

/**
 * 通用事件处理函数
 */
export type EventHandler<E = React.SyntheticEvent> = (event: E) => void;

/**
 * 变更事件处理函数
 */
export type ChangeEventHandler<T = HTMLInputElement> = (
  event: React.ChangeEvent<T>
) => void;

/**
 * 点击事件处理函数
 */
export type ClickEventHandler = (event: React.MouseEvent) => void;

/**
 * 键盘事件处理函数
 */
export type KeyboardEventHandler = (event: React.KeyboardEvent) => void;

// ==================== 组件 Props 类型 ====================

/**
 * 基础 Props（包含 className 和 children）
 */
export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * 可选的 Props
 */
export type OptionalProps<T> = Partial<T>;

// ==================== 工具函数类型 ====================

/**
 * 防抖函数类型
 */
export type DebounceFunction<T extends (...args: unknown[]) => unknown> = (
  ...args: Parameters<T>
) => void;

/**
 * 节流函数类型
 */
export type ThrottleFunction<T extends (...args: unknown[]) => unknown> = (
  ...args: Parameters<T>
) => void;

// ==================== 错误处理类型 ====================

/**
 * 错误信息
 */
export interface ErrorMessage {
  code: string;
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 错误处理函数
 */
export type ErrorHandler = (error: Error) => void;

/**
 * 重试配置
 */
export interface RetryConfig {
  retries: number;
  delay: number;
  backoff?: 'linear' | 'exponential';
}

// ==================== 动画类型 ====================

/**
 * 动画变体
 */
export type AnimationVariants = Record<string, Record<string, unknown>>;

/**
 * 过渡配置
 */
export interface TransitionConfig {
  type?: 'spring' | 'tween' | 'inertia';
  duration?: number;
  delay?: number;
  ease?: string | string[];
}
