/**
 * aiEngine.ts - AI 引擎服务层
 * 提供与后端 API 的交互，包含错误处理、重试机制和类型安全
 */

// ==================== 环境配置 ====================

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '') as string;

// ==================== 类型定义 ====================

export interface QAEntry {
  question: string;
  answer: string;
  time: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  frequency: number;
  status: string;
  orderIndex: number;
  quantity?: number;
  unit?: string;
  expiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GeneratedRecipe {
  id: string;
  name: string;
  mainIngredients: string[];
  allIngredients: Array<{ name: string; amount?: string; itemTotalCalories?: number; missingNutrition?: boolean } | string>;
  description: string;
  steps: string[];
  cookTime: string;
  servings: string;
  calories: number;
  difficulty: '简单' | '中等' | '复杂' | '困难';
  tools: string[];
  stepCount: number;
  tips?: string;
  is_expired_warning?: boolean;
  missing?: string[];
  category?: '立即下厨' | '顺路买点';
}

export type IngredientSelections = Record<string, string[]>;

export interface MatchResult {
  recipes: GeneratedRecipe[];
  total: number;
  hasMore: boolean;
}

export interface ToolLibraryItem {
  id: string;
  label: string;
  emoji: string;
  count?: number;
}

export interface IngredientLibraryMeta {
  items: string[];
  meatCuts: Record<string, Array<{ cut: string; count: number }>>;
}

export interface DishStub {
  name: string;
  missing: string[];
}

export interface DishSets {
  ready: DishStub[];
  simpleBuy: DishStub[];
  difficultBuy: DishStub[];
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// ==================== 错误处理 ====================

export class ApiErrorClass extends Error {
  code: string;
  status?: number;

  constructor(message: string, code: string = 'API_ERROR', status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export class NetworkError extends ApiErrorClass {
  constructor(message: string = '网络连接失败') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiErrorClass {
  constructor(message: string = '请求超时') {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends ApiErrorClass {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

// ==================== 工具函数 ====================

/**
 * 延迟函数
 */
const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * 带重试的 fetch 封装
 */
async function fetchWithRetry<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    signal,
    timeout = 30000,
    retries = 2,
    retryDelay = 1000,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiErrorClass(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          response.status
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error as Error;
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        if (signal?.aborted) {
          throw new ApiErrorClass('请求已取消', 'ABORTED');
        }
        throw new TimeoutError('请求超时');
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('无法连接到服务器');
      }

      if (attempt < retries) {
        console.warn(`请求失败，${retryDelay}ms 后重试 (尝试 ${attempt + 1}/${retries})`);
        await delay(retryDelay * (attempt + 1));
      }
    }
  }

  throw lastError || new ApiErrorClass('未知错误');
}

// ==================== 业务函数 ====================

function normalizeRecipeDTO(raw: any): GeneratedRecipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' ? raw.id : '';
  const name = typeof raw.name === 'string' ? raw.name : '';
  if (!id || !name) return null;
  const description = typeof raw.description === 'string' ? raw.description : '';
  const mainIngredients = Array.isArray(raw.mainIngredients) ? raw.mainIngredients.filter((x: any) => typeof x === 'string' && x.trim().length > 0) : [];
  const allIngredientsRaw = Array.isArray(raw.allIngredients) ? raw.allIngredients : [];
  const allIngredients = allIngredientsRaw.map((ing: any) => {
    if (typeof ing === 'string') return ing;
    if (!ing || typeof ing !== 'object') return '';
    const n = typeof ing.name === 'string' ? ing.name : '';
    const a = typeof ing.amount === 'string' ? ing.amount : '';
    return a ? `${n} ${a}`.trim() : n;
  }).filter((x: any) => typeof x === 'string' && x.trim().length > 0);
  const stepsRaw = Array.isArray(raw.steps) ? raw.steps : [];
  const steps = stepsRaw.map((s: any) => typeof s === 'string' ? s : (s && typeof s === 'object' && typeof s.fullText === 'string' ? s.fullText : '')).filter((x: any) => typeof x === 'string' && x.trim().length > 0);
  const cookTime = typeof raw.cookTime === 'string' ? raw.cookTime : '';
  const servings = typeof raw.servings === 'string' ? raw.servings : '';
  const calories = typeof raw.calories === 'number' ? raw.calories : 0;
  const difficulty = ((): GeneratedRecipe['difficulty'] => {
    const d = typeof raw.difficulty === 'string' ? raw.difficulty : '简单';
    return (d === '简单' || d === '中等' || d === '复杂' || d === '困难') ? d : '简单';
  })();
  const tools = Array.isArray(raw.tools) ? raw.tools.filter((x: any) => typeof x === 'string' && x.trim().length > 0) : [];
  const stepCount = steps.length;
  const tips = typeof raw.tips === 'string' ? raw.tips : undefined;
  const is_expired_warning = typeof raw.is_expired_warning === 'boolean' ? raw.is_expired_warning : undefined;
  const missing = Array.isArray(raw.missing) ? raw.missing.filter((x: any) => typeof x === 'string' && x.trim().length > 0) : undefined;
  const category = ((): GeneratedRecipe['category'] | undefined => {
    const c = typeof raw.category === 'string' ? raw.category : undefined;
    return c && (c === '立即下厨' || c === '顺路买点' || c === '需要采购') ? c : undefined;
  })();
  return { id, name, mainIngredients, allIngredients, description, steps, cookTime, servings, calories, difficulty, tools, stepCount, tips, is_expired_warning, missing, category };
}

/**
 * 构建分析步骤文本
 */
export function buildAnalysisSteps(
  ingredients: string[],
  seasonings: Record<string, boolean>,
  tools: string[]
): string[] {
  const ing = ingredients.join('、');
  const se = Object.entries(seasonings)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .slice(0, 6)
    .join('、');
  const tl = tools.length ? tools.join('、') : '常规厨具';

  return [
    `主厨正在磨刀...`,
    `正在扫描你的冰箱... 发现 ${ing || '空空如也'}`,
    `正在检查你的冰箱是否有异味... 没事，继续`,
    `匹配 ${se || '基础调料'}`,
    `正在剔除你没有的 ${tl}`,
    `正在构思 10 道绝活...`,
  ];
}

/**
 * 回答厨师问题（本地逻辑）
 */
export async function answerChefQuestion(
  recipeName: string,
  question: string
): Promise<QAEntry> {
  const now = Date.now();
  const base = question.trim();
  let answer = `主厨建议先稳住心态，按部就班。`;

  if (/化冻 | 冻 | 冰/.test(base)) {
    answer = `冷水泡 10 分钟，微波炉解冻 30 秒，再按步骤进行。`;
  } else if (/生抽 | 替换 | 没有 | 盐/.test(base)) {
    answer = `没有生抽时，每 1 勺生抽可用 1/4 勺盐 + 少许糖替代。`;
  } else if (/时间 | 多久/.test(base)) {
    answer = `关键步骤控制在 2-5 分钟，观察状态到位再进行下一步。`;
  } else if (/口味 | 辣 | 甜/.test(base)) {
    answer = `口味可调：辣加辣椒或花椒粉，甜加少许糖，咸加盐。`;
  } else if (
    !/炒 | 煮 | 蒸 | 烤 | 焖 | 煎 | 腌 | 刀 | 切 | 盐 | 糖 | 油 | 火候 | 时间 | 替换 | 食材 | 步骤/.test(base)
  ) {
    answer = `这道「${recipeName}」的秘密我还没讲完，你问我什么人工智能？我们只聊烹饪。`;
    return { question, answer, time: now };
  }

  return { question, answer: `关于「${recipeName}」：${answer}`, time: now };
}

/**
 * 获取库存列表
 */
export async function fetchInventory(): Promise<InventoryItem[]> {
  try {
    const data = await fetchWithRetry<unknown>(`${API_BASE_URL}/api/inventory`);

    const isRecord = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null;

    const rawItems: unknown[] = Array.isArray(data)
      ? data
      : isRecord(data) && Array.isArray(data.items)
        ? data.items
        : [];

    const normalized = rawItems
      .map((it: unknown): InventoryItem | null => {
        if (!isRecord(it)) return null;

        const id = typeof it.id === 'string' ? it.id : `ingredient-${it.name}`;
        const name = typeof it.name === 'string' ? it.name : undefined;
        const type = typeof it.type === 'string' ? it.type : 'ingredient';
        const frequency = typeof it.frequency === 'number' ? it.frequency : 0;
        const status = typeof it.status === 'string' ? it.status : 'normal';
        const orderIndex = typeof it.orderIndex === 'number' ? it.orderIndex : 0;
        const quantity = typeof it.quantity === 'number' ? it.quantity : undefined;
        const unit = typeof it.unit === 'string' ? it.unit : undefined;
        const expiryDate = typeof it.expiryDate === 'string' ? it.expiryDate : undefined;
        const createdAt = typeof it.createdAt === 'string' ? it.createdAt : undefined;
        const updatedAt = typeof it.updatedAt === 'string' ? it.updatedAt : undefined;

        if (!name) return null;

        return {
          id,
          name,
          type,
          frequency,
          status,
          orderIndex,
          quantity,
          unit,
          expiryDate,
          createdAt,
          updatedAt
        };
      })
      .filter((x): x is InventoryItem => Boolean(x));

    return normalized;
  } catch (error) {
    console.error('获取库存失败:', error);
    return [];
  }
}

/**
 * 更新库存状态
 */
export async function updateInventoryStatus(
  ingredientName: string,
  isExpiring: boolean
): Promise<void> {
  try {
    await fetchWithRetry(
      `${API_BASE_URL}/api/inventory/status`,
      {
        method: 'POST',
        body: { ingredientName, isExpiring },
      }
    );
  } catch (error) {
    console.error('更新库存状态失败:', error);
    throw error;
  }
}

/**
 * 匹配菜谱（分页加载）
 */
export async function fetchMatchRecipes(
  ingredients: string[],
  seasonings: Record<string, boolean>,
  tools: string[],
  mode: 'standard' | 'outrageous' = 'standard',
  page: number = 1,
  ingredientSelections?: IngredientSelections,
  options?: { signal?: AbortSignal }
): Promise<MatchResult> {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new ValidationError('食材列表不能为空');
  }
  if (!Array.isArray(tools) || tools.length === 0) {
    throw new ValidationError('请先选择厨具');
  }

  try {
    const data = await fetchWithRetry<MatchResult>(
      `${API_BASE_URL}/api/match`,
      {
        method: 'POST',
        body: { ingredients, seasonings, tools, mode, page, ingredientSelections },
        timeout: 120000,
        retries: 1,
        signal: options?.signal
      }
    );
    const normalizedRecipes = Array.isArray(data.recipes) ? data.recipes.map((r: any) => normalizeRecipeDTO(r)).filter((x): x is GeneratedRecipe => Boolean(x)) : [];
    return { recipes: normalizedRecipes, total: data.total, hasMore: data.hasMore };
  } catch (error) {
    console.error('匹配菜谱失败:', error);
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass('菜谱匹配失败，请稍后重试');
  }
}

export async function fetchSeasoningLibrary(): Promise<string[]> {
  const data = await fetchWithRetry<unknown>(`${API_BASE_URL}/api/meta/seasonings`, { timeout: 60000, retries: 1 });
  if (typeof data === 'object' && data !== null && Array.isArray((data as { items?: unknown }).items)) {
    return ((data as { items: unknown[] }).items).filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  }
  return [];
}

export async function fetchToolLibrary(): Promise<ToolLibraryItem[]> {
  const data = await fetchWithRetry<unknown>(`${API_BASE_URL}/api/meta/tools`, { timeout: 60000, retries: 1 });
  if (typeof data === 'object' && data !== null && Array.isArray((data as { items?: unknown }).items)) {
    return ((data as { items: unknown[] }).items)
      .filter((x): x is ToolLibraryItem => {
        if (!x || typeof x !== 'object') return false;
        const r = x as Record<string, unknown>;
        return typeof r.id === 'string' && typeof r.label === 'string' && typeof r.emoji === 'string';
      });
  }
  return [];
}

export async function fetchIngredientLibrary(): Promise<IngredientLibraryMeta | null> {
  const data = await fetchWithRetry<unknown>(`${API_BASE_URL}/api/meta/ingredients`, { timeout: 60000, retries: 1 });
  if (!data || typeof data !== 'object') return null;
  const r = data as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];
  const meatCuts: Record<string, Array<{ cut: string; count: number }>> = {};
  const rawMeatCuts = r.meatCuts;
  if (rawMeatCuts && typeof rawMeatCuts === 'object') {
    for (const [parent, cuts] of Object.entries(rawMeatCuts as Record<string, unknown>)) {
      if (!Array.isArray(cuts)) continue;
      meatCuts[parent] = cuts
        .filter((x) => x && typeof x === 'object')
        .map((x) => {
          const o = x as Record<string, unknown>;
          return { cut: typeof o.cut === 'string' ? o.cut : '', count: typeof o.count === 'number' ? o.count : Number(o.count) || 0 };
        })
        .filter((x) => x.cut.trim().length > 0);
    }
  }
  return { items, meatCuts };
}

/**
 * 标记菜谱已做过
 */
export async function markRecipeAsCooked(
  id: string,
  mode: 'standard' | 'outrageous'
): Promise<number> {
  try {
    const data = await fetchWithRetry<{ count: number }>(
      `${API_BASE_URL}/api/recipes/${id}/cooked`,
      {
        method: 'POST',
        body: { isOutrageous: mode === 'outrageous' },
      }
    );
    return data.count;
  } catch (error) {
    console.error('标记已做失败:', error);
    throw error;
  }
}

/**
 * 获取菜品分组（就绪/简单购买/困难购买）
 */
export async function fetchDishSets(
  ingredients: string[],
  seasonings: Record<string, boolean>,
  tools: string[],
  brainHole = false
): Promise<DishSets> {
  const defaultResult: DishSets = { ready: [], simpleBuy: [], difficultBuy: [] };

  try {
    return await fetchWithRetry<DishSets>(
      `${API_BASE_URL}/dishes`,
      {
        method: 'POST',
        body: {
          ingredients,
          seasonings,
          tools,
          mode: brainHole ? 'creative' : 'common',
        },
        timeout: 120000,
      }
    );
  } catch (error) {
    console.error('获取菜品分组失败:', error);
    return defaultResult;
  }
}

/**
 * 获取菜品详情（JSON 格式）
 */
export async function fetchDishDetailJson(
  dishName: string,
  ingredients: string[],
  seasonings: Record<string, boolean>,
  tools: string[]
): Promise<GeneratedRecipe | null> {
  try {
    return await fetchWithRetry<GeneratedRecipe>(
      `${API_BASE_URL}/detailJson`,
      {
        method: 'POST',
        body: { dishName, ingredients, seasonings, tools },
        timeout: 60000,
      }
    );
  } catch (error) {
    console.error('获取菜品详情失败:', error);
    return null;
  }
}

/**
 * 流式对话（SSE）
 */
export async function* chatStream(
  recipeName: string,
  question: string
): AsyncGenerator<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: `关于「${recipeName}」：${question}` }],
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.body) {
      throw new Error('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulator = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const obj = JSON.parse(dataStr);
            const delta =
              obj?.choices?.[0]?.delta?.content ?? obj?.output_text ?? '';
            if (delta) {
              accumulator += delta;
              yield accumulator;
            }
          } catch {
            accumulator += dataStr;
            yield accumulator;
          }
        }
      }
    }
  } catch (error) {
    console.error('流式对话失败:', error);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 流式获取菜品详情（SSE）
 */
export async function* streamDishDetail(
  dishName: string,
  ingredients: string[],
  seasonings: Record<string, boolean>,
  tools: string[]
): AsyncGenerator<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const response = await fetch(`${API_BASE_URL}/dishDetail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishName, ingredients, seasonings, tools }),
      signal: controller.signal,
    });

    if (!response.body) {
      throw new Error('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulator = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const obj = JSON.parse(dataStr);
            const delta =
              obj?.choices?.[0]?.delta?.content ?? obj?.output_text ?? '';
            if (delta) {
              accumulator += delta;
              yield accumulator;
            }
          } catch {
            accumulator += dataStr;
            yield accumulator;
          }
        }
      }
    }
  } catch (error) {
    console.error('流式获取详情失败:', error);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ==================== 高德地图API相关接口 ====================

/**
 * 餐厅接口定义
 */
export interface Restaurant {
  id: number;
  name: string;
  price: number;
  distance: number;
  image?: string;
}

/**
 * 市场接口定义
 */
export interface Market {
  id: number;
  name: string;
  distance: number;
  discount?: string;
  hours?: string;
  image?: string;
}

/**
 * 地址解析（地理编码）
 * @param address 地址字符串
 * @param apiKey 高德地图API Key
 * @returns 经纬度坐标
 */
async function geocodeAddress(address: string, apiKey: string): Promise<string> {
  const params = new URLSearchParams({
    key: apiKey,
    address,
  });
  
  const data: any = await fetchWithRetry(
    `/api/amap/v3/geocode/geo?${params}`,
    { method: 'GET' }
  );
  
  if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
    return data.geocodes[0].location; // 返回经纬度
  } else {
    throw new ApiErrorClass('地址无法识别', 'ADDRESS_NOT_FOUND');
  }
}

/**
 * 搜索附近场所（调用高德地图API）
 * @param addressOrLocation 搜索地址或位置信息
 * @param distance 搜索半径（米）
 * @param category 分类（美食/低价菜场）
 * @param sortBy 排序方式（price/distance）
 * @returns 餐厅和市场列表
 */
export async function searchNearbyPlaces(
  addressOrLocation: string | { lat: number; lng: number; name: string },
  distance: number,
  category: string,
  sortBy: string
): Promise<{ restaurants: Restaurant[]; markets: Market[] }> {
  try {
    const apiKey = import.meta.env.VITE_AMAP_API_KEY;
    console.log('API Key:', apiKey ? '已配置' : '未配置');
    if (!apiKey) {
      throw new ApiErrorClass('高德地图API Key未配置', 'API_KEY_MISSING');
    }
    
    // 1. 获取经纬度
    console.log('开始获取经纬度:', addressOrLocation);
    let location: string;
    
    if (typeof addressOrLocation === 'string') {
      // 如果是地址字符串，解析地址获取经纬度
      location = await geocodeAddress(addressOrLocation, apiKey);
    } else {
      // 如果是位置对象，直接使用经纬度
      location = `${addressOrLocation.lng},${addressOrLocation.lat}`;
    }
    
    console.log('经纬度获取结果:', location);
    
    // 2. 根据分类映射高德地图的type参数（对标高德美食搜索）
    const getAmapType = (category: string) => {
      switch (category) {
        case '美食':
          return '050000';  // 餐饮服务（最宽泛的一级分类，覆盖所有餐饮场所）
        case '低价菜场':
          return '060000|120000';  // 超市/便利店+生鲜市场
        default:
          return '050000';
      }
    };
    
    // 3. 构建高德地图API请求参数（弱化关键词限制）
    const getKeywords = (category: string) => {
      switch (category) {
        case '美食':
          return '';  // 不使用关键词限制，获取所有餐饮场所
        case '低价菜场':
          return '超市,便利店,生鲜,市场';  // 基础关键词，避免无关结果
        default:
          return category;
      }
    };
    
    // 前端软过滤函数：过滤出与分类相关的商户
    const filterPoiByCategory = (pois: any[], category: string): any[] => {
      if (!Array.isArray(pois)) return [];

      // 定义各分类的关键词库（对标高德美食搜索）
      const categoryKeywords: Record<string, string[]> = {
        '美食': ['餐厅', '饭店', '食堂', '饭馆', '小吃', '快餐', '美食', '饭', '面', '粉', '串', '鸡', '鱼', '米饭', '火锅', '烧烤', '汉堡', '披萨', '西餐', '中餐', '拉面', '黄焖鸡', '烤肉', '冒菜', '麻辣烫', '粥', '盖饭', '炒菜', '水饺', '馄饨', '米线', '饵丝', '沙县', '兰州拉面', '肯德基', '麦当劳', '汉堡王'],
        '低价菜场': ['超市', '便利店', '生鲜', '菜场', '菜市场', '果蔬', '市场', '商店', '购物', '永辉', '大润发', '沃尔玛', '家乐福', '联华', '苏果', '全家', '711', '罗森', '快客', '好德', '可的']
      };

      // 定义各分类的核心类型编码（已注释，因为当前实现中未使用）
      // const categoryTypes: Record<string, string[]> = {
      //   '美食': ['050000', '050100', '050200', '050300', '050400', '050700', '050800', '050900'],  // 餐饮服务（一级分类）+ 各细分餐饮类型
      //   '低价菜场': ['060000', '060100', '060200', '120000']  // 超市/便利店（一级分类）+ 各细分零售类型
      // };

      const keywords = categoryKeywords[category] || [];

      return pois.filter(poi => {
        // 获取商户的完整信息
        const poiType = poi.typecode || '';
        const poiName = poi.name || '';
        const poiTags = (poi.tag || '') + ' ' + (poi.business_area || '') + ' ' + (poi.address || '') + ' ' + (poi.industry_type || '');
        
        // 排除完全不相关的类型和关键词
        const irrelevantTypes = ['01', '02', '03', '04', '14', '15', '16', '17', '18', '19', '20']; // 排除建筑、交通、医疗、教育等完全不相关的一级分类
        const irrelevantKeywords = ['寿衣', '殡葬', '殡仪', '丧葬', '墓碑', '维修', '修理', '手机', '电脑', '电器', '五金', '建材', '装修', '家具', '房产', '地产', '中介', '汽车', '加油站', '4S店', '洗车', '保险', '金融', '银行', '证券', '投资'];
        
        // 先排除明显不相关的结果
        if (irrelevantTypes.some(type => poiType.startsWith(type)) || 
            irrelevantKeywords.some(key => poiName.includes(key) || poiTags.includes(key))) {
          return false;
        }
        
        // 智能过滤逻辑（对标高德搜索）
        if (category === '美食') {
          // 美食分类：类型是餐饮相关 OR 名称/标签包含美食关键词
          return poiType.startsWith('05') || // 所有餐饮服务子类
                 keywords.some(key => poiName.includes(key) || poiTags.includes(key));
        } else {
          // 低价菜场分类：类型是超市/便利店/生鲜市场 OR 名称/标签包含菜场关键词
          return poiType.startsWith('06') || poiType.startsWith('12') || // 零售服务和生鲜市场一级分类
                 keywords.some(key => poiName.includes(key) || poiTags.includes(key));
        }
      });
    };
    
    // 构建参数对象
    const paramObj: any = {
      key: apiKey,
      keywords: getKeywords(category),
      location: location,
      radius: distance.toString(),
      sortrule: sortBy === 'distance' ? 'distance' : 'price',
      offset: '50',  // 增加每页请求数量到50条
      page: '1',
      extensions: 'all',  // 获取完整商户信息，包括标签
    };
    
    // 只有当type有值时才添加type参数
    const typeValue = getAmapType(category);
    if (typeValue) {
      paramObj.type = typeValue;
    }
    
    const params = new URLSearchParams(paramObj);
    
    // 获取搜索地址名称用于日志
    const searchAddress = typeof addressOrLocation === 'string' ? addressOrLocation : addressOrLocation.name;
    console.log('调用高德地图API搜索附近场所', { address: searchAddress, location, distance, category, sortBy, params: params.toString() });
    
    // 4. 调用高德地图POI搜索API
    console.log('请求URL:', `/api/amap/v3/place/around?${params}`);
    const data: any = await fetchWithRetry(
      `/api/amap/v3/place/around?${params}`,
      { method: 'GET' }
    );
    
    console.log('API返回数据:', data);
    
    if (data.status === '1') {
      console.log('POI列表:', data.pois);
      
      // 确保pois是数组
      const pois = Array.isArray(data.pois) ? data.pois : [];
      console.log('处理后的POI列表:', pois);
      
      // 应用前端软过滤
      const filteredPois = filterPoiByCategory(pois, category);
      console.log('软过滤后的POI列表:', filteredPois);
      
      // 生成图片URL的函数
      const generateImageUrl = (name: string, type: 'restaurant' | 'market'): string => {
        // 使用text_to_image API根据商家名称生成相关图片
        const prompt = type === 'restaurant' 
          ? `A delicious meal at ${name}, realistic photo, food photography`
          : `Exterior view of ${name}, a supermarket or market, realistic photo`;
        
        // 对提示词进行URL编码
        const encodedPrompt = encodeURIComponent(prompt);
        
        // 使用text_to_image API（这里使用系统提供的API）
        return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodedPrompt}&image_size=square`;
      };
      
      // 5. 解析API响应
      if (category === '低价菜场') {
        // 市场列表
        const markets: Market[] = filteredPois.map((poi: any, index: number) => ({
          id: index + 1,
          name: poi.name || '未知市场',
          distance: parseInt(poi.distance || '0') || 0,
          discount: poi.biz_ext?.discount || undefined,
          hours: poi.biz_ext?.open_time || undefined,
          image: generateImageUrl(poi.name || '未知市场', 'market')
        }));
        
        console.log('解析后的市场列表:', markets);
        return { restaurants: [], markets };
      } else {
        // 餐厅列表（美食）
        const restaurants: Restaurant[] = filteredPois.map((poi: any, index: number) => ({
          id: index + 1,
          name: poi.name || '未知餐厅',
          price: parseInt(poi.biz_ext?.cost || '0') || 0,
          distance: parseInt(poi.distance || '0') || 0,
          image: generateImageUrl(poi.name || '未知餐厅', 'restaurant')
        }));
        
        console.log('解析后的餐厅列表:', restaurants);
        return { restaurants, markets: [] };
      }
    } else {
      throw new ApiErrorClass(data.info || '搜索失败', 'POI_SEARCH_FAILED');
    }
  } catch (error) {
    console.error('搜索附近场所失败:', error);
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass('搜索附近场所失败', 'SEARCH_FAILED');
  }
}
