import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class FileInfoDto {
  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  fileExt?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
