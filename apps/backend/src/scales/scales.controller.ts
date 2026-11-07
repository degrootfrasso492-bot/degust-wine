import { Controller, Get, Header } from '@nestjs/common';
import { ScalesService } from './scales.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Справочник настраиваемых шкал и пресетов по типу вина.
 * Статические данные без чувствительной информации — открыты без авторизации.
 */
@Controller('scales')
export class ScalesController {
  constructor(private scalesService: ScalesService) {}

  @Public()
  @Get()
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  listScales() {
    return this.scalesService.listScales();
  }

  @Public()
  @Get('presets')
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  listPresets() {
    return this.scalesService.listPresets();
  }
}
