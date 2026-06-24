/**
 * 继续生成菜谱 - 直到全部完成
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

## 输出格式（严格JSON）
{
  "name": "菜名",
  "description": "25字内简介",
  "difficulty": "简单/中等/困难",
  "cookTime": "15分钟",
  "servings": "1-2人份",
  "calories": 350,
  "mainIngredients": ["主料"],
  "requiredSeasonings": ["盐", "油", "生抽"],
  "optionalSeasonings": ["葱花"],
  "originalTools": ["炒锅"],
  "allIngredients": [
    {"name": "主料", "amount": "200g", "note": "约X个", "isRequired": true}
  ],
  "steps": [
    {"step": 1, "stage": "准备", "action": "洗净切好", "heat": "无", "time": "2分钟", "sensory": "大小均匀", "fullText": "步骤描述"}
  ],
  "tips": "小贴士"
}

## 关键规则
1. requiredSeasonings是必备调料
2. optionalSeasonings是可选调料
3. allIngredients.isRequired必须对应
4. 用量g/ml+生活化比喻`;

let generated = 0;
let failed = 0;
let apiErrors = 0;

async function generateDish(dishName) {
  try {
    const r = await axios.post(API_URL, {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `生成菜谱"${dishName}"的完整JSON` }
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
    if (e.response?.status === 429 || e.response?.status === 403) {
      apiErrors++;
    }
    return null;
  }
}

async function run() {
  // 查找需要更新的菜谱（requiredSeasonings为空）
  const oldFormat = db.prepare("SELECT name FROM StandardRecipes WHERE requiredSeasonings IS NULL OR requiredSeasonings = '' OR length(COALESCE(requiredSeasonings, '')) < 2").all();
  const toGenerate = oldFormat.map(r => r.name);
  
  console.log(`需要更新: ${toGenerate.length} 道菜谱`);
  
  if (toGenerate.length === 0) {
    console.log('全部完成!');
    db.close();
    return;
  }

  const insert = db.prepare(`
    UPDATE StandardRecipes SET
      description = ?, calories = ?, cookTime = ?, servings = ?, difficulty = ?,
      mainIngredients = ?, requiredSeasonings = ?, optionalSeasonings = ?, originalTools = ?,
      allIngredients = ?, steps = ?, tips = ?
    WHERE name = ?
  `);

  let batchNum = 0;
  
  for (let i = 0; i < toGenerate.length; i++) {
    const dishName = toGenerate[i];
    console.log(`[${i+1}/${toGenerate.length}] ${dishName}...`);
    
    const r = await generateDish(dishName);
    
    if (r) {
      try {
        insert.run(
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
          r.tips || '',
          dishName
        );
        generated++;
        console.log(`  ✅`);
      } catch (e) {
        failed++;
      }
    } else {
      failed++;
    }
    
    // 每100道汇报
    if ((i + 1) % 100 === 0) {
      batchNum++;
      const newFormat = db.prepare("SELECT COUNT(*) as cnt FROM StandardRecipes WHERE requiredSeasonings IS NOT NULL AND length(requiredSeasonings) > 2").get();
      console.log(`\n📊 第${batchNum}批汇报`);
      console.log(`   已更新: ${generated} 道`);
      console.log(`   失败: ${failed} 道`);
      console.log(`   新格式总计: ${newFormat.cnt}/1000`);
      console.log(`   预计剩余: ${toGenerate.length - i - 1} 道\n`);
      
      if (apiErrors >= 5) {
        console.log(`\n⚠️ API错误过多，停止生成`);
        break;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  
  const final = db.prepare("SELECT COUNT(*) as cnt FROM StandardRecipes WHERE requiredSeasonings IS NOT NULL").get();
  console.log(`\n✅ 完成! 新格式菜谱: ${final.cnt}/1000`);
  db.close();
}

run();