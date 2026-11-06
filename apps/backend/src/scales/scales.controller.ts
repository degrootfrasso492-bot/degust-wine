import { Controller, Get } from '@nestjs/common';
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
  listScales() {
    return this.scalesService.listScales();
  }

  @Public()
  @Get('presets')
  listPresets() {
    return this.scalesService.listPresets();
  }
}
