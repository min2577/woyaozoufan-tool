const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const aiService = require('../services/aiService');
const { buildContractRecipeFromDbRow, recipeToDbUpdateFields, validateRecipeContract } = require('../utils/recipeContractV0005');
const { normalizeText } = require('../utils/ingredientParser');

function parseArgs(argv) {
  const args = new Map();
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, v] = a.split('=');
    args.set(k, v === undefined ? true : v);
  }
  return args;
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function getDbPath() {
  return path.join(__dirname, '../data/recipes.db');
}

function backupDb(dbPath) {
  const backupPath = `${dbPath}.backup_${nowStamp()}`;
  fs.copyFileSync(dbPath, backupPath);
  return backupPath;
}

function hasColumn(db, table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c && c.name === column);
}

function getColumnsSet(db, table) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return new Set(cols.map(c => c && c.name).filter(Boolean));
}

function ensureColumns(db, table) {
  const columns = [
    { name: 'requiredSeasonings', type: 'TEXT' },
    { name: 'optionalSeasonings', type: 'TEXT' },
    { name: 'originalTools', type: 'TEXT' },
    { name: 'category', type: 'TEXT' },
    { name: 'note', type: 'TEXT' },
    { name: 'totalWeight', type: 'INTEGER' }
  ];
  for (const c of columns) {
    if (hasColumn(db, table, c.name)) continue;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${c.name} ${c.type}`);
  }
}

function safeJsonStringify(v) {
  try {
    return JSON.stringify(v);
  } catch {
    return '[]';
  }
}

function buildRepairPrompt(contractSpecSummary, rawRecipeJson) {
  return [
    { role: 'system', content: '你是一个“菜谱库修复器”。你只输出 JSON，不输出任何解释性文字。' },
    {
      role: 'user',
      content: [
        '请把输入菜谱修复为严格符合以下要求的 JSON（只输出 JSON）：',
        contractSpecSummary,
        '',
        '如果你无法可靠补齐（信息不足/不确定性过大），请输出：',
        '{ "ok": false, "reason": "为什么补不齐（用中文一句话）" }',
        '',
        '输入菜谱 JSON：',
        rawRecipeJson
      ].join('\n')
    }
  ];
}

function contractSpecSummaryV0005() {
  return [
    '必须满足 CONTRACTS.md 的 Recipe 格式，必须包含字段：',
    'id,name,description,difficulty,cookTime,servings,calories,',
    'mainIngredients,requiredSeasonings,optionalSeasonings,originalTools,',
    'allIngredients[{name,amount,note,isRequired}],',
    'steps[{step,stage,action,heat,time,sensory,fullText}],',
    'tips,category,note,totalWeight,cookedCount',
    '',
    '约束：',
    '- description ≤ 25 字',
    '- difficulty 仅允许：简单/中等/困难',
    '- category 仅允许：立即下厨/顺路买点',
    '- stage 仅允许：准备/预处理/烹饪/装盘',
    '- allIngredients.isRequired 必须严格对应：',
    '  - mainIngredients 与 requiredSeasonings → true',
    '  - optionalSeasonings → false',
    '- allIngredients 必须覆盖 mainIngredients/requiredSeasonings/optionalSeasonings',
    '- amount 必须为可读字符串（例如 200g/10ml）',
    '- originalTools 平底锅统一按“炒锅”口径'
  ].join('\n');
}

async function aiRepair(row, table) {
  const raw = {
    id: row.id,
    name: row.name,
    description: row.description,
    difficulty: row.difficulty,
    cookTime: row.cookTime,
    servings: row.servings,
    calories: row.calories,
    mainIngredients: row.mainIngredients ? JSON.parse(row.mainIngredients) : [],
    requiredSeasonings: row.requiredSeasonings ? JSON.parse(row.requiredSeasonings) : [],
    optionalSeasonings: row.optionalSeasonings ? JSON.parse(row.optionalSeasonings) : [],
    originalTools: row.originalTools ? JSON.parse(row.originalTools) : (row.tools ? JSON.parse(row.tools) : []),
    allIngredients: row.allIngredients ? JSON.parse(row.allIngredients) : [],
    steps: row.steps ? JSON.parse(row.steps) : [],
    tips: row.tips,
    category: row.category,
    note: row.note,
    totalWeight: row.totalWeight,
    cookedCount: row.cookedCount
  };

  const messages = buildRepairPrompt(contractSpecSummaryV0005(), safeJsonStringify(raw));
  const resp = await aiService.callAI(messages, { temperature: 0.2, maxTokens: 4096, useCache: false });
  const content = resp?.choices?.[0]?.message?.content;
  const text = normalizeText(content);
  if (!text) return { ok: false, reason: 'AI 返回为空' };

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { parsed = JSON.parse(text.slice(start, end + 1)); } catch {}
    }
  }

  if (!parsed || typeof parsed !== 'object') return { ok: false, reason: 'AI 返回非 JSON' };
  if (parsed.ok === false) return { ok: false, reason: normalizeText(parsed.reason) || 'AI 表示无法补齐' };

  const check = validateRecipeContract(parsed);
  if (!check.ok) return { ok: false, reason: `AI 输出仍不合规:${check.errors.slice(0, 3).join('|')}` };

  return { ok: true, recipe: parsed, table };
}

function buildReportPath() {
  const dir = path.join(__dirname, '../data/recipe_repair_reports');
  ensureDir(dir);
  return path.join(dir, `repair_report_v0005_${nowStamp()}.json`);
}

async function main() {
  const args = parseArgs(process.argv);
  const apply = args.get('--apply') === true;
  const limit = args.get('--limit') ? Number(args.get('--limit')) : null;

  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    process.stderr.write(`DB 文件不存在：${dbPath}\n`);
    process.exit(1);
  }

  const backupPath = apply ? backupDb(dbPath) : null;
  const db = new Database(dbPath, apply ? {} : { readonly: true, fileMustExist: true });

  if (apply) {
    ensureColumns(db, 'StandardRecipes');
    ensureColumns(db, 'OutrageousRecipes');
  }

  const tables = ['StandardRecipes', 'OutrageousRecipes'];
  const report = {
    version: 'v0005',
    dbPath,
    backupPath,
    apply,
    startedAt: new Date().toISOString(),
    totals: {},
    fixed: [],
    deleted: [],
    failed: []
  };

  for (const table of tables) {
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    report.totals[table] = { total: rows.length, compliant: 0, updated: 0, aiFixed: 0, deleted: 0, failed: 0 };

    const cols = getColumnsSet(db, table);
    const setParts = [
      'name=@name',
      'description=@description',
      'calories=@calories',
      'cookTime=@cookTime',
      'servings=@servings',
      'difficulty=@difficulty',
      'mainIngredients=@mainIngredients',
      'allIngredients=@allIngredients',
      'steps=@steps',
      'tips=@tips',
      'cookedCount=@cookedCount',
      'requiredSeasonings=@requiredSeasonings',
      'optionalSeasonings=@optionalSeasonings',
      'originalTools=@originalTools',
      'category=@category',
      'note=@note',
      'totalWeight=@totalWeight',
      "updatedAt=datetime('now')"
    ].filter(part => {
      const col = part.split('=')[0];
      return col === 'updatedAt' || cols.has(col);
    });
    if (cols.has('tools')) setParts.splice(setParts.indexOf('tips=@tips') + 1, 0, 'tools=@tools');

    const updateStmt = db.prepare(`UPDATE ${table} SET ${setParts.join(', ')} WHERE id=@id`);

    const deleteStmt = db.prepare(`DELETE FROM ${table} WHERE id=?`);

    const tx = db.transaction((ops) => {
      for (const op of ops) {
        if (op.type === 'update') updateStmt.run(op.data);
        if (op.type === 'delete') deleteStmt.run(op.id);
      }
    });

    const ops = [];
    for (let idx = 0; idx < rows.length; idx++) {
      if (limit && idx >= limit) break;
      const row = rows[idx];
      const contractRecipe = buildContractRecipeFromDbRow(row);
      const check = validateRecipeContract(contractRecipe);

      if (check.ok) {
        report.totals[table].compliant += 1;
        const data = recipeToDbUpdateFields(contractRecipe, true);
        data.id = row.id;
        ops.push({ type: 'update', data });
        report.totals[table].updated += 1;
        report.fixed.push({ table, id: row.id, name: row.name, mode: 'normalize' });
        continue;
      }

      try {
        const ai = await aiRepair(row, table);
        if (ai.ok) {
          report.totals[table].aiFixed += 1;
          const data = recipeToDbUpdateFields(ai.recipe, true);
          data.id = row.id;
          ops.push({ type: 'update', data });
          report.fixed.push({ table, id: row.id, name: row.name, mode: 'ai' });
        } else {
          report.totals[table].deleted += 1;
          ops.push({ type: 'delete', id: row.id });
          report.deleted.push({ table, id: row.id, name: row.name, reason: ai.reason });
        }
      } catch (e) {
        report.totals[table].failed += 1;
        report.failed.push({ table, id: row.id, name: row.name, reason: normalizeText(e?.message) || '未知错误' });
      }
    }

    if (apply) tx(ops);
  }

  if (apply) {
    for (const table of ['StandardRecipes', 'OutrageousRecipes']) {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      let bad = 0;
      for (const row of rows) {
        const r = validateRecipeContract(buildContractRecipeFromDbRow(row));
        if (!r.ok) bad++;
      }
      report.totals[table].postVerifyBad = bad;
    }
  }

  report.finishedAt = new Date().toISOString();
  const reportPath = buildReportPath();
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  db.close();

  process.stdout.write(`report=${reportPath}\n`);
  process.stdout.write(`backup=${backupPath}\n`);
  process.stdout.write(`apply=${apply}\n`);
}

main().catch((e) => {
  process.stderr.write((e && e.stack) ? e.stack + '\n' : String(e) + '\n');
  process.exit(1);
});
