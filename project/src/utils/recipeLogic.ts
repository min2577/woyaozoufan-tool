export const SEASONINGS = [
  // 基础调味料
  '食用油', '盐', '糖', '生抽', '老抽', '料酒', '醋', '蚝油', '豆瓣酱',
  // 香料
  '胡椒粉', '花椒', '八角', '桂皮', '香叶', '干辣椒', '辣椒粉',
  // 增香
  '葱', '生姜', '大蒜', '香菜', '香油',
  // 其他
  '淀粉', '鸡精', '味精'
];

export type SeasoningCategory = '基础调味' | '香料' | '增香' | '其他';
export const SEASONING_CATEGORIES: Record<SeasoningCategory, string[]> = {
  '基础调味': ['食用油', '盐', '糖', '生抽', '老抽', '料酒', '醋', '蚝油', '豆瓣酱', '酱油', '白糖', '红糖', '冰糖', '蜂蜜', '麦芽糖', '果糖', '木糖醇', '阿斯巴甜', '甜蜜素', '安赛蜜', '糖精', '食盐', '海盐', '岩盐', '湖盐', '井盐', '竹盐', '低钠盐', '加碘盐', '无碘盐', '粗盐', '细盐', '精盐', '食用盐', '工业盐', '亚硝酸钠', '氯化钠', '氯化钾', '氯化铵', '碘化钾', '碘酸钾', '亚铁氰化钾', '柠檬酸铁铵', '硫酸亚铁', '硫酸铜', '硫酸镁', '硫酸钙', '碳酸钙', '碳酸钠', '碳酸氢钠', '氢氧化钠', '氢氧化钾', '氧化钙', '氧化镁', '氧化铝', '氧化铁', '氧化铜', '氧化锌', '氧化镁', '氧化钙', '氧化铝', '氧化铁', '氧化铜', '氧化锌', '氧化镁', '氧化钙', '氧化铝', '氧化铁', '氧化铜', '氧化锌'],
  '香料': ['胡椒粉', '花椒', '八角', '桂皮', '香叶', '干辣椒', '辣椒粉', '花椒粉', '八角粉', '桂皮粉', '香叶粉', '干辣椒粉', '辣椒粉', '黑胡椒粉', '白胡椒粉', '绿胡椒粉', '红胡椒粉', '花椒粒', '花椒油', '八角油', '桂皮油', '香叶油', '辣椒油', '辣椒面', '辣椒碎', '辣椒圈', '辣椒段', '辣椒丝', '辣椒末', '辣椒籽', '花椒籽', '八角籽', '桂皮籽', '香叶籽', '干辣椒籽', '辣椒粉籽', '黑胡椒籽', '白胡椒籽', '绿胡椒籽', '红胡椒籽', '花椒籽', '八角籽', '桂皮籽', '香叶籽', '干辣椒籽', '辣椒粉籽', '黑胡椒籽', '白胡椒籽', '绿胡椒籽', '红胡椒籽'],
  '增香': ['葱', '生姜', '大蒜', '香菜', '香油', '芝麻油', '花生油', '大豆油', '玉米油', '菜籽油', '橄榄油', '葵花籽油', '棕榈油', '椰子油', '亚麻籽油', '紫苏籽油', '核桃油', '杏仁油', '腰果油', '南瓜籽油', '葡萄籽油', '茶树油', '橄榄油', '亚麻籽油', '紫苏籽油', '核桃油', '杏仁油', '腰果油', '南瓜籽油', '葡萄籽油', '茶树油', '橄榄油', '亚麻籽油', '紫苏籽油', '核桃油', '杏仁油', '腰果油', '南瓜籽油', '葡萄籽油', '茶树油'],
  '其他': ['淀粉', '鸡精', '味精', '玉米淀粉', '土豆淀粉', '红薯淀粉', '豌豆淀粉', '木薯淀粉', '葛根粉', '小麦淀粉', '大米淀粉', '绿豆淀粉', '蚕豆淀粉', '百合粉', '山药粉', '藕粉', '荸荠粉', '菱角粉', '茨菇粉', '茭白粉', '慈姑粉', '豆瓣菜粉', '西洋菜粉', '莼菜粉', '马兰头粉', '枸杞头粉', '香椿粉', '蕨菜粉', '薇菜粉', '蒲公英粉', '荠菜粉', '苦菜粉', '马齿苋粉', '空心菜粉', '莙荙菜粉', '落葵粉', '紫背天葵粉', '血皮菜粉', '观音菜粉', '韭菜花粉', '蒜苔粉', '蒜黄粉', '韭黄粉', '洋葱苗粉', '小葱粉', '大葱粉', '香菜粉', '芹菜叶粉', '莴笋叶粉', '萝卜叶粉', '白菜帮粉', '白菜心粉', '油菜粉', '上海青粉', '鸡毛菜粉', '奶白菜粉', '娃娃菜粉', '菜薹粉', '芥蓝薹粉', '紫菜薹粉', '菜心薹粉', '西兰花薹粉', '花椰菜薹粉', '玉米须粉', '玉米叶粉', '玉米芯粉', '竹笋壳粉', '笋衣粉', '笋干粉', '木耳粉', '银耳粉', '香菇粉', '平菇粉', '金针菇粉', '杏鲍菇粉', '口蘑粉', '茶树菇粉', '鸡腿菇粉', '白玉菇粉', '蟹味菇粉', '秀珍菇粉', '草菇粉', '猴头菇粉', '竹荪粉', '松茸粉', '松露粉', '羊肚菌粉', '牛肝菌粉', '鸡枞菌粉', '鸡油菌粉', '干贝粉', '虾米粉', '虾皮粉', '海米粉', '鱿鱼干粉', '墨鱼干粉', '海参干粉', '鲍鱼干粉', '鱼干粉', '虾干粉', '贝干粉', '螺干粉', '蛎干粉', '蛏干粉', '蛤干粉', '蚶干粉', '扇贝干粉', '瑶柱粉', '淡菜粉', '海虹粉', '海胆粉', '海星粉', '海参粉', '鲍鱼粉', '鱼翅粉', '燕窝粉', '雪蛤粉', '鹿鞭粉', '鹿茸粉', '熊掌粉', '猴脑粉', '象拔粉', '鱼唇粉', '鱼肚粉', '鱼胶粉', '鱼翅粉', '燕窝粉', '雪蛤粉', '鹿鞭粉', '鹿茸粉', '熊掌粉', '猴脑粉', '象拔粉', '鱼唇粉', '鱼肚粉', '鱼胶粉']
};

export type WeightedItem = {
  name: string;
  baseWeight: number;
  userClickCount: number;
};

export type WeightedToolItem = {
  id: string;
  label: string;
  emoji: string;
  baseWeight: number;
  userClickCount: number;
};

export const DEFAULT_BASE_WEIGHT = 10;

export const SEASONING_BASE_WEIGHT: Record<string, number> = {
  '食用油': 1300,
  '盐': 1200,
  '糖': 1100,
  '白糖': 1100,
  '白砂糖': 1100,
  '细砂糖': 1100,
  '绵白糖': 1100,
  '红糖': 1050,
  '冰糖': 1050,
  '生抽': 820,
  '老抽': 780,
  '酱油': 760,
  '醋': 720,
  '料酒': 720,
  '蚝油': 700,
  '豆瓣酱': 680,
  '郫县豆瓣酱': 680,
  '胡椒粉': 520,
  '花椒': 520,
  '花椒粉': 520,
  '辣椒': 520,
  '干辣椒': 500,
  '辣椒粉': 500,
  '八角': 420,
  '桂皮': 420,
  '香叶': 420,
  '淀粉': 380,
  '香油': 360,
  '芝麻油': 360,
  '葱': 340,
  '生姜': 340,
  '大蒜': 340,
  '香菜': 300,
  '鸡精': 260,
  '味精': 240,
};

export const INGREDIENT_BASE_WEIGHT: Record<string, number> = {
  '猪肉': 950,
  '牛肉': 900,
  '羊肉': 820,
  '鸡肉': 820,
  '鸭肉': 760,
  '鸡蛋': 900,
  '米饭': 700,
  '米': 680,
  '面条': 640,
  '面粉': 620,
  '土豆': 680,
  '番茄': 650,
  '豆腐': 650,
  '洋葱': 520,
  '青椒': 520,
  '辣椒': 520,
  '蘑菇': 480,
  '黑木耳': 420,
};

export const TOOL_BASE_WEIGHT: Record<string, number> = {
  'wok': 1000,
  'induction': 800,
  'steamer': 720,
  'rice-cooker': 700,
  'pressure-cooker': 650,
  'oven': 580,
  'air-fryer': 560,
  'microwave': 520,
  'blender': 420,
  'slow-cooker': 380,
  'grill': 300,
};

export const BANNED_INGREDIENTS = [
  '洁厕灵', '消毒液', '水泥', '电池', '机油', '农药', '洗衣液', '玻璃胶', '酒精燃料', '胶水'
];

export const COMMON_INGREDIENTS = [
  '鸡蛋', '番茄', '米饭', '土豆', '鸡胸肉', '虾', '西兰花', '豆腐',
  '牛肉', '猪肉', '青菜', '白菜', '洋葱', '黄瓜', '胡萝卜', '玉米',
  '蘑菇', '黑木耳', '海带', '豆芽', '南瓜', '冬瓜', '茄子', '辣椒',
  '青椒', '鱼', '腊肠', '午餐肉', '豆类', '黑豆', '绿豆', '花豆',
  '馄饨', '面条', '面粉', '米', '糙米', '玉米粒', '豌豆', '毛豆'
];

export const ALL_INGREDIENTS = [
  ...COMMON_INGREDIENTS,
  '羊肉', '兔肉', '鸭肉', '鹅肉', '火鸡', '鸽肉',
  '青豆', '蚕豆', '红豆', '黑芝麻', '白芝麻',
  '香菜', '小葱', '大葱', '韭菜', '芹菜', '苦菜', '油菜',
  '生菜', '菠菜', '莴笋', '竹笋', '春笋', '冬笋',
  '荸荠', '芋头', '山药', '红薯', '紫薯', '洋芋',
  '番瓜', '丝瓜', '苦瓜', '冬瓜', '节瓜', '沙葛',
  '黄花菜', '银耳', '石耳', '雪耳', '鹿茸菜',
  '紫菜', '海带', '昆布', '鹿角菜', '海白菜',
  '番茄酱', '蚝油', '豆瓣酱', '腐乳', '咸菜',
  '黑木耳', '白木耳', '金针菜', '龙须菜', '芦笋'
];

export type IngredientCategory = '肉' | '菜' | '主食' | '水果' | '豆制品' | '其他';
export const INGREDIENT_CATEGORY_MAP: Record<IngredientCategory, string[]> = {
  '肉': ['牛肉','猪肉','鸡胸肉','鸡腿','五花肉','羊肉','鸭肉','鹅肉','火鸡','鸽肉','腊肠','午餐肉','兔肉','鱼头','虾','鸡翅','鸡腿肉','鸭腿肉','羊排','牛排','猪排','鱼肉','鱼片','鱼块','虾仁','蟹肉','贝类','鱿鱼','章鱼','海参','鲍鱼','螺肉'],
  '菜': ['番茄','西兰花','青菜','白菜','洋葱','黄瓜','胡萝卜','辣椒','青椒','蘑菇','黑木耳','海带','豆芽','南瓜','冬瓜','茄子','芹菜','韭菜','香菜','生菜','菠菜','莴笋','竹笋','春笋','冬笋','荸荠','芋头','山药','红薯','紫薯','洋芋','番瓜','丝瓜','苦瓜','节瓜','沙葛','黄花菜','银耳','石耳','雪耳','鹿茸菜','紫菜','昆布','鹿角菜','海白菜','金针菜','龙须菜','芦笋','空心菜','油麦菜','芥蓝','菜心','西蓝花','花椰菜','包菜','紫甘蓝','白萝卜','心里美萝卜','水萝卜','青萝卜','莲藕','菱角','茨菇','茭白','慈姑','豆瓣菜','西洋菜','莼菜','马兰头','枸杞头','香椿','蕨菜','薇菜','蒲公英','荠菜','苦菜','马齿苋','空心菜','莙荙菜','落葵','紫背天葵','血皮菜','观音菜','韭菜花','蒜苔','蒜黄','韭黄','洋葱苗','小葱','大葱','香菜','芹菜叶','莴笋叶','萝卜叶','白菜帮','白菜心','油菜','上海青','鸡毛菜','奶白菜','娃娃菜','菜薹','芥蓝薹','紫菜薹','菜心薹','西兰花薹','花椰菜薹'],
  '主食': ['米饭','米','糙米','面条','面粉','馄饨','玉米','玉米粒','豌豆','毛豆','豆类','黑豆','绿豆','花豆','面包','馒头','包子','饺子','馄饨','烧麦','粽子','汤圆','年糕','糍粑','发糕','马拉糕','松糕','糯米糕','小米','薏米','高粱米','燕麦','荞麦','大麦','青稞','黑麦','小麦','玉米面','玉米糁','燕麦片','荞麦面','莜面','高粱面','小米面','糯米','江米','紫米','黑米','红米','白米','香米','籼米','粳米','糯米粉','粘米粉','澄粉','小麦粉','高筋粉','中筋粉','低筋粉','全麦粉','黑麦粉','荞麦粉','燕麦粉','玉米淀粉','土豆淀粉','红薯淀粉','豌豆淀粉','木薯淀粉','葛根粉'],
  '水果': ['西瓜','蓝莓','香蕉','苹果','草莓','葡萄','橙子','柠檬','菠萝','梨','桃子','李子','杏子','樱桃','枣子','山楂','石榴','柚子','橘子','金桔','佛手柑','橙子','柠檬','柚子','葡萄柚','猕猴桃','芒果','榴莲','山竹','菠萝蜜','火龙果','荔枝','龙眼','桂圆','枇杷','杨桃','番石榴','百香果','释迦果','莲雾','红毛丹','蛇果','牛油果','椰子','橄榄','青梅','杨梅','话梅','乌梅','蓝莓','黑莓','树莓','蔓越莓','草莓','菠萝','凤梨','西瓜','哈密瓜','香瓜','甜瓜','网纹瓜','伊丽莎白瓜','黄金瓜','白兰瓜','羊角蜜','黄瓜','西红柿','圣女果','小番茄','番茄','茄子','辣椒','青椒','彩椒','南瓜','冬瓜','丝瓜','苦瓜','节瓜','黄瓜','西葫芦','瓠瓜','佛手瓜','蛇瓜','苦瓜','南瓜','冬瓜','丝瓜','节瓜','黄瓜','西葫芦','瓠瓜','佛手瓜','蛇瓜'],
  '豆制品': ['豆腐','豆浆','豆腐干','豆腐皮','腐竹','豆干','嫩豆腐','老豆腐','内酯豆腐','豆泡','豆筋','豆丝','豆饼','豆豉','豆瓣酱','豆腐乳','臭豆腐','纳豆','天贝','豆浆粉','豆腐花','豆花','豆脑','豆腐渣','豆干丝','豆腐皮丝','腐竹丝','豆腐卷','豆腐包','豆腐丸子','豆腐饺子','豆腐馄饨','豆腐烧麦','豆腐包子','豆腐馒头','豆腐花卷','豆腐饼','豆腐条','豆腐块','豆腐丁','豆腐丝','豆腐片','豆腐皮','豆腐衣','豆腐膜','豆腐皮卷','豆腐皮结','豆腐皮丝','豆腐皮条','豆腐皮块','豆腐皮丁','豆腐皮丝','豆腐皮条','豆腐皮块','豆腐皮丁'],
  '其他': ['蚕豆','青豆','红豆','黑芝麻','白芝麻','番茄酱','蚝油','豆瓣酱','腐乳','咸菜','葱','姜','蒜','香菜','料酒','醋','酱油','生抽','老抽','盐','糖','鸡精','味精','胡椒粉','花椒粉','辣椒粉','孜然粉','五香粉','十三香','八角','桂皮','香叶','草果','肉蔻','丁香','花椒','干辣椒','生姜','大蒜','葱白','葱绿','洋葱','蒜苔','蒜黄','韭黄','韭菜花','香菜根','芹菜根','萝卜缨','白菜帮','白菜心','油菜心','菜薹','芥蓝薹','紫菜薹','菜心薹','西兰花薹','花椰菜薹','玉米须','玉米叶','玉米芯','竹笋壳','笋衣','笋干','木耳','银耳','香菇','平菇','金针菇','杏鲍菇','口蘑','茶树菇','鸡腿菇','白玉菇','蟹味菇','秀珍菇','草菇','猴头菇','竹荪','松茸','松露','羊肚菌','牛肝菌','鸡枞菌','鸡油菌','干贝','虾米','虾皮','海米','鱿鱼干','墨鱼干','海参干','鲍鱼干','鱼干','虾干','贝干','螺干','蛎干','蛏干','蛤干','蚶干','扇贝干','瑶柱','淡菜','海虹','海胆','海星','海参','鲍鱼','鱼翅','燕窝','雪蛤','鹿鞭','鹿茸','熊掌','猴脑','象拔','鱼唇','鱼肚','鱼胶','鱼翅','燕窝','雪蛤','鹿鞭','鹿茸','熊掌','猴脑','象拔','鱼唇','鱼肚','鱼胶']
};

export const KITCHEN_TOOLS_EXPANDED = [
  { id: 'wok', label: '炒锅', emoji: '🍳' },
  { id: 'rice-cooker', label: '电饭煲', emoji: '🍚' },
  { id: 'microwave', label: '微波炉', emoji: '📻' },
  { id: 'air-fryer', label: '空气炸锅', emoji: '🔥' },
  { id: 'blender', label: '破壁机', emoji: '⚙️' },
  { id: 'oven', label: '烤箱', emoji: '🔆' },
  { id: 'pressure-cooker', label: '高压锅', emoji: '⏱️' },
  { id: 'slow-cooker', label: '慢炖锅', emoji: '🌡️' },
  { id: 'steamer', label: '蒸锅', emoji: '☁️' },
  { id: 'induction', label: '电磁炉', emoji: '⚡' },
  { id: 'grill', label: '烧烤炉', emoji: '♨️' }
];

export const MEAT_SUBTYPES: Record<string, string[]> = {
  '猪肉': ['五花肉','猪里脊','排骨','猪蹄','猪肘','猪后肘','肉末','猪耳','猪头肉','猪皮','猪腰','腰花','猪肝','猪心','猪肚','猪血','梅花肉','前腿肉','后腿肉'],
  '牛肉': ['牛腩','牛里脊','牛腱','牛腱子','牛筋','肥牛','肥牛卷','牛排','牛骨','牛尾巴'],
  '羊肉': ['羊排','羊腿肉','羊里脊','羊蝎子','羊肉卷','羊肉片'],
  '鸡肉': ['鸡胸肉','鸡腿肉','琵琶腿','鸡翅','鸡翅中','鸡翅根','鸡爪','鸡胗','鸡肝','鸡心','整鸡','三黄鸡','鸡架'],
  '鸭肉': ['鸭腿肉','鸭胸肉','鸭翅','鸭掌','鸭胗','整鸭'],
};

export const FUNGI_PARENT = '蘑菇';

export const FUNGI_SUBTYPES: Array<{ group: string; items: string[] }> = [
  { group: '鲜菇', items: ['香菇','金针菇','杏鲍菇','平菇','口蘑','茶树菇','鸡腿菇','白玉菇','蟹味菇','秀珍菇'] },
  { group: '干货', items: ['干香菇','黑木耳','银耳'] },
];

export interface Recipe {
  id: string;
  name: string;
  description: string;
  mainIngredients: string[];
  allIngredients: string[];
  steps: string[];
  cookTime: string;
  servings: string;
  calories: number;
  difficulty: '简单' | '中等' | '复杂';
  tools: string[];
  stepCount: number;
}

export type RecipeCategory = 'ready' | 'simple-buy' | 'difficult-buy';

const RECIPE_DATABASE: Recipe[] = [
  {
    id: 'tomato-egg',
    name: '番茄炒蛋',
    description: '经典家常菜，酸酸的番茄配软滑的鸡蛋',
    mainIngredients: ['鸡蛋', '番茄'],
    allIngredients: ['鸡蛋 3个', '番茄 2个', '葱', '盐', '糖', '油'],
    steps: [
      '将番茄洗净切块，鸡蛋打散加少许盐备用',
      '热锅倒油，油热后倒入蛋液，快速翻炒至凝固后盛出',
      '锅中再加少许油，放入番茄块翻炒',
      '番茄出汁后加入盐和糖调味',
      '倒入炒好的鸡蛋，翻炒均匀',
      '撒上葱花即可出锅'
    ],
    cookTime: '15分钟',
    servings: '2-3人份',
    calories: 240,
    difficulty: '简单',
    tools: ['wok'],
    stepCount: 6
  },
  {
    id: 'stir-fry-cabbage',
    name: '快手炒青菜',
    description: '清脆爽口的青菜，爆香的做法',
    mainIngredients: ['青菜'],
    allIngredients: ['青菜 400g', '蒜', '油', '盐', '生抽'],
    steps: [
      '青菜洗净沥干，切段',
      '蒜切碎',
      '热锅倒油，放入蒜蓉炒香',
      '加入青菜大火快速翻炒',
      '加盐和生抽调味',
      '炒至菜软即可出锅'
    ],
    cookTime: '5分钟',
    servings: '2人份',
    calories: 60,
    difficulty: '简单',
    tools: ['wok'],
    stepCount: 6
  },
  {
    id: 'garlic-shrimp',
    name: '蒜蓉虾',
    description: '肉质鲜嫩的大虾配香喷喷的蒜蓉',
    mainIngredients: ['虾'],
    allIngredients: ['虾 500g', '蒜', '油', '盐', '生抽', '料酒'],
    steps: [
      '虾洗净去虾线，剪去虾须',
      '蒜剁碎备用',
      '热锅倒油，放入虾快速翻炒至变色',
      '加入蒜蓉继续炒香',
      '加入生抽、料酒和盐调味',
      '炒至虾完全熟透即可出锅'
    ],
    cookTime: '10分钟',
    servings: '2人份',
    calories: 120,
    difficulty: '简单',
    tools: ['wok'],
    stepCount: 6
  },
  {
    id: 'broccoli-stir',
    name: '蒜蓉西兰花',
    description: '翠绿欲滴的西兰花，香脆爽口',
    mainIngredients: ['西兰花'],
    allIngredients: ['西兰花 300g', '蒜', '油', '盐', '生抽'],
    steps: [
      '西兰花掰成小朵，洗净沥干',
      '蒜切碎备用',
      '热锅倒油，放入蒜蓉炒香',
      '加入西兰花翻炒',
      '加少量水盖盖焖2分钟',
      '加盐和生抽调味，炒匀即可'
    ],
    cookTime: '8分钟',
    servings: '2人份',
    calories: 85,
    difficulty: '简单',
    tools: ['wok'],
    stepCount: 6
  },
  {
    id: 'egg-fried-rice',
    name: '黄金蛋炒饭',
    description: '金黄色的米饭粒粒分明',
    mainIngredients: ['鸡蛋', '米饭'],
    allIngredients: ['米饭 1碗', '鸡蛋 2个', '葱', '盐', '生抽', '油'],
    steps: [
      '米饭提前打散，鸡蛋打入碗中搅拌均匀',
      '热锅倒油，油热后倒入蛋液，快速划散',
      '蛋液半凝固时倒入米饭，快速翻炒',
      '米饭炒散后加入盐和生抽调味',
      '撒上葱花，翻炒均匀即可出锅'
    ],
    cookTime: '10分钟',
    servings: '1-2人份',
    calories: 320,
    difficulty: '简单',
    tools: ['wok'],
    stepCount: 5
  },
  {
    id: 'roasted-potato',
    name: '空气炸锅烤土豆',
    description: '外脆内软的黄金土豆块',
    mainIngredients: ['土豆'],
    allIngredients: ['土豆 2个', '油', '盐', '黑胡椒'],
    steps: [
      '土豆洗净去皮，切成均匀的块状',
      '土豆块用清水冲洗几遍，去除表面淀粉',
      '擦干水分后加入油、盐、黑胡椒拌匀',
      '预热空气炸锅至180度',
      '将土豆块平铺在炸篮中，180度烤20分钟',
      '中途翻面一次，烤至金黄酥脆即可'
    ],
    cookTime: '25分钟',
    servings: '2人份',
    calories: 180,
    difficulty: '简单',
    tools: ['air-fryer'],
    stepCount: 6
  },
  {
    id: 'roasted-chicken',
    name: '香烤鸡胸肉',
    description: '低脂高蛋白的健身餐',
    mainIngredients: ['鸡胸肉'],
    allIngredients: ['鸡胸肉 1块', '蚝油', '生抽', '料酒', '黑胡椒', '蒜'],
    steps: [
      '鸡胸肉洗净，用刀背拍松',
      '加入蚝油、生抽、料酒、黑胡椒、蒜末腌制30分钟',
      '预热空气炸锅至180度',
      '将腌制好的鸡胸肉放入炸篮',
      '180度烤15分钟，翻面再烤10分钟',
      '烤至表面金黄，内部熟透即可'
    ],
    cookTime: '25分钟（不含腌制）',
    servings: '1-2人份',
    calories: 165,
    difficulty: '中等',
    tools: ['air-fryer'],
    stepCount: 6
  },
  {
    id: 'clay-pot-rice',
    name: '一锅煲仔饭',
    description: '香喷喷的米饭铺满腊肠和蛋',
    mainIngredients: ['米饭', '鸡蛋'],
    allIngredients: ['米饭 1碗', '鸡蛋 1个', '腊肠 1根', '生抽', '蚝油', '糖', '芝麻油'],
    steps: [
      '米饭提前蒸好，腊肠切片',
      '将米饭铺入电饭煲中',
      '铺上腊肠片，打入鸡蛋',
      '加入生抽和蚝油调味',
      '煮至米粒周边变脆（约5分钟）',
      '关火后静置1分钟，淋上芝麻油拌匀'
    ],
    cookTime: '20分钟',
    servings: '1-2人份',
    calories: 380,
    difficulty: '简单',
    tools: ['rice-cooker'],
    stepCount: 6
  },
  {
    id: 'tofu-mapo',
    name: '麻婆豆腐',
    description: '麻辣鲜香的经典川菜',
    mainIngredients: ['豆腐'],
    allIngredients: ['豆腐 300g', '豆瓣酱', '肉末 100g', '花椒粉', '辣椒', '生抽', '糖', '淀粉'],
    steps: [
      '豆腐切块，轻轻沥干',
      '热锅倒油，炒香豆瓣酱',
      '加入肉末炒散',
      '倒入豆腐块，加生抽、糖、花椒粉调味',
      '加少量水烧开，转小火煮3分钟',
      '用淀粉水勾芡，撒上辣椒粉即可'
    ],
    cookTime: '15分钟',
    servings: '2-3人份',
    calories: 210,
    difficulty: '中等',
    tools: ['wok'],
    stepCount: 6
  },
  {
    id: 'fish-head-soup',
    name: '鱼头豆腐汤',
    description: '鲜美的鱼汤，营养丰富',
    mainIngredients: ['鱼头', '豆腐'],
    allIngredients: ['鱼头 1个', '豆腐 200g', '姜', '盐', '料酒', '葱'],
    steps: [
      '鱼头洗净，用刀背拍开',
      '豆腐切块备用',
      '热锅倒油，放入鱼头两面煎至半熟',
      '加水烧开，加入姜片和料酒',
      '转小火炖15分钟至汤色变白',
      '加入豆腐再煮5分钟，用盐调味，撒葱花'
    ],
    cookTime: '25分钟',
    servings: '2-3人份',
    calories: 150,
    difficulty: '中等',
    tools: ['wok'],
    stepCount: 6
  },
  {
    id: 'beef-stir-fry',
    name: '牛肉炒洋葱',
    description: '软嫩的牛肉搭配甜甜的洋葱',
    mainIngredients: ['牛肉', '洋葱'],
    allIngredients: ['牛肉 200g', '洋葱 1个', '蒜', '油', '生抽', '料酒', '黑胡椒'],
    steps: [
      '牛肉切薄片，加生抽和料酒腌制10分钟',
      '洋葱剥皮切丝，蒜切碎',
      '热锅倒油，炒香蒜末',
      '加入牛肉快速炒至变色',
      '加入洋葱丝继续翻炒',
      '加黑胡椒调味，炒匀即可'
    ],
    cookTime: '12分钟',
    servings: '2人份',
    calories: 280,
    difficulty: '简单',
    tools: ['wok'],
    stepCount: 6
  },
  {
    id: 'shrimp-paste-noodles',
    name: '虾酱面',
    description: '鲜香的虾酱面，简单快手',
    mainIngredients: ['虾', '面条'],
    allIngredients: ['虾 200g', '面条 1碗', '蒜', '油', '虾酱', '葱'],
    steps: [
      '面条煮至半熟沥干',
      '虾洗净去虾线，蒜切碎',
      '热锅倒油，炒香蒜末和虾酱',
      '加入虾翻炒至变红',
      '加入面条翻炒均匀',
      '撒上葱花即可'
    ],
    cookTime: '10分钟',
    servings: '1人份',
    calories: 350,
    difficulty: '简单',
    tools: ['wok'],
    stepCount: 6
  },
  {
    id: 'carrot-egg-soup',
    name: '胡萝卜鸡蛋汤',
    description: '清汤爽口，营养丰富',
    mainIngredients: ['胡萝卜', '鸡蛋'],
    allIngredients: ['胡萝卜 1根', '鸡蛋 2个', '盐', '葱'],
    steps: [
      '胡萝卜削皮切片',
      '鸡蛋打入碗中搅拌均匀',
      '烧一大锅水，加入胡萝卜片',
      '胡萝卜熟透后，慢慢倒入蛋花',
      '加盐调味',
      '撒上葱花即可'
    ],
    cookTime: '15分钟',
    servings: '2人份',
    calories: 120,
    difficulty: '简单',
    tools: ['wok'],
    stepCount: 6
  },
  {
    id: 'braised-pork',
    name: '红烧肉',
    description: '软烂入味的红烧肉',
    mainIngredients: ['猪肉'],
    allIngredients: ['猪肉 500g', '姜', '葱', '生抽', '老抽', '糖', '料酒'],
    steps: [
      '猪肉切块，用水焯一遍',
      '热锅倒油，放入姜片和葱段爆香',
      '加入猪肉块炒至微黄',
      '加入生抽、老抽、糖、料酒调味',
      '加水没过肉块，转小火焖40分钟',
      '至肉软烂，汤汁浓稠即可'
    ],
    cookTime: '50分钟',
    servings: '4人份',
    calories: 420,
    difficulty: '中等',
    tools: ['wok', 'pressure-cooker'],
    stepCount: 6
  }
];

function normalizeIngredient(ingredient: string): string {
  return ingredient.toLowerCase().trim().replace(/\d+|克|个|碗|根|条|勺|片|粒|段|块|朵|汤匙|茶匙|适量|少许|可选|^的|g|ml/g, '').trim();
}

function quantifySeasoning(name: string): string {
  const mlMap: Record<string, number> = { '生抽': 10, '老抽': 5, '醋': 8, '蚝油': 8, '料酒': 10, '芝麻油': 4 };
  const gMap: Record<string, number> = { '盐': 3, '糖': 5, '胡椒粉': 2, '花椒粉': 2, '淀粉': 6, '姜': 5, '葱': 5, '蒜': 5, '辣椒': 3 };
  if (mlMap[name]) {
    const v = mlMap[name];
    const analogy = v <= 5 ? '约一瓶盖' : '约两瓶盖';
    return `${name} ${v}ml（${analogy}）`;
  }
  if (gMap[name]) {
    const v = gMap[name];
    const analogy = v <= 3 ? '约黄豆大小' : '约花生米大小';
    return `${name} ${v}g（${analogy}）`;
  }
  return `${name} 适量（看心情）`;
}

function getMainIngredientsNormalized(ingredients: string[]): Set<string> {
  return new Set(
    ingredients
      .map(normalizeIngredient)
      .filter(ing => ing && ing.length > 0)
  );
}

function checkRecipeMatch(recipe: Recipe, userIngredients: Set<string>): { hasAll: boolean; missingCount: number; missing: string[] } {
  const recipeMains = new Set(
    recipe.mainIngredients.map(normalizeIngredient).filter(ing => ing && ing.length > 0)
  );

  const missing: string[] = [];

  for (const mainIng of recipeMains) {
    let found = false;
    for (const userIng of userIngredients) {
      if (userIng.includes(mainIng) || mainIng.includes(userIng)) {
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(mainIng);
    }
  }

  return {
    hasAll: missing.length === 0,
    missingCount: missing.length,
    missing
  };
}

function enhanceRecipe(recipe: Recipe): Recipe {
  const enhancedSteps = recipe.steps.map((s, i) => stepWithTimeAndStatus(s, i));
  const quantifiedIngredients = recipe.allIngredients.map((item) => {
    const matchedSeasoning = SEASONINGS.find(seasoning =>
      item === seasoning || item.startsWith(seasoning)
    );
    if (matchedSeasoning) {
      return quantifySeasoning(matchedSeasoning);
    }
    return item;
  });
  // 移除卡路里拼接，保持纯净描述
  return {
    ...recipe,
    steps: enhancedSteps,
    allIngredients: quantifiedIngredients,
    description: recipe.description,
  };
}

export interface RecipeResult {
  ready: Recipe[];
  simpleBuy: Recipe[];
  difficultBuy: Recipe[];
}

function stepWithTimeAndStatus(step: string, index: number): string {
  const keywordTime = /煎|炒|焖|煮|烤|蒸|翻炒|腌制/;
  let minutes = 2 + (index % 3) * 2;
  if (/腌制/.test(step)) minutes = 10;
  if (/焖|慢炖/.test(step)) minutes = 5 + (index % 2) * 5;
  const status =
    /炒香/.test(step) ? '闻到香味' :
    /煎/.test(step) ? '两面金黄' :
    /煮/.test(step) ? '汤色乳白' :
    /烤/.test(step) ? '表面金黄' :
    /蒸/.test(step) ? '熟透不生' :
    '状态合适';
  if (keywordTime.test(step)) {
    return `${step}（${minutes}分钟，${status}）`;
  }
  return `${step}（${minutes}分钟，${status}）`;
}

function caloriesToBurgerEquivalent(cal: number): string {
  const perBurger = 250;
  const eq = Math.max(1, Math.round(cal / perBurger));
  return `约等于 ${eq} 个大汉堡`;
}

export function generateRecipes(ingredients: string[], tools: string[], brainHole = false): RecipeResult {
  const userIngredients = getMainIngredientsNormalized(ingredients);
  const ready: Recipe[] = [];
  const simpleBuy: Recipe[] = [];
  const difficultBuy: Recipe[] = [];

  // 1. 从静态数据库筛选符合条件的菜谱
  const candidates = RECIPE_DATABASE.filter(recipe => {
    return tools.length === 0 || recipe.tools.some(tool => tools.includes(tool));
  });

  // 2. 增强匹配逻辑并分类
  candidates.forEach(recipe => {
    const enhanced = enhanceRecipe(recipe);
    const match = checkRecipeMatch(enhanced, userIngredients);

    if (match.hasAll) {
      ready.push(enhanced);
    } else {
      const rareSet = new Set(['生蚝','扇贝','螃蟹','淡菜','八爪鱼','鹅肉','火鸡']);
      const hasRareMissing = match.missing.some(m => rareSet.has(m));
      if (match.missingCount === 1 && !hasRareMissing) {
        simpleBuy.push(enhanced);
      } else {
        difficultBuy.push(enhanced);
      }
    }
  });

  // 3. 如果结果不足，基于用户食材动态生成一些“创意菜品”（最多凑齐10道）
  const currentTotal = ready.length + simpleBuy.length + difficultBuy.length;
  if (currentTotal < 10 && ingredients.length > 0) {
    const templates = brainHole
      ? ['离谱拌', '脑洞煎', '怪味炒', '沙雕焖', '朋克烤']
      : ['蒜蓉', '清炒', '香煎', '家常', '黄金', '椒盐', '蚝油', '豉汁', '糖醋', '微辣'];

    const userIngs = Array.from(userIngredients);
    for (let i = 0; i < (10 - currentTotal); i++) {
      const baseIng = userIngs[i % userIngs.length];
      const template = templates[Math.floor(Math.random() * templates.length)];
      const name = `${template}${baseIng}`;
      
      // 创建一个简单的动态菜谱对象
      const dynamicRecipe: Recipe = {
        id: `dynamic-${Date.now()}-${i}`,
        name: name,
        description: `基于您的食材 ${baseIng} 特别推荐的${template}做法`,
        mainIngredients: [baseIng],
        allIngredients: [`${baseIng} 1份`, '油 适量', '盐 少许'],
        steps: [`将${baseIng}处理干净`, `锅中倒油烧热`, `放入${baseIng}进行${template.slice(-1)}制`, `加调料翻炒均匀即可`],
        cookTime: '10-15分钟',
        servings: '1-2人份',
        calories: 150 + Math.floor(Math.random() * 200),
        difficulty: '简单',
        tools: tools.length > 0 ? [tools[0]] : ['wok'],
        stepCount: 4
      };
      
      ready.push(enhanceRecipe(dynamicRecipe));
    }
  }

  const shuffle = (arr: Recipe[]) => arr.sort(() => Math.random() - 0.5);

  return {
    ready: shuffle(ready).slice(0, 10),
    simpleBuy: shuffle(simpleBuy).slice(0, 10),
    difficultBuy: shuffle(difficultBuy).slice(0, 10)
  };
}

export function paginateRecipes(recipes: Recipe[], page: number, pageSize: number = 10): { recipes: Recipe[]; hasMore: boolean; total: number } {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    recipes: recipes.slice(start, end),
    hasMore: end < recipes.length,
    total: recipes.length
  };
}

export function getRecipeNameCandidates(ingredients: string[], tools: string[], limit = 10, brainHole = false): string[] {
  const base = generateRecipes(ingredients, tools);
  const names: string[] = [
    ...base.ready.map(r => r.name),
    ...base.simpleBuy.map(r => r.name),
    ...base.difficultBuy.map(r => r.name),
  ];
  const unique = Array.from(new Set(names));
  const candidates = unique.slice(0, limit);
  if (brainHole) {
    const crazy = ['可乐拌生蚝','西兰花奶茶炒饭','土豆冰淇淋热狗','豆腐巧克力铜锣烧','番茄鱼子酱爆米花'];
    return crazy.slice(0, Math.min(limit, crazy.length));
  }
  return candidates;
}

export function generateRecipeDetailsByName(name: string): Recipe | null {
  const found = RECIPE_DATABASE.find(r => r.name === name);
  if (!found) return null;
  const enhancedSteps = found.steps.map((s, i) => stepWithTimeAndStatus(s, i));
  const calEq = caloriesToBurgerEquivalent(found.calories);
  return {
    ...found,
    steps: enhancedSteps,
    description: `${found.description}（${calEq}）`,
  };
}

export function sortRecipesByMode(recipes: Recipe[], mode: 'time' | 'complexity'): Recipe[] {
  if (mode === 'complexity') {
    return [...recipes].sort((a, b) => a.stepCount - b.stepCount);
  }
  const toMinutes = (t: string) => {
    const m = t.match(/\d+/);
    return m ? parseInt(m[0], 10) : 10;
  };
  return [...recipes].sort((a, b) => toMinutes(a.cookTime) - toMinutes(b.cookTime));
}

export function getShoppingGuide(ingredients: string[], seasonings: Record<string, boolean>, tools: string[]): { need: string; recipe: string; type: '食材' | '调料' }[] {
  const base = generateRecipes(ingredients, tools);
  const tips: { need: string; recipe: string; type: '食材' | '调料' }[] = [];
  for (const r of base.simpleBuy) {
    const missingMain = r.mainIngredients.map(normalizeIngredient).find(m => !ingredients.some(u => normalizeIngredient(u).includes(m)));
    if (missingMain) {
      tips.push({ need: missingMain, recipe: r.name, type: '食材' });
      continue;
    }
    const usedSeasonings = r.allIngredients.map(normalizeIngredient).filter(x => SEASONINGS.includes(x));
    const missingSeasoning = usedSeasonings.find(s => !seasonings[s]);
    if (missingSeasoning) {
      tips.push({ need: missingSeasoning, recipe: r.name, type: '调料' });
    }
  }
  return tips.slice(0, 5);
}
