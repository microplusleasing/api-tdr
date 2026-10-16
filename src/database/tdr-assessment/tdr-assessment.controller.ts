import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';

import type { Request } from 'express';

import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { TdrAssessmentService } from './tdr-assessment.service';
import { ContractExistResponseDto } from './dto/tdr-assessment.dto';
import { CreateTdrAssessmentMultipartDto } from './dto/create-tdr-assessment-multipart.dto';
import { TdrAssessmentRequestValidator } from './validators/tdr-assessment-request.validator';
import { TdrAssessmentFileValidator } from './validators/tdr-assessment-file.validator';

import type { TdrUploadedFiles } from './validators/tdr-assessment-file.validator';

import {
  ALLOWED_UPLOAD_MIME_TYPES,
  FORM_FIELD_DOCUMENT_ATTACH,
  FORM_FIELD_MOTORCYCLE_PHOTO,
  MAX_DOCUMENT_ATTACH_FILES,
  MAX_MOTORCYCLE_PHOTO_FILES,
  MAX_UPLOAD_FILE_SIZE,
} from './constants/tdr-assessment.constants';

@ApiTags('TDR Assessment')
@Controller('tdr-assessment')
export class TdrAssessmentController {
  constructor(
    private readonly tdrAssessmentService: TdrAssessmentService,
    private readonly requestValidator: TdrAssessmentRequestValidator,
    private readonly fileValidator: TdrAssessmentFileValidator,
  ) {}

  @Get('contract/:contractNo/exist')
  @ApiOperation({
    summary: 'Check whether contract number exists',
  })
  @ApiParam({
    name: 'contractNo',
    description: 'Contract number to check',
    example: '110202206010013',
  })
  @ApiResponse({
    status: 200,
    type: ContractExistResponseDto,
  })
  async checkContractExists(
    @Param('contractNo') contractNo: string,
  ): Promise<ContractExistResponseDto> {
    return this.tdrAssessmentService.checkContractExists(contractNo);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new TDR assessment',
    description:
      'multipart/form-data with three kinds of parts:\n\n' +
      '- `data` - JSON text of the assessment\n' +
      '- `motocyclePhoto` - photo files (repeat the field per file)\n' +
      '- `documentAttach` - document files (repeat the field per file)\n\n' +
      'Files are linked to the JSON by their own file name: `motocyclePhoto` files ' +
      'are named after the photoType (`01.jpg`, `02.jpg`), `documentAttach` files ' +
      'after the attachmentTypeId (`1.pdf`, `2.pdf`).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateTdrAssessmentMultipartDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: FORM_FIELD_MOTORCYCLE_PHOTO,
          maxCount: MAX_MOTORCYCLE_PHOTO_FILES,
        },
        {
          name: FORM_FIELD_DOCUMENT_ATTACH,
          maxCount: MAX_DOCUMENT_ATTACH_FILES,
        },
      ],
      {
        limits: { fileSize: MAX_UPLOAD_FILE_SIZE },
        fileFilter: (_req, file, callback) => {
          if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
            return callback(
              new BadRequestException({
                code: 'UNSUPPORTED_FILE_TYPE',
                message: `Unsupported file type ${file.mimetype}.`,
                field: file.fieldname,
                allowed: ALLOWED_UPLOAD_MIME_TYPES,
              }),
              false,
            );
          }

          callback(null, true);
        },
      },
    ),
  )
  async create(
    @Body() body: CreateTdrAssessmentMultipartDto,
    @UploadedFiles() files: TdrUploadedFiles,
    @Req() req: Request,
  ) {
    // 1. `data` (JSON string) -> validated DTO
    const request = await this.requestValidator.parse(body.data);

    // 2. Attached files must agree with the names declared in `data`
    const resolvedFiles = await this.fileValidator.resolve(request, files);

    // 3. Extract client metadata
    const ipAddress =
      req.ip ||
      req.socket.remoteAddress ||
      null;

    const deviceInfo =
      req.get('user-agent') || null;

    // 4. Database work + saving files
    return this.tdrAssessmentService.create(
      request,
      resolvedFiles,
      ipAddress,
      deviceInfo,
    );
  }
}
