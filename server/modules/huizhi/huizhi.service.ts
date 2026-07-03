import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
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
  }
];

@Injectable()
export class HuizhiService {
  private readonly logger = new Logger(HuizhiService.name);
  private memoryIdeas: Idea[] = [...seedIdeas];

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
    if (!this.isFeishuConfigured()) {
      return {
        projectName: '高原安A效率先锋汇智箱',
        uploadTarget: '飞书妙搭',
        stage: 'template-aligned',
        modules: ['点子广场', '投放想法', '积分榜'],
        basicInfo: null,
        flow: [],
        templates: [],
        awards: [],
        rules: [],
        infoConfig: null,
        sponsors: []
      };
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
        projectName: '高原安A效率先锋汇智箱',
        uploadTarget: '飞书妙搭',
        stage: 'template-aligned',
        modules: ['点子广场', '投放想法', '积分榜'],
        basicInfo: basicInfoRecords[0]?.fields || null,
        flow: flowRecords.map(r => r.fields),
        templates: templatesRecords.map(r => r.fields),
        awards: awardsRecords.map(r => r.fields),
        rules: rulesRecords.map(r => r.fields),
        infoConfig: infoConfigRecords[0]?.fields || null,
        sponsors: sponsorsRecords.map(r => r.fields)
      };
    } catch (error) {
      this.logger.error('获取飞书多维表格初始配置失败，降级使用空配置', error.message);
      return {
        projectName: '高原安A效率先锋汇智箱',
        uploadTarget: '飞书妙搭',
        stage: 'template-aligned',
        modules: ['点子广场', '投放想法', '积分榜'],
        basicInfo: null,
        flow: [],
        templates: [],
        awards: [],
        rules: [],
        infoConfig: null,
        sponsors: []
      };
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
        
        // 姓名是飞书人员字段
        const authorObj = fields['姓名']?.[0] || {};
        let authorName = authorObj.name || authorObj.en_name || '';
        let role = String(fields['部门'] || '');

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

        // 筛选和统计此点子相关的互动 (排除被软删除的记录)
        const relatedInteractions = interactionRecords.filter((inter) => {
          const isDeleted = inter.fields['是否删除'] === true || String(inter.fields['是否删除'] || '') === '是';
          if (isDeleted) {
            return false;
          }
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
    
    // 匹配飞书多维表格中是否存在该用户
    const matchedUser = await this.findFeishuUserByName(newIdea.author);

    const fields: any = {
      '点子标题': newIdea.title,
      '点子详情': newIdea.content,
      '建议分类主': newIdea.category,
      '建议分类副': newIdea.phase,
      '点子评分': 0,
      '点子采纳': null
    };

    if (matchedUser) {
      fields['姓名'] = [{ id: matchedUser.id }];
      fields['部门'] = newIdea.role;
    } else {
      // 匹配不到时的兼容：写入部门字段为 "技术组 (王某测试)"，前端 getIdeas 会反向解析
      fields['部门'] = `${newIdea.role} (${newIdea.author})`;
      // '姓名' 留空，避免 UserFieldConvFail
    }

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
   * 功能描述：点赞（写入互动中心）
   */
  async voteIdea(id: string, author?: string, department?: string): Promise<boolean> {
    if (!this.isFeishuConfigured()) {
      const idx = this.memoryIdeas.findIndex((x) => x.id === id);
      if (idx !== -1) {
        // 在内存模式下，通过一个 voted 临时状态切换点赞数
        const isVoted = (this.memoryIdeas[idx] as any).voted;
        this.memoryIdeas[idx].votes = Math.max(0, this.memoryIdeas[idx].votes + (isVoted ? -1 : 1));
        (this.memoryIdeas[idx] as any).voted = !isVoted;
        return true;
      }
      return false;
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN!;
    const voterName = (author || '匿名').trim();
    const deptName = (department || '').trim();

    try {
      // 1. 获取积分规则变动分数
      const rulesRecords = await this.feishuService.getRecords(appToken, TABLES.rules);
      const voteRule = rulesRecords.find((x) => x.fields['积分规则'] === '点赞');
      const scoreDiff = voteRule ? Number(voteRule.fields['分数变动']) : 0.2;

      // 2. 获取现存的互动记录进行软删除比对
      const records = await this.feishuService.getRecords(appToken, TABLES.interactions);
      
      const matchedRecord = records.find((record) => {
        const fields = record.fields;
        const op = String(fields['操作'] || '');
        const user = String(fields['用户'] || '').trim();
        const dept = String(fields['所属单位'] || '').trim();
        const deleted = fields['是否删除'] === true || String(fields['是否删除'] || '') === '是';

        // 解析关联点子 ID
        const rawLink = fields['关联点子'];
        let linkedIds: string[] = [];
        if (Array.isArray(rawLink)) {
          if (rawLink.length > 0 && typeof rawLink[0] === 'object' && (rawLink[0] as any).record_ids) {
            linkedIds = (rawLink[0] as any).record_ids;
          } else {
            linkedIds = rawLink.map(x => typeof x === 'string' ? x : (x?.id || ''));
          }
        }

        return op === '点赞' && user === voterName && dept === deptName && linkedIds.includes(id) && !deleted;
      });

      if (matchedRecord) {
        this.logger.log(`检测到重复点赞记录，进行【取消点赞】操作: recordId=${matchedRecord.record_id}`);
        // 3. 将是否删除设为 true
        const updateFields = {
          '是否删除': '是'
        };
        const result = await this.feishuService.updateRecord(appToken, TABLES.interactions, matchedRecord.record_id, updateFields);
        return !!result;
      } else {
        this.logger.log(`进行【点赞】操作: user=${voterName}, dept=${deptName}`);
        // 4. 新写入点赞记录
        const fields: any = {
          '关联点子': [id],
          '操作': '点赞',
          '用户': voterName,
          '所属单位': deptName,
          '是否删除': '否'
        };

        const result = await this.feishuService.createRecord(appToken, TABLES.interactions, fields);
        return !!result;
      }
    } catch (error) {
      this.logger.error('点赞/取消点赞操作失败', error.message);
      return false;
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
    const commentAuthor = (author || '匿名').trim();
    const deptName = (department || '').trim();
    try {
      const fields: any = {
        '关联点子': [id],
        '操作': '评论',
        '评论内容': commentText.trim(),
        '用户': commentAuthor,
        '所属单位': deptName,
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
}

