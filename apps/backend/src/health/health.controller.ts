import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

const MIN_FREE_BYTES = 50 * 1024 * 1024; // 50 МБ

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    const checks: Record<string, unknown> = {};
    let healthy = true;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok' };
    } catch (error) {
      healthy = false;
      checks.database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'unknown error',
      };
    }

    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      const stats = await fs.promises.statfs(uploadsDir);
      const freeBytes = Number(stats.bavail) * Number(stats.bsize);
      checks.disk = {
        status: freeBytes >= MIN_FREE_BYTES ? 'ok' : 'low',
        freeBytes,
        freeMb: Math.round(freeBytes / 1024 / 1024),
      };
      if (freeBytes < MIN_FREE_BYTES) healthy = false;
    } catch (error) {
      checks.disk = {
        status: 'error',
        message: error instanceof Error ? error.message : 'unknown error',
      };
    }

    const payload = {
      status: healthy ? 'ok' : 'error',
      uptime: process.uptime(),
      checks,
    };

    if (!healthy) {
      throw new ServiceUnavailableException(payload);
    }
    return payload;
  }
}
