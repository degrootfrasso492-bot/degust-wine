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
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Допустимы только изображения (JPEG, PNG, WebP, GIF)',
      );
    }
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Файл пустой');
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('Файл слишком большой (максимум 10 МБ)');
    }

    const ext = EXT_BY_MIME[file.mimetype] ?? 'bin';
    const filename = `${nanoid(16)}.${ext}`;

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    await fs.promises.writeFile(path.join(UPLOADS_DIR, filename), file.buffer);

    const baseUrl =
      process.env.BACKEND_URL ||
      `http://localhost:${process.env.BACKEND_PORT || 4000}`;

    return { url: `${baseUrl.replace(/\/$/, '')}/uploads/${filename}` };
  }
}
