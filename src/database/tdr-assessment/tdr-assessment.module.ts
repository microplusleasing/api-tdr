import { Module } from '@nestjs/common';

import { TdrAssessmentController } from './tdr-assessment.controller';
import { TdrAssessmentService } from './tdr-assessment.service';
import { TdrAssessmentRepository } from './repositories/tdr-assessment.repository';
import { TdrAssessmentMasterValidator } from './validators/tdr-assessment-master.validator';
import { TdrAssessmentContractValidator } from './validators/tdr-assessment-contract.validator';
import { TdrAssessmentRequestValidator } from './validators/tdr-assessment-request.validator';
import { TdrAssessmentFileValidator } from './validators/tdr-assessment-file.validator';
import { FileLoggerService } from '../../common/logger/file-logger.service';
import { FileStorageModule } from '../../common/file-storage/file-storage.module';
import { DatabaseModule } from '../database.module';

@Module({
  imports: [DatabaseModule,FileStorageModule],
  controllers: [TdrAssessmentController],
  providers: [
    TdrAssessmentService,
    TdrAssessmentRepository,
    TdrAssessmentMasterValidator,
    TdrAssessmentContractValidator,
    TdrAssessmentRequestValidator,
    TdrAssessmentFileValidator,
    FileLoggerService,
  ],
  exports: [TdrAssessmentService],
})
export class TdrAssessmentModule {}