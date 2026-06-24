/**
 * 批量生成/优化菜谱脚本 - 使用阿里云qwen-plus
 * 按新格式生成1000道菜谱
 */

const Database = require('better-sqlite3');
const axios = require('axios');
const fs = require('fs');

const db = new Database('./data/recipes.db');

// 阿里云DashScope API
const API_KEY = 'sk-8e45bff52a8349b097e5c7da42ce42a5';
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = 'qwen-plus';

const SYSTEM_PROMPT = `你是"我要做饭"应用的菜谱生成专家，拥有五星级酒店厨师经验。

## 核心任务
根据用户输入的食材，按标准化格式生成菜谱。

## 菜谱格式要求
{
  "id": "std-时间戳-随机6位",
  "name": "菜名",
  "description": "25字内简介",
  "difficulty": "简单/中等/困难",
  "cookTime": "10分钟",
  "servings": "1-2人份",
  "calories": 350,
  "mainIngredients": ["主料1", "主料2"],
  "requiredSeasonings": ["盐", "油", "生抽"],
  "optionalSeasonings": ["葱花", "蒜末"],
  "originalTools": ["炒锅"],
  "allIngredients": [
    {"name": "番茄", "amount": "200g", "note": "约2个", "isRequired": true},
    {"name": "鸡蛋", "amount": "100g", "note": "约2个", "isRequired": true}
  ],
  "steps": [
    {
      "step": 1, "stage": "准备", "action": "番茄洗净切块",
      "heat": "无", "time": "2分钟", "sensory": "大小均匀",
      "fullText": "番茄洗净，切成大小均匀的块，备用"
    }
  ],
  "tips": "小贴士"
}

## 规则
1. 食材必须有具体用量(g/ml)和生活化比喻
2. 步骤必须包含：操作动作 + 火候 + 时间 + 感官状态
3. requiredSeasonings是必须有否则味道不对的调料
4. optionalSeasonings是可有可无的调料
5. mainIngredients是主料，缺了就不是这道菜`;

async function generateBatch(dishNames) {
  const userContent = `请为以下菜名生成标准格式菜谱（JSON数组格式）：
${dishNames.join(', ')}

每个菜谱必须包含：mainIngredients, requiredSeasonings, optionalSeasonings, originalTools, allIngredients(含isRequired), steps(含stage/heat/time/sensory/fullText)

返回纯JSON数组，不要其他文字。`;

  try {
    const r = await axios.post(API_URL, {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      max_tokens: 8000
    }, {
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 120000
    });

    let content = r.data?.choices?.[0]?.message?.content || '';
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return [];
  } catch (e) {
    console.error('生成失败:', e.message);
    return [];
  }
}

// 获取需要生成的菜名
const allDishNames = JSON.parse(fs.readFileSync('./data/dish_names.json', 'utf-8'));
const existing = db.prepare('SELECT name FROM StandardRecipes').all();
const existingNames = new Set(existing.map(r => r.name));

const toGenerate = allDishNames.filter(n => !existingNames.has(n)).slice(0, 300);
console.log(`待生成: ${toGenerate.length} 道菜谱`);

// 批量插入
const insert = db.prepare(`
  INSERT INTO StandardRecipes 
  (id, name, description, calories, cookTime, servings, difficulty, 
   mainIngredients, requiredSeasonings, optionalSeasonings, originalTools,
   allIngredients, steps, tips, cookedCount, lastCookedDate)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
`);

// 分批处理（每批10道）
const BATCH_SIZE = 10;
let generated = 0;

async function run() {
  for (let i = 0; i < toGenerate.length; i += BATCH_SIZE) {
    const batch = toGenerate.slice(i, i + BATCH_SIZE);
    console.log(`\n[${i/BATCH_SIZE + 1}/${Math.ceil(toGenerate.length/BATCH_SIZE)}] 生成: ${batch.join(', ')}`);
    
    const recipes = await generateBatch(batch);
    
    for (const r of recipes) {
      if (!r || !r.name) continue;
      
      const id = `std-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      
      try {
        insert.run(
          id,
          r.name || '',
          r.description || '',
          r.calories || 0,
          r.cookTime || '',
          r.servings || '',
          r.difficulty || '简单',
          JSON.stringify(r.mainIngredients || []),
          JSON.stringify(r.requiredSeasonings || []),
          JSON.stringify(r.optionalSeasonings || []),
          JSON.stringify(r.originalTools || []),
          JSON.stringify(r.allIngredients || []),
          JSON.stringify(r.steps || []),
          r.tips || ''
        );
        generated++;
      } catch (e) {
        console.log(`插入失败: ${r.name} - ${e.message}`);
      }
    }
    
    // 避免API限流
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const finalCount = db.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
  console.log(`\n✅ 完成! 共 ${generated} 道菜谱，数据库现有 ${finalCount.cnt} 道`);
  
  db.close();
}

run();