import { Module } from '@nestjs/common';
import { WsetService } from './wset.service';
import { WsetController } from './wset.controller';

@Module({
  providers: [WsetService],
  controllers: [WsetController],
})
export class WsetModule {}
