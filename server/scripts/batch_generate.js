const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MODEL_ID = process.env.VOLCENGINE_MODEL_ID || 'doubao-seed-2-0-mini-260215';
const API_KEY = process.env.VOLCENGINE_API_KEY || 'a2ed729e-f8f5-49cc-a9a4-dd40a950c06e';

const SYSTEM_PROMPT = [
  '身份：脾气古怪、护短、技术顶级的烹饪宗师。',
  '规则：只聊这道菜的技巧（火候、食材替代、处理方法）。遇到编程、天气等无关问题，必须用大厨口吻幽默拒绝。',
  '输出规范：当给出步骤或配方时，所有调料必须带克/毫升并附生活化比喻（如：盐 3g（约黄豆大小））。能量描述用幽默去焦虑的表达。',
  '语言：请使用中文回答，口吻保持大师风格。'
].join('\n');

const RECIPES_FILE = path.join(__dirname, '../data/recipes.json');

// 定义要批量生成的食材组合
const INGREDIENTS_BATCH = [
  ['番茄', '鸡蛋'],
  ['土豆', '牛腩'],
  ['青椒', '肉丝'],
  ['豆腐', '小葱'],
  ['五花肉', '梅干菜']
];

async function generateRecipe(ingredients) {
  const userContent = [
    `用户食材：${ingredients.join('、')}`,
    `可用调料：基础调料`,
    `可用厨具：常规厨具`,
    `只返回一个 JSON 对象，字段：id,name,mainIngredients(数组),allIngredients(数组，调料需克/毫升和生活化比喻),steps(数组6步以内),cookTime(如“15分钟”),servings(如“1-2人份”),calories(整数),difficulty('简单'|'中等'|'复杂'),tools(数组)。`,
    `必须只返回纯 JSON。`
  ].join('\n');

  const payload = {
    model: MODEL_ID,
    stream: false,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ]
  };

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const r = await axios.post(API_URL, payload, { headers, timeout: 30000 });
    const rawContent = r.data?.choices?.[0]?.message?.content ?? r.data?.output_text ?? '';
    let obj = null;
    try { obj = JSON.parse(rawContent); } catch {
      const m = rawContent.match(/\{[\s\S]*\}/);
      if (m) { try { obj = JSON.parse(m[0]); } catch {} }
    }
    return obj;
  } catch (err) {
    console.error(`Error generating recipe for ${ingredients.join('+')}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('开始批量生成菜谱...');
  
  let existingRecipes = [];
  try {
    if (fs.existsSync(RECIPES_FILE)) {
      const content = fs.readFileSync(RECIPES_FILE, 'utf-8');
      existingRecipes = JSON.parse(content || '[]');
    }
  } catch (err) {
    console.error('读取现有菜谱失败，将创建新文件。');
  }

  for (const ingredients of INGREDIENTS_BATCH) {
    console.log(`正在生成：${ingredients.join('+')} ...`);
    const recipe = await generateRecipe(ingredients);
    if (recipe && recipe.name) {
      // 简单去重
      if (!existingRecipes.some(r => r.name === recipe.name)) {
        recipe.id = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        existingRecipes.push(recipe);
        console.log(`✅ 生成成功：${recipe.name}`);
      } else {
        console.log(`⚠️ 跳过重复：${recipe.name}`);
      }
    } else {
      console.log(`❌ 生成失败：${ingredients.join('+')}`);
    }
    // 简单的延时，避免速率限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  fs.writeFileSync(RECIPES_FILE, JSON.stringify(existingRecipes, null, 2), 'utf-8');
  console.log(`🎉 批量生成完成！共 ${existingRecipes.length} 道菜谱，已保存至 ${RECIPES_FILE}`);
}

run();
