const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MODEL_ID = process.env.VOLCENGINE_MODEL_ID || 'doubao-seed-2-0-mini-260215';
const API_KEY = process.env.VOLCENGINE_API_KEY || 'a2ed729e-f8f5-49cc-a9a4-dd40a950c06e';

const TARGET_FILE = path.join(__dirname, '../data/dish_names.json');

const CATEGORIES = [
  '热门家常菜', '经典川菜', '传统粤菜', '下饭湘菜', 
  '地道东北菜', '清淡江浙菜', '特色小吃', '滋补汤羹', 
  '减脂轻食', '快手早餐', '深夜夜宵', '待客硬菜'
];

async function fetchNames(category) {
  console.log(`正在获取分类：${category}...`);
  const payload = {
    model: MODEL_ID,
    stream: false,
    messages: [
      { role: 'system', content: '你是一个菜谱数据库助手。' },
      { role: 'user', content: `请列出 50 道互不重复的${category}菜名。只返回一个 JSON 字符串数组，例如 ["菜名1", "菜名2"]。不要包含任何其他文字。` }
    ]
  };

  try {
    const r = await axios.post(API_URL, payload, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });
    const content = r.data?.choices?.[0]?.message?.content || '';
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return [];
  } catch (e) {
    console.error(`获取 ${category} 失败:`, e.message);
    return [];
  }
}

async function run() {
  let allNames = new Set();
  
  // 尝试读取已有的
  if (fs.existsSync(TARGET_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(TARGET_FILE, 'utf-8'));
      existing.forEach(n => allNames.add(n));
    } catch {}
  }

  for (const cat of CATEGORIES) {
    const names = await fetchNames(cat);
    names.forEach(n => allNames.add(n));
    console.log(`分类 ${cat} 获取到 ${names.length} 个，当前总数：${allNames.size}`);
    await new Promise(r => setTimeout(r, 1000));
  }

  const sortedNames = Array.from(allNames).sort();
  fs.writeFileSync(TARGET_FILE, JSON.stringify(sortedNames, null, 2));
  console.log(`\n🎉 菜名库构建完成！共 ${sortedNames.length} 道菜。保存至 ${TARGET_FILE}`);
}

run();
