import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmpty, IsNotEmpty, IsString } from 'class-validator';

import { TDR_ASSESSMENT_SWAGGER_EXAMPLE } from '../constants/tdr-assessment-swagger-example';

/**
 * What POST /tdr-assessment really receives: a multipart/form-data body.
 *
 * Only `data` ends up in `req.body`. The two file fields are consumed by
 * Multer and arrive through @UploadedFiles(); they are declared here so Swagger
 * UI renders file pickers.
 *
 * They carry @IsEmpty() on purpose: with target ES2022+ every declared class
 * field becomes a real (undefined) property, and the global ValidationPipe
 * (whitelist + forbidNonWhitelisted) rejects properties that have no
 * class-validator decorator. @IsEmpty() also makes it an error to send these
 * names as plain text fields instead of files.
 *
 * `data` is the JSON of CreateTdrAssessmentDto. It is validated separately by
 * TdrAssessmentRequestValidator, NOT by the global ValidationPipe (the pipe only
 * sees a string here).
 */
export class CreateTdrAssessmentMultipartDto {
  @ApiProperty({
    type: 'string',
    description:
      'JSON text of the assessment (CreateTdrAssessmentDto). ' +
      'Do not put File objects inside - attach them in the file fields below.',
    example: JSON.stringify(TDR_ASSESSMENT_SWAGGER_EXAMPLE),
  })
  @IsString()
  @IsNotEmpty()
  data!: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      'Motorcycle photos (image/PDF), one entry per photo. ' +
      'Name each file after its photoType: "01.jpg", "02.jpg" ' +
      '(a suffix is fine: "01-front.jpg").',
  })
  @IsEmpty({ message: 'motorcyclePhoto must be sent as file(s), not as text' })
  motorcyclePhoto?: unknown[];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      'Supporting documents (image/PDF), one entry per document. ' +
      'Name each file after its attachmentTypeId: "1.pdf", "2.pdf" ' +
      '(a suffix is fine: "1-id-card.pdf"). Several files may share one id.',
  })
  @IsEmpty({ message: 'documentAttach must be sent as file(s), not as text' })
  documentAttach?: unknown[];
}
