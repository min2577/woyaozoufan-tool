/**
 * 持续生成菜谱脚本 - 直接写入数据库
 * 直到8点或达到目标数量
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MODEL_ID = process.env.VOLCENGINE_MODEL_ID || 'doubao-seed-2-0-mini-260215';
const API_KEY = process.env.VOLCENGINE_API_KEY || 'a2ed729e-f8f5-49cc-a9a4-dd40a950c06e';

const db = new Database('./data/woyaozoufan.db');

// 获取已有菜谱名
const existingRecipes = db.prepare('SELECT name FROM StandardRecipes').all();
const existingNames = new Set(existingRecipes.map(r => r.name));
console.log(`已有菜谱: ${existingNames.size} 条`);

// 读取菜名库
const allDishNames = JSON.parse(fs.readFileSync('./data/dish_names.json', 'utf-8'));
const tasks = allDishNames.filter(n => !existingNames.has(n));
console.log(`待生成: ${tasks.length} 条`);

const TARGET_HOUR = 8;
const TARGET_COUNT = 232;

const SYSTEM_PROMPT = `你是"我要做饭"应用的内容主编，拥有 20 年五星级酒店行政总厨经验及资深营养师背景。你擅长将复杂的烹饪过程拆解为小白也能看懂的数字化、感官化指令。`;

async function generateDish(dishName) {
  const userContent = `
Task: 请根据菜名"${dishName}"，严格按照以下JSON格式生成标准菜谱。

要求：
1. 简介控制在25字内
2. 所有调料必须用克(g)或毫升(ml)标注，并加生活化比喻
3. 步骤必须包含火候、时间、感官状态

返回格式（纯JSON，不要markdown）：
{
  "name": "${dishName}",
  "description": "简介",
  "calories": 数字,
  "cookTime": "如：20分钟",
  "servings": "如：1-2人份",
  "difficulty": "简单/中等/困难",
  "mainIngredients": ["主料1", "主料2"],
  "allIngredients": [{"name":"食材名","amount":"用量","note":"比喻","isRequired":true}],
  "steps": ["步骤1", "步骤2"],
  "tips": "小贴士"
}
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
    rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const obj = JSON.parse(rawContent);
    return obj;
  } catch (err) {
    console.error(`生成失败: ${err.message}`);
    return null;
  }
}

async function run() {
  const now = new Date();
  let generated = existingNames.size;
  
  console.log(`开始时间: ${now.toLocaleTimeString()}`);
  console.log(`目标: ${TARGET_COUNT} 条或早上${TARGET_HOUR}点`);
  
  let index = 0;
  while (index < tasks.length) {
    const currentHour = new Date().getHours();
    if (currentHour >= TARGET_HOUR || generated >= TARGET_COUNT) {
      console.log(`\n完成任务！已生成 ${generated} 条菜谱`);
      break;
    }
    
    const dishName = tasks[index];
    console.log(`\n[${index + 1}/${tasks.length}] 正在生成: ${dishName}...`);
    
    const recipe = await generateDish(dishName);
    
    if (recipe) {
      try {
        // 插入数据库
        db.prepare(`
          INSERT INTO StandardRecipes 
          (id, name, description, calories, cookTime, servings, difficulty, 
           mainIngredients, allIngredients, steps, tips, cookedCount, lastCooked)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
        `).run(
          `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          recipe.name || dishName,
          recipe.description || '',
          recipe.calories || 0,
          recipe.cookTime || '',
          recipe.servings || '',
          recipe.difficulty || '简单',
          JSON.stringify(recipe.mainIngredients || []),
          JSON.stringify(recipe.allIngredients || []),
          JSON.stringify(recipe.steps || []),
          recipe.tips || ''
        );
        
        generated++;
        console.log(`✅ 成功! 已生成 ${generated} 条`);
      } catch (e) {
        console.error(`数据库插入失败: ${e.message}`);
      }
    } else {
      console.log(`❌ 跳过`);
    }
    
    index++;
    
    // 避免API限制
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log(`\n最终数量: ${generated} 条`);
  db.close();
}

run();