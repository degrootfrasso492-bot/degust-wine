import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { ExportService } from './export.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('export')
@UseGuards(RolesGuard)
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Post('events/:eventId/pdf')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  async createPdfJob(@Param('eventId') eventId: string) {
    const job = await this.exportService.createJob(eventId, 'pdf');
    return { jobId: job.jobId };
  }

  @Post('events/:eventId/excel')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  async createExcelJob(@Param('eventId') eventId: string) {
    const job = await this.exportService.createJob(eventId, 'excel');
    return { jobId: job.jobId };
  }

  @Get('jobs/:jobId/status')
  @Roles(Role.ADMIN)
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.exportService.getJob(jobId);
    return {
      jobId: job.jobId,
      status: job.status,
      format: job.format,
      createdAt: job.createdAt,
      error: job.error,
    };
  }

  @Get('jobs/:jobId/download')
  @Roles(Role.ADMIN)
  async downloadFile(@Param('jobId') jobId: string, @Res() res: Response) {
    const filePath = await this.exportService.getFilePath(jobId);
    const job = await this.exportService.getJob(jobId);
    const ext = job.format === 'pdf' ? 'pdf' : 'xlsx';
    const mimeType =
      job.format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const fileName = `degust-export-${job.eventId}.${ext}`;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}
