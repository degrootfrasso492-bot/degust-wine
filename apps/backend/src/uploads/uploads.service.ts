import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

/** Интерфейс загруженного файла (совместим с multer MemoryStorage). */
export interface UploadedImageFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const MAX_SIZE = 10 * 1024 * 1024; // 10 МБ

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * file-type — ESM-only пакет. Из CommonJS-сборки обычный `import()` после
 * транспиляции превращается в require() и падает с ERR_REQUIRE_ESM, поэтому
 * используем нативный динамический import через Function.
 */
const dynamicImport = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<any>;

/** Запасная проверка magic bytes, если file-type недоступен. */
function detectByMagic(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 6 &&
    buffer.subarray(0, 4).toString('ascii') === 'GIF8'
  ) {
    return 'image/gif';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

@Injectable()
export class UploadsService {
  /**
   * Сохраняет изображение на диск и возвращает публичный URL.
   *
   * Хранилище — локальная папка `uploads/`, раздаётся статически через
   * `app.useStaticAssets`. Для S3/MinIO в проде достаточно заменить тело
   * метода на PutObjectCommand с тем же контрактом { url }.
   */
  async saveImage(file: UploadedImageFile): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('Файл не передан');
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Файл пустой');
    }
    if (file.buffer.length > MAX_SIZE) {
      throw new BadRequestException('Файл слишком большой (максимум 10 МБ)');
    }

    // Никогда не доверяем клиентскому mimetype/расширению: определяем тип
    // по реальным байтам. Это закрывает stored XSS через .svg/.html и
    // подмену расширения.
    const detected = await this.detectMime(file.buffer);
    if (!detected || !ALLOWED_MIME.has(detected)) {
      throw new BadRequestException(
        'Допустимы только изображения (JPEG, PNG, WebP, GIF)',
      );
    }

    const ext = EXT_BY_MIME[detected];
    const filename = `${nanoid(16)}.${ext}`;

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    await fs.promises.writeFile(path.join(UPLOADS_DIR, filename), file.buffer);

    const baseUrl =
      process.env.BACKEND_URL ||
      `http://localhost:${process.env.BACKEND_PORT || 4000}`;

    return { url: `${baseUrl.replace(/\/$/, '')}/uploads/${filename}` };
  }

  private async detectMime(buffer: Buffer): Promise<string | null> {
    try {
      const { fileTypeFromBuffer } = await dynamicImport('file-type');
      const result = await fileTypeFromBuffer(buffer);
      if (result?.mime) return result.mime as string;
    } catch {
      // Пакет недоступен/сломан — переходим к magic bytes ниже.
    }
    return detectByMagic(buffer);
  }
}
