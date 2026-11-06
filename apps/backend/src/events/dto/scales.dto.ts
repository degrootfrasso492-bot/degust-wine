import { IsArray, IsString } from 'class-validator';

export class SetEventScalesDto {
  @IsArray()
  @IsString({ each: true })
  scaleSlugs!: string[];
}
