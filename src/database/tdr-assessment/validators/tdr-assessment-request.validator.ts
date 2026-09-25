import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { flattenValidationErrors } from '../../../common/validators/is-record-of.decorator';
import { CreateTdrAssessmentDto } from '../dto/create-tdr-assessment.dto';
import { FORM_FIELD_DATA } from '../constants/tdr-assessment.constants';

/**
 * Turns the multipart `data` text field into a validated CreateTdrAssessmentDto.
 *
 * Why this exists:
 * multipart/form-data can only carry strings and files, so the nested JSON
 * arrives as ONE string in `req.body.data`. The global ValidationPipe cannot
 * validate that string as the nested DTO, so we parse and validate it here
 * with the same options the global pipe uses (whitelist + forbidNonWhitelisted).
 */
@Injectable()
export class TdrAssessmentRequestValidator {
  async parse(rawData: string): Promise<CreateTdrAssessmentDto> {
    const json = this.parseJson(rawData);

    const dto = plainToInstance(CreateTdrAssessmentDto, json);

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const details = flattenValidationErrors(errors);

      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        field: FORM_FIELD_DATA,
        errors: details,
      });
    }

    return dto;
  }

  private parseJson(rawData: string): Record<string, unknown> {
    let json: unknown;

    try {
      json = JSON.parse(rawData);
    } catch (error) {
      throw new BadRequestException({
        code: 'INVALID_JSON',
        message: `Form field "${FORM_FIELD_DATA}" is not valid JSON`,
        field: FORM_FIELD_DATA,
        reason: error instanceof Error ? error.message : String(error),
      });
    }

    if (typeof json !== 'object' || json === null || Array.isArray(json)) {
      throw new BadRequestException({
        code: 'INVALID_JSON',
        message: `Form field "${FORM_FIELD_DATA}" must be a JSON object`,
        field: FORM_FIELD_DATA,
      });
    }

    return json as Record<string, unknown>;
  }
}
