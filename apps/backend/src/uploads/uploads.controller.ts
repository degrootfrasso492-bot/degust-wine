import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UploadedImageFile, UploadsService } from './uploads.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 МБ

@Controller('uploads')
@UseGuards(RolesGuard)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('image')
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  uploadImage(@UploadedFile() file: UploadedImageFile) {
    return this.uploadsService.saveImage(file);
  }

  /** Загрузка аватара — доступна любому авторизованному пользователю. */
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  uploadAvatar(@UploadedFile() file: UploadedImageFile) {
    return this.uploadsService.saveImage(file);
  }
}
