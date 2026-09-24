import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { Connection } from 'oracledb';

import { DatabaseService } from '../../database.service';

@Injectable()
export class TdrAssessmentContractValidator {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  async validate(
    connection: Connection,
    contractNo: string,
  ): Promise<void> {
    const result =
      await this.databaseService.executeOnConnection<{
        FLAG: number;
      }>(
        connection,
        `
          SELECT CASE
                   WHEN EXISTS (
                     SELECT 1
                     FROM BTW.T_SMS_GDR_TDR_LOG
                     WHERE CONTRACT_NO = :contractNo
                   )
                   THEN 1
                   ELSE 0
                 END AS FLAG
          FROM DUAL
        `,
        {
          contractNo,
        },
      );

    const exists =
      result.rows?.[0]?.FLAG === 1;

    if (!exists) {
      throw new BadRequestException({
        code: 'CONTRACT_NOT_FOUND',
        message:
          'Contract number was not found',
        field:
          'customerInformation.contractNo',
      });
    }
  }
}