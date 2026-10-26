// src/common/filters/api-exception.filter.ts
import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  FORM_FIELD_DATA, FORM_FIELD_DOCUMENT_ATTACH, FORM_FIELD_MOTORCYCLE_PHOTO,
  MAX_DOCUMENT_ATTACH_FILES, MAX_MOTORCYCLE_PHOTO_FILES,
} from '../../database/tdr-assessment/constants/tdr-assessment.constants';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const raw = exception.getResponse();
      const obj: Record<string, any> =
        typeof raw === 'string' ? { message: raw } : (raw as Record<string, any>);

      if (obj.code) {
        // already structured by our validators -> keep as is
        body = obj;
      } else if (Array.isArray(obj.message)) {
        // global ValidationPipe
        body = { code: 'VALIDATION_FAILED', message: 'Request validation failed', errors: obj.message };
      } else {
        body = this.mapMulter(String(obj.message), status) ?? {
          code: 'BAD_REQUEST', message: obj.message,
        };
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    res.status(status).json({
      statusCode: status,
      ...body,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }

  /** Multer errors reach Nest as plain messages; give them a code. */
  private mapMulter(message: string, status: number): Record<string, unknown> | null {
    switch (message) {
      case 'Unexpected field':
        return {
          code: 'UNEXPECTED_FORM_FIELD',
          message: 'A form field or file field name is not accepted by this endpoint.',
          allowedFields: [FORM_FIELD_DATA, FORM_FIELD_MOTORCYCLE_PHOTO, FORM_FIELD_DOCUMENT_ATTACH],
        };
      case 'Too many files':
        return {
          code: 'TOO_MANY_FILES',
          message: 'Too many files were attached.',
          limits: {
            [FORM_FIELD_MOTORCYCLE_PHOTO]: MAX_MOTORCYCLE_PHOTO_FILES,
            [FORM_FIELD_DOCUMENT_ATTACH]: MAX_DOCUMENT_ATTACH_FILES,
          },
        };
      case 'File too large':
        return { code: 'FILE_TOO_LARGE', message: 'An attached file exceeds the size limit.' };
      default:
        return null;
    }
  }
}