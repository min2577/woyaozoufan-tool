const fs = require('fs');
const path = require('path');

function normalizeKey(input) {
  return String(input || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function splitLineToItems(line) {
  const s = normalizeKey(line).replace(/^-+/, '').trim();
  if (!s) return [];
  const parts = s
    .split(/[、，,；;。\s]+/g)
    .map((x) => normalizeKey(x))
    .filter(Boolean);
  return parts;
}

function extractSection(md, startMark, endMark) {
  const start = md.indexOf(startMark);
  if (start < 0) return '';
  const rest = md.slice(start + startMark.length);
  const end = endMark ? rest.indexOf(endMark) : -1;
  return end >= 0 ? rest.slice(0, end) : rest;
}

function readContractsMarkdown() {
  const filePath = path.join(__dirname, '..', '..', 'CONTRACTS.md');
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function loadLexiconFromContracts() {
  const md = readContractsMarkdown();
  const sideSection = extractSection(md, '### 常见配菜固定列表（COMMON_SIDE_DISHES）', '\n### ');
  const mainSection = extractSection(md, '### 常见主材固定列表（COMMON_MAIN_ITEMS）', '\n### ');

  const side = [];
  const main = [];

  for (const line of String(sideSection || '').split('\n')) {
    if (!line.trim().startsWith('-')) continue;
    side.push(...splitLineToItems(line));
  }
  for (const line of String(mainSection || '').split('\n')) {
    if (!line.trim().startsWith('-')) continue;
    main.push(...splitLineToItems(line));
  }

  return {
    commonSideDishes: Array.from(new Set(side)),
    commonMainItems: Array.from(new Set(main))
  };
}

module.exports = {
  loadLexiconFromContracts
};

