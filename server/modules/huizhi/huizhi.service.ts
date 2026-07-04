import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Subject, Observable } from 'rxjs';
import { FeishuService } from '../feishu/feishu.service';

export interface Idea {
  id: string;
  author: string;
  role: string;
  title: string;
  category: string;
  phase: string;
  content: string;
  votes: number;
  adoptedPoints: number;
  fullPlan: boolean;
  comments: string[];
  createdAt: string;
}

const TABLES = {
  ideas: 'tblT07IEX7PmjPUP',        // 点子广场
  interactions: 'tbl1lgQJR8oMLPRX', // 互动中心
  rules: 'tblFYdxOloAz57on',        // 积分规则
  awards: 'tblaEc7GcXvqRNom',       // 奖池
  flow: 'tblm9mealdkMJ6pE',         // 流程安排
  templates: 'tblPF3M3a35SxaoN',    // 展示模版
  basicInfo: 'tblfQ1Asb54goCMu',    // 基础信息
  infoConfig: 'tblYvTnJPYpcHgPh',   // 信息配置
  sponsors: 'tblGxTgWKe4Qvrf4',     // 发起企业
  members: 'tbljG1iBh18lc4G4'       // 人员表
};

const seedIdeas: Idea[] = [
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
    comments: ["市场组: 可以和报名表字段打通。", "技术组: 也适合给主持人口播引用。"],
    createdAt: "2026-06-26T15:00:00.000Z"
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
    comments: ["销售组: 建议每个案例控制在8分钟。"],
    createdAt: "2026-06-26T15:20:00.000Z"
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
    createdAt: "2026-06-26T16:00:00.000Z"
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
    comments: ["品牌组: 注意不包装成独立产品。"],
    createdAt: "2026-06-26T16:08:00.000Z"
  }
];

@Injectable()
export class HuizhiService {
  private readonly logger = new Logger(HuizhiService.name);
  private memoryIdeas: Idea[] = [...seedIdeas];
  private readonly polishEvent$ = new Subject<{ text: string }>();

  constructor(private readonly feishuService: FeishuService) {}

  private isFeishuConfigured(): boolean {
    const token = process.env.FEISHU_BITABLE_APP_TOKEN;
    if (!token || token.includes('占位')) {
      return false;
    }
    return true;
  }

  /**
   * 功能描述：获取项目初始引导数据和多维表格中的静态配置信息
   */
  async getBootstrap() {
    const fallbackData = {
      projectName: '高原安AI效率先锋汇智箱',
      uploadTarget: '飞书妙搭',
      stage: 'template-aligned',
      modules: ['点子广场', '投放想法', '积分榜'],
      basicInfo: {
        活动主题: 'AI运用于企业管理的实战分享暨飞书效率先锋决赛',
        时间: '2026年9月3日全天',
        城市: '成都',
        规模估计: '500',
        AIAA晚餐企业主席位: '30',
        '元/人自愿AA': '198',
        活动地点: '成都',
        活动描述: '面向企业主、高管、企业二代与数字化转型核心人员，围绕AI时代企业管理、飞书效率实践、案例决赛对决和未来设想展开全天活动。'
      },
      flow: [
        { 时间段: "09:00-12:00", 流程安排: "上午主论坛：AI与企业管理实战分享、飞书效率先锋展示。" },
        { 时间段: "12:00-13:30", 流程安排: "自助餐与交流，承接上午内容并促进商机互动。" },
        { 时间段: "13:30-17:30", 流程安排: "下午决赛与专题分享，中间插入共90分钟热场活动和问题解答。" },
        { 时间段: "18:00-20:00", 流程安排: "AIAA晚餐，自愿AA制报名，每人198元，主要面向30位企业主深度交流。" }
      ],
      templates: [
        { 案例标题: "AI运用于企业管理的实战分享", 案例描述: "展示真实企业管理场景中AI提效、降本、增收的实践方法。", 案例链接: "https://ycnafmezb6nu.feishu.cn/base/PY4Ib9Pohaxkn3st42mcbveTnVb?table=tblPF3M3a35SxaoN&view=vew1TiFIYE" },
        { 案例标题: "飞书效率先锋决赛对决", 案例描述: "用轻比赛、重展示呈现内部精品案例和业务改造成果。", 案例链接: "https://ycnafmezb6nu.feishu.cn/base/PY4Ib9Pohaxkn3st42mcbveTnVb?table=tblPF3M3a35SxaoN&view=vew1TiFIYE" },
        { 案例标题: "AI时代企业管理经验交流", 案例描述: "让企业主围绕组织、流程、绩效、销售和客户经营展开交流。", 案例链接: "https://ycnafmezb6nu.feishu.cn/base/PY4Ib9Pohaxkn3st42mcbveTnVb?table=tblPF3M3a35SxaoN&view=vew1TiFIYE" },
        { 案例标题: "飞书应用未来与设想", 案例描述: "邀请字节跳动高级分享，讨论飞书应用于现代企业管理的未来方向。", 案例链接: "https://ycnafmezb6nu.feishu.cn/base/PY4Ib9Pohaxkn3st42mcbveTnVb?table=tblPF3M3a35SxaoN&view=vew1TiFIYE" }
      ],
      awards: [
        { 奖品名称: "活动伴手礼", 所需积分: "30", 礼品个数: "100" },
        { 奖品名称: "定制纪念杯", 所需积分: "60", 礼品个数: "50" },
        { 奖品名称: "AI效率工具会员/晚餐交流", 所需积分: "100", 礼品个数: "10" }
      ],
      rules: [
        { 积分规则: "提交想法", 分数变动: "1" },
        { 积分规则: "被点赞", 分数变动: "0.2" },
        { 积分规则: "采纳点", 分数变动: "5" },
        { 积分规则: "完整策划被采用", 分数变动: "20" }
      ],
      infoConfig: {
        主办方核心目的: "高原安、字节跳动、海科科技共同发起，打造一场面向约500位企业核心人员的AI效率先锋活动，展示AI和飞书在企业管理中的实战价值，提升行业影响力并促进高质量商机转化。",
        希望达成的效果: "让企业主看见真实案例、愿意交流、愿意留下需求；让飞书效率先锋决赛形成传播亮点；让AIAA晚餐承接30位企业主深度交流；最终沉淀一份可执行、可传播、可复盘的总策划。",
        投入资源与边界: "活动时间为2026年9月3日全天，地点成都，总人数约500人。上午 9:00-12:00，12:00-13:30 自助餐交流，下午 13:30-17:30，间隙插入共90分钟热场活动和问题解答，18:00-20:00 AIAA晚餐，自愿AA报名，每人198元，约30人，主要针对企业主。现场若挂飞书名，不做直接商业售卖。",
        智能策划偏好: "AI企业管理,飞书效率,实战分享,效率先锋决赛,企业主,商机转化,客户信息收集,互动热场,问题解答,AIAA晚餐,字节跳动高级分享,合规,成都,500人"
      },
      sponsors: [
        { 企业名称: "高原安", 企业职责: "总发起、客户经营、企业管理实战案例、AIAA晚餐转化。" },
        { 企业名称: "字节跳动", 企业职责: "飞书站台、高级分享、数字化应用未来设想、原厂背书。" },
        { 企业名称: "海科科技", 企业职责: "活动策划执行、客户邀约、现场互动、内容包装与传播。" }
      ]
    };

    if (!this.isFeishuConfigured()) {
      return fallbackData;
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    try {
      const [
        basicInfoRecords,
        flowRecords,
        templatesRecords,
        awardsRecords,
        rulesRecords,
        infoConfigRecords,
        sponsorsRecords
      ] = await Promise.all([
        this.feishuService.getRecords(appToken, TABLES.basicInfo),
        this.feishuService.getRecords(appToken, TABLES.flow),
        this.feishuService.getRecords(appToken, TABLES.templates),
        this.feishuService.getRecords(appToken, TABLES.awards),
        this.feishuService.getRecords(appToken, TABLES.rules),
        this.feishuService.getRecords(appToken, TABLES.infoConfig),
        this.feishuService.getRecords(appToken, TABLES.sponsors)
      ]);

      return {
        projectName: '高原安AI效率先锋汇智箱',
        uploadTarget: '飞书妙搭',
        stage: 'template-aligned',
        modules: ['点子广场', '投放想法', '积分榜'],
        basicInfo: basicInfoRecords[0]?.fields || fallbackData.basicInfo,
        flow: flowRecords.length > 0 ? flowRecords.map(r => r.fields) : fallbackData.flow,
        templates: templatesRecords.length > 0 ? templatesRecords.map(r => r.fields) : fallbackData.templates,
        awards: awardsRecords.length > 0 ? awardsRecords.map(r => r.fields) : fallbackData.awards,
        rules: rulesRecords.length > 0 ? rulesRecords.map(r => r.fields) : fallbackData.rules,
        infoConfig: infoConfigRecords[0]?.fields || fallbackData.infoConfig,
        sponsors: sponsorsRecords.length > 0 ? sponsorsRecords.map(r => r.fields) : fallbackData.sponsors
      };
    } catch (error) {
      this.logger.error('获取飞书多维表格初始配置失败，降级使用空配置', error.message);
      return fallbackData;
    }
  }

  /**
   * 功能描述：拉取所有的点子以及对应的互动评论、点赞数量
   */
  async getIdeas(): Promise<Idea[]> {
    if (!this.isFeishuConfigured()) {
      return this.memoryIdeas;
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    try {
      const [ideaRecords, interactionRecords] = await Promise.all([
        this.feishuService.getRecords(appToken, TABLES.ideas),
        this.feishuService.getRecords(appToken, TABLES.interactions)
      ]);

      if (!ideaRecords || ideaRecords.length === 0) {
        return [];
      }

      return ideaRecords.map((record) => {
        const fields = record.fields;
        const recordId = record.record_id;
        
        // 姓名是单行文本或飞书人员字段
        let authorName = '';
        const rawName = fields['姓名'];
        if (typeof rawName === 'string') {
          authorName = rawName.trim();
        } else if (Array.isArray(rawName)) {
          const authorObj = rawName[0] || {};
          authorName = authorObj.name || authorObj.en_name || '';
        }
        let role = String(fields['所属单位'] || fields['部门'] || '');

        if (!authorName) {
          // 尝试从部门字段中解码出外部投稿人名字，格式为 "技术组 (王某测试)"
          const match = role.match(/^(.*?)\s*\(([^)]+)\)$/);
          if (match) {
            role = match[1].trim();
            authorName = match[2].trim();
          } else {
            authorName = '匿名';
          }
        }

        // 筛选和统计此点子相关的互动
        const relatedInteractions = interactionRecords.filter((inter) => {
          const isDeleted = inter.fields['是否删除'];
          if (isDeleted === '是') return false;

          const rawLink = inter.fields['关联点子'];
          let linkedIds: string[] = [];
          if (Array.isArray(rawLink)) {
            if (rawLink.length > 0 && typeof rawLink[0] === 'object' && (rawLink[0] as any).record_ids) {
              linkedIds = (rawLink[0] as any).record_ids;
            } else {
              linkedIds = rawLink.map(x => typeof x === 'string' ? x : (x?.id || ''));
            }
          }
          return linkedIds.includes(recordId);
        });

        const votesCount = relatedInteractions.filter((x) => x.fields['操作'] === '点赞').length;
        const comments = relatedInteractions
          .filter((x) => x.fields['操作'] === '评论' && x.fields['评论内容'])
          .map((x) => {
            const uName = String(x.fields['用户'] || '匿名');
            const content = String(x.fields['评论内容']).trim();
            return `${uName}: ${content}`;
          });

        const interactions = relatedInteractions.map((x) => {
          const uName = String(x.fields['用户'] || '匿名');
          const op = String(x.fields['操作'] || '');
          const content = String(x.fields['评论内容'] || '').trim();

          return {
            id: x.record_id,
            user: uName,
            type: op,
            content: content
          };
        });

        return {
          id: recordId,
          author: authorName,
          role: role,
          title: fields['点子标题'] ? String(fields['点子标题']).trim() : '',
          category: String(fields['建议分类主'] || ''),
          phase: String(fields['建议分类副'] || ''),
          content: fields['点子详情'] ? String(fields['点子详情']).trim() : '',
          votes: votesCount,
          adoptedPoints: Number(fields['点子评分']) || 0,
          fullPlan: fields['点子采纳'] === '采纳',
          comments: comments,
          interactions: interactions,
          createdAt: String(fields['createdAt'] || new Date().toISOString()),
        };
      });
    } catch (error) {
      this.logger.error('拉取点子广场或互动中心数据失败', error.message);
      return this.memoryIdeas;
    }
  }

  /**
   * 辅助方法：直接通过飞书通讯录 API 根据姓名模糊/精确检索用户 ID
   */
  private async searchFeishuUserFromPlatform(name: string): Promise<any> {
    try {
      const token = await this.feishuService.getTenantAccessToken();
      const url = 'https://open.feishu.cn/open-apis/contact/v3/users/search';
      
      this.logger.log(`正在请求飞书开放平台检索实名用户: name=${name}`);
      const response = await axios.post(
        url,
        { query: name },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );

      if (response.data?.code === 0) {
        const items = response.data.data?.items || [];
        const matched = items.find((x: any) => x.name === name);
        if (matched) {
          this.logger.log(`成功从飞书平台检索到用户ID: name=${name}, open_id=${matched.open_id}`);
          return {
            id: matched.open_id,
            name: matched.name,
            avatar_url: matched.avatar?.avatar_origin || matched.avatar?.avatar_72 || '',
          };
        }
      } else {
        this.logger.warn(`飞书平台用户检索接口返回失败: ${response.data?.msg || '未知'} (码: ${response.data?.code})`);
      }
    } catch (error) {
      this.logger.error(`飞书平台检索用户异常: ${error.message}`);
    }
    return null;
  }

  /**
   * 辅助方法：从飞书多维表格成员表查找同名用户
   */
  private async findFeishuUserByName(authorName: string): Promise<any> {
    try {
      const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
      const records = await this.feishuService.getRecords(appToken, TABLES.members);
      if (records) {
        for (const record of records) {
          const nameVal = record.fields['人员名称'] ? String(record.fields['人员名称']).trim() : '';
          if (nameVal === authorName) {
            return {
              id: record.record_id,
              name: nameVal,
              avatar_url: '',
            };
          }
        }
      }
    } catch (e) {
      this.logger.warn(`从成员表已有历史查找失败: ${e.message}`);
    }

    // 2. 如果多维表格历史中没有，调用飞书通讯录 API 搜索
    return await this.searchFeishuUserFromPlatform(authorName);
  }

  /**
   * 功能描述：提交新想法到点子广场
   */
  async createIdea(ideaData: any): Promise<Idea> {
    const newIdea: Idea = {
      id: `idea-${Date.now()}`,
      author: String(ideaData.author || '').trim(),
      role: String(ideaData.role || '').trim(),
      title: String(ideaData.title || '').trim(),
      category: String(ideaData.category || ''),
      phase: String(ideaData.phase || ''),
      content: String(ideaData.content || '').trim(),
      votes: 0,
      adoptedPoints: 0,
      fullPlan: false,
      comments: [],
      createdAt: new Date().toISOString(),
    };

    if (!this.isFeishuConfigured()) {
      this.memoryIdeas.unshift(newIdea);
      return newIdea;
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    
    const fields: any = {
      '点子标题': newIdea.title,
      '点子详情': newIdea.content,
      '建议分类主': newIdea.category,
      '建议分类副': newIdea.phase,
      '姓名': newIdea.author,
      '所属单位': newIdea.role,
      '点子评分': 0,
      '点子采纳': null
    };

    try {
      const record = await this.feishuService.createRecord(appToken, TABLES.ideas, fields);
      if (record) {
        newIdea.id = record.record_id;
      } else {
        this.memoryIdeas.unshift(newIdea);
      }
    } catch (error) {
      this.logger.error('插入新点子失败，降级存入本地内存', error.message);
      this.memoryIdeas.unshift(newIdea);
    }

    return newIdea;
  }

  /**
   * 功能描述：点赞与取消点赞切换（写入或更新互动中心）
   */
  async voteIdea(id: string, author?: string, department?: string): Promise<{ success: boolean; action: 'vote' | 'unvote' }> {
    if (!this.isFeishuConfigured()) {
      const idx = this.memoryIdeas.findIndex((x) => x.id === id);
      if (idx !== -1) {
        if (this.memoryIdeas[idx].votes > 0) {
          this.memoryIdeas[idx].votes -= 1;
          return { success: true, action: 'unvote' };
        }
        this.memoryIdeas[idx].votes += 1;
        return { success: true, action: 'vote' };
      }
      return { success: false, action: 'vote' };
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    const voterName = author || '匿名';
    const deptVal = department || '';

    try {
      const rulesRecords = await this.feishuService.getRecords(appToken, TABLES.rules);
      const voteRule = rulesRecords.find((x) => x.fields['积分规则'] === '点赞');
      const scoreDiff = voteRule ? Number(voteRule.fields['分数变动']) : 0.2;

      // 1. 拉取所有互动记录，检索当前用户与所属单位对该点子是否已有且未删除的点赞记录
      const records = await this.feishuService.getRecords(appToken, TABLES.interactions);
      
      const existingActiveVote = records.find((record) => {
        const fields = record.fields;
        const op = fields['操作'];
        const user = String(fields['用户'] || '');
        const role = String(fields['所属单位'] || '');
        const isDeleted = fields['是否删除'];
        
        const rawLink = fields['关联点子'];
        let linkedIds: string[] = [];
        if (Array.isArray(rawLink)) {
          if (rawLink.length > 0 && typeof rawLink[0] === 'object' && (rawLink[0] as any).record_ids) {
            linkedIds = (rawLink[0] as any).record_ids;
          } else {
            linkedIds = rawLink.map(x => typeof x === 'string' ? x : (x?.id || ''));
          }
        }
        
        return (
          linkedIds.includes(id) &&
          op === '点赞' &&
          user === voterName &&
          role === deptVal &&
          isDeleted !== '是'
        );
      });

      if (existingActiveVote) {
        // 2. 找到有效点赞记录 -> 触发【取消点赞】，标记 是否删除 为 '是'
        this.logger.log(`检测到重复点赞记录，进行【取消点赞】操作: recordId=${existingActiveVote.record_id}`);
        const updateFields = {
          '是否删除': '是'
        };
        const updateResult = await this.feishuService.updateRecord(
          appToken,
          TABLES.interactions,
          existingActiveVote.record_id,
          updateFields
        );
        return { success: !!updateResult, action: 'unvote' };
      } else {
        // 3. 无有效点赞记录 -> 触发【新增点赞】
        const fields: any = {
          '关联点子': [id],
          '操作': '点赞',
          '积分变动': scoreDiff,
          '用户': voterName,
          '所属单位': deptVal,
          '是否删除': '否'
        };

        const createResult = await this.feishuService.createRecord(appToken, TABLES.interactions, fields);
        return { success: !!createResult, action: 'vote' };
      }
    } catch (error) {
      this.logger.error('点赞/取消点赞记录处理失败', error.message);
      return { success: false, action: 'vote' };
    }
  }

  /**
   * 功能描述：添加评论（写入互动中心）
   */
  async addComment(id: string, commentText: string, author?: string, department?: string): Promise<string[]> {
    if (!commentText.trim()) return [];

    if (!this.isFeishuConfigured()) {
      const idx = this.memoryIdeas.findIndex((x) => x.id === id);
      if (idx !== -1) {
        const commentAuthor = author || '匿名';
        this.memoryIdeas[idx].comments.push(`${commentAuthor}: ${commentText.trim()}`);
        return this.memoryIdeas[idx].comments;
      }
      return [];
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    const commentAuthor = author || '匿名';
    const deptVal = department || '';

    try {
      const fields: any = {
        '关联点子': [id],
        '操作': '评论',
        '评论内容': commentText.trim(),
        '积分变动': 0,
        '用户': commentAuthor,
        '所属单位': deptVal,
        '是否删除': '否'
      };

      const result = await this.feishuService.createRecord(appToken, TABLES.interactions, fields);
      if (result) {
        const updatedIdeas = await this.getIdeas();
        const matchedIdea = updatedIdeas.find((x) => x.id === id);
        return matchedIdea ? matchedIdea.comments : [];
      }
    } catch (error) {
      this.logger.error('插入评论失败', error.message);
    }
    return [];
  }

  /**
   * 功能描述：获取人员积分排行榜
   */
  async getLeaderboard(): Promise<any[]> {
    if (!this.isFeishuConfigured()) {
      return [];
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    try {
      const records = await this.feishuService.getRecords(appToken, TABLES.members);
      if (!records || records.length === 0) {
        return [];
      }

      const members = records.map((record) => {
        const fields = record.fields;
        
        const authorName = fields['人员名称'] ? String(fields['人员名称']).trim() : '匿名';
        const role = String(fields['所属单位'] || fields['部门'] || '');
        
        return {
          id: record.record_id,
          author: authorName,
          role: role,
          avatarUrl: '',
          score: Number(fields['总积分']) || 0,
          ideas: Number(fields['发帖个数']) || 0,
          adoptedPoints: Number(fields['得分情况']) || 0, // 得分情况
        };
      });

      return members.sort((a, b) => b.score - a.score);
    } catch (error) {
      this.logger.error('获取积分榜人员排行失败', error.message);
      return [];
    }
  }

  async updateAdoptedPoints(id: string, value: number): Promise<boolean> {
    return true;
  }

  async toggleFullPlan(id: string, fullPlan: boolean): Promise<boolean> {
    return true;
  }

  /**
   * 功能描述：更新信息配置表中的发起人想法及策划关键字
   */
  async updateInfoConfig(data: any): Promise<boolean> {
    if (!this.isFeishuConfigured()) {
      return true;
    }
    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    try {
      // 现获取已有的配置记录ID以进行覆盖更新
      const records = await this.feishuService.getRecords(appToken, TABLES.infoConfig);
      const recordId = records?.[0]?.record_id;
      if (!recordId) {
        this.logger.error('未找到可更新的信息配置记录');
        return false;
      }
      
      const fields = {
        '主办方核心目的': String(data.主办方核心目的 || '').trim(),
        '希望达成的效果': String(data.希望达成的效果 || '').trim(),
        '投入资源与边界': String(data.投入资源与边界 || '').trim(),
        '智能策划偏好': String(data.智能策划偏好 || '').trim(),
      };
      
      const result = await this.feishuService.updateRecord(appToken, TABLES.infoConfig, recordId, fields);
      return !!result;
    } catch (error) {
      this.logger.error('更新发起人想法配置失败', error.message);
      return false;
    }
  }

  /**
   * 功能描述：注册/登记共创人员信息到人员表中
   */
  async registerMember(data: { name: string; department: string }): Promise<boolean> {
    if (!this.isFeishuConfigured()) {
      return true;
    }
    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    const name = String(data.name || '').trim();
    const department = String(data.department || '').trim();
    if (!name || !department) return false;

    try {
      this.logger.log(`正在请求飞书检索/登记共创人员: name=${name}, dept=${department}`);
      // 1. 获取已有的人员列表，以进行防重复校验
      const records = await this.feishuService.getRecords(appToken, TABLES.members);
      
      const exists = records.some((record) => {
        const fields = record.fields;
        const authorName = fields['人员名称'] ? String(fields['人员名称']).trim() : '';
        const role = String(fields['所属单位'] || fields['部门'] || '');
        return authorName === name && role === department;
      });

      if (exists) {
        this.logger.log(`人员已存在，跳过写入: name=${name}, dept=${department}`);
        return true;
      }

      // 2. 写入多维表格人员表
      const fields: any = {
        '人员名称': name,
        '所属单位': department
      };

      const result = await this.feishuService.createRecord(appToken, TABLES.members, fields);
      return !!result;
    } catch (error) {
      this.logger.error('注册人员失败', error.message);
      return false;
    }
  }

  /**
   * 功能描述：接收 Webhook 推送的 AI 润色结果，并分发至客户端
   */
  triggerPolishWebhook(datas: string) {
    this.logger.log(`Webhook 触发 AI 润色就绪，收到数据长度: ${datas ? datas.length : 0}`);
    this.polishEvent$.next({ text: datas || '' });
  }

  /**
   * 功能描述：获取 AI 润色的实时推送流
   */
  getPolishSseStream(): Observable<{ text: string }> {
    return this.polishEvent$.asObservable();
  }

  /**
   * 功能描述：向“点子优化多维表格” (tbldaBH4Gpq2MKtm) 添加一条润色记录
   */
  async createPolishRecord(body: {
    title: string;
    category: string;
    content: string;
    phase: string;
  }): Promise<any> {
    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN || 'PY4Ib9Pohaxkn3st42mcbveTnVb';
    const tableId = 'tbldaBH4Gpq2MKtm';
    
    this.logger.log(`正在写入点子优化多维表格: ${tableId}, 标题: ${body.title || ''}`);
    
    try {
      const fields = {
        '建议标题': body.title || '',
        '建议分类': body.category || '',
        '具体内容': body.content || '',
        '可落地时间段': body.phase || ''
      };
      const result = await this.feishuService.createRecord(appToken, tableId, fields);
      return result;
    } catch (error) {
      this.logger.error('写入点子优化多维表格失败', error.message);
      throw error;
    }
  }

  /**
   * 功能描述：主动查询多维表格中某条润色记录的 AI 结果 (方案 B 轮询兜底)
   */
  async getPolishStatus(recordId: string): Promise<{ ready: boolean; text: string }> {
    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN || 'PY4Ib9Pohaxkn3st42mcbveTnVb';
    const tableId = 'tbldaBH4Gpq2MKtm';
    try {
      const record = await this.feishuService.getRecord(appToken, tableId, recordId);
      const fields = record?.fields || {};
      
      // 兼容可能存在的列名
      const aiText = fields['AI润色描述'] || fields['AI捷径生成方案'] || fields['AI润色成果'] || fields['datas'] || fields['润色结果'] || '';
      return {
        ready: !!aiText,
        text: String(aiText)
      };
    } catch (error) {
      this.logger.error(`查询润色状态失败: ${recordId}`, error.message);
      return { ready: false, text: '' };
    }
  }
}

