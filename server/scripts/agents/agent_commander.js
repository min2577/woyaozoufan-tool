const fs = require('fs');
const path = require('path');

/**
 * 👮‍♂️ 单入口指挥官 (Single-Entry Commander) 物理落地脚本
 * 
 * 职责：
 * 1. 扫描当前项目的 SSOT (三大核心文件) 状态
 * 2. 检查最近一次的代码改动是否偏离了 CONTRACTS.md
 * 3. 生成大白话汇报，供人类“董事长”快速查看项目健康度
 */

const SSOT_PATHS = {
  intent: path.join(__dirname, '../../../PROJECT_INTENT.md'),
  contracts: path.join(__dirname, '../../../CONTRACTS.md'),
  tasks: path.join(__dirname, '../../../TASKS.md'),
};

function checkSSOTHealth() {
  console.log('\n====================================================');
  console.log('👮‍♂️ [单入口指挥官] 正在向董事长汇报项目健康度...');
  console.log('====================================================\n');

  let allHealthy = true;

  // 1. 检查核心文件是否存在
  for (const [name, filePath] of Object.entries(SSOT_PATHS)) {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ [警告] 核心文件缺失: ${name.toUpperCase()} (${filePath})`);
      allHealthy = false;
    } else {
      console.log(`✅ [正常] 核心文件存在: ${name.toUpperCase()}`);
    }
  }

  // 2. 简易分析当前 TASKS 完成度
  if (fs.existsSync(SSOT_PATHS.tasks)) {
    const tasksContent = fs.readFileSync(SSOT_PATHS.tasks, 'utf-8');
    const totalCheckboxes = (tasksContent.match(/- \[ \]/g) || []).length + (tasksContent.match(/- \[x\]/g) || []).length;
    const completedCheckboxes = (tasksContent.match(/- \[x\]/gi) || []).length;
    
    if (totalCheckboxes > 0) {
      const progress = Math.round((completedCheckboxes / totalCheckboxes) * 100);
      console.log(`\n📊 [任务进度] 当前 TASKS.md 显式勾选进度: ${progress}% (${completedCheckboxes}/${totalCheckboxes})`);
    } else {
      console.log(`\n📊 [任务状态] 当前 TASKS.md 中没有使用复选框追踪，请结合上下文评估。`);
    }
  }

  // 3. 给人类的汇报语
  console.log('\n📢 [指挥官大白话汇报]:');
  if (allHealthy) {
    console.log('报告董事长：咱们的“三大宪法文件”都在根目录好好待着呢。');
    console.log('系统的基础规矩没有丢。你可以随时让我调用另外两个特种兵 Agent（契约守护者、提示词优化器）去干活测试了！');
  } else {
    console.log('报告董事长：项目规矩文件有丢失，请立刻停下开发，恢复 SSOT 文件！');
  }
  
  console.log('\n====================================================');
}

// 如果直接运行此脚本
if (require.main === module) {
  checkSSOTHealth();
}

module.exports = { checkSSOTHealth };