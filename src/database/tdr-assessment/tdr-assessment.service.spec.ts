import { Test, TestingModule } from '@nestjs/testing';
import { TdrAssessmentService } from './tdr-assessment.service';

describe('TdrAssessmentService', () => {
  let service: TdrAssessmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TdrAssessmentService],
    }).compile();

    service = module.get<TdrAssessmentService>(TdrAssessmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
