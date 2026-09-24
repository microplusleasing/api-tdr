import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { TdrAssessmentService } from './tdr-assessment.service';
import { ContractExistResponseDto } from './dto/tdr-assessment.dto';
import { CreateTdrAssessmentDto } from './dto/create-tdr-assessment.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '../../common/types/uploaded-file.type';

@ApiTags('TDR Assessment')
@Controller('tdr-assessment')
export class TdrAssessmentController {
  constructor(private readonly tdrAssessmentService: TdrAssessmentService) {}

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
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateTdrAssessmentDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  @UseInterceptors(FilesInterceptor('files'))
  create(
    @Body() dto: CreateTdrAssessmentDto,
    @UploadedFiles() files: UploadedFile[],
  ) {
    return this.tdrAssessmentService.create(dto, files);
  }
}
