import { Test, TestingModule } from '@nestjs/testing';
import { TdrAssessmentController } from './tdr-assessment.controller';

describe('TdrAssessmentController', () => {
  let controller: TdrAssessmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TdrAssessmentController],
    }).compile();

    controller = module.get<TdrAssessmentController>(TdrAssessmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
