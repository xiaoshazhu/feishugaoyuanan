import { Controller, Get } from '@nestjs/common';

import { HuizhiService } from './huizhi.service';

@Controller('api/huizhi')
export class HuizhiController {
  constructor(private readonly huizhiService: HuizhiService) {}

  @Get('bootstrap')
  getBootstrap() {
    return this.huizhiService.getBootstrap();
  }
}
