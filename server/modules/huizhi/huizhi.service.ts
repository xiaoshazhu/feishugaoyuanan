import { Injectable } from '@nestjs/common';

@Injectable()
export class HuizhiService {
  getBootstrap() {
    return {
      projectName: '高原安A效率先锋汇智箱',
      uploadTarget: '飞书妙搭',
      stage: 'template-aligned',
      modules: ['点子广场', '投放想法', '智能策划', '积分榜', '组委会后台'],
    };
  }
}
