import { Module } from '@nestjs/common';

import { TdrAssessmentController } from './tdr-assessment.controller';
import { TdrAssessmentService } from './tdr-assessment.service';
import { TdrAssessmentRepository } from './repositories/tdr-assessment.repository';
import { TdrAssessmentMasterValidator } from './validators/tdr-assessment-master.validator';
import { TdrAssessmentContractValidator } from './validators/tdr-assessment-contract.validator';
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
    FileLoggerService
  ],
  exports: [TdrAssessmentService],
})
export class TdrAssessmentModule {}