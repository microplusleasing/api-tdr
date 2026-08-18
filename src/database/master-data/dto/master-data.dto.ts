import { ApiProperty } from '@nestjs/swagger';

export class AttachmentTypeDisplayDto {
    @ApiProperty({
        example: 1,
        description: 'ID ประเภทเอกสารแนบ',
    })
    attachmentTypeId!: number;

    @ApiProperty({
        example: 'ID_CARD',
        description: 'Code ประเภทเอกสารแนบ',
    })
    attachmentCode!: string;

    @ApiProperty({
        example: 'สำเนาบัตรประชาชน',
        description: 'ชื่อประเภทเอกสารแนบ',
    })
    attachmentName!: string;

    @ApiProperty({
        example: 1,
        description: 'ลำดับการแสดงผล',
    })
    displayOrder!: number;

    @ApiProperty({
        example: true,
        description: 'ต้องแนบเอกสารหรือไม่',
    })
    isRequired!: boolean;

    @ApiProperty({
        example: false,
        description: 'อนุญาตให้อัปโหลดหลายไฟล์หรือไม่',
    })
    allowMultiple!: boolean;

    @ApiProperty({
        example: 'pdf,jpg,jpeg,png',
        nullable: true,
        description: 'ประเภทไฟล์ที่อนุญาต',
    })
    acceptFileType!: string | null;

    @ApiProperty({
        example: 10,
        nullable: true,
        description: 'ขนาดไฟล์สูงสุด MB',
    })
    maxFileSizeMb!: number | null;

    @ApiProperty({
        example: 'จำเป็น',
        nullable: true,
        description: 'ข้อความแสดงสถานะ required',
    })
    labelRequired!: string | null;

    @ApiProperty({
        example: '#FF0000',
        nullable: true,
        description: 'สีของข้อความ required',
    })
    labelRequiredColor!: string | null;
}

export class DocumentTypeDisplayDto {
    @ApiProperty({
        example: 'ID_CARD',
        description: 'Code ประเภทเอกสาร',
    })
    documentCode!: string;

    @ApiProperty({
        example: 'สำเนาบัตรประชาชน',
        description: 'ชื่อประเภทเอกสาร',
    })
    documentName!: string;

    @ApiProperty({
        example: true,
        description: 'ต้องระบุหมายเหตุหรือไม่',
    })
    requireRemark!: boolean;

    @ApiProperty({
        example: 1,
        description: 'ลำดับการแสดงผล',
    })
    displayOrder!: number;

    @ApiProperty({
        example: false,
        description: 'อนุญาตให้มีหลายรายการหรือไม่',
    })
    allowMultiple!: boolean;
}

export class StatusCodeDisplayDto {
    @ApiProperty({
        example: 2,
        description: 'ID สถานะ',
    })
    statusId!: number;

    @ApiProperty({
        example: 'SUBMITTED',
        description: 'Code สถานะ',
    })
    statusCode!: string;

    @ApiProperty({
        example: 'ส่งคำขอแล้ว',
        description: 'ชื่อสถานะ',
    })
    statusName!: string;

    @ApiProperty({
        example: 1,
        description: 'ลำดับการแสดงผล',
    })
    displayOrder!: number;
}

export class MotorcyclePhotoTypeDto {
    @ApiProperty({
        example: '01',
        description: 'Code ประเภทรูปถ่ายรถจักรยานยนต์',
    })
    code!: string;

    @ApiProperty({
        example: 'รูปหน้ารถ',
        description: 'ชื่อประเภทรูปถ่ายรถจักรยานยนต์',
    })
    name!: string;

    @ApiProperty({
        example: 1,
        description: 'ลำดับการแสดงผล',
    })
    displayOrder!: number;
}

export class RestructureReasonDto {
    @ApiProperty({
        example: '01',
        description: 'Code เหตุผลการปรับโครงสร้างหนี้',
    })
    code!: string;

    @ApiProperty({
        example: 'รายได้ลดลง',
        description: 'ชื่อเหตุผลการปรับโครงสร้างหนี้',
    })
    name!: string;

    @ApiProperty({
        example: true,
        description: 'ต้องระบุรายละเอียดเพิ่มเติมหรือไม่',
    })
    requireRemark!: boolean;

    @ApiProperty({
        example: 1,
        description: 'ลำดับการแสดงผล',
    })
    displayOrder!: number;
}

export class AddressTypeDisplayDto {
    @ApiProperty({
        example: '01',
        description: 'Code ประเภทที่อยู่',
    })
    code!: string;

    @ApiProperty({
        example: 'ที่อยู่ตามทะเบียนบ้าน',
        description: 'ชื่อประเภทที่อยู่',
    })
    name!: string;

    @ApiProperty({
        example: 2,
        description: 'ลำดับการแสดงผล',
    })
    displayOrder!: number;
}

export class AssessmentItemDisplayDto {
    @ApiProperty({
        example: 1,
        description: 'ID ของรายการประเมิน',
    })
    itemId!: number;

    @ApiProperty({
        example: 'PRIMARY_INCOME',
        description: 'Code ของรายการประเมิน',
    })
    itemCode!: string;

    @ApiProperty({
        example: 'รายได้หลัก (เงินเดือน/ค่าจ้าง)',
        description: 'ชื่อรายการประเมิน',
    })
    itemName!: string;

    @ApiProperty({
        example: 1,
        description: 'ลำดับการแสดงผลภายใน Category',
    })
    displayOrder!: number;

    @ApiProperty({
        example: true,
        description: 'ต้องระบุหมายเหตุหรือไม่',
    })
    requireRemark!: boolean;

    @ApiProperty({
        example: 'N',
        description: 'ประเภทข้อมูลของหมายเหตุ',
    })
    remarkTextType!: string | null;
}

export class AssessmentCategoryDisplayDto {
    @ApiProperty({
        example: 1,
        description: 'ID ของ Category',
    })
    categoryId!: number;

    @ApiProperty({
        example: 'MONTHLY_INCOME',
        description: 'Code ของ Category',
    })
    categoryCode!: string;

    @ApiProperty({
        example: 'รายการรายรับต่อเดือน',
        description: 'ชื่อ Category',
    })
    categoryName!: string;

    @ApiProperty({
        example: 1,
        description: 'ลำดับการแสดงผลภายใน Group',
    })
    displayOrder!: number;

    @ApiProperty({
        type: [AssessmentItemDisplayDto],
    })
    items!: AssessmentItemDisplayDto[];
}

export class AssessmentGroupDisplayDto {
    @ApiProperty({
        example: 1,
        description: 'ID ของ Group',
    })
    groupId!: number;

    @ApiProperty({
        example: 'INCOME',
        description: 'Code ของ Group',
    })
    groupCode!: string;

    @ApiProperty({
        example: 'การประเมินรายได้ (รวมต่อเดือน)',
        description: 'ชื่อ Group',
    })
    groupName!: string;

    @ApiProperty({
        example: 1,
        description: 'ลำดับการแสดงผลของ Group',
    })
    displayOrder!: number;

    @ApiProperty({
        type: [AssessmentCategoryDisplayDto],
    })
    categories!: AssessmentCategoryDisplayDto[];
}

class MasterDataParametersDto {
    // @ApiProperty({
    //     type: [MotorcyclePhotoTypeDto],
    // })
    // motorcyclePhotoTypes!: MotorcyclePhotoTypeDto[];

    // @ApiProperty({
    //     type: [RestructureReasonDto],
    // })
    // restructureReasons!: RestructureReasonDto[];
}

export class MasterDataDisplayDto {

    @ApiProperty({
        type: [MotorcyclePhotoTypeDto],
    })
    motorcyclePhotoTypes!: MotorcyclePhotoTypeDto[];

    @ApiProperty({
        type: [RestructureReasonDto],
    })
    
    restructureReasons!: RestructureReasonDto[];
    @ApiProperty({
        type: [AddressTypeDisplayDto],
    })
    addressTypes!: AddressTypeDisplayDto[];

    @ApiProperty({
        type: [AssessmentGroupDisplayDto],
    })
    assessment!: AssessmentGroupDisplayDto[];

    @ApiProperty({
        type: [AttachmentTypeDisplayDto],
    })
    attachmentTypes!: AttachmentTypeDisplayDto[];

    @ApiProperty({
        type: [DocumentTypeDisplayDto],
    })
    documentTypes!: DocumentTypeDisplayDto[];

    @ApiProperty({
        type: [StatusCodeDisplayDto],
    })
    statusCodes!: StatusCodeDisplayDto[];
}

export class MasterDataResponseDto {
    @ApiProperty({
        type: MasterDataParametersDto,
    })
    parameters!: MasterDataParametersDto;

    @ApiProperty({
        type: MasterDataDisplayDto,
    })
    display!: MasterDataDisplayDto;
}