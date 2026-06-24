const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MODEL_ID = process.env.VOLCENGINE_MODEL_ID || 'doubao-seed-2-0-mini-260215';
const API_KEY = process.env.VOLCENGINE_API_KEY || 'a2ed729e-f8f5-49cc-a9a4-dd40a950c06e';

const NAMES_FILE = path.join(__dirname, '../data/simple_dish_names.json');
const RECIPES_FILE = path.join(__dirname, '../data/recipes.json');

// 读取菜名库
let allDishNames = [];
try {
  allDishNames = JSON.parse(fs.readFileSync(NAMES_FILE, 'utf-8'));
} catch (e) {
  console.error('无法读取简单菜名库，请先运行 seed_simple_dishes.js');
  process.exit(1);
}

// 读取现有菜谱
let existingRecipes = [];
try {
  if (fs.existsSync(RECIPES_FILE)) {
    existingRecipes = JSON.parse(fs.readFileSync(RECIPES_FILE, 'utf-8'));
  }
} catch (e) {
  console.error('读取现有菜谱失败');
}

// 过滤掉已存在的
const existingNames = new Set(existingRecipes.map(r => r.name));
const tasks = allDishNames.filter(n => !existingNames.has(n));

console.log(`总简单菜名数：${allDishNames.length}，已存在：${existingNames.size}，待生成：${tasks.length}`);

const SYSTEM_PROMPT = `你是“我要揍饭”应用的内容主编，拥有 20 年五星级酒店行政总厨经验及资深营养师背景。你擅长将复杂的烹饪过程拆解为小白也能看懂的数字化、感官化指令。`;

async function generateDish(dishName) {
  const userContent = `
Task: 请根据菜名“${dishName}”，严格按照以下结构生成标准菜谱。

[核心约束规则]
1. 简介限制：【简介】部分字数必须严格控制在 25 字以内。
2. 拒绝模糊：严禁使用“少许、适量、适口”等词汇。所有调料必须以 克 (g) 或 毫升 (ml) 标注。
3. 生活化比喻：每个调料后必须跟一个生活化的参照物比喻（如：3g 盐 = 约 12 颗黄豆大小）。
4. 感官+时间逻辑：步骤必须包含 “火候控制 + 精确时间 + 感官状态（视觉/嗅觉/触觉）”。
5. 统一格式：保持简洁、专业、代码化的排版风格。

请返回一个合法的 JSON 对象（不要Markdown代码块，只返回纯JSON字符串），字段如下：
- name: "${dishName}"
- description: 简介（25字内，点出风味核心）
- calories: 总热量（整数，单位kcal）
- cookTime: 预计时长（如"20分钟"）
- servings: 建议份量（如"1-2人份"）
- difficulty: 制作难度（简单/中等/困难）
- tools: 厨具数组（如 ["炒锅", "菜刀"]）
- mainIngredients: 主料名称数组（如 ["五花肉", "青椒"]）
- allIngredients: 所有食材和调料的字符串数组。格式严格为："名称 用量（比喻）"。例如："盐 3g（约12颗黄豆大小）"。
- steps: 步骤字符串数组。每个步骤包含阶段、动作、火候、时间、感官标志。例如："第一阶段：预处理。五花肉切薄片..."。
- tips: 黄金比例或额外提示。

必须只返回纯 JSON。
`;

  const payload = {
    model: MODEL_ID,
    stream: false,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ]
  };

  try {
    const r = await axios.post(API_URL, payload, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 60000
    });
    
    let rawContent = r.data?.choices?.[0]?.message?.content || '';
    // 清理可能存在的 Markdown 标记
    rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 尝试提取 JSON
    let jsonStr = rawContent;
    const match = rawContent.match(/\{[\s\S]*\}/);
    if (match) {
      jsonStr = match[0];
    }

    const obj = JSON.parse(jsonStr);
    return obj;
  } catch (err) {
    console.error(`生成 ${dishName} 失败:`, err.message);
    return null;
  }
}

async function run() {
  let count = 0;
  // 这里我们跑前 10 个作为示例，用户可以把这里的 slice 去掉跑全量
  const BATCH_SIZE = 10; 
  const batchTasks = tasks.slice(0, BATCH_SIZE); 

  console.log(`本批次计划生成 ${batchTasks.length} 道菜...`);

  for (const name of batchTasks) {
    console.log(`[${++count}/${batchTasks.length}] 正在生成：${name}...`);
    const recipe = await generateDish(name);
    
    if (recipe) {
      recipe.id = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // 确保字段兼容性
      if (!recipe.allIngredients) recipe.allIngredients = [];
      if (!recipe.steps) recipe.steps = [];
      
      existingRecipes.push(recipe);
      // 实时保存，防止中断
      fs.writeFileSync(RECIPES_FILE, JSON.stringify(existingRecipes, null, 2));
      console.log(`✅ 保存成功：${name}`);
    } else {
      console.log(`❌ 跳过：${name}`);
    }
    
    // 避免速率限制
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log(`\n🎉 批次完成！已生成并保存到 ${RECIPES_FILE}`);
}

run();
