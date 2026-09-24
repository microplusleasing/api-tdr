import { ApiProperty } from '@nestjs/swagger';

export class ContractExistResponseDto {
  @ApiProperty({
    description:
      'Indicates whether the contract number exists in T_SMS_GDR_TDR_LOG',
    example: true,
  })
  flag: boolean;

  constructor(flag: boolean) {
    this.flag = flag;
  }
}
