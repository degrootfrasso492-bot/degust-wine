import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsDateString, IsTimeZone } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  date!: string;

  @IsBoolean()
  isBlind!: boolean;

  @IsBoolean()
  @IsOptional()
  isManuallyOpen?: boolean;

  @IsTimeZone()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  accessPin?: string;

  @IsString()
  @IsOptional()
  coverUrl?: string;
}

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsBoolean()
  @IsOptional()
  isBlind?: boolean;

  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;

  @IsBoolean()
  @IsOptional()
  isManuallyOpen?: boolean;

  @IsTimeZone()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  accessPin?: string;

  @IsString()
  @IsOptional()
  coverUrl?: string;
}
