import { Module } from '@nestjs/common';

import { HuizhiController } from './huizhi.controller';
import { HuizhiService } from './huizhi.service';

@Module({
  controllers: [HuizhiController],
  providers: [HuizhiService],
})
export class HuizhiModule {}
