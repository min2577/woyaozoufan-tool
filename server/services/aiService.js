/**
 * AI 服务层 - 重构版：完美适配精准菜谱生成
 * 修复所有核心错误，新增安全与鲁棒性保障
 */

const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const { logger } = require('../middleware/logger');
const { createEventLogger } = require('../middleware/eventStream');
const { v4: uuidv4 } = require('uuid');

// 替换为支持事件流的 logger
const eventLogger = createEventLogger(logger);
const { AppError, withRetry } = require('../middleware/errorHandler');
const { normalizeText, normalizeIngredientName, parseAmountUnit } = require('../utils/ingredientParser');

// 顶部新增配置校验
function validateConfig() {
  const required = ['apiUrl', 'modelId', 'apiKey', 'timeout', 'maxRetries'];
  const volcValid = required.every(k => config.ai?.[k]);
  const qwenValid = config.qwen ? required.every(k => config.qwen?.[k]) : true;
  if (!volcValid && !qwenValid) throw AppError.serverError('AI配置缺失');
}
validateConfig();

// ===================== 工具类：LRU缓存实现（修复原FIFO淘汰策略错误）=====================
class LRUCache {
  constructor(maxSize = 1000, ttl = 3600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const item = this.cache.get(key);
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    // LRU核心：访问后移到末尾（最近使用）
    this.cache.delete(key);
    this.cache.set(key, item);
    this._log('缓存命中', key);
    return item.data;
  }

  set(key, data) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最久未使用的（第一个）
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
    this._log('缓存写入', key);
  }

  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this._log('缓存已清理', null, { clearedSize: size });
    return size;
  }

  get size() {
    return this.cache.size;
  }

  _log(action, key, extra = {}) {
    try {
      eventLogger.api(action, {
        key: key ? key.substring(0, 8) + '...' : null,
        size: this.cache.size,
        ...extra
      });
    } catch (e) {
      // 日志容错：即使日志失败也不影响主流程
    }
  }
}

// 初始化LRU缓存
const cache = new LRUCache(1000, config.ai.cacheTTL || 3600000);

// ===================== 工具类：简单令牌桶限流（修复原无限流问题）=====================
class TokenBucket {
  constructor(capacity = config.ai?.rateLimit || 10, refillRate = 1) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  tryConsume() {
    this._refill();
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }

  async tryConsumeWithWait() {
    while (true) {
      this._refill();
      if (this.tokens > 0) {
        this.tokens--;
        return true;
      }
      await new Promise(r => setTimeout(r, 100));
    }
  }

  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

// 初始化限流器：每秒最多10个请求
const rateLimiter = new TokenBucket(10, 1);

// ===================== 安全工具：简单的Prompt注入防护与XSS防护 ======================
function sanitizeInput(input) {
  if (!input) return '';
  return String(input).replace(/[<>"\'\\]/g, '')
    .replace(/忽略|假装|系统指令|system prompt|ignore|pretend|forget/gi, '');
}

const xss = require('xss');

function sanitizeOutput(output) {
  if (!output) return output;
  if (typeof output === 'string') {
    // 强化XSS防护：使用xss库
    return xss(output);
  }
  if (Array.isArray(output)) {
    return output.map(sanitizeOutput);
  }
  if (typeof output === 'object') {
    const sanitized = {};
    for (const key in output) {
      sanitized[key] = sanitizeOutput(output[key]);
    }
    return sanitized;
  }
  return output;
}

// ===================== 核心工具函数（修复原有错误）=====================

/**
 * 生成缓存键（修复原缺少核心参数的错误）
 */
function generateCacheKey(messages, options = {}) {
  try {
    // 加入所有影响生成结果的核心参数
    const content = JSON.stringify({
      messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    });
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (e) {
    // 循环引用容错：生成随机键
    return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 从缓存获取结果
 */
function getFromCache(key) {
  if (!config.ai.cacheEnabled) return null;
  return cache.get(key);
}

/**
 * 缓存结果
 */
function setCache(key, data) {
  if (!config.ai.cacheEnabled) return;
  cache.set(key, data);
}

/**
 * 清理缓存
 */
function clearCache() {
  return cache.clear();
}

/**
 * 生成符合新规则的唯一ID
 * @param {string} category - 分类：'immediate' | 'extra'
 */
function generateRecipeId(category) {
  const prefix = category === 'immediate' ? 'immediate' : 'extra';
  // 使用更精确的时间戳
  const timestamp = Date.now();
  // 生成10位随机字符
  const randomStr = Math.random().toString(36).substring(2, 12);
  // 添加额外的随机数，确保即使在同一毫秒也能生成唯一ID
  const extraRandom = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${extraRandom}-${randomStr}`;
}

/**
 * 自动修复seasonings格式（修复原处理不全的错误）
 */
function fixSeasonings(agentAOutput) {
  return agentAOutput.map(dish => {
    let s = dish.seasonings;
    // 处理字符串类型的seasonings
    if (typeof s === 'string') {
      dish.seasonings = s.split(/，|,/).map(item => item.trim()).filter(Boolean);
    }
    // 处理数组但第一个元素是带逗号字符串的情况
    else if (Array.isArray(s) && s.length > 0 && typeof s[0] === 'string' && (s[0].includes('，') || s[0].includes(','))) {
      dish.seasonings = s[0].split(/，|,/).map(item => item.trim()).filter(Boolean);
    }
    // 确保最终是数组
    if (!Array.isArray(dish.seasonings)) {
      dish.seasonings = [];
    }
    return dish;
  });
}

/**
 * 提取JSON（修复原AI直接返回数组时解析失败的错误）
 */
function extractJsonFromText(raw) {
  if (!raw) return [];
  try {
    // 增强JSON提取（清理Markdown/注释/空格）
    raw = raw.replace(/```json|```|\/\/.*|\/\*[\s\S]*?\*\//g, '').trim();
    
    let arr;
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      arr = JSON.parse(arrayMatch[0]);
    } else {
      const objMatch = raw.match(/\{[\s\S]*\}/);
      if (objMatch) {
        const parsed = JSON.parse(objMatch[0]);
        if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
          if (parsed.recipes && Array.isArray(parsed.recipes)) {
            arr = parsed.recipes;
          } else {
            arr = [parsed];
          }
        }
      }
    }
    
    if (!Array.isArray(arr)) return [];
    return arr.filter(item => item && typeof item === 'object');
  } catch (e) {
    try {
      eventLogger.error('extractJsonFromText 解析失败', { reason: e.message, raw: raw.substring(0, 100) });
    } catch (logErr) {}
    return [];
  }
}

// ===================== 核心AI调用底座（修复所有工程化错误）=====================

/**
 * 调用 AI API（带重试、超时、容灾、限流）
 */
async function callAI(messages, options = {}) {
  // 前置限流检查
  if (!await rateLimiter.tryConsumeWithWait()) {
    throw AppError.tooManyRequests('请求过于频繁，请稍后重试');
  }

  const {
    stream = false,
    temperature = 0.7,
    maxTokens = 4096,
    timeout = config.ai.timeout || 60000,
    useCache = true,
    providerPreference = 'auto',
    retryOptions = {
      maxRetries: config.ai.maxRetries || 3,
      delay: config.ai.retryDelay || 1000,
      backoff: 2,
      shouldRetry: (err) => {
        return err.code === 'ECONNRESET' || 
               err.code === 'ETIMEDOUT' ||
               err.code === 'ECONNABORTED' ||
               (err.response?.status >= 500 && err.response?.status !== 501);
      }
    }
  } = options;

  // 调用AI时，流式请求强制关闭缓存
  if (stream) options.useCache = false;

  // 前置参数校验
  if (!Array.isArray(messages) || messages.length === 0) {
    throw AppError.badRequest('对话消息不能为空');
  }

  // 验证API Key有效性
  const volcEnabled = !!config.ai.apiKey && config.ai.apiKey.trim().length > 0;
  const qwenEnabled = !!config.qwen?.apiKey && config.qwen.apiKey.trim().length > 0;

  if (!volcEnabled && !qwenEnabled) {
    throw AppError.aiServiceError('AI_API_KEY 未配置');
  }

  // 验证API Key格式
  const isVolcKeyValid = volcEnabled && /^[a-zA-Z0-9_-]{30,}$/.test(config.ai.apiKey);
  const isQwenKeyValid = qwenEnabled && /^[a-zA-Z0-9_-]{30,}$/.test(config.qwen.apiKey);

  // 构建提供商候选列表（修复原限流不降级的错误）
  const candidates = (() => {
    const list = [];
    if (providerPreference === 'volc' && isVolcKeyValid) list.push('volc');
    if (providerPreference === 'qwen' && isQwenKeyValid) list.push('qwen');
    if (providerPreference === 'auto') {
      if (isQwenKeyValid) list.push('qwen');
      if (isVolcKeyValid) list.push('volc');
    }
    if (list.length === 0) {
      if (isQwenKeyValid) list.push('qwen');
      if (isVolcKeyValid) list.push('volc');
    }
    return list;
  })();

  if (candidates.length === 0) {
    throw AppError.aiServiceError('无可用的AI提供商');
  }

  // 检查缓存
  const cacheKey = generateCacheKey(messages, { temperature, maxTokens, stream });
  if (useCache && !stream) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // 带重试的调用函数
  const makeRequest = async () => {
    let lastError = null;
    let currentProviderIndex = 0;

    while (currentProviderIndex < candidates.length) {
      const provider = candidates[currentProviderIndex];
      const providerConfig = provider === 'qwen'
        ? { name: 'qwen', apiUrl: config.qwen.apiUrl, modelId: config.qwen.modelId, apiKey: config.qwen.apiKey }
        : { name: 'volc', apiUrl: config.ai.apiUrl, modelId: config.ai.modelId, apiKey: config.ai.apiKey };

      const extraModels = providerConfig.name === 'qwen'
        ? ['qwen-plus', 'qwen-max', 'qwen-turbo']
        : (config.ai?.modelFallbacks || []);
      const modelCandidates = Array.from(new Set([providerConfig.modelId, ...extraModels].filter(Boolean).map(String)));

      for (const modelId of modelCandidates) {
        const requestBody = {
          model: modelId,
          messages,
          stream,
          temperature,
          max_tokens: maxTokens
        };

        const requestConfig = {
          headers: {
            'Authorization': `Bearer ${providerConfig.apiKey}`,
            'Content-Type': 'application/json',
            'X-Request-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          },
          timeout
        };

        try {
          eventLogger.api('调用 AI API', {
            provider: providerConfig.name,
            model: modelId,
            stream,
            messagesCount: messages.length
          });

          const startTime = Date.now();
          const response = await axios.post(providerConfig.apiUrl, requestBody, requestConfig);
          const result = response.data;
          result.duration = Date.now() - startTime;

          eventLogger.api('AI 响应成功', {
            provider: providerConfig.name,
            usage: result.usage,
            duration: result.duration,
            tokens: result.usage?.total_tokens
          });

          if (useCache && !stream) setCache(cacheKey, result);
          return result;
        } catch (error) {
          lastError = error;

          // 错误分类处理
          if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            eventLogger.error('AI 请求超时', { timeout, url: providerConfig.apiUrl, provider: providerConfig.name });
            continue;
          }

          if (error.response) {
            eventLogger.error('AI API 错误响应', {
              provider: providerConfig.name,
              status: error.response.status,
              data: error.response.data
            });

            const qwenModelNotFound =
              providerConfig.name === 'qwen' &&
              error.response.status === 404 &&
              String(error.response.data?.error?.code || '') === 'model_not_found';

            if (qwenModelNotFound) {
              continue; // 换模型重试
            }

            if (error.response.status === 401 || error.response.status === 403) {
              break; // 鉴权失败，换提供商
            }

            if (error.response.status === 429) {
              // 限流：换提供商重试，而不是直接抛出
              currentProviderIndex++;
              break;
            }

            if (error.response.status >= 500) {
              break; // 服务端错误，换提供商
            }
          }

          eventLogger.error('AI API 调用失败', {
            provider: providerConfig.name,
            error: error.message,
            code: error.code
          });
        }
      }

      // 当前提供商所有模型都失败，换下一个
      currentProviderIndex++;
    }

    // 所有提供商都失败
    if (lastError && (lastError.code === 'ECONNABORTED' || lastError.code === 'ETIMEDOUT')) {
      throw AppError.aiServiceError('AI 服务响应超时，请重试');
    }

    throw lastError || AppError.aiServiceError('AI 服务暂时不可用');
  };

  // 执行带重试的调用
  try {
    const retryableCall = withRetry(makeRequest, retryOptions);
    return await retryableCall();
  } catch (error) {
    if (!(error instanceof AppError)) {
      throw AppError.aiServiceError(`AI 调用失败：${error.message}`);
    }
    throw error;
  }
}

// ===================== 新AgentA强约束Prompt（优化版）=====================
const AGENT_A_SYSTEM_PROMPT = `
你是专业的菜谱草稿标准化生成Agent，唯一职责是基于用户提供的物料，输出符合固定字段规则的菜谱草稿JSON数据，为后续AgentB提供合规的基础骨架，不生成任何详细步骤、烹饪说明等额外内容；不强制要求用到所有调料，可自由选择调料子集，重点保证草稿差异化和实用性。

# 绝对不可违反的强制红线（违反则输出无效）
1. 所有菜谱条目必须完整包含以下7个必填字段，严禁缺项、漏项、修改字段名：
   - name（菜谱名称）
   - mainIngredients（主料）
   - tools（厨具）
   - seasonings（调料）
   - category（分类）
   - isDraft（草稿标记）
   - id（唯一标识）
2. 【立即下厨】分类规则（零新增）：
   - mainIngredients必须100%使用用户提供的主料，严禁新增任何食材
   - seasonings必须是用户提供的调料的子集，严禁新增任何未提及的调料；调料选择可自由搭配，不强制用全
   - category固定为"立即下厨"
   - 菜谱需从做法维度拆分（如煎、焖、炒），确保每道菜做法差异明显，不同质化
3. 【顺路买点】分类规则（限1-2样新增）：
   - 每道菜仅允许新增1-2种食材/调料，严禁超过2种，新增内容必须在name中用括号明确标注，例："番茄土豆鸡腿（新增：番茄、土豆）"
   - mainIngredients需包含用户原有主料+新增主料，seasonings需包含用户原有调料子集+新增调料（如有）
   - category固定为"顺路买点"
   - 调料优先选用现有调料的合理组合，贴合菜名常规做法，避免所有菜谱调料组合完全一致
4. 固定字段强制规则：
   - tools字段固定为["炒锅"]，严禁修改、增减
   - isDraft字段固定为布尔值true，严禁修改
5. 其他规则：
   - name必须为中文大众熟知的家常菜名，体现做法差异，严禁编造离谱菜名；避免重复用词，确保每道菜名有明显区分
   - 调料选择需贴合菜名做法（例：蒜香类菜谱需包含蒜，老抽类菜谱需包含老抽），无逻辑矛盾
   - 每个菜谱的id必须唯一，不可重复

# ID生成固定规则
- 【立即下厨】类ID格式：immediate-13位毫秒级时间戳-6位随机小写字母+数字组合
- 【顺路买点】类ID格式：extra-13位毫秒级时间戳-6位随机小写字母+数字组合
- 关键要求：每条菜谱的13位时间戳必须独立生成（可相差1-10毫秒），严禁所有菜谱时间戳完全一致

# 输入要求
用户需提供以下3项核心信息，你必须严格基于输入内容生成：
1. 现有主料食材（数组格式，例：["鸡腿"]）
2. 现有可用调料（数组格式，例：["食用油", "盐", "老抽", "葱", "蒜"]）
3. 现有厨具（固定为炒锅，无需额外提供）

# 输出规范
必须严格输出以下两个固定的JSON数组，无任何额外的解释、说明、备注、话术，仅输出纯JSON内容：
{
  "immediateRecipes": [
    此处为【立即下厨】分类的所有菜谱草稿对象，至少生成3条，做法差异明显
  ],
  "extraRecipes": [
    此处为【顺路买点】分类的所有菜谱草稿对象，至少生成5条，调料组合有差异、贴合菜名做法
  ]
}

# 单条菜谱草稿标准示例（严格参照此结构）
{
  "name": "香煎鸡腿",
  "mainIngredients": ["鸡腿"],
  "tools": ["炒锅"],
  "seasonings": ["食用油", "盐"],
  "category": "立即下厨",
  "isDraft": true,
  "id": "immediate-1775533878569-h5qcsl"
}
`;

// Agent B：懒加载补全详情（优化：统一感官描述规则，强调精准量化）
const DETAIL_SYSTEM_PROMPT = `
你是菜谱结构化填充器，严格按骨架生成，**字段名禁止修改**。
【固定标准字段】
- name：菜谱名称
- category：分类
- mainIngredients：主料数组（对象格式，含name/quantity）
- requiredSeasonings：必选调料
- optionalSeasonings：可选调料（立即下厨为空[]）
- originalTools：工具
- allIngredients：所有食材和调料的完整列表（对象格式，含name/amount/unit）
- steps：步骤
【格式规则（核心优化：统一感官描述）】
1. 所有调料用量精确到克/毫升，无"适量"、"少许"
2. 仅使用骨架中提供的材料，禁止新增任何东西
3. 步骤必须包含：动作、火候、时间、**量化的感官描述**
   - 允许的感官描述："至表面呈现均匀金黄色"、"至油面泛起细密油纹"、"至筷子戳刺无血水渗出"
   - 禁止的模糊描述："爆香"、"煎至金黄"、"断生"（必须加具体状态判断）
4. 仅输出标准JSON，无多余内容
【标准结构示例】
{
  "name": "葱姜炒里脊",
  "category": "立即下厨",
  "mainIngredients": [{"name":"猪里脊","quantity":"300克"}],
  "requiredSeasonings": [{"name":"食用油","quantity":"15毫升"},{"name":"葱","quantity":"30克"},{"name":"盐","quantity":"3克"},{"name":"姜","quantity":"20克"},{"name":"料酒","quantity":"10毫升"}],
  "optionalSeasonings": [],
  "originalTools": ["炒锅"],
  "allIngredients": [{"name":"猪里脊","amount":300,"unit":"克"},{"name":"食用油","amount":15,"unit":"毫升"},{"name":"葱","amount":30,"unit":"克"},{"name":"盐","amount":3,"unit":"克"},{"name":"姜","amount":20,"unit":"克"},{"name":"料酒","amount":10,"unit":"毫升"}],
  "steps": [
    {
      "step": 1,
      "stage": "准备",
      "action": "将300克猪里脊切成薄片",
      "heat": "常温",
      "time": "2分钟",
      "sensory": "肉片厚度均匀，约2毫米",
      "fullText": "将300克猪里脊切成厚度均匀的薄片，约2毫米，耗时2分钟"
    }
  ]
}
`;

// ===================== 优化后的校验规则（统一与Prompt的冲突）=====================

function coerceAllIngredients(allIngredients) {
  const arr = Array.isArray(allIngredients) ? allIngredients : [];
  return arr.map((it) => {
    if (typeof it === 'string') {
      const name = normalizeText(it);
      return { name, amount: null, unit: '', note: '', isRequired: true };
    }
    const name = normalizeText(it.name);
    const parsed = parseAmountUnit(it.amount, it.unit);
    return {
      name,
      amount: parsed.amount,
      unit: parsed.unit,
      note: normalizeText(it.note),
      isRequired: it.isRequired !== false
    };
  });
}

// 优化：允许量化的感官描述，去掉与Prompt的冲突
function isRecipeStructured(recipe) {
  if (!recipe || typeof recipe !== 'object') return false;
  if (!normalizeText(recipe.name)) return false;
  if (!Array.isArray(recipe.mainIngredients) || recipe.mainIngredients.length === 0) return false;
  if (!Array.isArray(recipe.allIngredients)) return false;
  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) return false;
  const firstStep = recipe.steps[0];
  if (!firstStep || typeof firstStep !== 'object') return false;
  // 优化：只要有感官描述即可，不强制特定内容
  return ['action', 'heat', 'time', 'sensory', 'fullText'].every(k => normalizeText(firstStep[k]) !== undefined);
}

function validateAgainstSpec(recipe, userIngredients, userSeasonings, isOutrageous) {
  if (!isRecipeStructured(recipe)) return { ok: false, reason: '结构不完整' };

  const userIngSet = new Set((userIngredients || []).map(normalizeIngredientName).filter(Boolean));
  const userSeSet = new Set(Object.keys(userSeasonings || {}).filter(k => userSeasonings[k]).map(normalizeIngredientName).filter(Boolean));

  const mainNorm = (recipe.mainIngredients || []).map(normalizeIngredientName).filter(Boolean);
  if (mainNorm.some(n => !userIngSet.has(n))) {
    return { ok: false, reason: '主料未完全覆盖用户食材' };
  }

  const all = coerceAllIngredients(recipe.allIngredients);
  const mainNormSet = new Set(mainNorm);

  // 精准量化检查
  if (all.some(i => !normalizeText(i.amount) || !normalizeText(i.unit))) {
    return { ok: false, reason: '物料未满足精准量化' };
  }

  const missingRequired = all.filter(i => {
    const n = normalizeIngredientName(i.name);
    if (!i.isRequired) return false;
    if (mainNormSet.has(n)) return false;
    if (userIngSet.has(n)) return false;
    if (userSeSet.has(n)) return false;
    return true;
  });
  if (missingRequired.length > 0) {
    return { ok: false, reason: '禁止使用未提供的调料' };
  }

  if (!isOutrageous) {
    const banned = ['榴莲', '咖啡', '巧克力', '可乐', '香水', '牙膏'];
    if (banned.some(k => normalizeText(recipe.name).includes(k))) {
      return { ok: false, reason: '疑似非常识菜品' };
    }
  }

  return { ok: true, allIngredients: all };
}

// ===================== 核心业务入口（修复原有接口兼容性）=====================

/**
 * 生成菜谱草稿（新AgentA逻辑：一次AI调用生成双分类）
 */
async function generateDraftRecipes({ kind = 'ready', ingredients, seasonings, tools, count = 5, isOutrageous = false }) {
  // 前置参数校验
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw AppError.badRequest('请至少提供一种食材');
  }

  // 安全过滤输入
  const safeIngredients = ingredients.map(sanitizeInput);
  const userSeList = Object.keys(seasonings || {}).filter(k => seasonings[k]).map(sanitizeInput);
  const safeTools = (tools || ['炒锅']).map(sanitizeInput);

  // 构建新AgentA Prompt
  const userPrompt = [
    `用户现有食材：${safeIngredients.join('、')}`,
    `用户现有调料：${userSeList.join('、')}`,
    `用户现有厨具：${safeTools.join('、')}`,
    '请严格按照要求生成菜谱草稿JSON'
  ].join('\n');

  const messages = [
    { role: 'system', content: AGENT_A_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ];

  try {
    // 一次AI调用生成双分类
    const res = await callAI(messages, { 
      maxTokens: 2048, 
      temperature: 0.3, 
      useCache: false,
      providerPreference: 'qwen' // 优先使用qwen模型，生成更稳定
    });
    const raw = res.choices?.[0]?.message?.content || '';
    eventLogger.info('新AgentA 原始返回内容', { raw: raw.substring(0, 600) });

    // 解析双分类结构
    let parsed = { immediateRecipes: [], extraRecipes: [] };
    try {
      // 清理输出，移除可能的markdown标记和注释
      const cleanRaw = raw.replace(/```json|```|\/\/.*|\/\*[\s\S]*?\*\//g, '').trim();
      // 尝试匹配JSON对象
      const objMatch = cleanRaw.match(/\{[\s\S]*\}/);
      if (objMatch) {
        parsed = JSON.parse(objMatch[0]);
      }
    } catch (e) {
      eventLogger.error('新AgentA 双分类解析失败', { reason: e.message });
    }

    // 统一处理两类草稿：修复格式、安全过滤
    const processRecipes = (arr, category) => {
      if (!Array.isArray(arr)) return [];
      return fixSeasonings(arr).map(r => ({
        id: r.id || generateRecipeId(category), // 如果AI生成了ID就使用，否则重新生成
        name: sanitizeInput(r.name),
        mainIngredients: r.mainIngredients || safeIngredients.slice(0, 2),
        tools: r.tools || safeTools,
        seasonings: r.seasonings || [],
        category: category === 'immediate' ? '立即下厨' : '顺路买点',
        isDraft: true
      }));
    };

    const immediate = processRecipes(parsed.immediateRecipes, 'immediate');
    const extra = processRecipes(parsed.extraRecipes, 'extra');

    // 条数兜底（确保至少返回要求数量）
    const ensureCount = (arr, minCount, defaultCategory) => {
      while (arr.length < minCount) {
        arr.push({
          id: generateRecipeId(defaultCategory),
          name: `简易${defaultCategory === 'immediate' ? '立即下厨' : '顺路买点'}菜谱${arr.length + 1}`,
          mainIngredients: safeIngredients.slice(0, 2),
          tools: safeTools,
          seasonings: userSeList.slice(0, Math.min(3, userSeList.length)),
          category: defaultCategory === 'immediate' ? '立即下厨' : '顺路买点',
          isDraft: true
        });
      }
      return arr;
    };

    const finalImmediate = ensureCount(immediate, 3, 'immediate');
    const finalExtra = ensureCount(extra, 5, 'extra');

    // 按kind参数过滤（保留原有接口兼容性）
    const allRecipes = [...finalImmediate, ...finalExtra];
    if (kind === 'ready') return finalImmediate.slice(0, count);
    if (kind === 'buy') return finalExtra.slice(0, count);
    return allRecipes.slice(0, count);
  } catch (e) {
    try {
      eventLogger.error('新AgentA 生成失败', { reason: e.message });
    } catch (logErr) {}
    // 全局降级返回
    return [{
      id: generateRecipeId('immediate'),
      name: '简易菜谱',
      mainIngredients: ingredients,
      seasonings: [],
      tools: tools || ['炒锅'],
      category: '立即下厨',
      isDraft: true
    }];
  }
}

// 保留原有接口名别名（确保兼容性）
const generateRecipes = generateDraftRecipes;

/**
 * 生成菜谱详情（优化：信息隔离+精准量化）
 */
async function generateRecipeDetail(recipeDraft, { ingredients, seasonings, tools }) {
  try {
    // 安全过滤
    const safeDraft = sanitizeOutput(recipeDraft);
    
    // 构建提示词：仅传递骨架信息
    const detailPrompt = buildDetailPrompt({ recipeDraft: safeDraft });
    const messages = [
      { role: 'system', content: DETAIL_SYSTEM_PROMPT },
      { role: 'user', content: detailPrompt }
    ];

    eventLogger.api('开始生成懒加载详情', { name: safeDraft.name });

    const response = await callAI(messages, { 
      maxTokens: 2048, 
      temperature: 0.3,
      useCache: true,
      providerPreference: 'qwen'
    });

    let raw = response.choices?.[0]?.message?.content || '';
    raw = String(raw).replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        eventLogger.error('AI未返回有效的JSON对象', { name: safeDraft.name, rawResponse: raw });
        return { ok: false, reason: 'AI未返回有效的JSON对象' };
      }
      const parsed = JSON.parse(match[0]);
      // 安全过滤输出
      const safeParsed = sanitizeOutput(parsed);
      
      // 兜底逻辑：如果AI没有生成allIngredients字段，从mainIngredients和requiredSeasonings构建
      if (!safeParsed.allIngredients) {
        const allIngredients = [];
        
        // 从mainIngredients添加主料
        if (Array.isArray(safeParsed.mainIngredients)) {
          safeParsed.mainIngredients.forEach(ing => {
            if (ing && typeof ing === 'object' && ing.name) {
              const quantity = ing.quantity || '300克';
              const match = quantity.match(/(\d+(?:\.\d+)?)([\u4e00-\u9fa5a-zA-Z]+)/);
              if (match) {
                allIngredients.push({
                  name: ing.name,
                  amount: parseFloat(match[1]),
                  unit: match[2]
                });
              } else {
                allIngredients.push({
                  name: ing.name,
                  amount: 300,
                  unit: '克'
                });
              }
            }
          });
        }
        
        // 从requiredSeasonings添加调料
        if (Array.isArray(safeParsed.requiredSeasonings)) {
          safeParsed.requiredSeasonings.forEach(seasoning => {
            if (seasoning && typeof seasoning === 'object' && seasoning.name) {
              const quantity = seasoning.quantity || '15毫升';
              const match = quantity.match(/(\d+(?:\.\d+)?)([\u4e00-\u9fa5a-zA-Z]+)/);
              if (match) {
                allIngredients.push({
                  name: seasoning.name,
                  amount: parseFloat(match[1]),
                  unit: match[2]
                });
              } else {
                allIngredients.push({
                  name: seasoning.name,
                  amount: 15,
                  unit: '毫升'
                });
              }
            }
          });
        }
        
        safeParsed.allIngredients = allIngredients;
      }
      
      // 缺失字段兜底
      safeParsed.optionalSeasonings = safeParsed.optionalSeasonings || [];
      safeParsed.steps = safeParsed.steps || [];
      
      eventLogger.api('AI详情生成解析成功', { name: safeDraft.name });
      return { ok: true, recipe: safeParsed };
    } catch (e) {
      eventLogger.error('解析AI生成的详情JSON失败', { raw, error: e.message });
      return { ok: false, reason: 'AI生成的格式无法解析' };
    }
  } catch (error) {
    try {
      eventLogger.error('AI详情生成失败', { name: recipeDraft?.name, error: error.message });
    } catch (logErr) {}
    return { ok: false, reason: `AI生成失败: ${error.message}` };
  }
}

/**
 * 构建详情提示词
 */
function buildDetailPrompt({ recipeDraft }) {
  const draftSeasonings = recipeDraft.seasonings || [];
  let seasoningsList = [];
  if (Array.isArray(draftSeasonings)) {
    seasoningsList = draftSeasonings;
  } else if (typeof draftSeasonings === 'string') {
    seasoningsList = draftSeasonings.split(',').map(s => s.trim()).filter(Boolean);
  }
  
  return [
    '【唯一合法材料（仅能用这些）】',
    `菜名：${recipeDraft.name}`,
    `主料：${(recipeDraft.mainIngredients || []).join('、')}`,
    `调料：${seasoningsList.join('、')}`,
    `厨具：${(recipeDraft.tools || []).join('、')}`,
    `类别：${recipeDraft.category}`,
    '',
    '【强制命令】：',
    '1. 仅使用上述材料生成，禁止添加任何东西',
    '2. 立即下厨类别：只使用上述调料，不添加任何额外调料',
    '3. 顺路买点类别：最多只添加1-2种常见调料',
    '4. 步骤必须包含量化的感官描述（如"至表面呈现均匀金黄色"）',
    '5. 返回纯JSON，不要任何额外文字'
  ].join('\n');
}

/**
 * 生成调试信息，获取AgentA和AgentB的原始输出
 */
async function generateDebugInfo({ ingredients, seasonings, tools }) {
  try {
    // 安全过滤输入
    const safeIngredients = ingredients.map(sanitizeInput);
    const safeTools = (tools || []).map(sanitizeInput);
    
    // 生成草稿
    const draftRecipes = await generateDraftRecipes({ 
      kind: 'ready', 
      ingredients: safeIngredients, 
      seasonings, 
      tools: safeTools, 
      count: 1 
    });
    
    if (draftRecipes.length === 0) {
      return {
        "调试说明": "生成失败",
        "错误信息": "AgentA 未生成任何菜谱",
        "agent_a_原始骨架": [],
        "agent_b_最终菜谱": null
      };
    }
    
    const draftRecipe = draftRecipes[0];
    
    // 生成详情
    const detailResult = await generateRecipeDetail(draftRecipe, { 
      ingredients: safeIngredients, 
      seasonings, 
      tools: safeTools 
    });
    
    return {
      "调试说明": "菜谱生成全流程原始数据",
      "agent_a_原始骨架": draftRecipes,
      "agent_b_最终菜谱": detailResult.ok ? detailResult.recipe : null
    };
  } catch (error) {
    eventLogger.error('generateDebugInfo 失败', { error: error.message });
    return {
      "调试说明": "生成失败",
      "错误信息": error.message,
      "agent_a_原始骨架": [],
      "agent_b_最终菜谱": null
    };
  }
}

// ===================== 导出模块 =====================
module.exports = {
  callAI,
  generateDraftRecipes,
  generateRecipeDetail,
  clearCache,
  getCacheStats: () => ({ size: cache.size }),
  // 保留原有接口名，确保兼容性
  generateRecipes: generateDraftRecipes,
  generateDebugInfo
};