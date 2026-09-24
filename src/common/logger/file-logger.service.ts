import { Injectable } from '@nestjs/common';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class FileLoggerService {
  private readonly logDirectory = join(
    process.cwd(),
    'logs',
  );

  private readonly failedRequestDirectory = join(
    this.logDirectory,
    'failed-requests',
  );

  private readonly separator =
    '================================================================================';

  // ============================================================
  // API START
  // ============================================================

  async start(
    api: string,
    reqId: string,
  ): Promise<void> {
    await this.writeRaw(`${this.separator}\n`);

    await this.log(
      api,
      reqId,
      'START',
    );

    await this.writeRaw(`${this.separator}\n`);
  }

  // ============================================================
  // NORMAL LOG
  // ============================================================

  async log(
    api: string,
    reqId: string,
    message: string,
  ): Promise<void> {
    await this.write(
      'LOG',
      api,
      reqId,
      message,
    );
  }

  // ============================================================
  // ERROR LOG
  // ============================================================

  async error(
    api: string,
    reqId: string,
    message: string,
    error?: unknown,
  ): Promise<void> {
    const errorMessage = this.getErrorMessage(error);

    const finalMessage = errorMessage
      ? `${message}\n${errorMessage}`
      : message;

    await this.write(
      'ERROR',
      api,
      reqId,
      finalMessage,
    );
  }

  // ============================================================
  // API END
  // ============================================================

  async end(
    api: string,
    reqId: string,
    message = 'SUCCESS',
  ): Promise<void> {
    await this.log(
      api,
      reqId,
      message,
    );

    await this.writeRaw(`${this.separator}\n`);
  }

  // ============================================================
  // SAVE FAILED REQUEST
  // ============================================================

  async saveFailedRequest(
    api: string,
    reqId: string,
    request: unknown,
    error?: unknown,
  ): Promise<void> {
    const date = this.getDate();

    const dateDirectory = join(
      this.failedRequestDirectory,
      date,
    );

    await mkdir(
      dateDirectory,
      {
        recursive: true,
      },
    );

    const filePath = join(
      dateDirectory,
      `${reqId}.json`,
    );

    const failedRequest = {
      reqId,
      api,
      timestamp: this.getTimestamp(),
      error: this.serializeError(error),
      request,
    };

    await writeFile(
      filePath,
      JSON.stringify(
        failedRequest,
        null,
        2,
      ),
      'utf8',
    );
  }

  // ============================================================
  // PRIVATE - WRITE LOG
  // ============================================================

  private async write(
    level: 'LOG' | 'ERROR',
    api: string,
    reqId: string,
    message: string,
  ): Promise<void> {
    const timestamp = this.getTimestamp();

    const logMessage =
      `[${timestamp}] ` +
      `[${level}] ` +
      `[${api}] ` +
      `[${reqId}] ` +
      `${message}\n`;

    await this.writeRaw(logMessage);
  }

  // ============================================================
  // PRIVATE - WRITE RAW
  // ============================================================

  private async writeRaw(
    message: string,
  ): Promise<void> {
    await mkdir(
      this.logDirectory,
      {
        recursive: true,
      },
    );

    const date = this.getDate();

    const filePath = join(
      this.logDirectory,
      `${date}.txt`,
    );

    await appendFile(
      filePath,
      message,
      'utf8',
    );
  }

  // ============================================================
  // PRIVATE - ERROR MESSAGE
  // ============================================================

  private getErrorMessage(
    error: unknown,
  ): string {
    if (error instanceof Error) {
      return [
        `Error: ${error.message}`,
        error.stack
          ? `Stack: ${error.stack}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    if (error === undefined || error === null) {
      return '';
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(
        error,
        null,
        2,
      );
    } catch {
      return String(error);
    }
  }

  // ============================================================
  // PRIVATE - SERIALIZE ERROR FOR JSON
  // ============================================================

  private serializeError(
    error: unknown,
  ): unknown {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (
      error === undefined ||
      error === null
    ) {
      return null;
    }

    return error;
  }

  // ============================================================
  // PRIVATE - DATE
  // ============================================================

  private getDate(): string {
    return new Date().toLocaleDateString(
      'en-CA',
      {
        timeZone: 'Asia/Bangkok',
      },
    );
  }

  // ============================================================
  // PRIVATE - TIMESTAMP
  // ============================================================

  private getTimestamp(): string {
    const now = new Date();

    const date = now.toLocaleDateString(
      'en-CA',
      {
        timeZone: 'Asia/Bangkok',
      },
    );

    const time = now.toLocaleTimeString(
      'en-GB',
      {
        timeZone: 'Asia/Bangkok',
        hour12: false,
      },
    );

    return `${date} ${time}`;
  }
}