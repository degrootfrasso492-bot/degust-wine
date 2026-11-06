import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { UpsertNoteDto } from './dto/note.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('notes')
@UseGuards(RolesGuard)
export class NotesController {
  constructor(private notesService: NotesService) {}

  @Post('upsert')
  upsertNote(@CurrentUser() user: any, @Body() dto: UpsertNoteDto) {
    return this.notesService.upsertNote(user.id, dto);
  }

  @Get('wine/:wineId')
  getNoteByWine(@CurrentUser() user: any, @Param('wineId') wineId: string) {
    return this.notesService.getNoteByWine(user.id, wineId);
  }

  @Get('me/liked')
  getLikedWines(@CurrentUser() user: any) {
    return this.notesService.getUserLikedWines(user.id);
  }

  @Get('me/history')
  getHistory(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notesService.getUserNotesHistory(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 30,
    );
  }

  @Get('me/events')
  getMyEvents(@CurrentUser() user: any) {
    return this.notesService.getUserEvents(user.id);
  }
}
