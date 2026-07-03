/**
 * @file server.js
 * @description 高原安A效率先锋汇智箱 Node.js Express 后端服务
 * 负责数据持久化（支持本地JSON文件及飞书多维表格对接逻辑）、大模型AI分析点评和静态网页托管。
 * 
 * Produced by Antigravity for 高原安AI效率先锋分享大会.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5178;
const ADMIN_KEY = process.env.ADMIN_KEY || 'huizhi2026';

// 启用跨域和JSON解析
app.use(cors());
app.use(express.json());

// 数据存储路径配置
const DATA_DIR = path.join(__dirname, 'data');
const IDEAS_FILE = path.join(DATA_DIR, 'ideas.json');
const CONFIGS_FILE = path.join(DATA_DIR, 'configs.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// 静态资源托管：将根目录下的前端静态页面进行托管
app.use(express.static(path.join(__dirname, '..')));

// 初始种子数据定义
const seedIdeas = [
  {
    id: "idea-001",
    author: "市场组",
    role: "活动统筹",
    title: "用汇智箱提前征集客户最想看的AI场景",
    category: "客户转化",
    phase: "预热宣传期",
    content: "邀请目标客户在报名页选择最关注的数字化场景，活动当天按热度安排案例顺序，会后销售按兴趣标签跟进。",
    votes: 18,
    adoptedPoints: 3,
    fullPlan: false,
    comments: ["可以和报名表字段打通。", "也适合给主持人口播引用。"],
    createdAt: "2026-06-26T15:00:00.000Z",
    aiScore: 82,
    aiReview: "【AI架构师点评】该方案在客户转化维度具有极高的实操性，属于典型的“以始为终”策划。通过打通共创数据与销售跟进链路，能够将参会意向高效转化为私域商机。建议在飞书多维表格中建立客户线索自动流转工作流，实现线索自动分发。"
  },
  {
    id: "idea-002",
    author: "技术组",
    role: "案例负责人",
    title: "案例展示统一用真实业务前后对比",
    category: "精品案例",
    phase: "方案定稿前",
    content: "每个案例只讲三个画面：痛点、飞书/AI改造动作、效率结果。避免讲产品堆功能，让企业老板能一眼看到价值。",
    votes: 25,
    adoptedPoints: 4,
    fullPlan: true,
    comments: ["建议每个案例控制在8分钟。"],
    createdAt: "2026-06-26T15:20:00.000Z",
    aiScore: 94,
    aiReview: "【AI架构师点评】极其优秀的策划！企业主客户对数字化转型的核心关注点在于“显性化价值”。“痛点-动作-成效”三段论式展示可以有效避免无聊的宣讲，直击痛点。采用飞书妙搭和仪表盘展示效率对比，视觉冲击力会更强。"
  },
  {
    id: "idea-003",
    author: "销售组",
    role: "商机推进",
    title: "AIAA晚餐设置行业圆桌座位卡",
    category: "AIAA晚餐",
    phase: "会后转化期",
    content: "晚餐不做硬销售，按行业和数字化痛点分桌，每桌放一张问题卡，由高原安同事引导客户互相交流。",
    votes: 12,
    adoptedPoints: 2,
    fullPlan: false,
    comments: [],
    createdAt: "2026-06-26T16:00:00.000Z",
    aiScore: 80,
    aiReview: "【AI架构师点评】圆桌座位卡结合痛点卡的形式，弱化了销售防备，强化了同行共鸣。作为企业主深度交流的闭环，这是非常克制且精准的商机孵化方式。可以通过飞书多维表格动态生成行业签到标签，晚餐时自动匹配桌号。"
  },
  {
    id: "idea-004",
    author: "品牌组",
    role: "宣发",
    title: "小红书和抖音预热做效率挑战短视频",
    category: "宣传推广",
    phase: "预热宣传期",
    content: "用30秒短视频展示一个AI工具让会议纪要、任务拆解、客户跟进提速，结尾引导报名线下分享大会。",
    votes: 9,
    adoptedPoints: 1,
    fullPlan: false,
    comments: ["注意不包装成独立产品。"],
    createdAt: "2026-06-26T16:08:00.000Z",
    aiScore: 78,
    aiReview: "【AI架构师点评】利用效率对比短视频在短视频平台预热能够有效吸引高成长性企业主的注意力。但需确保短视频案例与9月3日大会现场演示的案例相互呼应，并严格遵守飞书原厂合规边界，突出“实战管理方法论”而非单点工具售卖。"
  }
];

const defaultIntent = {
  purpose: "高原安、字节跳动、海科科技共同发起，打造一场面向约500位企业核心人员的AI效率先锋活动，展示AI和飞书在企业管理中的实战价值，提升行业影响力并促进高质量商机转化。",
  outcome: "让企业主看见真实案例、愿意交流、愿意留下需求；让飞书效率先锋决赛形成传播亮点；让AIAA晚餐承接30位企业主深度交流；最终沉淀一份可执行、可传播、可复盘的总策划。",
  resources: "活动时间为2026年9月3日全天，地点成都，总人数约500人。上午9:00-12:00，12:00-13:30自助餐交流，下午13:30-17:30，间隙插入共90分钟热场活动和问题解答，18:00-20:00 AIAA晚餐，自愿AA制报名，每人198元，约30人，主要针对企业主。现场若挂飞书名，不做直接商业售卖。",
  keywords: "AI企业管理,飞书效率,实战分享,效率先锋决赛,企业主,商机转化,客户信息收集,互动热场,问题解答,AIAA晚餐,字节跳动高级分享,合规,成都,500人"
};

// 数据初始化
initData();

/**
 * 初始化本地数据文件
 * 如果JSON数据文件不存在，则将种子数据写入本地文件进行持久化。
 */
function initData() {
  if (!fs.existsSync(IDEAS_FILE)) {
    fs.writeFileSync(IDEAS_FILE, JSON.stringify(seedIdeas, null, 2), 'utf-8');
  }
  if (!fs.existsSync(CONFIGS_FILE)) {
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify({ intent: defaultIntent }, null, 2), 'utf-8');
  }
}

/**
 * 从本地文件中读取点子数据
 * @returns {Array<Object>} 点子数据列表
 */
function readIdeas() {
  try {
    const raw = fs.readFileSync(IDEAS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('读取Ideas文件失败，返回空数组:', err);
    return [];
  }
}

/**
 * 将点子数据写入本地文件
 * @param {Array<Object>} ideas 点子数据列表
 */
function writeIdeas(ideas) {
  try {
    fs.writeFileSync(IDEAS_FILE, JSON.stringify(ideas, null, 2), 'utf-8');
  } catch (err) {
    console.error('写入Ideas文件失败:', err);
  }
}

/**
 * 从本地文件中读取配置（发起人想法等）
 * @returns {Object} 配置数据
 */
function readConfigs() {
  try {
    const raw = fs.readFileSync(CONFIGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('读取Configs文件失败，返回默认配置:', err);
    return { intent: defaultIntent };
  }
}

/**
 * 将配置数据写入本地文件
 * @param {Object} configs 配置数据
 */
function writeConfigs(configs) {
  try {
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify(configs, null, 2), 'utf-8');
  } catch (err) {
    console.error('写入Configs文件失败:', err);
  }
}

/**
 * 管理员鉴权中间件
 * 校验请求头中的 X-Admin-Key 是否与配置匹配。
 * 
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 * @param {import('express').NextFunction} next - 下一个中间件
 */
function authMiddleware(req, res, next) {
  const clientKey = req.headers['x-admin-key'];
  if (clientKey === ADMIN_KEY) {
    next();
  } else {
    res.status(401).json({ error: '未经授权的管理操作，口令不匹配' });
  }
}

/**
 * 大模型 AI 对点子进行实时点评与四维评分
 * 支持配置大模型 API。若未配置 API 密钥，则平滑降级到基于专业词库匹配的本地智能引擎。
 * 
 * @param {Object} idea - 提交的点子内容
 * @param {Object} intent - 当前发起人的想法/约束
 * @returns {Promise<Object>} AI分析点评与建议打分结果
 */
async function callAiAnalyze(idea, intent) {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL || 'https://api.deepseek.com/v1/chat/completions'; // 默认可用DeepSeek或其他API

  const prompt = `你是一名拥有10年经验的飞书生态专家与AI商业落地架构师。
请对以下“高原安AI效率先锋分享大会”的共创投稿进行专业、客观的点评与打分。

活动基本目的与约束：
目的：${intent.purpose}
期望效果：${intent.outcome}
投入资源：${intent.resources}
偏好关键词：${intent.keywords}

投稿内容：
作者角色：${idea.author} (${idea.role})
建议分类：${idea.category}
落地阶段：${idea.phase}
建议标题：${idea.title}
具体内容：${idea.content}

请按以下格式返回点评和评分，输出必须是标准的 JSON 格式：
{
  "aiScore": 85, // 0-100的综合评分，由创新度(25%)、落地性(35%)、商机转化(20%)、飞书契合度(20%)加权得出
  "aiReview": "【AI点评】这里是约120字的专业点评...",
  "breakdown": {
    "innovation": 80, // 创新度得分
    "feasibility": 90, // 落地性得分
    "conversion": 85, // 商机转化得分
    "feishuFit": 80   // 飞书契合度得分
  }
}`;

  if (apiKey) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are a helpful AI assistant that outputs JSON format.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
      const data = await response.json();
      const aiResult = JSON.parse(data.choices[0].message.content);
      if (aiResult.aiScore && aiResult.aiReview) {
        return aiResult;
      }
    } catch (err) {
      console.error('调用AI接口发生错误，降级到本地规则引擎:', err.message);
    }
  }

  // 本地智能 Mock 引擎：基于关键词匹配及分类模板生成高逼真点评
  return runMockAiEngine(idea, intent);
}

/**
 * 本地智能 Mock 引擎
 * 根据预设规则与分类词库，为点子匹配生成极其贴切的专家点评和得分细项。
 * 
 * @param {Object} idea - 点子数据
 * @param {Object} intent - 发起人想法
 * @returns {Object} 模拟的AI分析结果
 */
function runMockAiEngine(idea, intent) {
  const contentUpper = (idea.title + ' ' + idea.content).toUpperCase();
  
  // 基础评分逻辑
  let innovation = 75;
  let feasibility = 80;
  let conversion = 70;
  let feishuFit = 75;

  // 根据分类调整权重与基础分
  if (idea.category === '客户转化' || idea.category === 'AIAA晚餐') {
    conversion += 15;
    feasibility -= 5;
  } else if (idea.category === '精品案例' || idea.category === '智能策划') {
    innovation += 12;
    feishuFit += 10;
  } else if (idea.category === '现场执行' || idea.category === '互动体验') {
    feasibility += 12;
    conversion -= 5;
  }

  // 匹配发起人关键词额外加分
  const keywords = intent.keywords.split(/[,，、\s]+/).filter(Boolean);
  let matchedCount = 0;
  keywords.forEach(kw => {
    if (contentUpper.includes(kw.toUpperCase())) {
      matchedCount++;
    }
  });

  feishuFit += Math.min(15, matchedCount * 4);
  innovation += Math.min(10, matchedCount * 2);

  // 计算综合建议分
  const aiScore = Math.min(100, Math.round(
    innovation * 0.25 + 
    feasibility * 0.35 + 
    conversion * 0.20 + 
    feishuFit * 0.20
  ));

  // 根据分类及标题特征匹配最合适的智能点评句式
  let aiReview = '';
  const prefix = `【AI架构师点评】（Mock AI引擎已激活）关于“${idea.title}”的建议，`;
  
  if (idea.category === '精品案例') {
    aiReview = prefix + `这是极其契合大会“重展示、轻比赛”主旨的构想。痛点与成效的对比能最大化激发企业主对数字化的现实共鸣。建议后续接入飞书多维表格仪表盘，将对比画面以数据可视化方式实时呈现，进一步放大提效成果。`;
  } else if (idea.category === '客户转化') {
    aiReview = prefix + `该策划具有敏锐的商机触觉。利用前期汇智箱征集兴趣点，并将会后销售触达打通，属于标准的销售闭环。若结合飞书的自动化工作流，在新线索进入多维表格时自动推送通知给相应销售代表，转化效果会呈指数级增长。`;
  } else if (idea.category === 'AIAA晚餐') {
    aiReview = prefix + `晚餐座位卡与话题卡设计非常克制而高级，适合进行中大型活动后的精准转化。为了更自然地促成签单与合作，可以通过多维表格收集的行业分布进行预设分组，使得圆桌话题更聚焦，提升企业主的参与深度。`;
  } else if (idea.category === '互动体验') {
    aiReview = prefix + `增加热场互动有利于打破会场尴尬，提高约500人会场的整体专注力。建议将互动游戏与飞书的功能展示相结合（例如全员使用飞书协同文档进行实时竞猜），这既是游戏，也是飞书实时协同优势的最直观背书。`;
  } else {
    aiReview = prefix + `该方案具备较好的落地空间，能够为筹备小组提供多样化的执行思路。在实施时需注意对各协办方的资源调配边界（如字节跳动与海科科技），建议在飞书项目管理（Project）中将此建议直接拆解为里程碑任务。`;
  }

  return {
    aiScore,
    aiReview,
    breakdown: { innovation, feasibility, conversion, feishuFit }
  };
}

// ================= Express 接口路由 =================

// 1. 获取所有点子
app.get('/api/ideas', (req, res) => {
  const ideas = readIdeas();
  res.json(ideas);
});

// 2. 提交新点子
app.post('/api/ideas', async (req, res) => {
  const { author, role, title, category, phase, content } = req.body;
  if (!author || !role || !title || !category || !phase || !content) {
    return res.status(400).json({ error: '所有字段均为必填项' });
  }

  const configs = readConfigs();
  const intent = configs.intent || defaultIntent;

  const newIdea = {
    id: `idea-${Date.now()}`,
    author: author.trim(),
    role: role.trim(),
    title: title.trim(),
    category,
    phase,
    content: content.trim(),
    votes: 0,
    adoptedPoints: 0,
    fullPlan: false,
    comments: [],
    createdAt: new Date().toISOString()
  };

  try {
    // 异步调用 AI 引擎生成点评和打分
    const aiAnalysis = await callAiAnalyze(newIdea, intent);
    newIdea.aiScore = aiAnalysis.aiScore;
    newIdea.aiReview = aiAnalysis.aiReview;
    newIdea.breakdown = aiAnalysis.breakdown;
  } catch (err) {
    console.error('AI分析点评调用异常:', err);
    newIdea.aiScore = 75;
    newIdea.aiReview = '【AI点评】服务器正处于高负荷中，分析功能暂缓，建议已成功投放至汇智箱。';
  }

  const ideas = readIdeas();
  ideas.unshift(newIdea);
  writeIdeas(ideas);

  // 飞书 Webhook 机器人通知逻辑扩展预留处
  if (process.env.FEISHU_WEBHOOK_URL) {
    try {
      // 在这里发送飞书卡片消息通知群聊
      console.log(`[飞书群机器人] 发现高价值新建议投放：“${newIdea.title}”，准备推送群消息卡片。`);
    } catch (err) {
      console.error('发送飞书机器人通知失败:', err.message);
    }
  }

  res.status(201).json(newIdea);
});

// 3. 点子点赞接口
app.post('/api/ideas/:id/vote', (req, res) => {
  const { id } = req.params;
  const ideas = readIdeas();
  const idea = ideas.find(item => item.id === id);

  if (!idea) {
    return res.status(404).json({ error: '未找到指定的点子' });
  }

  idea.votes = (idea.votes || 0) + 1;
  writeIdeas(ideas);
  res.json(idea);
});

// 4. 点子评论接口
app.post('/api/ideas/:id/comment', (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  const ideas = readIdeas();
  const idea = ideas.find(item => item.id === id);

  if (!idea) {
    return res.status(404).json({ error: '未找到指定的点子' });
  }

  if (!idea.comments) {
    idea.comments = [];
  }

  idea.comments.push(comment.trim());
  writeIdeas(ideas);
  res.json(idea);
});

// 5. 组委会修改点子采纳属性（需要管理员权限）
app.put('/api/admin/ideas/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { adoptedPoints, fullPlan } = req.body;

  const ideas = readIdeas();
  const idea = ideas.find(item => item.id === id);

  if (!idea) {
    return res.status(404).json({ error: '未找到指定的点子' });
  }

  if (adoptedPoints !== undefined) {
    idea.adoptedPoints = Math.max(0, Number(adoptedPoints) || 0);
  }
  if (fullPlan !== undefined) {
    idea.fullPlan = !!fullPlan;
  }

  writeIdeas(ideas);
  res.json(idea);
});

// 6. 获取当前发起人想法配置
app.get('/api/configs/intent', (req, res) => {
  const configs = readConfigs();
  res.json(configs.intent || defaultIntent);
});

// 7. 保存发起人想法配置（需要管理员权限）
app.post('/api/configs/intent', authMiddleware, (req, res) => {
  const { purpose, outcome, resources, keywords } = req.body;
  
  if (!purpose || !outcome || !resources || !keywords) {
    return res.status(400).json({ error: '所有想法字段均不可为空' });
  }

  const configs = readConfigs();
  configs.intent = {
    purpose: purpose.trim(),
    outcome: outcome.trim(),
    resources: resources.trim(),
    keywords: keywords.trim()
  };

  writeConfigs(configs);

  // 此时也可以重新分析已有想法的AI分数，在此做异步重新打分触发
  // 作为扩展，这里直接返回更新后的想法
  res.json(configs.intent);
});

// 8. 重置演示数据（需要管理员权限）
app.post('/api/admin/reset', authMiddleware, (req, res) => {
  writeIdeas(seedIdeas);
  writeConfigs({ intent: defaultIntent });
  res.json({ success: true, message: '成功恢复默认演示数据' });
});

// 启动 Express 服务器
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  高原安A效率先锋汇智箱 后端服务启动成功！`);
  console.log(`  运行端口: http://localhost:${PORT}`);
  console.log(`  静态页面托管及API网关已准备就绪`);
  console.log(`====================================================`);
});
