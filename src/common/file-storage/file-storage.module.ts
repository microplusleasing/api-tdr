// src/common/file-storage/file-storage.module.ts
import { Module } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';

@Module({
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}