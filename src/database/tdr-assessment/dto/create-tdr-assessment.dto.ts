import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsRecordOf } from '../../../common/validators/is-record-of.decorator';


// ============================================================
// Address
// ============================================================

export class AddressDto {
  @ApiPropertyOptional({ example: '309' })
  @IsOptional()
  @IsString()
  houseNo?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  alley?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  soi?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  road?: string;

  @ApiPropertyOptional({ example: '10290' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'ในคลองบางปลากด' })
  @IsOptional()
  @IsString()
  subDistrict?: string;

  @ApiPropertyOptional({ example: 'พระสมุทรเจดีย์' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: 'สมุทรปราการ' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ example: '110504' })
  @IsOptional()
  @IsString()
  postalCodeLookup?: string;
}


// ============================================================
// Workplace Address
// ============================================================

export class WorkplaceAddressDto extends AddressDto {
  @ApiPropertyOptional({ example: '021143459' })
  @IsOptional()
  @IsString()
  workplacePhone?: string;

  @ApiPropertyOptional({ example: 'ใหญ่โต อลังการ' })
  @IsOptional()
  @IsString()
  workplaceDescription?: string;
}


// ============================================================
// Reference Person
// ============================================================

export class ReferencePersonDto {
  @ApiPropertyOptional({ example: 'พลวัต' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '0999999999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'เพื่อน' })
  @IsOptional()
  @IsString()
  relationship?: string;
}


// ============================================================
// Customer Information
// ============================================================

export class CustomerInformationDto {
  @ApiProperty({ example: '110202206010013' })
  @IsString()
  @Length(1, 50)
  contractNo!: string;

  @ApiProperty({ example: '001' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'ณภัทร' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'รอดเนียม' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: '1229900584011' })
  @IsString()
  citizenId!: string;

  @ApiProperty({ type: () => AddressDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => AddressDto)
  idCardAddress!: AddressDto;

  @ApiProperty({ example: true })
  @IsBoolean()
  registeredAddressSameAsIdCard!: boolean;

  @ApiProperty({ type: () => AddressDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => AddressDto)
  registeredAddress!: AddressDto;

  @ApiProperty({ example: true })
  @IsBoolean()
  currentAddressSameAsIdCard!: boolean;

  @ApiProperty({ type: () => AddressDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => AddressDto)
  currentAddress!: AddressDto;

  @ApiProperty({ example: '0952483338' })
  @IsString()
  phoneNo!: string;

  @ApiProperty({ example: '2' })
  @IsString()
  maritalStatus!: string;

  @ApiProperty({ example: '2' })
  @IsString()
  numberOfChildren!: string;

  @ApiProperty({ example: '1' })
  @IsString()
  dependents!: string;

  @ApiProperty({ example: 'Programmer' })
  @IsString()
  occupation!: string;

  @ApiProperty({ example: 'พนักงานประจำ' })
  @IsString()
  position!: string;

  @ApiProperty({ example: 'งาน Office' })
  @IsString()
  jobDescription!: string;

  @ApiProperty({ example: 'mpls leasing.co' })
  @IsString()
  workplaceName!: string;

  @ApiProperty({ type: () => WorkplaceAddressDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => WorkplaceAddressDto)
  workplaceAddress!: WorkplaceAddressDto;

  @ApiProperty({ type: () => ReferencePersonDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ReferencePersonDto)
  reference1!: ReferencePersonDto;

  @ApiProperty({ type: () => ReferencePersonDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ReferencePersonDto)
  reference2!: ReferencePersonDto;
}


// ============================================================
// Motorcycle Photo
// ============================================================
//
// IMPORTANT:
// Actual uploaded File is NOT placed inside this DTO.
// The binary comes through the multipart field `motorcyclePhoto`.
// This DTO only describes it, so the API can check the JSON against the
// files that were really attached:
//
//   photoType  -> which photo slot it is ("01", "02", ...). The attached file
//                 must be named after it: "01.jpg", "02.png" ("01-front.jpg" also works).
//   fileName   -> informational only, NOT compared with the attached file.
//

export class MotorcyclePhotoDto {
  @ApiProperty({ example: '01' })
  @IsString()
  photoType!: string;

  @ApiPropertyOptional({ example: '01-รูปหน้ารถ.jpg' })
  @IsOptional()
  @IsString()
  fileName?: string;
}


// ============================================================
// Product Information
// ============================================================

export class VehicleUserAddressDto extends AddressDto {}

/**
 * Angular currently also sends `productInformation.documentAttachments`
 * (a list of `{ attachmentTypeId }`). The real attachment data lives in the
 * top-level `documentAttachments`, so this is accepted and ignored.
 * It can be removed from the Angular payload.
 */
export class ProductDocumentAttachmentRefDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  attachmentTypeId?: string;
}

export class ProductInformationDto {
  @ApiProperty({ example: '01' })
  @IsString()
  brand!: string;

  @ApiProperty({ example: '0001' })
  @IsString()
  model!: string;

  @ApiProperty({ example: 'ดำ' })
  @IsString()
  color!: string;

  @ApiProperty({ example: 'ปค1311' })
  @IsString()
  registrationNo!: string;

  @ApiProperty({ example: 'VUS01' })
  @IsString()
  vehicleUserType!: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @ApiProperty({ example: 'สมปอง' })
  @IsString()
  currentUserName!: string;

  @ApiProperty({ example: 'เพื่อน' })
  @IsString()
  relationship!: string;

  @ApiProperty({ example: '0999999999' })
  @IsString()
  currentUserPhone!: string;

  @ApiProperty({ example: '93/1 หมู่ 3 ซ.วัดใหญ่' })
  @IsString()
  currentCondition!: string;

  @ApiProperty({ type: () => VehicleUserAddressDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => VehicleUserAddressDto)
  carUserAddress!: VehicleUserAddressDto;

  @ApiProperty({ example: '200000' })
  @IsString()
  currentMileage!: string;

  @ApiProperty({
    type: () => MotorcyclePhotoDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MotorcyclePhotoDto)
  motorcyclePhoto!: MotorcyclePhotoDto[];

  @ApiPropertyOptional({
    type: () => ProductDocumentAttachmentRefDto,
    isArray: true,
    deprecated: true,
    description: 'Ignored. Use the top-level documentAttachments instead.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDocumentAttachmentRefDto)
  documentAttachments?: ProductDocumentAttachmentRefDto[];
}


// ============================================================
// Estimate Income
// ============================================================

export class IncomeDetailDto {
  @ApiProperty({ example: 25000 })
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  remark?: string | null;
}


export class EstimateIncomeDto {
  @ApiProperty({
    description: 'Map of income code to income detail',
    example: {
      PRIMARY_INCOME: {
        amount: 25000,
        remark: null,
      },
      EXTRA_INCOME: {
        amount: 10000,
        remark: null,
      },
    },
  })
  @IsObject()
  @IsRecordOf(() => IncomeDetailDto)
  incomes!: Record<string, IncomeDetailDto>;
}


// ============================================================
// Estimate Payment
// ============================================================

export class PaymentDetailDto {
  @ApiProperty({ example: '6' })
  @IsString()
  itemId!: string;

  @ApiProperty({ example: 3000 })
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  remark?: string | null;
}


export class EstimatePaymentDto {
  @ApiProperty({
    description:
      'Map of necessary expense code to payment detail. ' +
      'The property name is UPPER_SNAKE_CASE because that is what Angular sends.',
    example: {
      HOUSING_EXPENSE: {
        itemId: '6',
        amount: 3000,
        remark: null,
      },
      UTILITIES_EXPENSE: {
        itemId: '7',
        amount: 6000,
        remark: null,
      },
    },
  })
  @IsObject()
  @IsRecordOf(() => PaymentDetailDto)
  NECESSARY_EXPENSE!: Record<string, PaymentDetailDto>;

  @ApiProperty({
    description: 'Map of debt obligation code to payment detail',
    example: {
      HOUSING_LOAN_PAYMENT: {
        itemId: '13',
        amount: 3000,
        remark: null,
      },
      AUTO_LOAN_PAYMENT: {
        itemId: '14',
        amount: 1000,
        remark: null,
      },
    },
  })
  @IsObject()
  @IsRecordOf(() => PaymentDetailDto)
  DEBT_OBLIGATION!: Record<string, PaymentDetailDto>;
}


// ============================================================
// Restructure Reason
// ============================================================

export class RestructureReasonItemDto {
  @ApiProperty({ example: 'R001' })
  @IsString()
  reasonCode!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  selected!: boolean;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  otherReason?: string;
}


export class RestructureReasonDto {
  @ApiProperty({
    type: () => RestructureReasonItemDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestructureReasonItemDto)
  reasons!: RestructureReasonItemDto[];
}


// ============================================================
// Document Attachments
// ============================================================

export class AttachmentFileDto {
  @ApiPropertyOptional({ example: 'id_card.pdf' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ example: 512000 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 'pdf' })
  @IsOptional()
  @IsString()
  fileExt?: string;

  @ApiPropertyOptional({ example: 'Certified copy' })
  @IsOptional()
  @IsString()
  remark?: string;
}


// Actual binaries come through the multipart field `documentAttach`.
// An uploaded file belongs to the attachment whose attachmentTypeId equals the
// number its file name starts with ("1.pdf", "1-id-card.pdf" -> attachmentTypeId "1").
// files[].fileName is informational only; files[].remark is paired by position.
export class AttachmentDto {
  @ApiProperty({ example: 'ID_CARD' })
  @IsString()
  attachmentCode!: string;

  @ApiPropertyOptional({
    example: '1',
    description:
      'Checked against M_ATTACHMENT_TYPE. Uploaded files named after it ' +
      '("1.pdf", "1-id-card.pdf") are linked to this attachment.',
  })
  @IsOptional()
  @IsString()
  attachmentTypeId?: string;

  @ApiProperty({
    type: () => AttachmentFileDto,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentFileDto)
  files?: AttachmentFileDto[] | null;
}


export class DocumentAttachmentsDto {
  @ApiProperty({
    type: () => AttachmentDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments!: AttachmentDto[];
}


// ============================================================
// Main Create DTO
// ============================================================

export class CreateTdrAssessmentDto {
  @ApiProperty({
    type: () => CustomerInformationDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => CustomerInformationDto)
  customerInformation!: CustomerInformationDto;

  @ApiProperty({
    type: () => ProductInformationDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProductInformationDto)
  productInformation!: ProductInformationDto;

  @ApiProperty({
    type: () => EstimateIncomeDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => EstimateIncomeDto)
  estimateIncome!: EstimateIncomeDto;

  @ApiProperty({
    type: () => EstimatePaymentDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => EstimatePaymentDto)
  estimatePayment!: EstimatePaymentDto;

  @ApiProperty({
    type: () => RestructureReasonDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => RestructureReasonDto)
  restructureReason!: RestructureReasonDto;

  @ApiProperty({
    type: () => DocumentAttachmentsDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => DocumentAttachmentsDto)
  documentAttachments!: DocumentAttachmentsDto;
}