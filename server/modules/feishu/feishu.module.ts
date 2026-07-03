import { Module, Global } from '@nestjs/common';
import { FeishuService } from './feishu.service';

/**
 * 飞书集成模块，并将其标记为全局模块以供其他模块共享使用
 */
@Global()
@Module({
  providers: [FeishuService],
  exports: [FeishuService],
})
export class FeishuModule {}
