/**
 * 配置管理中心
 * 统一管理应用配置、环境变量和运行时设置
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || '0.0.0.0'
  },

  // 火山引擎 AI 配置
  ai: {
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    modelId: process.env.VOLCENGINE_MODEL_ID || 'doubao-seed-2-0-mini-260215',
    apiKey: process.env.VOLCENGINE_API_KEY,
    timeout: parseInt(process.env.AI_TIMEOUT) || 60000,
    maxRetries: parseInt(process.env.AI_MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.AI_RETRY_DELAY) || 1000,
    cacheEnabled: process.env.AI_CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.AI_CACHE_TTL) || 3600000 // 1 小时
  },

  // 阿里云百炼（DashScope 兼容 OpenAI）AI 配置
  qwen: {
    apiUrl: process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    modelId: process.env.QWEN_MODEL_ID || 'qwen-plus',
    apiKey: process.env.QWEN_API_KEY
  },

  // 数据库配置
  database: {
    path: process.env.DATABASE_PATH || './data/recipes.db',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 1,
    busyTimeout: parseInt(process.env.DB_BUSY_TIMEOUT) || 5000
  },

  // CORS 配置
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Request-ID']
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 14,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    enableConsole: process.env.LOG_CONSOLE !== 'false'
  },

  // 系统提示词
  systemPrompt: [
    '身份：脾气古怪、护短、技术顶级的烹饪宗师。',
    '规则：只聊这道菜的技巧（火候、食材替代、处理方法）。遇到编程、天气等无关问题，必须用大厨口吻幽默拒绝。',
    '输出规范：当给出步骤或配方时，所有调料必须带克/毫升并附生活化比喻（如：盐 3g（约黄豆大小））。能量描述用幽默去焦虑的表达。',
    '语言：请使用中文回答，口吻保持大师风格。'
  ].join('\n'),

  // AI 菜谱生成模板
  recipeTemplate: `
Task: 请根据菜名，严格按照以下结构生成标准菜谱。
[核心约束规则]
1. 简介限制：【简介】部分字数必须严格控制在 25 字以内。
2. 拒绝模糊：严禁使用"少许、适量、适口"等词汇。所有调料必须以 克 (g) 或 毫升 (ml) 标注。
3. 生活化比喻：每个调料后必须跟一个生活化的参照物比喻（如：3g 盐 = 约 12 颗黄豆大小）。
4. 感官 + 时间逻辑：步骤必须包含"火候控制 + 精确时间 + 感官状态（视觉/嗅觉/触觉）"。
5. 统一格式：保持简洁、专业、代码化的排版风格。

请返回一个合法的 JSON 对象，字段如下：
- name: 菜名
- description: 简介（25 字内）
- calories: 总热量（整数，单位 kcal）
- cookTime: 预计时长（如"20 分钟"）
- servings: 建议份量（如"1-2 人份"）
- difficulty: 制作难度（简单/中等/困难）
- tools: 厨具数组
- mainIngredients: 主料名称数组
- allIngredients: 所有食材和调料数组，对象：{name, amount, note, isRequired}。调料 note 必须包含生活化比喻。
- steps: 步骤数组，包含阶段、动作、火候、时间、感官标志。
- tips: 黄金比例或额外提示。
- professionalAnalysis: (仅离谱模式) 专业原理解析。
`
};

// 验证必要配置
if (!config.ai.apiKey && !config.qwen.apiKey) {
  console.warn('⚠️  警告：未配置 VOLCENGINE_API_KEY 或 QWEN_API_KEY，AI 功能将不可用');
}

module.exports = config;
