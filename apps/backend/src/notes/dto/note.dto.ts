import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsArray, IsNumber, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DescriptorType } from '@prisma/client';

class ScoreValueDto {
  @IsString()
  @IsNotEmpty()
  attributeName!: string;

  @IsNumber()
  score!: number;
}

class DescriptorDto {
  @IsString()
  @IsNotEmpty()
  descriptorId!: string;

  @IsEnum(DescriptorType)
  type!: DescriptorType;
}

export class UpsertNoteDto {
  @IsString()
  @IsNotEmpty()
  wineId!: string;

  @IsBoolean()
  @IsOptional()
  isLiked?: boolean;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreValueDto)
  @IsOptional()
  scores?: ScoreValueDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DescriptorDto)
  @IsOptional()
  descriptors?: DescriptorDto[];
}
