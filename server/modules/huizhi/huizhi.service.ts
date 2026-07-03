import { Injectable, Logger } from '@nestjs/common';
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
    comments: ["可以和报名表字段打通。", "也适合给主持人口播引用。"],
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
    comments: ["建议每个案例控制在8分钟。"],
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
    comments: ["注意不包装成独立产品。"],
    createdAt: "2026-06-26T16:08:00.000Z"
  }
];

/**
 * 业务汇智箱逻辑服务类，对接飞书多维表格实现核心功能
 */
@Injectable()
export class HuizhiService {
  private readonly logger = new Logger(HuizhiService.name);
  private memoryIdeas: Idea[] = [...seedIdeas];

  constructor(private readonly feishuService: FeishuService) {}

  /**
   * 功能描述：检查飞书多维表格的配置是否完整可用
   * @return {boolean} 配置完整返回 true，否则返回 false
   */
  private isFeishuConfigured(): boolean {
    const token = process.env.FEISHU_BITABLE_APP_TOKEN;
    const tableId = process.env.FEISHU_BITABLE_TABLE_ID;
    
    // 如果 token 或 tableId 是默认占位符或未配置，说明无法使用飞书连接，需使用内存缓存
    if (!token || !tableId || token.includes('占位') || tableId.includes('占位')) {
      return false;
    }
    return true;
  }

  /**
   * 功能描述：获取项目初始引导数据
   * @return {any} 引导配置信息对象
   */
  getBootstrap() {
    return {
      projectName: '高原安A效率先锋汇智箱',
      uploadTarget: '飞书妙搭',
      stage: 'template-aligned',
      modules: ['点子广场', '投放想法', '积分榜'],
    };
  }

  /**
   * 功能描述：从飞书多维表格或内存缓存中获取所有的点子列表
   * @return {Promise<Idea[]>} 点子记录列表
   */
  async getIdeas(): Promise<Idea[]> {
    if (!this.isFeishuConfigured()) {
      this.logger.warn('飞书多维表格未配置或为占位符，将使用本地内存数据');
      return this.memoryIdeas;
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    const tableId = process.env.FEISHU_BITABLE_TABLE_ID!;

    const records = await this.feishuService.getRecords(appToken, tableId);
    if (!records || records.length === 0) {
      this.logger.warn('未从飞书获取到记录或接口报错，返回内存数据');
      return this.memoryIdeas;
    }

    // 将多维表格的记录转换为前端认识的 Idea 结构
    return records.map((record) => {
      const fields = record.fields;
      let comments: string[] = [];
      if (fields.comments) {
        try {
          comments = JSON.parse(fields.comments);
        } catch {
          comments = String(fields.comments).split(',').filter(Boolean);
        }
      }

      return {
        id: record.record_id,
        author: fields.author || '',
        role: fields.role || '',
        title: fields.title || '',
        category: fields.category || '',
        phase: fields.phase || '',
        content: fields.content || '',
        votes: Number(fields.votes) || 0,
        adoptedPoints: Number(fields.adoptedPoints) || 0,
        fullPlan: Boolean(fields.fullPlan),
        comments,
        createdAt: fields.createdAt || new Date().toISOString(),
      };
    });
  }

  /**
   * 功能描述：向数据库（飞书多维表格）中添加一条新点子
   * @param ideaData {Omit<Idea, 'id' | 'votes' | 'adoptedPoints' | 'fullPlan' | 'comments' | 'createdAt'>} 新点子的部分必填属性 (必填)
   * @return {Promise<Idea>} 返回完整的新增点子结构
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
    const tableId = process.env.FEISHU_BITABLE_TABLE_ID!;

    const fields = {
      author: newIdea.author,
      role: newIdea.role,
      title: newIdea.title,
      category: newIdea.category,
      phase: newIdea.phase,
      content: newIdea.content,
      votes: newIdea.votes,
      adoptedPoints: newIdea.adoptedPoints,
      fullPlan: newIdea.fullPlan,
      comments: JSON.stringify(newIdea.comments),
      createdAt: newIdea.createdAt,
    };

    const record = await this.feishuService.createRecord(appToken, tableId, fields);
    if (record) {
      newIdea.id = record.record_id;
    } else {
      this.logger.error('向飞书插入记录失败，降级保存至本地内存');
      this.memoryIdeas.unshift(newIdea);
    }

    return newIdea;
  }

  /**
   * 功能描述：给指定的点子进行投票点赞（+1赞）
   * @param id {string} 点子唯一标识符 id (必填)
   * @return {Promise<boolean>} 点赞操作成功返回 true，失败返回 false
   */
  async voteIdea(id: string): Promise<boolean> {
    if (!this.isFeishuConfigured() || id.startsWith('idea-')) {
      const idx = this.memoryIdeas.findIndex((x) => x.id === id);
      if (idx !== -1) {
        this.memoryIdeas[idx].votes += 1;
        return true;
      }
      return false;
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    const tableId = process.env.FEISHU_BITABLE_TABLE_ID!;

    // 首先拉取所有记录以便获知当前赞数
    const ideas = await this.getIdeas();
    const currentIdea = ideas.find((x) => x.id === id);
    if (!currentIdea) {
      return false;
    }

    const result = await this.feishuService.updateRecord(appToken, tableId, id, {
      votes: currentIdea.votes + 1,
    });

    return !!result;
  }

  /**
   * 功能描述：为指定的点子添加一条评论
   * @param id {string} 点子唯一标识符 id (必填)
   * @param commentText {string} 评论文本 (必填)
   * @return {Promise<string[]>} 返回更新后的评论数组，操作失败返回空数组
   */
  async addComment(id: string, commentText: string): Promise<string[]> {
    if (!commentText.trim()) return [];

    if (!this.isFeishuConfigured() || id.startsWith('idea-')) {
      const idx = this.memoryIdeas.findIndex((x) => x.id === id);
      if (idx !== -1) {
        this.memoryIdeas[idx].comments.push(commentText.trim());
        return this.memoryIdeas[idx].comments;
      }
      return [];
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    const tableId = process.env.FEISHU_BITABLE_TABLE_ID!;

    const ideas = await this.getIdeas();
    const currentIdea = ideas.find((x) => x.id === id);
    if (!currentIdea) {
      return [];
    }

    const updatedComments = [...currentIdea.comments, commentText.trim()];
    const result = await this.feishuService.updateRecord(appToken, tableId, id, {
      comments: JSON.stringify(updatedComments),
    });

    return result ? updatedComments : [];
  }

  /**
   * 功能描述：管理后台：修改采纳点数量
   * @param id {string} 点子 ID (必填)
   * @param value {number} 新的采纳点数 (必填)
   * @return {Promise<boolean>} 成功返回 true，失败返回 false
   */
  async updateAdoptedPoints(id: string, value: number): Promise<boolean> {
    const val = Math.max(0, value);
    if (!this.isFeishuConfigured() || id.startsWith('idea-')) {
      const idx = this.memoryIdeas.findIndex((x) => x.id === id);
      if (idx !== -1) {
        this.memoryIdeas[idx].adoptedPoints = val;
        return true;
      }
      return false;
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    const tableId = process.env.FEISHU_BITABLE_TABLE_ID!;

    const result = await this.feishuService.updateRecord(appToken, tableId, id, {
      adoptedPoints: val,
    });

    return !!result;
  }

  /**
   * 功能描述：管理后台：切换完整策划状态
   * @param id {string} 点子 ID (必填)
   * @param fullPlan {boolean} 是否为完整策划 (必填)
   * @return {Promise<boolean>} 成功返回 true，失败返回 false
   */
  async toggleFullPlan(id: string, fullPlan: boolean): Promise<boolean> {
    if (!this.isFeishuConfigured() || id.startsWith('idea-')) {
      const idx = this.memoryIdeas.findIndex((x) => x.id === id);
      if (idx !== -1) {
        this.memoryIdeas[idx].fullPlan = fullPlan;
        return true;
      }
      return false;
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    const tableId = process.env.FEISHU_BITABLE_TABLE_ID!;

    const result = await this.feishuService.updateRecord(appToken, tableId, id, {
      fullPlan: fullPlan,
    });

    return !!result;
  }
}
