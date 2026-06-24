/**
 * 管理后台 API 路由
 * 提供核心数据大屏、菜谱管理、用户统计等功能
 */

const express = require('express')
const router = express.Router()
const db = require('../lib/db')

// ========== 核心数据大屏 API ==========

router.get('/dashboard', (req, res) => {
  try {
    // 今日新增菜谱
    const todayNew = db.get(`
      SELECT COUNT(*) as count 
      FROM StandardRecipes 
      WHERE date(createdAt) = date('now')
    `)

    // 草稿数
    const drafts = db.get(`
      SELECT COUNT(*) as count 
      FROM StandardRecipes 
      WHERE isDraft = 1
    `)

    // 菜谱总数
    const total = db.get(`
      SELECT COUNT(*) as count 
      FROM StandardRecipes
    `)

    // 热门菜谱 Top10
    const topRecipes = db.query(`
      SELECT name, cookedCount, difficulty, cookTime 
      FROM StandardRecipes 
      ORDER BY cookedCount DESC 
      LIMIT 10
    `)

    // 用户库存统计
    const inventory = db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN isExpiring = 1 THEN 1 ELSE 0 END) as expiring,
        SUM(clickFrequency) as totalClicks
      FROM UserInventory
    `)

    res.json({
      todayNew: todayNew?.count || 0,
      drafts: drafts?.count || 0,
      total: total?.count || 0,
      topRecipes: topRecipes || [],
      inventory: {
        total: inventory?.total || 0,
        expiring: inventory?.expiring || 0,
        totalClicks: inventory?.totalClicks || 0
      }
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    res.status(500).json({ error: '获取数据失败' })
  }
})

// ========== 菜谱管理 API ==========

// 菜谱列表（支持分页、搜索）
router.get('/recipes', (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', draft = '' } = req.query
    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 20
    const offset = (pageNum - 1) * limitNum

    let where = '1=1'
    const params = []
    
    if (search) {
      where += ' AND name LIKE ?'
      params.push(`%${search}%`)
    }
    if (draft !== '' && draft !== undefined) {
      where += ' AND isDraft = ?'
      params.push(draft === 'true' ? 1 : 0)
    }

    // 获取总数
    const countResult = db.get(
      `SELECT COUNT(*) as count FROM StandardRecipes WHERE ${where}`,
      params
    )

    // 获取列表
    const list = db.query(`
      SELECT id, name, description, calories, cookTime, servings, 
             difficulty, cookedCount, isDraft, category, createdAt
      FROM StandardRecipes 
      WHERE ${where}
      ORDER BY createdAt DESC 
      LIMIT ${limitNum} OFFSET ${offset}
    `, params)

    res.json({
      list: list || [],
      total: countResult?.count || 0,
      page: pageNum,
      limit: limitNum
    })
  } catch (error) {
    console.error('Recipes API error:', error)
    res.status(500).json({ error: '获取菜谱列表失败' })
  }
})

// 菜谱详情
router.get('/recipes/:id', (req, res) => {
  try {
    const { id } = req.params
    const recipe = db.get('SELECT * FROM StandardRecipes WHERE id = ?', [id])
    
    if (!recipe) {
      return res.status(404).json({ error: '菜谱不存在' })
    }
    
    res.json(recipe)
  } catch (error) {
    console.error('Recipe detail API error:', error)
    res.status(500).json({ error: '获取菜谱详情失败' })
  }
})

// 创建菜谱
router.post('/recipes', (req, res) => {
  try {
    const {
      name,
      description = '',
      calories = 0,
      cookTime = '',
      servings = '1人份',
      difficulty = '简单',
      mainIngredients = [],
      requiredSeasonings = [],
      optionalSeasonings = [],
      tools = [],
      allIngredients = [],
      steps = [],
      tips = '',
      category = '',
      note = '',
      totalWeight = 0,
      isDraft = 0
    } = req.body

    if (!name) {
      return res.status(400).json({ error: '菜谱名称不能为空' })
    }

    const id = `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    db.prepare(`
      INSERT INTO StandardRecipes (
        id, name, description, calories, cookTime, servings, difficulty,
        mainIngredients, requiredSeasonings, optionalSeasonings, tools,
        allIngredients, steps, tips, category, note, totalWeight, cookedCount, isDraft
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      id,
      name,
      description,
      calories,
      cookTime,
      servings,
      difficulty,
      JSON.stringify(mainIngredients),
      JSON.stringify(requiredSeasonings),
      JSON.stringify(optionalSeasonings),
      JSON.stringify(tools),
      JSON.stringify(allIngredients),
      JSON.stringify(steps),
      tips,
      category,
      note,
      totalWeight,
      isDraft
    )

    res.json({ id, message: '菜谱创建成功' })
  } catch (error) {
    console.error('Create recipe API error:', error)
    res.status(500).json({ error: '创建菜谱失败' })
  }
})

// 更新菜谱
router.put('/recipes/:id', (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      description,
      calories,
      cookTime,
      servings,
      difficulty,
      mainIngredients,
      requiredSeasonings,
      optionalSeasonings,
      tools,
      allIngredients,
      steps,
      tips,
      category,
      note,
      totalWeight,
      isDraft
    } = req.body

    // 检查菜谱是否存在
    const existing = db.get('SELECT id FROM StandardRecipes WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ error: '菜谱不存在' })
    }

    db.prepare(`
      UPDATE StandardRecipes SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        calories = COALESCE(?, calories),
        cookTime = COALESCE(?, cookTime),
        servings = COALESCE(?, servings),
        difficulty = COALESCE(?, difficulty),
        mainIngredients = COALESCE(?, mainIngredients),
        requiredSeasonings = COALESCE(?, requiredSeasonings),
        optionalSeasonings = COALESCE(?, optionalSeasonings),
        tools = COALESCE(?, tools),
        allIngredients = COALESCE(?, allIngredients),
        steps = COALESCE(?, steps),
        tips = COALESCE(?, tips),
        category = COALESCE(?, category),
        note = COALESCE(?, note),
        totalWeight = COALESCE(?, totalWeight),
        isDraft = COALESCE(?, isDraft),
        updatedAt = datetime('now')
      WHERE id = ?
    `).run(
      name,
      description,
      calories,
      cookTime,
      servings,
      difficulty,
      mainIngredients ? JSON.stringify(mainIngredients) : null,
      requiredSeasonings ? JSON.stringify(requiredSeasonings) : null,
      optionalSeasonings ? JSON.stringify(optionalSeasonings) : null,
      tools ? JSON.stringify(tools) : null,
      allIngredients ? JSON.stringify(allIngredients) : null,
      steps ? JSON.stringify(steps) : null,
      tips,
      category,
      note,
      totalWeight,
      isDraft,
      id
    )

    res.json({ id, message: '菜谱更新成功' })
  } catch (error) {
    console.error('Update recipe API error:', error)
    res.status(500).json({ error: '更新菜谱失败' })
  }
})

// 删除菜谱
router.delete('/recipes/:id', (req, res) => {
  try {
    const { id } = req.params

    const existing = db.get('SELECT id FROM StandardRecipes WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ error: '菜谱不存在' })
    }

    db.prepare('DELETE FROM StandardRecipes WHERE id = ?').run(id)

    res.json({ message: '菜谱删除成功' })
  } catch (error) {
    console.error('Delete recipe API error:', error)
    res.status(500).json({ error: '删除菜谱失败' })
  }
})

// ========== 用户统计 API ==========

router.get('/users', (req, res) => {
  try {
    // 热门食材 Top50
    const topIngredients = db.query(`
      SELECT ingredientName, clickFrequency, isExpiring
      FROM UserInventory 
      ORDER BY clickFrequency DESC 
      LIMIT 50
    `)

    // 临期食材
    const expiring = db.query(`
      SELECT ingredientName, expiryDate
      FROM UserInventory 
      WHERE isExpiring = 1
    `)

    res.json({
      topIngredients: topIngredients || [],
      expiring: expiring || []
    })
  } catch (error) {
    console.error('Users API error:', error)
    res.status(500).json({ error: '获取用户数据失败' })
  }
})

module.exports = router