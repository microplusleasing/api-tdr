import { BadRequestException, Injectable } from '@nestjs/common';
import { Connection } from 'oracledb';

import { DatabaseService } from '../../database.service';
import { CreateTdrAssessmentDto } from '../dto/create-tdr-assessment.dto';

export interface TdrAssessmentMasterContext {
  attachmentTypeIds: Map<string, number>;
}

interface AssessmentItemInput {
  itemId: string;
  remark?: string | null;
}

interface AssessmentItemMaster {
  ITEM_ID: string;
  REQUIRE_REMARK: string;
  IS_ACTIVE: string;
}

interface RestructureReasonMaster {
  REASON_CODE: string;
  REQUIRE_REMARK: string;
  IS_ACTIVE: string;
}

interface PaymentDetailInput {
  itemId: string;
  amount: number;
  remark?: string | null;
}

@Injectable()
export class TdrAssessmentMasterValidator {
  constructor(private readonly databaseService: DatabaseService) {}

  async validate(
    connection: Connection,
    request: CreateTdrAssessmentDto,
  ): Promise<TdrAssessmentMasterContext> {
    await this.validateRestructureReasons(connection, request);

    await this.validateVehicleUserType(connection, request);

    await this.validateMotorcyclePhotoTypes(connection, request);

    await this.validateAssessmentItems(connection, request);

    const attachmentTypeIds = await this.validateAttachmentTypes(
      connection,
      request,
    );

    return {
      attachmentTypeIds,
    };
  }

  // ===========================================================================
  // Restructure Reasons
  // ===========================================================================

  /**
   * Validate selected restructure reasons.
   *
   * Request:
   *
   * restructureReason: {
   *   reasons: [
   *     {
   *       reasonCode: string;
   *       selected: boolean;
   *       otherReason?: string;
   *     }
   *   ];
   * }
   *
   * Table:
   * M_RESTRUCTURE_REASON
   *
   * Validation:
   * - selected reasonCode must exist
   * - selected reasonCode must be active
   * - otherReason is required when IS_REMARK = 'Y'
   */
  private async validateRestructureReasons(
    connection: Connection,
    request: CreateTdrAssessmentDto,
  ): Promise<void> {
    const reasons = request.restructureReason?.reasons ?? [];

    const selectedReasons = reasons.filter(
      (reason) => reason.selected && !!reason.reasonCode,
    );

    if (selectedReasons.length === 0) {
      return;
    }

    const reasonCodes = [
      ...new Set(
        selectedReasons.map((reason) => reason.reasonCode),
      ),
    ];

    const placeholders = this.createBindPlaceholders(
      reasonCodes.length,
      'reasonCode',
    );

    const binds = this.createBinds(
      reasonCodes,
      'reasonCode',
    );

    const result =
      await this.databaseService.executeOnConnection<RestructureReasonMaster>(
        connection,
        `
          SELECT
            REASON_CODE,
            IS_REMARK AS REQUIRE_REMARK,
            IS_ACTIVE
          FROM MOBILEMPLS.M_RESTRUCTURE_REASON
          WHERE REASON_CODE IN (${placeholders})
        `,
        binds,
      );

    const masterReasons = result.rows ?? [];

    const activeReasons = new Map<string, RestructureReasonMaster>(
      masterReasons
        .filter((reason) => reason.IS_ACTIVE === 'Y')
        .map((reason) => [
          reason.REASON_CODE,
          reason,
        ]),
    );

    // -------------------------------------------------------------------------
    // Validate existence + active status
    // -------------------------------------------------------------------------

    const invalidReasonCodes = reasonCodes.filter(
      (reasonCode) => !activeReasons.has(reasonCode),
    );

    if (invalidReasonCodes.length > 0) {
      throw new BadRequestException({
        code: 'INVALID_MASTER_DATA',
        message:
          'One or more restructure reasons are invalid or inactive.',
        field: 'restructureReason.reasons',
        values: invalidReasonCodes,
      });
    }

    // -------------------------------------------------------------------------
    // Validate required remark
    // -------------------------------------------------------------------------

    const invalidRemarkReasonCodes = selectedReasons
      .filter((reason) => {
        const masterReason = activeReasons.get(
          reason.reasonCode,
        );

        if (!masterReason) {
          return false;
        }

        if (masterReason.REQUIRE_REMARK !== 'Y') {
          return false;
        }

        return !reason.otherReason?.trim();
      })
      .map((reason) => reason.reasonCode);

    if (invalidRemarkReasonCodes.length > 0) {
      throw new BadRequestException({
        code: 'REQUIRED_RESTRUCTURE_REASON_REMARK',
        message:
          'Other reason is required for one or more selected restructure reasons.',
        field: 'restructureReason.reasons',
        values: [...new Set(invalidRemarkReasonCodes)],
      });
    }
  }

  // ===========================================================================
  // Vehicle User Type
  // ===========================================================================

  /**
   * Validate vehicle user type.
   *
   * Table:
   * M_VEHICLE_USER_TYPE
   *
   * Validation:
   * - vehicleUserType must exist
   *
   * NOTE:
   * M_VEHICLE_USER_TYPE currently does not have IS_ACTIVE.
   */
  private async validateVehicleUserType(
    connection: Connection,
    request: CreateTdrAssessmentDto,
  ): Promise<void> {
    const vehicleUserType =
      request.productInformation?.vehicleUserType;

    if (!vehicleUserType) {
      return;
    }

    const result =
      await this.databaseService.executeOnConnection<{
        VEHICLE_USER_TYPE_CODE: string;
      }>(
        connection,
        `
          SELECT
            VEHICLE_USER_TYPE_CODE
          FROM MOBILEMPLS.M_VEHICLE_USER_TYPE
          WHERE VEHICLE_USER_TYPE_CODE = :vehicleUserType
        `,
        {
          vehicleUserType,
        },
      );

    const exists = (result.rows?.length ?? 0) > 0;

    if (!exists) {
      throw new BadRequestException({
        code: 'INVALID_MASTER_DATA',
        message: 'Vehicle user type is invalid.',
        field: 'productInformation.vehicleUserType',
        value: vehicleUserType,
      });
    }
  }

  // ===========================================================================
  // Motorcycle Photo Types
  // ===========================================================================

  /**
   * Validate motorcycle photo types.
   *
   * Table:
   * M_MOTORCYCLE_PHOTO_TYPE
   *
   * Validation:
   * - photoType must exist
   * - photoType must be active
   */
  private async validateMotorcyclePhotoTypes(
    connection: Connection,
    request: CreateTdrAssessmentDto,
  ): Promise<void> {
    const photos =
      request.productInformation?.motorcyclePhoto ?? [];

    const photoTypes = [
      ...new Set(
        photos
          .map((photo) => photo.photoType)
          .filter(
            (photoType): photoType is string =>
              !!photoType,
          ),
      ),
    ];

    if (photoTypes.length === 0) {
      return;
    }

    const placeholders = this.createBindPlaceholders(
      photoTypes.length,
      'photoType',
    );

    const binds = this.createBinds(
      photoTypes,
      'photoType',
    );

    const result =
      await this.databaseService.executeOnConnection<{
        PHOTO_TYPE_CODE: string;
      }>(
        connection,
        `
          SELECT
            PHOTO_TYPE_CODE
          FROM MOBILEMPLS.M_MOTORCYCLE_PHOTO_TYPE
          WHERE PHOTO_TYPE_CODE IN (${placeholders})
            AND IS_ACTIVE = 'Y'
        `,
        binds,
      );

    const activeCodes = new Set(
      (result.rows ?? []).map(
        (row) => row.PHOTO_TYPE_CODE,
      ),
    );

    const invalidCodes = photoTypes.filter(
      (code) => !activeCodes.has(code),
    );

    if (invalidCodes.length > 0) {
      throw new BadRequestException({
        code: 'INVALID_MASTER_DATA',
        message:
          'One or more motorcycle photo types are invalid or inactive.',
        field: 'productInformation.motorcyclePhoto',
        values: invalidCodes,
      });
    }
  }

  // ===========================================================================
  // Assessment Items
  // ===========================================================================

  /**
   * Validate assessment item IDs.
   *
   * Request:
   *
   * estimatePayment: {
   *   NECESSARY_EXPENSE: {
   *     [code: string]: {
   *       itemId: string;
   *       amount: number;
   *       remark?: string | null;
   *     };
   *   };
   *
   *   DEBT_OBLIGATION: {
   *     [code: string]: {
   *       itemId: string;
   *       amount: number;
   *       remark?: string | null;
   *     };
   *   };
   * }
   *
   * Table:
   * M_ASSESSMENT_ITEM
   *
   * Validation:
   * - itemId must exist
   * - itemId must be active
   * - remark is required when IS_REMARK = 'Y'
   */
  private async validateAssessmentItems(
    connection: Connection,
    request: CreateTdrAssessmentDto,
  ): Promise<void> {
    const items = this.collectAssessmentItems(request);

    if (items.length === 0) {
      return;
    }

    const itemIds = [
      ...new Set(
        items.map((item) => item.itemId),
      ),
    ];

    const placeholders = this.createBindPlaceholders(
      itemIds.length,
      'itemId',
    );

    const binds = this.createBinds(
      itemIds,
      'itemId',
    );

    const result =
      await this.databaseService.executeOnConnection<AssessmentItemMaster>(
        connection,
        `
          SELECT
            ITEM_ID,
            REQUIRE_REMARK,
            IS_ACTIVE
          FROM MOBILEMPLS.M_ASSESSMENT_ITEM
          WHERE ITEM_ID IN (${placeholders})
        `,
        binds,
      );

    const masterItems = result.rows ?? [];

    // -------------------------------------------------------------------------
    // Build active master item map
    // -------------------------------------------------------------------------

    const activeItems = new Map<string, AssessmentItemMaster>(
      masterItems
        .filter((item) => item.IS_ACTIVE === 'Y')
        .map((item) => [
          String(item.ITEM_ID),
          item,
        ]),
    );

    // -------------------------------------------------------------------------
    // Validate existence + active status
    // -------------------------------------------------------------------------

    const invalidItemIds = itemIds.filter(
      (itemId) =>
        !activeItems.has(String(itemId)),
    );

    if (invalidItemIds.length > 0) {
      throw new BadRequestException({
        code: 'INVALID_MASTER_DATA',
        message:
          'One or more assessment items are invalid or inactive.',
        field: 'estimatePayment',
        values: invalidItemIds,
      });
    }

    // -------------------------------------------------------------------------
    // Validate required remark
    // -------------------------------------------------------------------------

    const invalidRemarkItemIds = items
      .filter((item) => {
        const masterItem = activeItems.get(
          String(item.itemId),
        );

        if (!masterItem) {
          return false;
        }

        if (masterItem.REQUIRE_REMARK !== 'Y') {
          return false;
        }

        return !item.remark?.trim();
      })
      .map((item) => item.itemId);

    if (invalidRemarkItemIds.length > 0) {
      throw new BadRequestException({
        code: 'REMARK_REQUIRED',
        message:
          'Remark is required for one or more assessment items.',
        field: 'estimatePayment',
        values: [
          ...new Set(invalidRemarkItemIds),
        ],
      });
    }
  }

  /**
   * Collect all assessment items from:
   *
   * estimatePayment.NECESSARY_EXPENSE
   * estimatePayment.DEBT_OBLIGATION
   */
  private collectAssessmentItems(
    request: CreateTdrAssessmentDto,
  ): AssessmentItemInput[] {
    const items: AssessmentItemInput[] = [];

    this.collectAssessmentItemsFromGroup(
      request.estimatePayment?.NECESSARY_EXPENSE,
      items,
    );

    this.collectAssessmentItemsFromGroup(
      request.estimatePayment?.DEBT_OBLIGATION,
      items,
    );

    return items;
  }

  private collectAssessmentItemsFromGroup(
    group: Record<string, PaymentDetailInput> | undefined,
    items: AssessmentItemInput[],
  ): void {
    if (!group) {
      return;
    }

    for (const item of Object.values(group)) {
      if (!item?.itemId) {
        continue;
      }

      items.push({
        itemId: item.itemId,
        remark: item.remark ?? null,
      });
    }
  }

  // ===========================================================================
  // Attachment Types
  // ===========================================================================

  /**
   * Validate attachment codes.
   *
   * Table:
   * M_ATTACHMENT_TYPE
   *
   * Request:
   *
   * documentAttachments: {
   *   attachments: [
   *     {
   *       attachmentCode: string;
   *       files?: AttachmentFileDto[];
   *     }
   *   ];
   * }
   *
   * Validation:
   * - attachmentCode must exist
   * - attachmentCode must be active
   *
   * Returns:
   *
   * Map<attachmentCode, attachmentTypeId>
   */
  private async validateAttachmentTypes(
    connection: Connection,
    request: CreateTdrAssessmentDto,
  ): Promise<Map<string, number>> {
    const attachments =
      request.documentAttachments?.attachments ?? [];

    const declaredTypeIds = new Map<string, string>();

    for (const attachment of attachments) {
      if (attachment.attachmentTypeId) {
        declaredTypeIds.set(
          attachment.attachmentCode,
          attachment.attachmentTypeId,
        );
      }
    }

    const codes = [
      ...new Set(
        attachments
          .map(
            (attachment) =>
              attachment.attachmentCode,
          )
          .filter(
            (code): code is string => !!code,
          ),
      ),
    ];

    const resultMap = new Map<string, number>();

    if (codes.length === 0) {
      return resultMap;
    }

    const placeholders = this.createBindPlaceholders(
      codes.length,
      'attachmentCode',
    );

    const binds = this.createBinds(
      codes,
      'attachmentCode',
    );

    const result =
      await this.databaseService.executeOnConnection<{
        ATTACHMENT_CODE: string;
        ATTACHMENT_TYPE_ID: string;
      }>(
        connection,
        `
          SELECT
            ATTACHMENT_CODE,
            ATTACHMENT_TYPE_ID
          FROM MOBILEMPLS.M_ATTACHMENT_TYPE
          WHERE ATTACHMENT_CODE IN (${placeholders})
            AND IS_ACTIVE = 'Y'
          -- AND MODULE_CODE = 'TDR'
        `,
        binds,
      );

    const activeCodes = new Set<string>();

    for (const row of result.rows ?? []) {
      activeCodes.add(row.ATTACHMENT_CODE);

      resultMap.set(
        row.ATTACHMENT_CODE,
        Number(row.ATTACHMENT_TYPE_ID),
      );
    }

    const invalidCodes = codes.filter(
      (code) => !activeCodes.has(code),
    );

    if (invalidCodes.length > 0) {
      throw new BadRequestException({
        code: 'INVALID_MASTER_DATA',
        message:
          'One or more attachment types are invalid or inactive.',
        field: 'documentAttachments.attachments',
        values: invalidCodes,
      });
    }

    // -------------------------------------------------------------------------
    // The attachmentTypeId sent by the client must agree with the master table
    // -------------------------------------------------------------------------

    const mismatched = [...declaredTypeIds.entries()]
      .filter(
        ([code, typeId]) => resultMap.get(code) !== Number(typeId),
      )
      .map(([code, typeId]) => ({
        attachmentCode: code,
        sent: typeId,
        expected: resultMap.get(code),
      }));

    if (mismatched.length > 0) {
      throw new BadRequestException({
        code: 'ATTACHMENT_TYPE_ID_MISMATCH',
        message:
          'attachmentTypeId does not match attachmentCode in M_ATTACHMENT_TYPE.',
        field: 'documentAttachments.attachments',
        values: mismatched,
      });
    }

    return resultMap;
  }

  // ===========================================================================
  // SQL Bind Helpers
  // ===========================================================================

  /**
   * Create Oracle bind placeholders.
   *
   * Example:
   *
   * createBindPlaceholders(3, 'itemId')
   *
   * returns:
   *
   * :itemId0, :itemId1, :itemId2
   */
  private createBindPlaceholders(
    count: number,
    prefix: string,
  ): string {
    return Array.from(
      { length: count },
      (_, index) => `:${prefix}${index}`,
    ).join(', ');
  }

  /**
   * Create Oracle bind object.
   *
   * Example:
   *
   * createBinds(['1', '2'], 'itemId')
   *
   * returns:
   *
   * {
   *   itemId0: '1',
   *   itemId1: '2'
   * }
   */
  private createBinds(
    values: string[],
    prefix: string,
  ): Record<string, string> {
    return Object.fromEntries(
      values.map((value, index) => [
        `${prefix}${index}`,
        value,
      ]),
    );
  }
}