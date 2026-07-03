import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { HuizhiModule } from './modules/huizhi/huizhi.module';
import { ViewModule } from './modules/view/view.module';

const platformModules = process.env.SUDA_DATABASE_URL
  ? [PlatformModule.forRoot()]
  : [];

@Module({
  imports: [
    // 平台 Module，提供飞书妙搭平台能力；本地没有数据库环境时跳过，便于开发预览。
    ...platformModules,
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    HuizhiModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
