const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MODEL_ID = process.env.VOLCENGINE_MODEL_ID || 'doubao-seed-2-0-mini-260215';
const API_KEY = process.env.VOLCENGINE_API_KEY || 'a2ed729e-f8f5-49cc-a9a4-dd40a950c06e';

const TARGET_FILE = path.join(__dirname, '../data/simple_dish_names.json');

const PROMPTS = [
  '请列出 50 道中国家庭最常见的家常炒菜（stir-fry），要求食材易买、做法简单、耗时短。只返回 JSON 字符串数组，例如 ["菜名1", "菜名2"]。不要包含任何其他文字。',
  '请列出 30 道适合新手的快手肉菜，步骤简单。只返回 JSON 字符串数组。',
  '请列出 30 道适合新手的快手素菜，步骤简单。只返回 JSON 字符串数组。',
  '请列出 20 道常见的家常盖浇饭菜码（如番茄炒蛋、青椒肉丝等）。只返回 JSON 字符串数组。'
];

async function fetchNames(prompt) {
  console.log(`正在请求 AI 生成菜名...`);
  const payload = {
    model: MODEL_ID,
    stream: false,
    messages: [
      { role: 'system', content: '你是一个菜谱数据库助手。' },
      { role: 'user', content: prompt }
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
    console.error(`获取失败:`, e.message);
    return [];
  }
}

async function run() {
  let allNames = new Set();
  
  for (const p of PROMPTS) {
    const names = await fetchNames(p);
    names.forEach(n => allNames.add(n));
    console.log(`本次获取到 ${names.length} 个，当前总数：${allNames.size}`);
    await new Promise(r => setTimeout(r, 1000));
  }

  const sortedNames = Array.from(allNames).sort();
  fs.writeFileSync(TARGET_FILE, JSON.stringify(sortedNames, null, 2));
  console.log(`\n🎉 简单菜名库构建完成！共 ${sortedNames.length} 道菜。保存至 ${TARGET_FILE}`);
}

run();
