import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import {
    MasterDataResponseDto,
    MotorcyclePhotoTypeDto,
    RestructureReasonDto,
} from './dto/master-data.dto';

@ApiTags('Master Data')
@Controller('master-data')
export class MasterDataController {
    constructor(
        private readonly masterDataService: MasterDataService,
    ) { }

    @Get('tdr-assessment')
    @ApiOperation({
        summary: 'Get application master data',
        description:
            'Returns master data used by the application.',
    })
    @ApiResponse({
        status: 200,
        description: 'Master data retrieved successfully.',
        type: MasterDataResponseDto,
    })
    async getMasterData(): Promise<MasterDataResponseDto> {
        return this.masterDataService.getMasterData();
    }

    @Get('motorcycle-photo-types')
    @ApiOperation({
        summary: 'Get motorcycle photo types',
    })
    @ApiResponse({
        status: 200,
        description: 'Motorcycle photo types retrieved successfully.',
        type: [MotorcyclePhotoTypeDto],
    })
    async getMotorcyclePhotoTypes(): Promise<MotorcyclePhotoTypeDto[]> {
        return this.masterDataService.getMotorcyclePhotoTypesDisplay();
    }

    @Get('restructure-reasons')
    @ApiOperation({
        summary: 'Get restructure reasons',
    })
    @ApiResponse({
        status: 200,
        description: 'Restructure reasons retrieved successfully.',
        type: [RestructureReasonDto],
    })
    async getRestructureReasons(): Promise<RestructureReasonDto[]> {
        return this.masterDataService.getRestructureReasonsDisplay();
    }

}
