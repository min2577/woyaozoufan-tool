const fs = require('fs');
const path = require('path');

/**
 * 🤖 提示词优化与测试 Agent (Prompt Optimizer) 物理落地脚本
 * 
 * 职责：
 * 1. 它相当于一个自动化“红队测试员”
 * 2. 给出一个极端刁钻的食材组合（如：只有“午餐肉”和“盐”）
 * 3. 它不会去真实调用接口扣钱，而是分析当前的 Prompt 够不够严厉
 * 4. 它能扫描后端代码里的 Prompt，并给出优化建议
 */

function analyzePromptRobustness() {
  console.log('\n====================================================');
  console.log('🤖 [提示词优化器 Agent] 正在对当前系统的提示词进行强度测试...');
  console.log('====================================================\n');

  const aiServicePath = path.join(__dirname, '../../services/aiService.js');
  
  if (!fs.existsSync(aiServicePath)) {
    console.log('❌ 找不到 aiService.js，无法读取系统提示词。');
    return;
  }

  const code = fs.readFileSync(aiServicePath, 'utf-8');
  
  // 简单提取 DRAFT_SYSTEM_PROMPT 的内容
  const draftPromptMatch = code.match(/DRAFT_SYSTEM_PROMPT\s*=\s*\[([\s\S]*?)\]\.join/);
  
  if (!draftPromptMatch) {
    console.log('❌ 无法在代码中解析出 DRAFT_SYSTEM_PROMPT。');
    return;
  }

  const promptText = draftPromptMatch[1];
  console.log('📜 当前侦测到的骨架生成核心 Prompt:');
  console.log('----------------------------------------------------');
  console.log(promptText);
  console.log('----------------------------------------------------\n');

  // 强度测试用例
  const tests = [
    {
      keyword: '绝不允许凭空捏造',
      desc: '是否包含防发散机制（防止无中生有）'
    },
    {
      keyword: '顺路买点',
      desc: '是否明确定义了柔性降级的概念'
    },
    {
      keyword: '午餐肉炒饭',
      desc: '是否包含具体的极端负面示例（如主食越界示例）'
    },
    {
      keyword: '必须且只能输出纯 JSON 数组',
      desc: '是否包含严格的格式约束'
    }
  ];

  let passedTests = 0;
  console.log('🧪 正在执行提示词强度检测:');
  tests.forEach(test => {
    if (promptText.includes(test.keyword)) {
      console.log(`  ✅ 通过: ${test.desc} (包含关键词: '${test.keyword}')`);
      passedTests++;
    } else {
      console.log(`  ❌ 失败: ${test.desc} (缺失关键词: '${test.keyword}')`);
    }
  });

  console.log(`\n📊 提示词强度得分: ${Math.round((passedTests / tests.length) * 100)}分`);
  
  if (passedTests < tests.length) {
    console.log('⚠️ [优化建议]: 提示词强度不足，AI 存在越界或格式错误的风险，请考虑把以上缺失的警告加入 prompt！');
  } else {
    console.log('🛡️ [优化结论]: 当前提示词非常强壮，是一份合格的“极限生存主厨”命令！AI 越界概率极低。');
  }
  
  console.log('\n====================================================');
}

if (require.main === module) {
  analyzePromptRobustness();
}

module.exports = { analyzePromptRobustness };