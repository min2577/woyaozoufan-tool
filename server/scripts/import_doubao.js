const dbService = require('../lib/db');
const { validateRecipeContract, recipeToDbUpdateFields } = require('../utils/recipeContractV0005');

const doubaoRecipes = [
  {
    id: "doubao-001",
    name: "腊肉焖饭",
    description: "饭菜一锅出，腊香浸透米饭",
    difficulty: "简单",
    cookTime: "35 分钟",
    servings: "1-2 人份",
    calories: 450,
    mainIngredients: ["大米", "农家腊肉"],
    requiredSeasonings: ["食用油", "生抽", "老抽", "料酒", "葱", "生姜"],
    optionalSeasonings: ["胡椒粉"],
    originalTools: ["电饭煲", "炒锅"],
    allIngredients: [
      { name: "大米", amount: "200g", note: "", isRequired: true },
      { name: "农家腊肉", amount: "150g", note: "", isRequired: true },
      { name: "食用油", amount: "5ml", note: "", isRequired: true },
      { name: "生抽", amount: "10ml", note: "", isRequired: true },
      { name: "老抽", amount: "3ml", note: "调色", isRequired: true },
      { name: "料酒", amount: "5ml", note: "去腥", isRequired: true },
      { name: "葱", amount: "1根", note: "", isRequired: true },
      { name: "生姜", amount: "3片", note: "", isRequired: true },
      { name: "胡椒粉", amount: "1g", note: "", isRequired: false }
    ],
    steps: [
      { step: 1, stage: "准备", action: "淘洗大米", heat: "无", time: "2 分钟", sensory: "大米洗净", fullText: "大米淘洗干净；腊肉切薄片；葱切葱花，姜切丝。" },
      { step: 2, stage: "烹饪", action: "煸炒腊肉", heat: "中火", time: "3 分钟", sensory: "出油爆香", fullText: "炒锅放少许油，下腊肉煸炒出油，加姜丝、料酒爆香。" },
      { step: 3, stage: "烹饪", action: "混合煮饭", heat: "无", time: "30 分钟", sensory: "煮熟", fullText: "将腊肉和调料与大米混合，加正常煮饭水量，电饭煲按煮饭键。" },
      { step: 4, stage: "装盘", action: "焖拌", heat: "无", time: "10 分钟", sensory: "拌匀", fullText: "煮好焖 10 分钟，撒葱花、胡椒粉拌匀即可。" }
    ],
    tips: "腊肉本身很咸，不要再加盐。",
    category: "立即下厨",
    note: "可直接做；厨具已适配：按你现有的电饭煲调整做法",
    totalWeight: 1000,
    cookedCount: 0
  },
  {
    id: "doubao-002",
    name: "清蒸腊肉",
    description: "保留原味，肥而不腻，做法极简",
    difficulty: "简单",
    cookTime: "30 分钟",
    servings: "1-2 人份",
    calories: 300,
    mainIngredients: ["农家腊肉"],
    requiredSeasonings: ["料酒", "生姜", "生抽", "醋", "大蒜"],
    optionalSeasonings: ["香油", "香菜"],
    originalTools: ["蒸锅"],
    allIngredients: [
      { name: "农家腊肉", amount: "200g", note: "", isRequired: true },
      { name: "料酒", amount: "10ml", note: "去腥", isRequired: true },
      { name: "生姜", amount: "5片", note: "", isRequired: true },
      { name: "生抽", amount: "15ml", note: "蘸料", isRequired: true },
      { name: "醋", amount: "5ml", note: "蘸料", isRequired: true },
      { name: "大蒜", amount: "3瓣", note: "", isRequired: true },
      { name: "香油", amount: "3ml", note: "", isRequired: false },
      { name: "香菜", amount: "1根", note: "", isRequired: false }
    ],
    steps: [
      { step: 1, stage: "准备", action: "腊肉装盘", heat: "无", time: "2 分钟", sensory: "准备就绪", fullText: "腊肉洗净，整块或切片装盘，放姜片、淋料酒。" },
      { step: 2, stage: "烹饪", action: "蒸制", heat: "大火", time: "25 分钟", sensory: "变软出油", fullText: "蒸锅水烧开，大火蒸 25 分钟至腊肉变软出油。" },
      { step: 3, stage: "准备", action: "调蘸料", heat: "无", time: "2 分钟", sensory: "蘸料完成", fullText: "大蒜切末，加生抽、醋、香油、香菜调成蘸料。" },
      { step: 4, stage: "装盘", action: "取出切片", heat: "无", time: "1 分钟", sensory: "完成", fullText: "腊肉取出切片，蘸料食用，蒸出的腊油可留用炒菜。" }
    ],
    tips: "整块蒸更锁汁，切片蒸更入味。",
    category: "立即下厨",
    note: "可直接做；厨具已适配：按你现有的蒸锅调整做法",
    totalWeight: 1000,
    cookedCount: 0
  },
  {
    id: "doubao-003",
    name: "清炒腊肉片",
    description: "腊香浓郁，下饭神器，操作简单",
    difficulty: "简单",
    cookTime: "15 分钟",
    servings: "1-2 人份",
    calories: 400,
    mainIngredients: ["农家腊肉"],
    requiredSeasonings: ["食用油", "料酒", "生抽", "葱", "生姜", "大蒜", "胡椒粉"],
    optionalSeasonings: ["鸡精"],
    originalTools: ["炒锅"],
    allIngredients: [
      { name: "农家腊肉", amount: "200g", note: "", isRequired: true },
      { name: "食用油", amount: "10ml", note: "", isRequired: true },
      { name: "料酒", amount: "10ml", note: "", isRequired: true },
      { name: "生抽", amount: "10ml", note: "", isRequired: true },
      { name: "葱", amount: "1根", note: "", isRequired: true },
      { name: "生姜", amount: "3片", note: "", isRequired: true },
      { name: "大蒜", amount: "3瓣", note: "", isRequired: true },
      { name: "胡椒粉", amount: "1g", note: "", isRequired: true },
      { name: "鸡精", amount: "2g", note: "", isRequired: false }
    ],
    steps: [
      { step: 1, stage: "准备", action: "泡软切片", heat: "无", time: "5 分钟", sensory: "切好备用", fullText: "腊肉温水泡 5 分钟去咸，切薄片；葱姜蒜切好备用。" },
      { step: 2, stage: "烹饪", action: "煸炒腊肉", heat: "中火", time: "3 分钟", sensory: "出油爆香", fullText: "炒锅烧热倒油，下腊肉煸炒出油，加葱姜蒜、料酒爆香。" },
      { step: 3, stage: "烹饪", action: "加调料", heat: "中火", time: "2 分钟", sensory: "味道融合", fullText: "加生抽、胡椒粉翻炒均匀，让味道融合。" },
      { step: 4, stage: "装盘", action: "撒葱花", heat: "无", time: "1 分钟", sensory: "出锅", fullText: "撒葱花、鸡精，翻炒后出锅。" }
    ],
    tips: "多煸出油脂，吃起来更清爽不腻。",
    category: "立即下厨",
    note: "可直接做；厨具已适配：按你现有的炒锅调整做法",
    totalWeight: 1000,
    cookedCount: 0
  },
  {
    id: "doubao-004",
    name: "腊肉粥",
    description: "清淡暖胃，适合早餐或夜宵",
    difficulty: "简单",
    cookTime: "40 分钟",
    servings: "1-2 人份",
    calories: 250,
    mainIngredients: ["大米", "农家腊肉"],
    requiredSeasonings: ["盐", "胡椒粉", "葱", "生姜"],
    optionalSeasonings: ["香菜", "香油"],
    originalTools: ["电饭煲"],
    allIngredients: [
      { name: "大米", amount: "100g", note: "", isRequired: true },
      { name: "农家腊肉", amount: "80g", note: "", isRequired: true },
      { name: "盐", amount: "2g", note: "少量", isRequired: true },
      { name: "胡椒粉", amount: "1g", note: "", isRequired: true },
      { name: "葱", amount: "1根", note: "", isRequired: true },
      { name: "生姜", amount: "2片", note: "", isRequired: true },
      { name: "香菜", amount: "1根", note: "", isRequired: false },
      { name: "香油", amount: "3ml", note: "", isRequired: false }
    ],
    steps: [
      { step: 1, stage: "准备", action: "处理食材", heat: "无", time: "3 分钟", sensory: "切好备用", fullText: "大米淘洗；腊肉切小丁；葱姜香菜切好。" },
      { step: 2, stage: "烹饪", action: "煮粥", heat: "大火", time: "30 分钟", sensory: "煮至半稠", fullText: "大米加水加姜丝，电饭煲煮粥档煮至半稠。" },
      { step: 3, stage: "烹饪", action: "加腊肉", heat: "中火", time: "5 分钟", sensory: "腊肉熟透", fullText: "放入腊肉丁，再煮 5 分钟至腊肉熟透。" },
      { step: 4, stage: "装盘", action: "调味", heat: "无", time: "1 分钟", sensory: "完成", fullText: "加盐、胡椒粉，撒葱花、香菜，淋香油即可。" }
    ],
    tips: "腊肉含盐，盐一定要少放。",
    category: "立即下厨",
    note: "可直接做；厨具已适配：按你现有的电饭煲调整做法",
    totalWeight: 1000,
    cookedCount: 0
  },
  {
    id: "doubao-005",
    name: "香辣腊肉丁",
    description: "麻辣开胃，重口下饭，越嚼越香",
    difficulty: "中等",
    cookTime: "20 分钟",
    servings: "1-2 人份",
    calories: 450,
    mainIngredients: ["农家腊肉"],
    requiredSeasonings: ["食用油", "料酒", "生抽", "豆瓣酱", "干辣椒", "花椒", "辣椒粉", "葱", "大蒜", "糖"],
    optionalSeasonings: ["鸡精"],
    originalTools: ["炒锅"],
    allIngredients: [
      { name: "农家腊肉", amount: "200g", note: "", isRequired: true },
      { name: "食用油", amount: "15ml", note: "", isRequired: true },
      { name: "料酒", amount: "10ml", note: "", isRequired: true },
      { name: "生抽", amount: "10ml", note: "", isRequired: true },
      { name: "豆瓣酱", amount: "10g", note: "剁碎", isRequired: true },
      { name: "干辣椒", amount: "5个", note: "剪段", isRequired: true },
      { name: "花椒", amount: "3g", note: "", isRequired: true },
      { name: "辣椒粉", amount: "3g", note: "", isRequired: true },
      { name: "葱", amount: "1根", note: "", isRequired: true },
      { name: "大蒜", amount: "4瓣", note: "", isRequired: true },
      { name: "糖", amount: "3g", note: "提鲜", isRequired: true },
      { name: "鸡精", amount: "2g", note: "", isRequired: false }
    ],
    steps: [
      { step: 1, stage: "准备", action: "泡切食材", heat: "无", time: "5 分钟", sensory: "切好备用", fullText: "腊肉切小丁，温水泡去咸味；干辣椒剪段，葱姜蒜切好。" },
      { step: 2, stage: "烹饪", action: "煸炒腊肉", heat: "中火", time: "4 分钟", sensory: "出油", fullText: "炒锅倒油，下腊肉丁煸干出油，盛出备用。" },
      { step: 3, stage: "烹饪", action: "炒红油", heat: "小火", time: "2 分钟", sensory: "炒出红油", fullText: "留底油，小火炒香豆瓣酱、干辣椒、花椒，炒出红油。" },
      { step: 4, stage: "烹饪", action: "混合翻炒", heat: "中火", time: "3 分钟", sensory: "炒匀", fullText: "倒回腊肉丁，加料酒、生抽、糖、蒜末、辣椒粉炒匀。" },
      { step: 5, stage: "装盘", action: "出锅", heat: "无", time: "1 分钟", sensory: "完成", fullText: "撒葱花，出锅装盘。" }
    ],
    tips: "豆瓣酱很咸，全程不用额外加盐。",
    category: "立即下厨",
    note: "可直接做；厨具已适配：按你现有的炒锅调整做法",
    totalWeight: 1000,
    cookedCount: 0
  },
  {
    id: "doubao-006",
    name: "腊肉炒青椒",
    description: "青椒清爽解腻，腊肉咸香入味",
    difficulty: "简单",
    cookTime: "15 分钟",
    servings: "1-2 人份",
    calories: 350,
    mainIngredients: ["农家腊肉", "青椒"],
    requiredSeasonings: ["食用油", "料酒", "生抽", "葱", "姜", "蒜"],
    optionalSeasonings: ["鸡精"],
    originalTools: ["炒锅"],
    allIngredients: [
      { name: "农家腊肉", amount: "150g", note: "", isRequired: true },
      { name: "青椒", amount: "2个", note: "", isRequired: true },
      { name: "食用油", amount: "10ml", note: "", isRequired: true },
      { name: "料酒", amount: "5ml", note: "", isRequired: true },
      { name: "生抽", amount: "10ml", note: "", isRequired: true },
      { name: "葱", amount: "1根", note: "", isRequired: true },
      { name: "姜", amount: "3片", note: "", isRequired: true },
      { name: "蒜", amount: "2瓣", note: "", isRequired: true },
      { name: "鸡精", amount: "2g", note: "", isRequired: false }
    ],
    steps: [
      { step: 1, stage: "准备", action: "切配", heat: "无", time: "3 分钟", sensory: "切好备用", fullText: "腊肉切片，青椒切块。" },
      { step: 2, stage: "烹饪", action: "煸炒", heat: "中火", time: "3 分钟", sensory: "爆香", fullText: "腊肉下锅煸出油，加葱姜蒜、料酒爆香。" },
      { step: 3, stage: "烹饪", action: "炒青椒", heat: "大火", time: "2 分钟", sensory: "断生", fullText: "下青椒大火快炒至断生。" },
      { step: 4, stage: "装盘", action: "调味出锅", heat: "中火", time: "1 分钟", sensory: "炒匀出锅", fullText: "加少许生抽调味，翻炒均匀出锅。" }
    ],
    tips: "趁热食用口感更佳",
    category: "顺路买点",
    note: "顺路买点青椒即可做；厨具已适配：按你现有的炒锅调整做法",
    totalWeight: 500,
    cookedCount: 0
  },
  {
    id: "doubao-007",
    name: "腊肉炒蒜薹",
    description: "蒜薹脆嫩，腊香十足，超级下饭",
    difficulty: "简单",
    cookTime: "18 分钟",
    servings: "1-2 人份",
    calories: 380,
    mainIngredients: ["农家腊肉", "蒜薹"],
    requiredSeasonings: ["食用油", "料酒", "生抽", "盐"],
    optionalSeasonings: [],
    originalTools: ["炒锅"],
    allIngredients: [
      { name: "农家腊肉", amount: "150g", note: "", isRequired: true },
      { name: "蒜薹", amount: "200g", note: "", isRequired: true },
      { name: "食用油", amount: "10ml", note: "", isRequired: true },
      { name: "料酒", amount: "5ml", note: "", isRequired: true },
      { name: "生抽", amount: "10ml", note: "", isRequired: true },
      { name: "盐", amount: "1g", note: "少量", isRequired: true }
    ],
    steps: [
      { step: 1, stage: "准备", action: "切配", heat: "无", time: "3 分钟", sensory: "切好备用", fullText: "蒜薹切段，腊肉切片。" },
      { step: 2, stage: "烹饪", action: "煸炒", heat: "中火", time: "3 分钟", sensory: "出油去腥", fullText: "腊肉煸香出油，加料酒去腥。" },
      { step: 3, stage: "烹饪", action: "炒蒜薹", heat: "中火", time: "4 分钟", sensory: "变软熟透", fullText: "下蒜薹中火炒至变软熟透。" },
      { step: 4, stage: "装盘", action: "调味出锅", heat: "无", time: "1 分钟", sensory: "出锅", fullText: "加少许生抽、极少量盐调味出锅。" }
    ],
    tips: "趁热食用口感更佳",
    category: "顺路买点",
    note: "顺路买点蒜薹即可做；厨具已适配：按你现有的炒锅调整做法",
    totalWeight: 500,
    cookedCount: 0
  },
  {
    id: "doubao-008",
    name: "腊肉炒蒜苗",
    description: "蒜苗香气浓，和腊肉是经典搭配",
    difficulty: "简单",
    cookTime: "15 分钟",
    servings: "1-2 人份",
    calories: 360,
    mainIngredients: ["农家腊肉", "蒜苗"],
    requiredSeasonings: ["食用油", "料酒", "生抽", "姜", "蒜"],
    optionalSeasonings: [],
    originalTools: ["炒锅"],
    allIngredients: [
      { name: "农家腊肉", amount: "150g", note: "", isRequired: true },
      { name: "蒜苗", amount: "200g", note: "", isRequired: true },
      { name: "食用油", amount: "10ml", note: "", isRequired: true },
      { name: "料酒", amount: "5ml", note: "", isRequired: true },
      { name: "生抽", amount: "10ml", note: "", isRequired: true },
      { name: "姜", amount: "2片", note: "", isRequired: true },
      { name: "蒜", amount: "2瓣", note: "", isRequired: true }
    ],
    steps: [
      { step: 1, stage: "准备", action: "切配", heat: "无", time: "3 分钟", sensory: "切好备用", fullText: "蒜苗切段，腊肉切片。" },
      { step: 2, stage: "烹饪", action: "煸炒", heat: "中火", time: "3 分钟", sensory: "炒香", fullText: "腊肉煸出油，加姜蒜、料酒炒香。" },
      { step: 3, stage: "烹饪", action: "炒蒜苗", heat: "大火", time: "2 分钟", sensory: "断生", fullText: "下蒜苗大火快炒至断生。" },
      { step: 4, stage: "装盘", action: "调味出锅", heat: "无", time: "1 分钟", sensory: "出锅", fullText: "加生抽调味，翻炒均匀即可。" }
    ],
    tips: "趁热食用口感更佳",
    category: "顺路买点",
    note: "顺路买点蒜苗即可做；厨具已适配：按你现有的炒锅调整做法",
    totalWeight: 500,
    cookedCount: 0
  },
  {
    id: "doubao-009",
    name: "腊肉炒土豆丝",
    description: "土豆丝脆爽，腊肉增香，家常快手菜",
    difficulty: "简单",
    cookTime: "18 分钟",
    servings: "1-2 人份",
    calories: 400,
    mainIngredients: ["农家腊肉", "土豆"],
    requiredSeasonings: ["食用油", "料酒", "生抽", "醋", "葱", "盐"],
    optionalSeasonings: [],
    originalTools: ["炒锅"],
    allIngredients: [
      { name: "农家腊肉", amount: "100g", note: "", isRequired: true },
      { name: "土豆", amount: "1个", note: "", isRequired: true },
      { name: "食用油", amount: "10ml", note: "", isRequired: true },
      { name: "料酒", amount: "5ml", note: "", isRequired: true },
      { name: "生抽", amount: "10ml", note: "", isRequired: true },
      { name: "醋", amount: "5ml", note: "", isRequired: true },
      { name: "葱", amount: "1根", note: "", isRequired: true },
      { name: "盐", amount: "1g", note: "少量", isRequired: true }
    ],
    steps: [
      { step: 1, stage: "准备", action: "切丝泡水", heat: "无", time: "5 分钟", sensory: "去淀粉", fullText: "土豆切细丝泡水去淀粉，腊肉切丝。" },
      { step: 2, stage: "烹饪", action: "炒腊肉", heat: "中火", time: "3 分钟", sensory: "出油", fullText: "腊肉炒香出油，加葱花、料酒。" },
      { step: 3, stage: "烹饪", action: "炒土豆丝", heat: "大火", time: "3 分钟", sensory: "脆感", fullText: "下土豆丝大火快炒，加少许醋保持脆感。" },
      { step: 4, stage: "装盘", action: "调味出锅", heat: "无", time: "1 分钟", sensory: "炒匀出锅", fullText: "加生抽、少量盐调味，炒匀出锅。" }
    ],
    tips: "趁热食用口感更佳",
    category: "顺路买点",
    note: "顺路买点土豆即可做；厨具已适配：按你现有的炒锅调整做法",
    totalWeight: 500,
    cookedCount: 0
  },
  {
    id: "doubao-010",
    name: "腊肉炒豆角",
    description: "豆角吸满腊汁，干香下饭",
    difficulty: "中等",
    cookTime: "25 分钟",
    servings: "1-2 人份",
    calories: 380,
    mainIngredients: ["农家腊肉", "豆角"],
    requiredSeasonings: ["食用油", "料酒", "生抽", "姜", "蒜", "盐"],
    optionalSeasonings: [],
    originalTools: ["炒锅"],
    allIngredients: [
      { name: "农家腊肉", amount: "150g", note: "", isRequired: true },
      { name: "豆角", amount: "200g", note: "", isRequired: true },
      { name: "食用油", amount: "10ml", note: "", isRequired: true },
      { name: "料酒", amount: "5ml", note: "", isRequired: true },
      { name: "生抽", amount: "10ml", note: "", isRequired: true },
      { name: "姜", amount: "2片", note: "", isRequired: true },
      { name: "蒜", amount: "2瓣", note: "", isRequired: true },
      { name: "盐", amount: "1g", note: "极少量", isRequired: true }
    ],
    steps: [
      { step: 1, stage: "准备", action: "切配", heat: "无", time: "3 分钟", sensory: "切好备用", fullText: "豆角摘段，腊肉切片。" },
      { step: 2, stage: "烹饪", action: "炒腊肉", heat: "中火", time: "3 分钟", sensory: "出油", fullText: "腊肉煸香出油，加姜蒜、料酒。" },
      { step: 3, stage: "烹饪", action: "焖豆角", heat: "中火", time: "10 分钟", sensory: "熟透", fullText: "下豆角翻炒，加少量清水焖至熟透。" },
      { step: 4, stage: "装盘", action: "收汁出锅", heat: "大火", time: "2 分钟", sensory: "收干汁", fullText: "加生抽调味，大火收干汁出锅。" }
    ],
    tips: "豆角必须彻底炒熟，否则容易中毒",
    category: "顺路买点",
    note: "顺路买点豆角即可做；厨具已适配：按你现有的炒锅调整做法",
    totalWeight: 500,
    cookedCount: 0
  }
];

function run() {
  let inserted = 0;
  for (const recipe of doubaoRecipes) {
    // 1. 验证契约
    const { ok, errors } = validateRecipeContract(recipe);
    if (!ok) {
      console.error(`验证失败 [${recipe.name}]:`, errors);
      continue;
    }

    // 2. 转换数据
    const fields = recipeToDbUpdateFields(recipe, false);
    
    try {
      // 3. 检查是否已存在
      const existing = dbService.get('SELECT id FROM StandardRecipes WHERE name = ?', [recipe.name]);
      
      if (existing) {
        // 更新
        const setClause = Object.keys(fields).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(fields), existing.id];
        dbService.run(`UPDATE StandardRecipes SET ${setClause}, updatedAt = datetime('now') WHERE id = ?`, values);
        console.log(`更新成功: ${recipe.name}`);
      } else {
        // 插入
        const cols = ['id', ...Object.keys(fields)];
        const placeholders = cols.map(() => '?').join(', ');
        const values = [recipe.id, ...Object.values(fields)];
        
        dbService.run(`INSERT INTO StandardRecipes (${cols.join(', ')}) VALUES (${placeholders})`, values);
        console.log(`插入成功: ${recipe.name}`);
      }
      inserted++;
    } catch (err) {
      console.error(`写入数据库失败 [${recipe.name}]:`, err.message);
    }
  }
  
  console.log(`完成: 成功导入/更新 ${inserted} 个菜谱`);
}

run();
