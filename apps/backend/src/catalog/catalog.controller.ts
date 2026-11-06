import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Public()
  @Get()
  getCatalog(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('categories') categories?: string,
    @Query('country') country?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    return this.catalogService.getCatalog({
      q,
      type: type === 'WINE' || type === 'SPIRIT' ? type : undefined,
      categories,
      country,
      sort: sort === 'newest' ? 'newest' : 'likes',
      order: order === 'asc' ? 'asc' : 'desc',
    });
  }
}
