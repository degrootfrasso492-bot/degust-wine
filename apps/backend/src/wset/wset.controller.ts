import { Controller, Get, Query, BadRequestException, Header } from '@nestjs/common';
import { WsetService } from './wset.service';
import { WineType } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';

@Controller('wset')
export class WsetController {
  constructor(private wsetService: WsetService) {}

  @Public()
  @Get('descriptors')
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  getDescriptors(@Query('wineType') wineType: string) {
    if (wineType !== 'WINE' && wineType !== 'SPIRIT') {
      throw new BadRequestException('wineType must be WINE or SPIRIT');
    }
    return this.wsetService.getDescriptorTree(wineType as WineType);
  }
}
