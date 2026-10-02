import { BadRequestException, Injectable } from '@nestjs/common';

import { randomUUID } from 'crypto';

import { DatabaseService } from '../database.service';

import { ContractExistResponseDto } from './dto/tdr-assessment.dto';
import { CreateTdrAssessmentDto } from './dto/create-tdr-assessment.dto';

import { TdrAssessmentMasterValidator } from './validators/tdr-assessment-master.validator';
import { TdrAssessmentContractValidator } from './validators/tdr-assessment-contract.validator';

import { TdrAssessmentRepository } from './repositories/tdr-assessment.repository';

import { FileLoggerService } from '../../common/logger/file-logger.service';
import { FileStorageService } from '../../common/file-storage/file-storage.service';
import { ResolvedTdrFiles } from './validators/tdr-assessment-file.validator';

@Injectable()
export class TdrAssessmentService {
  private readonly LOG_API = 'TDR-CREATE';

  constructor(
    private readonly dbService: DatabaseService,
    private readonly masterValidator: TdrAssessmentMasterValidator,
    private readonly contractValidator: TdrAssessmentContractValidator,
    private readonly repository: TdrAssessmentRepository,
    private readonly fileLogger: FileLoggerService,
    private readonly fileStorage: FileStorageService,
  ) {}

  // ============================================================
  // Check Contract Exists
  // ============================================================

  async checkContractExists(
    contractNo: string,
  ): Promise<ContractExistResponseDto> {
    const normalizedContractNo = contractNo?.trim();

    if (!normalizedContractNo) {
      throw new BadRequestException('Contract number is required');
    }

    const exists = await this.existsByContractNo(normalizedContractNo);

    return new ContractExistResponseDto(exists);
  }

  private async existsByContractNo(contractNo: string): Promise<boolean> {
    const sql = `
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
    `;

    // db.execute() borrows one connection and always releases it.
    const result = await this.dbService.execute(sql, {
      contractNo,
    });

    return result.rows?.[0]?.FLAG === 1;
  }

  // ============================================================
  // Create TDR Assessment
  // ============================================================

  async create(request: CreateTdrAssessmentDto, files: ResolvedTdrFiles) {
    const reqId = this.generateReqId();

    /**
     * Keep track of files that were successfully written to
     * physical storage.
     *
     * Database transaction rollback does NOT automatically
     * delete files from the filesystem.
     */
    const writtenFiles: string[] = [];

    await this.fileLogger.start(this.LOG_API, reqId);

    try {
      await this.dbService.transaction(async (connection) => {
        // ======================================================
        // 1. Validate Contract
        // ======================================================

        await this.step(reqId, '[1/7] Contract validation', () =>
          this.contractValidator.validate(
            connection,
            request.customerInformation.contractNo,
          ),
        );

        // ======================================================
        // 2. Validate Master Data
        // ======================================================

        const masterContext = await this.step(
          reqId,
          '[2/7] Master validation',
          () => this.masterValidator.validate(connection, request),
        );

        // ======================================================
        // 3. Insert Customer Request
        // ======================================================

        await this.step(reqId, '[3/7] Insert customer request', () =>
          this.repository.insertCustomerRequest(connection, reqId, request),
        );

        // ======================================================
        // 4. Insert Customer Addresses
        // ======================================================

        await this.step(reqId, '[4/7] Insert customer addresses', () =>
          this.repository.insertCustomerAddresses(connection, reqId, request),
        );

        // ======================================================
        // 5. Insert Motorcycle Photos
        // ======================================================

        await this.step(reqId, '[5/7] Insert motorcycle photos', () =>
          this.repository.insertMotorcyclePhotos(
            connection,
            reqId,
            request,
            files,
            writtenFiles,
          ),
        );

        // ======================================================
        // 6. Insert Financial Assessment
        // ======================================================

        await this.step(reqId, '[6/7] Insert financial assessment', () =>
          this.repository.insertFinancialAssessment(
            connection,
            reqId,
            request,
          ),
        );

        // ======================================================
        // 7. Insert Attachments
        // ======================================================

        await this.step(reqId, '[7/7] Insert attachments', () =>
          this.repository.insertAttachments(
            connection,
            reqId,
            request,
            files,
            masterContext.attachmentTypeIds,
            writtenFiles,
          ),
        );
      });

      // ========================================================
      // Transaction committed
      // ========================================================

      await this.fileLogger.end(
        this.LOG_API,
        reqId,
        'CREATE SUCCESS - TRANSACTION COMMITTED',
      );

      return {
        success: true,
        reqId,
        message: 'TDR assessment created successfully',
      };
    } catch (error) {
      // ========================================================
      // Transaction failed
      // ========================================================

      /**
       * The Oracle transaction has already been rolled back
       * by DatabaseService.transaction().
       *
       * Delete files that were already written to disk because
       * filesystem operations are not part of the DB transaction.
       *
       * A cleanup failure must NOT hide the original error.
       */
      if (writtenFiles.length > 0) {
        try {
          await this.fileStorage.deleteFiles(writtenFiles);
        } catch (cleanupError) {
          await this.fileLogger.error(
            this.LOG_API,
            reqId,
            'FILE CLEANUP FAILED',
            cleanupError,
          );
        }
      }

      // ========================================================
      // Error Logging
      // ========================================================

      await this.fileLogger.error(
        this.LOG_API,
        reqId,
        'CREATE FAILED - TRANSACTION ROLLED BACK',
        error,
      );

      // ========================================================
      // Save Failed Request
      // ========================================================

      await this.fileLogger.saveFailedRequest(
        this.LOG_API,
        reqId,
        request,
        error,
      );

      await this.fileLogger.end(this.LOG_API, reqId, 'CREATE FAILED');

      throw error;
    }
  }

  // ============================================================
  // Step runner (writes "<label> START" / "<label> SUCCESS")
  // ============================================================

  private async step<T>(
    reqId: string,
    label: string,
    action: () => Promise<T>,
  ): Promise<T> {
    await this.fileLogger.log(this.LOG_API, reqId, `${label} START`);

    const result = await action();

    await this.fileLogger.log(this.LOG_API, reqId, `${label} SUCCESS`);

    return result;
  }

  // ============================================================
  // Generate Request ID
  // ============================================================

  private generateReqId(): string {
    return `TDR-${randomUUID()}`;
  }
}
