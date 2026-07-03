import { Controller, Get, Req, Res, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';

@Controller()
export class ViewController {

  @Get(['/', '*'])
  async render(@Req() req: Request, @Res() res: Response) {
    const isApi = req.path.startsWith('/api') || req.path.startsWith('/openapi') || req.path.startsWith('/__innerapi__');
    if (isApi) {
      throw new NotFoundException(`Cannot GET ${req.path}`);
    }

    const useDevClient =
      process.env.NODE_ENV === 'development' && !process.env.SUDA_DATABASE_URL;
    if (useDevClient) {
      return res.redirect('http://127.0.0.1:8080/client/');
    }

    // you can add custom render params here
    const platformData = req.__platform_data__ ?? {};
    return res.render('index', {
      // don't delete this line, it's used by client to get platform info
      __platform__: JSON.stringify(platformData),
    });
  }
}
