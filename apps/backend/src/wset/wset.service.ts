import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WineType } from '@prisma/client';

@Injectable()
export class WsetService {
  constructor(private prisma: PrismaService) {}

  async getDescriptorTree(wineType: WineType) {
    const all = await this.prisma.wsetDescriptor.findMany({
      where: { wineType },
      orderBy: { sortOrder: 'asc' },
    });

    const byId = new Map(all.map((d) => [d.id, { ...d, children: [] as any[] }]));
    const roots: any[] = [];

    for (const d of byId.values()) {
      if (d.parentId && byId.has(d.parentId)) {
        byId.get(d.parentId)!.children.push(d);
      } else if (!d.parentId) {
        roots.push(d);
      }
    }

    return roots;
  }
}
