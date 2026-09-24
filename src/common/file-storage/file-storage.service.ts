// src/common/file-storage/file-storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly rootPath: string;

  constructor(private readonly configService: ConfigService) {
    // e.g. C:\mpls-files  — keep it configurable rather than hardcoded
    this.rootPath = this.configService.get<string>('FILE_STORAGE_ROOT') ?? 'C:\\mpls-files';
  }

  /**
   * Writes a file to {root}/{reqId}/{subFolder}/{fileName}
   * Creates directories as needed. Returns the full path written.
   */
  async saveFile(
    reqId: string,
    subFolder: string,
    fileName: string,
    content: Buffer,
  ): Promise<string> {
    const dir = path.join(this.rootPath, reqId, subFolder);
    await fs.mkdir(dir, { recursive: true });

    const fullPath = path.join(dir, fileName);
    await fs.writeFile(fullPath, content);

    return fullPath;
  }

  /**
   * Best-effort cleanup — used when a DB transaction fails
   * after files were already written to disk.
   */
  async deleteFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        // don't let cleanup failure mask the original error
        this.logger.warn(`Failed to delete orphaned file ${filePath}: ${err}`);
      }
    }
  }
}