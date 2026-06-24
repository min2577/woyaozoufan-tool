/**
 * 重新生成1000道菜谱 - 新格式
 */

const Database = require('better-sqlite3');
const axios = require('axios');
const fs = require('fs');

const db = new Database('./data/recipes.db');

// 阿里云API
const API_KEY = 'sk-8e45bff52a8349b097e5c7da42ce42a5';
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = 'qwen-plus';

const SYSTEM_PROMPT = `你是"我要做饭"应用的菜谱生成专家。

## 输出格式（必须严格遵循）
{
  "name": "菜名",
  "description": "25字内简介",
  "difficulty": "简单/中等/困难",
  "cookTime": "10分钟",
  "servings": "1-2人份", 
  "calories": 350,
  "mainIngredients": ["主料1"],
  "requiredSeasonings": ["盐", "油", "生抽"],
  "optionalSeasonings": ["葱花"],
  "originalTools": ["炒锅"],
  "allIngredients": [
    {"name": "番茄", "amount": "200g", "note": "约2个", "isRequired": true},
    {"name": "盐", "amount": "3g", "note": "约12颗黄豆大小", "isRequired": true}
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

## 关键规则
1. requiredSeasonings: 必须有否则味道不对的调料
2. optionalSeasonings: 可有可无的调料  
3. 步骤必须包含 heat/time/sensory
4. 用量必须g/ml+生活化比喻`;

async function generateDish(dishName) {
  const userContent = `生成菜谱"${dishName}"的完整JSON数据。严格按照上述格式，不要编造菜谱。`;

  try {
    const r = await axios.post(API_URL, {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      max_tokens: 2000
    }, {
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 60000
    });

    let content = r.data?.choices?.[0]?.message?.content || '';
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return null;
  } catch (e) {
    console.error(`生成失败: ${dishName} - ${e.message}`);
    return null;
  }
}

// 清空旧菜谱（可选）
// db.prepare('DELETE FROM StandardRecipes').run();
// console.log('已清空旧菜谱');

// 读取菜名
const allDishNames = JSON.parse(fs.readFileSync('./data/dish_names.json', 'utf-8'));

// 生成100道（分批）
const insert = db.prepare(`
  INSERT INTO StandardRecipes 
  (id, name, description, calories, cookTime, servings, difficulty, 
   mainIngredients, requiredSeasonings, optionalSeasonings, originalTools,
   allIngredients, steps, tips, cookedCount, lastCookedDate)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
`);

// 生成前100道测试
const toGenerate = allDishNames.slice(0, 100);
let success = 0;

async function run() {
  console.log(`开始生成 ${toGenerate.length} 道菜谱...`);
  
  for (let i = 0; i < toGenerate.length; i++) {
    const dishName = toGenerate[i];
    console.log(`[${i+1}/${toGenerate.length}] ${dishName}...`);
    
    const r = await generateDish(dishName);
    
    if (r) {
      const id = `std-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      try {
        insert.run(
          id,
          r.name || dishName,
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
        success++;
        console.log(`  ✅ 成功`);
      } catch (e) {
        console.log(`  ❌ 插入失败: ${e.message}`);
      }
    }
    
    // 避免限流
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  const final = db.prepare('SELECT COUNT(*) as cnt FROM StandardRecipes').get();
  console.log(`\n✅ 完成! 新增 ${success} 道，共 ${final.cnt} 道`);
  db.close();
}

run();