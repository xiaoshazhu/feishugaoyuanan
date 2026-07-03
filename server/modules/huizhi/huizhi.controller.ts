import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { HuizhiService } from './huizhi.service';

/**
 * 汇智箱主业务控制器，提供前后台数据通讯的 REST APIs
 */
@Controller('api/huizhi')
export class HuizhiController {
  constructor(private readonly huizhiService: HuizhiService) {}

  /**
   * 功能描述：拉取项目引导配置元数据
   * @return {any} 基础配置元数据
   */
  @Get('bootstrap')
  async getBootstrap() {
    return await this.huizhiService.getBootstrap();
  }

  /**
   * 功能描述：获取所有点子广场的想法记录
   * @return {Promise<any[]>} 所有点子列表
   */
  @Get('ideas')
  async getIdeas() {
    return await this.huizhiService.getIdeas();
  }

  /**
   * 功能描述：新建一条想法记录
   * @param body {any} 前端传递过来的想法字段键值对，包含作者、角色、标题、分类、阶段、内容等 (必填)
   * @return {Promise<any>} 完整点子实例
   */
  @Post('ideas')
  async createIdea(@Body() body: any) {
    return await this.huizhiService.createIdea(body);
  }

  /**
   * 功能描述：给指定的想法点赞投票
   * @param id {string} 点子唯一标识记录 ID (必填)
   * @return {Promise<{ success: boolean }>} 是否点赞成功
   */
  @Post('ideas/:id/vote')
  async voteIdea(@Param('id') id: string, @Body() body: { author?: string }) {
    const success = await this.huizhiService.voteIdea(id, body.author);
    return { success };
  }

  /**
   * 功能描述：给指定的想法追加新评论
   * @param id {string} 点子 ID (必填)
   * @param body { { commentText: string } } 评论内容 JSON (必填)
   * @return {Promise<{ comments: string[] }>} 包含该想法更新后的所有评论列表
   */
  @Post('ideas/:id/comment')
  async addComment(
    @Param('id') id: string,
    @Body() body: { commentText: string; author?: string },
  ) {
    const comments = await this.huizhiService.addComment(id, body.commentText, body.author);
    return { comments };
  }

  /**
   * 功能描述：管理后台操作，更新某点子的采纳点分值
   * @param id {string} 点子 ID (必填)
   * @param body { { value: number } } 包含新的采纳点数 (必填)
   * @return {Promise<{ success: boolean }>} 操作是否成功
   */
  @Post('ideas/:id/adopted')
  async updateAdoptedPoints(@Param('id') id: string, @Body() body: { value: number }) {
    const success = await this.huizhiService.updateAdoptedPoints(id, body.value);
    return { success };
  }

  /**
   * 功能描述：管理后台操作，切换点子是否属于完整策划
   * @param id {string} 点子 ID (必填)
   * @param body { { fullPlan: boolean } } 是否完整策划布尔值 (必填)
   * @return {Promise<{ success: boolean }>} 操作是否成功
   */
  @Post('ideas/:id/toggle-full-plan')
  async toggleFullPlan(@Param('id') id: string, @Body() body: { fullPlan: boolean }) {
    const success = await this.huizhiService.toggleFullPlan(id, body.fullPlan);
    return { success };
  }

  /**
   * 功能描述：获取人员积分排行数据
   * @return {Promise<any[]>} 人员积分排行数据
   */
  @Get('leaderboard')
  async getLeaderboard() {
    return await this.huizhiService.getLeaderboard();
  }

  /**
   * 功能描述：更新发起人想法及智能策划配置信息
   */
  @Put('info-config')
  async updateInfoConfig(@Body() body: any) {
    const success = await this.huizhiService.updateInfoConfig(body);
    return { success };
  }

  /**
   * 功能描述：进入系统后实名登记共创人员信息
   */
  @Post('members')
  async registerMember(@Body() body: { name: string; department: string }) {
    const success = await this.huizhiService.registerMember(body);
    return { success };
  }
}
