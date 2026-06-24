/**
 * 添加缺失的营养库条目
 */
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/nutrition-db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

// 添加缺失的常见食材
const additions = {
  "麻酱": {
    "per_100g": { "calories": 595, "protein": 6, "fat": 52, "carbs": 22, "sodium": 43, "vitamin_c": 0, "calcium": 117, "iron": 6, "fiber": 5, "potassium": 180 },
    "unit": "勺", "unit_weight": 15
  },
  "胡椒粉": {
    "per_100g": { "calories": 251, "protein": 10, "fat": 3.3, "carbs": 64, "sodium": 27, "vitamin_c": 1, "calcium": 443, "iron": 10, "fiber": 25, "potassium": 1350 },
    "unit": "勺", "unit_weight": 2
  },
  "孜然": {
    "per_100g": { "calories": 333, "protein": 18, "fat": 15, "carbs": 44, "sodium": 20, "vitamin_c": 0, "calcium": 930, "iron": 26, "fiber": 21, "potassium": 1600 },
    "unit": "勺", "unit_weight": 2
  },
  "辣椒": {
    "per_100g": { "calories": 40, "protein": 2, "fat": 0.2, "carbs": 9, "sodium": 8, "vitamin_c": 144, "calcium": 16, "iron": 1.2, "fiber": 1.5, "potassium": 295 },
    "unit": "个", "unit_weight": 20
  },
  "豆芽": {
    "per_100g": { "calories": 16, "protein": 2, "fat": 0.1, "carbs": 3, "sodium": 6, "vitamin_c": 8, "calcium": 14, "iron": 0.5, "fiber": 0.7, "potassium": 160 },
    "unit": "份", "unit_weight": 100
  },
  "豆角": {
    "per_100g": { "calories": 30, "protein": 2, "fat": 0.2, "carbs": 6, "sodium": 3, "vitamin_c": 18, "calcium": 50, "iron": 1, "fiber": 2, "potassium": 200 },
    "unit": "份", "unit_weight": 100
  },
  "西葫芦": {
    "per_100g": { "calories": 15, "protein": 1, "fat": 0.3, "carbs": 3, "sodium": 4, "vitamin_c": 18, "calcium": 16, "iron": 0.4, "fiber": 1, "potassium": 260 },
    "unit": "个", "unit_weight": 150
  },
  "面包": {
    "per_100g": { "calories": 265, "protein": 9, "fat": 3.2, "carbs": 49, "sodium": 491, "vitamin_c": 0, "calcium": 161, "iron": 3.6, "fiber": 2.7, "potassium": 115 },
    "unit": "片", "unit_weight": 30
  },
  "酵母": {
    "per_100g": { "calories": 325, "protein": 40, "fat": 7, "carbs": 41, "sodium": 51, "vitamin_c": 0, "calcium": 30, "iron": 2.2, "fiber": 20, "potassium": 955 },
    "unit": "勺", "unit_weight": 5
  },
  "蜂蜜": {
    "per_100g": { "calories": 304, "protein": 0.3, "fat": 0, "carbs": 82, "sodium": 4, "vitamin_c": 0.5, "calcium": 6, "iron": 0.4, "fiber": 0.2, "potassium": 52 },
    "unit": "勺", "unit_weight": 20
  },
  "芝麻": {
    "per_100g": { "calories": 573, "protein": 18, "fat": 50, "carbs": 23, "sodium": 39, "vitamin_c": 0, "calcium": 780, "iron": 7.8, "fiber": 12, "potassium": 420 },
    "unit": "勺", "unit_weight": 10
  },
  "糯米": {
    "per_100g": { "calories": 350, "protein": 7, "fat": 1, "carbs": 78, "sodium": 1, "vitamin_c": 0, "calcium": 26, "iron": 1.5, "fiber": 0.8, "potassium": 150 },
    "unit": "g", "unit_weight": 100
  },
  "红枣": {
    "per_100g": { "calories": 276, "protein": 1, "fat": 0.3, "carbs": 69, "sodium": 6, "vitamin_c": 69, "calcium": 64, "iron": 1.6, "fiber": 4, "potassium": 510 },
    "unit": "颗", "unit_weight": 10
  },
  "枸杞": {
    "per_100g": { "calories": 258, "protein": 13, "fat": 1.5, "carbs": 57, "sodium": 110, "vitamin_c": 48, "calcium": 60, "iron": 5.4, "fiber": 8, "potassium": 1110 },
    "unit": "g", "unit_weight": 5
  },
  "党参": {
    "per_100g": { "calories": 168, "protein": 5, "fat": 0.5, "carbs": 38, "sodium": 12, "vitamin_c": 0, "calcium": 55, "iron": 3.8, "fiber": 6, "potassium": 480 },
    "unit": "g", "unit_weight": 5
  },
  "黄芪": {
    "per_100g": { "calories": 252, "protein": 8, "fat": 1, "carbs": 56, "sodium": 20, "vitamin_c": 0, "calcium": 140, "iron": 7.8, "fiber": 6, "potassium": 720 },
    "unit": "g", "unit_weight": 5
  },
  "陈皮": {
    "per_100g": { "calories": 278, "protein": 8, "fat": 2, "carbs": 73, "sodium": 30, "vitamin_c": 0, "calcium": 400, "iron": 8, "fiber": 20, "potassium": 900 },
    "unit": "g", "unit_weight": 5
  },
  "腊肉": {
    "per_100g": { "calories": 584, "protein": 12, "fat": 50, "carbs": 5, "sodium": 1918, "vitamin_c": 0, "calcium": 22, "iron": 3.8, "fiber": 0, "potassium": 380 },
    "unit": "片", "unit_weight": 30
  },
  "腊肠": {
    "per_100g": { "calories": 584, "protein": 12, "fat": 50, "carbs": 5, "sodium": 1918, "vitamin_c": 0, "calcium": 22, "iron": 3.8, "fiber": 0, "potassium": 380 },
    "unit": "根", "unit_weight": 50
  },
  "火腿": {
    "per_100g": { "calories": 310, "protein": 16, "fat": 25, "carbs": 3, "sodium": 1100, "vitamin_c": 0, "calcium": 20, "iron": 2, "fiber": 0, "potassium": 280 },
    "unit": "片", "unit_weight": 30
  },
  "柠檬": {
    "per_100g": { "calories": 29, "protein": 1, "fat": 0.3, "carbs": 9, "sodium": 2, "vitamin_c": 53, "calcium": 26, "iron": 0.6, "fiber": 2.8, "potassium": 138 },
    "unit": "片", "unit_weight": 20
  },
  "芹菜": {
    "per_100g": { "calories": 14, "protein": 0.7, "fat": 0.1, "carbs": 3, "sodium": 33, "vitamin_c": 8, "calcium": 40, "iron": 0.8, "fiber": 1.6, "potassium": 250 },
    "unit": "根", "unit_weight": 50
  },
  "迷迭香": {
    "per_100g": { "calories": 331, "protein": 6, "fat": 15, "carbs": 21, "sodium": 50, "vitamin_c": 21, "calcium":1280, "iron": 6.7, "fiber": 43, "potassium": 1100 },
    "unit": "勺", "unit_weight": 1
  },
  "甜菜": {
    "per_100g": { "calories": 43, "protein": 1.6, "fat": 0.2, "carbs": 10, "sodium": 78, "vitamin_c": 4, "calcium": 16, "iron": 0.8, "fiber": 2.8, "potassium": 325 },
    "unit": "个", "unit_weight": 100
  },
  "鸡肉": {
    "per_100g": { "calories": 165, "protein": 31, "fat": 3.6, "carbs": 0, "sodium": 74, "vitamin_c": 0, "calcium": 15, "iron": 1.2, "fiber": 0, "potassium": 334 },
    "unit": "份", "unit_weight": 100
  },
  "鸽肉": {
    "per_100g": { "calories": 201, "protein": 30, "fat": 8.5, "carbs": 0, "sodium": 62, "vitamin_c": 0, "calcium": 18, "iron": 4.2, "fiber": 0, "potassium": 310 },
    "unit": "份", "unit_weight": 100
  },
  "猪肉": {
    "per_100g": { "calories": 242, "protein": 18, "fat": 18, "carbs": 0, "sodium": 62, "vitamin_c": 0, "calcium": 8, "iron": 1.8, "fiber": 0, "potassium": 280 },
    "unit": "份", "unit_weight": 100
  },
  "羊肉": {
    "per_100g": { "calories": 206, "protein": 20, "fat": 13, "carbs": 0, "sodium": 68, "vitamin_c": 0, "calcium": 10, "iron": 2.1, "fiber": 0, "potassium": 310 },
    "unit": "份", "unit_weight": 100
  }
};

let addedCount = 0;
for (const [key, value] of Object.entries(additions)) {
  if (!db[key]) {
    db[key] = value;
    addedCount++;
    console.log(`+ 添加: ${key}`);
  } else {
    console.log(`  已存在: ${key}`);
  }
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
console.log(`\n共添加 ${addedCount} 项`);
console.log(`总条目数: ${Object.keys(db).length}`);