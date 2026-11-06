import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

export type ExportFormat = 'pdf' | 'excel';
export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed';

export interface ExportJob {
  jobId: string;
  eventId: string;
  format: ExportFormat;
  status: JobStatus;
  filePath?: string;
  error?: string;
  createdAt: Date;
}

const EXPORTS_DIR = path.join(process.cwd(), 'tmp', 'exports');

@Injectable()
export class ExportService {
  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
  ) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }

  async createJob(eventId: string, format: ExportFormat): Promise<ExportJob> {
    const event = await this.prisma.tastingEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');

    const row = await this.prisma.exportJob.create({
      data: { eventId, format, status: 'waiting' },
    });

    // Обработка в фоне; статус и результат пишутся в БД, поэтому задача
    // переживает перезапуск процесса.
    this.processJob(row.id).catch(async (err: Error) => {
      await this.prisma.exportJob
        .update({
          where: { id: row.id },
          data: { status: 'failed', error: err.message },
        })
        .catch(() => undefined);
    });

    return this.toDto(row);
  }

  async getJob(jobId: string): Promise<ExportJob> {
    const row = await this.prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!row) throw new NotFoundException('Job not found');
    return this.toDto(row);
  }

  async getFilePath(jobId: string): Promise<string> {
    const job = await this.getJob(jobId);
    if (job.status !== 'completed' || !job.filePath) {
      throw new NotFoundException('File not ready');
    }
    return job.filePath;
  }

  private async processJob(jobId: string): Promise<void> {
    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'active' },
    });

    const row = await this.prisma.exportJob.findUniqueOrThrow({
      where: { id: jobId },
    });

    const filePath =
      row.format === 'pdf'
        ? await this.generatePdf(row.eventId, jobId)
        : await this.generateExcel(row.eventId, jobId);

    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'completed', filePath },
    });
  }

  private toDto(row: {
    id: string;
    eventId: string;
    format: string;
    status: string;
    filePath: string | null;
    error: string | null;
    createdAt: Date;
  }): ExportJob {
    return {
      jobId: row.id,
      eventId: row.eventId,
      format: row.format as ExportFormat,
      status: row.status as JobStatus,
      filePath: row.filePath ?? undefined,
      error: row.error ?? undefined,
      createdAt: row.createdAt,
    };
  }

  private async generatePdf(eventId: string, jobId: string): Promise<string> {
    // Dynamic import so the module is optional at startup
    const PDFDocument = (await import('pdfkit')).default;

    const [event, analytics] = await Promise.all([
      this.prisma.tastingEvent.findUniqueOrThrow({ where: { id: eventId } }),
      this.analyticsService.getEventAnalytics(eventId),
    ]);

    const filePath = path.join(EXPORTS_DIR, `${jobId}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 50, compress: true });
    const stream = fs.createWriteStream(filePath);

    // Register Lato fonts for Cyrillic support
    const fontsDir = path.join(process.cwd(), 'fonts');
    const regularFont = path.join(fontsDir, 'Lato-Regular.ttf');
    const boldFont = path.join(fontsDir, 'Lato-Bold.ttf');
    if (fs.existsSync(regularFont)) {
      doc.registerFont('Lato', regularFont);
      doc.registerFont('Lato-Bold', boldFont);
      doc.font('Lato');
    }

    // Helper to switch between bold and regular
    const bold = () => doc.font(fs.existsSync(boldFont) ? 'Lato-Bold' : 'Helvetica-Bold');
    const regular = () => doc.font(fs.existsSync(regularFont) ? 'Lato' : 'Helvetica');

    await new Promise<void>((resolve, reject) => {
      doc.pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);

      const W = 595 - 100; // content width
      const WINE_COLOR = '#9c2b3a';
      const GRAY = '#6b7280';

      // ── Cover page ──────────────────────────────────────────────
      bold()
        .fontSize(28)
        .fillColor(WINE_COLOR)
        .text(event.title, 50, 80, { width: W, align: 'center' });

      regular()
        .fontSize(12)
        .fillColor(GRAY)
        .text(
          new Date(event.date).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          50,
          doc.y + 8,
          { width: W, align: 'center' },
        );

      regular()
        .moveDown(0.5)
        .fontSize(11)
        .fillColor('#374151')
        .text(
          `Участников: ${analytics.totalParticipants}   •   Образцов: ${analytics.wines.length}`,
          { width: W, align: 'center' },
        );

      if (event.description) {
        regular()
          .moveDown(1)
          .fontSize(10)
          .fillColor(GRAY)
          .text(event.description, { width: W, align: 'center' });
      }

      // Divider
      doc
        .moveDown(1.5)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#e5e7eb')
        .stroke();

      // Podium header
      bold()
        .moveDown(1)
        .fontSize(16)
        .fillColor(WINE_COLOR)
        .text('Итоговый рейтинг', { align: 'center' });

      // Wines ranked
      analytics.wines.forEach((w, idx) => {
        const medal = idx === 0 ? '1.' : idx === 1 ? '2.' : idx === 2 ? '3.' : `${idx + 1}.`;
        bold()
          .moveDown(0.5)
          .fontSize(11)
          .fillColor('#111827')
          .text(`${medal}  ${w.title}`, 70, doc.y, { continued: true });
        regular()
          .fillColor(GRAY)
          .text(`   ${w.likeCount} лайков`, { align: 'right' });
      });

      // ── Per-wine pages ───────────────────────────────────────────
      analytics.wines.forEach((wine) => {
        doc.addPage();
        regular(); // reset font for each page

        // Wine header
        bold()
          .fontSize(20)
          .fillColor(WINE_COLOR)
          .text(wine.title, 50, 60, { width: W });

        if (wine.producer || wine.country) {
          regular()
            .fontSize(11)
            .fillColor(GRAY)
            .text(
              [wine.producer, wine.country, wine.region]
                .filter(Boolean)
                .join(' · '),
            );
        }

        regular()
          .moveDown(0.3)
          .fontSize(10)
          .fillColor('#374151')
          .text(`Лайков: ${wine.likeCount}   Оценок: ${wine.noteCount}`);

        // Score bars
        bold().moveDown(1).fontSize(12).fillColor('#111827').text('Средние оценки:');

        wine.attributeAverages.forEach((attr) => {
          const label = attr.labelRu;
          const barWidth = Math.round((attr.average / attr.maxVal) * (W - 120));

          regular().moveDown(0.4).fontSize(10).fillColor('#374151').text(label, 50, doc.y, {
            continued: false,
            width: 110,
          });

          const barY = doc.y - 14;
          doc
            .roundedRect(165, barY, W - 120, 10, 3)
            .fillColor('#f3f4f6')
            .fill();

          if (barWidth > 0) {
            doc
              .roundedRect(165, barY, barWidth, 10, 3)
              .fillColor(WINE_COLOR)
              .fill();
          }

          regular()
            .fontSize(9)
            .fillColor(GRAY)
            .text(`${attr.average}`, 165 + (W - 120) + 5, barY, {
              width: 30,
            });
        });

        // Aroma descriptors
        if (wine.topAromaDescriptors.length > 0) {
          bold().moveDown(1).fontSize(12).fillColor('#111827').text('Топ ароматов:');
          const aromaText = wine.topAromaDescriptors
            .map((d) => `${d.labelRu} (${d.count})`)
            .join('  •  ');
          regular().moveDown(0.3).fontSize(10).fillColor(GRAY).text(aromaText, { width: W });
        }

        // Flavour descriptors
        if (wine.topFlavourDescriptors.length > 0) {
          bold().moveDown(0.8).fontSize(12).fillColor('#111827').text('Топ вкусов:');
          const flavourText = wine.topFlavourDescriptors
            .map((d) => `${d.labelRu} (${d.count})`)
            .join('  •  ');
          regular().moveDown(0.3).fontSize(10).fillColor(GRAY).text(flavourText, { width: W });
        }
      });

      // ── Global descriptors page ──────────────────────────────────
      doc.addPage();
      bold()
        .fontSize(20)
        .fillColor(WINE_COLOR)
        .text('Зал об ароматах и вкусах', 50, 60, { width: W });

      if (analytics.globalTopAroma.length > 0) {
        bold().moveDown(1.5).fontSize(14).fillColor('#111827').text('Топ-10 ароматов зала:');
        analytics.globalTopAroma.forEach((d, i) => {
          regular()
            .moveDown(0.3)
            .fontSize(11)
            .fillColor(GRAY)
            .text(`${i + 1}. ${d.labelRu}`, 70, doc.y, { continued: true })
            .text(`${d.count}×`, { align: 'right' });
        });
      }

      if (analytics.globalTopFlavour.length > 0) {
        bold().moveDown(1.5).fontSize(14).fillColor('#111827').text('Топ-10 вкусов зала:');
        analytics.globalTopFlavour.forEach((d, i) => {
          regular()
            .moveDown(0.3)
            .fontSize(11)
            .fillColor(GRAY)
            .text(`${i + 1}. ${d.labelRu}`, 70, doc.y, { continued: true })
            .text(`${d.count}×`, { align: 'right' });
        });
      }

      doc.end();
    });

    return filePath;
  }

  private async generateExcel(eventId: string, jobId: string): Promise<string> {
    const ExcelJS = await import('exceljs');

    const [event, analytics, matrix] = await Promise.all([
      this.prisma.tastingEvent.findUniqueOrThrow({ where: { id: eventId } }),
      this.analyticsService.getEventAnalytics(eventId),
      this.analyticsService.getWineRawMatrix(eventId),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Degust';
    workbook.created = new Date();

    // ── Sheet 1: Summary ─────────────────────────────────────────
    const summarySheet = workbook.addWorksheet('Сводка');

    summarySheet.getRow(1).values = [
      event.title,
      '',
      `Дата: ${new Date(event.date).toLocaleDateString('ru-RU')}`,
    ];
    summarySheet.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF9C2B3A' } };
    summarySheet.getRow(2).values = [`Участников: ${analytics.totalParticipants}`];

    summarySheet.addRow(['']);
    summarySheet.addRow(['']);

    const attrNames = analytics.wines[0]?.attributeAverages.map((a) => a.labelRu) ?? [];

    const colHeaders = [
      'Место',
      'Вино',
      'Производитель',
      'Страна',
      'Лайки',
      'Оценок',
      ...attrNames,
    ];

    const tableHeaderRow = summarySheet.addRow(colHeaders);
    tableHeaderRow.font = { bold: true };
    tableHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };

    analytics.wines.forEach((wine, idx) => {
      const avgValues = wine.attributeAverages.map((a) => a.average);
      summarySheet.addRow([
        idx + 1,
        wine.title,
        wine.producer ?? '',
        wine.country ?? '',
        wine.likeCount,
        wine.noteCount,
        ...avgValues,
      ]);
    });

    summarySheet.columns.forEach((col) => {
      col.width = 18;
    });
    summarySheet.getColumn(2).width = 30;

    // ── Sheet 2: Raw matrix ───────────────────────────────────────
    const matrixSheet = workbook.addWorksheet('Матрица оценок');

    const matrixHeaders = [
      'Участник',
      ...matrix.wineHeaders.map((h) => `#${h.index} ${h.title}`),
    ];
    const matrixHeaderRow = matrixSheet.addRow(matrixHeaders);
    matrixHeaderRow.font = { bold: true };
    matrixHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };

    matrix.matrix.forEach((row) => {
      const rowValues = [
        row['userName'] as string,
        ...matrix.wineHeaders.map((h) => {
          const val = row[`wine_${h.index}`];
          return val !== null && val !== undefined ? val : '—';
        }),
      ];
      const dataRow = matrixSheet.addRow(rowValues);
      matrix.wineHeaders.forEach((h, colIdx) => {
        const liked = row[`wine_${h.index}_liked`];
        if (liked) {
          const cell = dataRow.getCell(colIdx + 2);
          cell.font = { color: { argb: 'FF9C2B3A' }, bold: true };
        }
      });
    });

    matrixSheet.columns.forEach((col) => {
      col.width = 20;
    });
    matrixSheet.getColumn(1).width = 28;

    // ── Sheet 3: Descriptor rankings ─────────────────────────────
    const descSheet = workbook.addWorksheet('Дескрипторы');

    const descHeaderRow = descSheet.addRow(['Аромат', 'Кол-во', '', 'Вкус', 'Кол-во']);
    descHeaderRow.font = { bold: true };

    const maxLen = Math.max(
      analytics.globalTopAroma.length,
      analytics.globalTopFlavour.length,
    );

    for (let i = 0; i < maxLen; i++) {
      const aroma = analytics.globalTopAroma[i];
      const flavour = analytics.globalTopFlavour[i];
      descSheet.addRow([
        aroma ? `${i + 1}. ${aroma.labelRu}` : '',
        aroma ? aroma.count : '',
        '',
        flavour ? `${i + 1}. ${flavour.labelRu}` : '',
        flavour ? flavour.count : '',
      ]);
    }

    descSheet.columns.forEach((col) => {
      col.width = 26;
    });

    const filePath = path.join(EXPORTS_DIR, `${jobId}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }
}
