#!/usr/bin/env python3
"""
持续生成菜谱脚本 - 直接写入数据库
目标: 生成到232条或早上8点
"""

import sqlite3
import json
import time
import requests
import os

# 配置
API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
MODEL_ID = "doubao-seed-2-0-mini-260215"
API_KEY = "a2ed729e-f8f5-49cc-a9a4-dd40a950c06e"

DB_PATH = r"D:\bianchengchangshi\woyaozoufan\server\data\woyaozoufan.db"
NAMES_FILE = r"D:\bianchengchangshi\woyaozoufan\server\data\dish_names.json"

TARGET_HOUR = 8
TARGET_COUNT = 232

SYSTEM_PROMPT = """你是"我要做饭"应用的内容主编，拥有20年五星级酒店行政总厨经验及资深营养师背景。
你擅长将复杂的烹饪过程拆解为小白也能看懂的数字化、感官化指令。"""

def get_connection():
    return sqlite3.connect(DB_PATH)

def get_existing_names(conn):
    c = conn.cursor()
    c.execute('SELECT name FROM StandardRecipes')
    return set([row[0] for row in c.fetchall()])

def load_dish_names():
    with open(NAMES_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_recipe(dish_name):
    user_content = f"""
Task: 请根据菜名"{dish_name}"，严格按照以下JSON格式生成标准菜谱。

要求：
1. 简介控制在25字内
2. 所有调料必须用克(g)或毫升(ml)标注，并加生活化比喻
3. 步骤必须包含火候、时间、感官状态

返回格式（纯JSON，不要markdown）：
{{
  "name": "{dish_name}",
  "description": "简介",
  "calories": 数字,
  "cookTime": "如：20分钟",
  "servings": "如：1-2人份",
  "difficulty": "简单/中等/困难",
  "mainIngredients": ["主料1", "主料2"],
  "allIngredients": [{{"name":"食材名","amount":"用量","note":"比喻","isRequired":true}}],
  "steps": ["步骤1", "步骤2"],
  "tips": "小贴士"
}}
"""
    payload = {
        "model": MODEL_ID,
        "stream": False,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ]
    }
    
    try:
        r = requests.post(API_URL, json=payload, headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }, timeout=60)
        
        content = r.json()["choices"][0]["message"]["content"]
        content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        print(f"生成失败: {e}")
        return None

def save_recipe(conn, recipe):
    import random
    import string
    
    recipe_id = f"batch-{int(time.time())}-{''.join(random.choices(string.ascii_lowercase, k=9))}"
    
    c = conn.cursor()
    c.execute('''
        INSERT INTO StandardRecipes 
        (id, name, description, calories, cookTime, servings, difficulty, 
         mainIngredients, allIngredients, steps, tips, cookedCount, lastCooked)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
    ''', (
        recipe_id,
        recipe.get('name', ''),
        recipe.get('description', ''),
        recipe.get('calories', 0),
        recipe.get('cookTime', ''),
        recipe.get('servings', ''),
        recipe.get('difficulty', '简单'),
        json.dumps(recipe.get('mainIngredients', [])),
        json.dumps(recipe.get('allIngredients', [])),
        json.dumps(recipe.get('steps', [])),
        recipe.get('tips', '')
    ))
    conn.commit()

def main():
    print(f"开始时间: {time.strftime('%H:%M:%S')}")
    print(f"目标: {TARGET_COUNT} 条或早上{TARGET_HOUR}点\n")
    
    conn = get_connection()
    existing_names = get_existing_names(conn)
    print(f"已有菜谱: {len(existing_names)} 条")
    
    all_names = load_dish_names()
    tasks = [n for n in all_names if n not in existing_names]
    print(f"待生成: {len(tasks)} 条\n")
    
    generated = len(existing_names)
    
    for i, dish_name in enumerate(tasks):
        # 检查是否达到目标
        current_hour = time.localtime().tm_hour
        if current_hour >= TARGET_HOUR or generated >= TARGET_COUNT:
            print(f"\n完成! 已生成 {generated} 条菜谱")
            break
        
        print(f"[{i+1}/{len(tasks)}] 正在生成: {dish_name}...")
        
        recipe = generate_recipe(dish_name)
        
        if recipe:
            try:
                save_recipe(conn, recipe)
                generated += 1
                print(f"  成功! 总计: {generated} 条")
            except Exception as e:
                print(f"  保存失败: {e}")
        else:
            print(f"  失败")
        
        # 避免API限制
        time.sleep(2)
    
    conn.close()
    print(f"\n最终数量: {generated} 条")

if __name__ == "__main__":
    main()