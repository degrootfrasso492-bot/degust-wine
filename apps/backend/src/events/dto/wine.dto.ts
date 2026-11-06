import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { WineCategory } from '@prisma/client';

export class CreateWineDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(WineCategory)
  category!: WineCategory;

  @IsNumber()
  orderIndex!: number;

  @IsNumber()
  @IsOptional()
  abv?: number;

  @IsString()
  @IsOptional()
  composition?: string;

  @IsString()
  @IsOptional()
  producer?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  aging?: string;

  @IsString()
  @IsOptional()
  methods?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  blindLabel?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}

export class UpdateWineDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(WineCategory)
  @IsOptional()
  category?: WineCategory;

  @IsNumber()
  @IsOptional()
  orderIndex?: number;

  @IsNumber()
  @IsOptional()
  abv?: number;

  @IsString()
  @IsOptional()
  composition?: string;

  @IsString()
  @IsOptional()
  producer?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  aging?: string;

  @IsString()
  @IsOptional()
  methods?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  blindLabel?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}
