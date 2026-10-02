import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { randomUUID } from 'crypto';

import { Connection, Result } from 'oracledb';

import { DatabaseService } from '../database.service';

import { FileLoggerService } from '../../common/logger/file-logger.service';

import {
  AddressTypeDisplayDto,
  AssessmentCategoryDisplayDto,
  AssessmentGroupDisplayDto,
  AttachmentTypeDisplayDto,
  BrandDto,
  CurrentVehicleConditionDto,
  LocationDto,
  MarriedStatusDto,
  MasterDataResponseDto,
  ModelDto,
  MotorcyclePhotoTypeDto,
  RestructureReasonMasterDataDto,
  StatusCodeDisplayDto,
  TitleDto,
  VehicleUserTypeDto,
} from './dto/master-data.dto';

// ============================================================
// Assessment flat result
// ============================================================

interface AssessmentDisplayRow {
  GROUP_ID: number;
  GROUP_CODE: string;
  GROUP_NAME: string;
  GROUP_DISPLAY_ORDER: number;

  CATEGORY_ID: number | null;
  CATEGORY_CODE: string | null;
  CATEGORY_NAME: string | null;
  CATEGORY_DISPLAY_ORDER: number | null;

  ITEM_ID: number | null;
  ITEM_CODE: string | null;
  ITEM_NAME: string | null;
  ITEM_DISPLAY_ORDER: number | null;

  REQUIRE_REMARK: string | null;
  REMARK_TEXT_TYPE: string | null;
}

@Injectable()
export class MasterDataService {
  /**
   * Master data rarely changes, so keep it in memory for a while
   * instead of hitting Oracle on every page load / browser refresh.
   */
  private static readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  private cache?: { data: MasterDataResponseDto; expiresAt: number };

  /** Shared in-flight load so concurrent requests trigger ONE DB load. */
  private inflight?: Promise<MasterDataResponseDto>;

  /** reqId of the load currently in flight (shown in joined-request logs). */
  private inflightReqId?: string;

  private readonly LOG_API = 'MASTER-DATA';

  private readonly logger = new Logger(MasterDataService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly fileLogger: FileLoggerService,
  ) {}

  // ============================================================
  // Query runner
  // ============================================================

  /**
   * Run a query on the given connection when provided
   * (one connection shared by the whole request),
   * otherwise borrow a connection just for this single query.
   */
  private run<T>(sql: string, connection?: Connection): Promise<Result<T>> {
    return connection
      ? this.db.executeOnConnection<T>(connection, sql)
      : this.db.query<T>(sql);
  }

  // ============================================================
  // Master Data (cached)
  // ============================================================

  async getMasterData(): Promise<MasterDataResponseDto> {
    // const reqId = this.generateReqId();
    const reqId = 'master-data/tdr-assessment'

    // Served from memory: one log line only (no START/END block),
    // otherwise every page load would flood the daily log file.
    if (this.cache && this.cache.expiresAt > Date.now()) {
      await this.safeLog(reqId, 'CACHE HIT');

      return this.cache.data;
    }

    // Another request is already loading from Oracle: wait for it.
    if (this.inflight) {
      await this.safeLog(
        reqId,
        `JOINED IN-FLIGHT LOAD ${this.inflightReqId}`,
      );

      return this.inflight;
    }

    this.inflightReqId = reqId;

    this.inflight = this.loadMasterData(reqId)
      .then((data) => {
        this.cache = {
          data,
          expiresAt: Date.now() + MasterDataService.CACHE_TTL_MS,
        };

        return data;
      })
      .finally(() => {
        this.inflight = undefined;
        this.inflightReqId = undefined;
      });

    return this.inflight;
  }

  /** Call this if master data is changed in the database and must show now. */
  clearCache(): void {
    this.cache = undefined;
  }

  // ============================================================
  // Master Data (load from DB using ONE connection)
  // ============================================================

  private async loadMasterData(
    reqId: string,
  ): Promise<MasterDataResponseDto> {
    const startedAt = Date.now();

    await this.safeStart(reqId);

    try {
      const data = await this.db.withConnection(async (conn) => {
        // Time spent waiting for a free pooled connection.
        // A large value here = pool starvation (the NJS-040 problem).
        await this.safeLog(
          reqId,
          `Connection acquired in ${Date.now() - startedAt} ms`,
        );

        // Queries run one after another on the same connection
        // (an Oracle connection executes one statement at a time anyway).

        // --------------------------------------------------------
        // Parameters
        // --------------------------------------------------------

        const titles = await this.step(reqId, '[1/13] Titles', () =>
          this.getTitles(conn),
        );

        const locations = await this.step(reqId, '[2/13] Locations', () =>
          this.getLocations(conn),
        );

        const marriedStatus = await this.step(
          reqId,
          '[3/13] Married status',
          () => this.getMarriedStatus(conn),
        );

        const brands = await this.step(reqId, '[4/13] Brands', () =>
          this.getBrands(conn),
        );

        const models = await this.step(reqId, '[5/13] Models', () =>
          this.getModels(conn),
        );

        const currentVehicleConditionTypes = await this.step(
          reqId,
          '[6/13] Current vehicle conditions',
          () => this.getCurrentVehicleCondition(conn),
        );

        // --------------------------------------------------------
        // Display
        // --------------------------------------------------------

        const motorcyclePhotoTypes = await this.step(
          reqId,
          '[7/13] Motorcycle photo types',
          () => this.getMotorcyclePhotoTypesDisplay(conn),
        );

        const vehicleUserTypes = await this.step(
          reqId,
          '[8/13] Vehicle user types',
          () => this.getVehicleUserTypes(conn),
        );

        const restructureReasons = await this.step(
          reqId,
          '[9/13] Restructure reasons',
          () => this.getRestructureReasonsDisplay(conn),
        );

        const addressTypes = await this.step(
          reqId,
          '[10/13] Address types',
          () => this.getAddressTypeDisplay(conn),
        );

        const assessment = await this.step(reqId, '[11/13] Assessment', () =>
          this.getAssessmentDisplay(conn),
        );

        const attachmentTypes = await this.step(
          reqId,
          '[12/13] Attachment types',
          () => this.getAttachmentTypesDisplay(conn),
        );

        const statusCodes = await this.step(
          reqId,
          '[13/13] Status codes',
          () => this.getStatusCodesDisplay(conn),
        );

        return {
          // ====================================================
          // Parameters
          // ====================================================

          parameters: {
            titles,
            locations,
            marriedStatus,
            brands,
            models,
            currentVehicleConditionTypes,
          },

          // ====================================================
          // Display
          // ====================================================

          display: {
            motorcyclePhotoTypes,
            vehicleUserTypes,
            restructureReasons,
            addressTypes,
            assessment,
            attachmentTypes,
            statusCodes,
          },
        };
      });

      await this.safeEnd(
        reqId,
        `LOAD SUCCESS - cached for ` +
          `${MasterDataService.CACHE_TTL_MS / 1000} s ` +
          `(total ${Date.now() - startedAt} ms)`,
      );

      return data;
    } catch (error) {
      await this.safeError(reqId, 'LOAD FAILED', error);

      await this.safeSaveFailedRequest(reqId, error);

      await this.safeEnd(
        reqId,
        `LOAD FAILED (total ${Date.now() - startedAt} ms)`,
      );

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
    const stepStartedAt = Date.now();

    await this.safeLog(reqId, `${label} START`);

    try {
      const result = await action();

      const rows = Array.isArray(result) ? `, ${result.length} rows` : '';

      await this.safeLog(
        reqId,
        `${label} SUCCESS (${Date.now() - stepStartedAt} ms${rows})`,
      );

      return result;
    } catch (error) {
      // Shows exactly which step failed; full error is logged by the caller.
      await this.safeLog(
        reqId,
        `${label} FAILED (${Date.now() - stepStartedAt} ms)`,
      );

      throw error;
    }
  }

  // ============================================================
  // Safe file logging
  // (a log-file problem, e.g. folder permission on IIS,
  //  must NEVER break the API response)
  // ============================================================

  private async safeStart(reqId: string): Promise<void> {
    try {
      await this.fileLogger.start(this.LOG_API, reqId);
    } catch (error) {
      this.warnLogFailure(error);
    }
  }

  private async safeLog(reqId: string, message: string): Promise<void> {
    try {
      await this.fileLogger.log(this.LOG_API, reqId, message);
    } catch (error) {
      this.warnLogFailure(error);
    }
  }

  private async safeError(
    reqId: string,
    message: string,
    error: unknown,
  ): Promise<void> {
    try {
      await this.fileLogger.error(this.LOG_API, reqId, message, error);
    } catch (logError) {
      this.warnLogFailure(logError);
    }
  }

  private async safeEnd(reqId: string, message: string): Promise<void> {
    try {
      await this.fileLogger.end(this.LOG_API, reqId, message);
    } catch (error) {
      this.warnLogFailure(error);
    }
  }

  private async safeSaveFailedRequest(
    reqId: string,
    error: unknown,
  ): Promise<void> {
    try {
      // GET endpoint has no body; record which endpoint failed.
      await this.fileLogger.saveFailedRequest(
        this.LOG_API,
        reqId,
        { method: 'GET', path: '/master-data/tdr-assessment' },
        error,
      );
    } catch (saveError) {
      this.warnLogFailure(saveError);
    }
  }

  private warnLogFailure(error: unknown): void {
    this.logger.warn(
      `Unable to write file log: ${(error as Error).message}`,
    );
  }

  // ============================================================
  // Parameters
  // ============================================================

  // ============================================================
  // Titles
  // ============================================================

  private async getTitles(connection?: Connection): Promise<TitleDto[]> {
    const result = await this.run<{
      TITLE_ID: string;
      TITLE_NAME: string;
      SEX: string | null;
      STATUS_SHOW_RECT: string | null;
      STATUS_SHOW_VAT: string | null;
      STATUS_SHOW_DEALER: string | null;
    }>(
      `
      SELECT
        TITLE_ID,
        TITLE_NAME,
        SEX,
        STATUS_SHOW_RECT,
        STATUS_SHOW_VAT,
        STATUS_SHOW_DEALER
      FROM BTW.TITLE_P
      ORDER BY TITLE_ID
    `,
      connection,
    );

    const rows = result.rows ?? [];

    return rows.map((row) => ({
      titleId: row.TITLE_ID,
      titleName: row.TITLE_NAME,
      sex: row.SEX,
      statusShowRect: row.STATUS_SHOW_RECT === 'Y',
      statusShowVat: row.STATUS_SHOW_VAT === 'Y',
      statusShowDealer: row.STATUS_SHOW_DEALER === 'Y',
    }));
  }

  // ============================================================
  // Locations
  // ============================================================

  private async getLocations(connection?: Connection): Promise<LocationDto[]> {
    const result = await this.run<{
      POST_CODE: string;
      SUB_DISTRICT: string;
      DISTRICT: string;
      PROVINCE: string;
      LOCATION_CODE: string | null;
      PROVINCE_CODE: string | null;
      FLOOD_EFFECT: string | null;
    }>(
      `
      SELECT
        POST_CODE,
        SUB_DISTRICT,
        DISTRICT,
        PROVINCE,
        LOCATION_CODE,
        PROVINCE_CODE,
        FLOOD_EFFECT
      FROM BTW.X_POST_CODE
      ORDER BY
        POST_CODE,
        PROVINCE,
        DISTRICT,
        SUB_DISTRICT
    `,
      connection,
    );

    const rows = result.rows ?? [];

    return rows.map((row) => ({
      postCode: row.POST_CODE,
      subDistrict: row.SUB_DISTRICT,
      district: row.DISTRICT,
      province: row.PROVINCE,
      locationCode: row.LOCATION_CODE,
      provinceCode: row.PROVINCE_CODE,
      floodEffect: row.FLOOD_EFFECT,

      label_text: `${[
        row.SUB_DISTRICT,
        row.DISTRICT,
        row.PROVINCE,
        row.POST_CODE,
      ]
        .filter(Boolean)
        .join(' / ')}`,
    }));
  }

  // ============================================================
  // MARRIED_STATUS
  // ============================================================

  private async getMarriedStatus(
    connection?: Connection,
  ): Promise<MarriedStatusDto[]> {
    const result = await this.run<{
      CODE: string;
      NAME: string;
    }>(
      `
      SELECT
        CODE,
        NAME
      FROM
        BTW.X_MARRIED_STATUS_P
      WHERE
        CODE NOT IN ('0')
      ORDER BY
        CODE ASC
    `,
      connection,
    );

    const rows = result.rows ?? [];

    return rows.map((row) => ({
      code: row.CODE,
      name: row.NAME,
    }));
  }

  // ============================================================
  // BRAND
  // ============================================================

  private async getBrands(connection?: Connection): Promise<BrandDto[]> {
    const result = await this.run<{
      BRAND_CODE: string;
      BRAND_NAME: string;
    }>(
      `
      SELECT
          BRAND_CODE,
          BRAND_NAME
      FROM
          BTW.X_BRAND_P
      WHERE
          ACTIVE_STATUS = 'Y'
          AND PRO_CODE = '01'
      ORDER BY
          BRAND_CODE ASC
    `,
      connection,
    );

    const rows = result.rows ?? [];

    return rows.map((row) => ({
      brand_code: row.BRAND_CODE,
      brand_name: row.BRAND_NAME,
    }));
  }

  // ============================================================
  // MODEL
  // ============================================================

  private async getModels(connection?: Connection): Promise<ModelDto[]> {
    const result = await this.run<{
      BRAND_CODE: string;
      MODEL_CODE: string;
      MODEL_NAME: string;
      MODEL_KEY: string;
    }>(
      `
      SELECT
          B.BRAND_CODE,
          P.MODEL_CODE,
          P.MODEL AS MODEL_NAME,
          P.BRAND_CODE || '-' || MODEL_CODE AS MODEL_KEY
      FROM
          BTW.X_MODEL_P P,
          BTW.X_BRAND_P B
      WHERE
          P.BRAND_CODE = B.BRAND_CODE
          AND P.PRO_CODE = B.PRO_CODE
          AND P.PRO_CODE = '01'
    `,
      connection,
    );

    const rows = result.rows ?? [];

    return rows.map((row) => ({
      brand_code: row.BRAND_CODE,
      model_code: row.MODEL_CODE,
      model_name: row.MODEL_NAME,
      model_key: row.MODEL_KEY,
    }));
  }

  // ============================================================
  // CURRENT_VEHICLE_CONDITION
  // ============================================================

  private async getCurrentVehicleCondition(
    connection?: Connection,
  ): Promise<CurrentVehicleConditionDto[]> {
    const result = await this.run<{
      CODE: string;
      NAME: string;
      ORDER_INDEX: number;
    }>(
      `
      SELECT
          CONDITION_CODE AS CODE,
          CONDITION_NAME AS NAME,
          ORDER_INDEX
      FROM
          MOBILEMPLS.M_CURRENT_VEHICLE_CONDITION
    `,
      connection,
    );

    const rows = result.rows ?? [];

    return rows.map((row) => ({
      code: row.CODE,
      name: row.NAME,
      order_index: row.ORDER_INDEX,
    }));
  }

  // ============================================================
  // Display
  // ============================================================

  // ============================================================
  // Motorcycle Photo Types
  // (public: also used directly by the controller, so the
  //  connection is optional)
  // ============================================================

  async getMotorcyclePhotoTypesDisplay(
    connection?: Connection,
  ): Promise<MotorcyclePhotoTypeDto[]> {
    const result = await this.run<{
      PHOTO_TYPE_CODE: string;
      PHOTO_TYPE_NAME: string;
      DISPLAY_ORDER: number;
    }>(
      `
      SELECT
        PHOTO_TYPE_CODE,
        PHOTO_TYPE_NAME,
        DISPLAY_ORDER
      FROM MOBILEMPLS.M_MOTORCYCLE_PHOTO_TYPE
      WHERE IS_ACTIVE = 'Y'
      ORDER BY DISPLAY_ORDER
    `,
      connection,
    );

    const rows = result.rows ?? [];

    this.validateDisplayOrder('motorcyclePhotoTypes', rows);

    return rows.map((row) => ({
      code: row.PHOTO_TYPE_CODE,
      name: row.PHOTO_TYPE_NAME,
      displayOrder: row.DISPLAY_ORDER,
    }));
  }

  // ============================================================
  // VEHICLE_USER_TYPE
  // ============================================================

  private async getVehicleUserTypes(
    connection?: Connection,
  ): Promise<VehicleUserTypeDto[]> {
    // NOTE: the row type now matches the selected columns
    // (before, it declared CODE / NAME but the code read
    //  VEHICLE_USER_TYPE_CODE / VEHICLE_USER_TYPE_NAME).
    const result = await this.run<{
      VEHICLE_USER_TYPE_CODE: string;
      VEHICLE_USER_TYPE_NAME: string;
      DISPLAY_ORDER: number;
      REMARK_TEXT_TYPE: string | null;
    }>(
      `
      SELECT
        VEHICLE_USER_TYPE_CODE,
        VEHICLE_USER_TYPE_NAME,
        DISPLAY_ORDER,
        REMARK_TEXT_TYPE
      FROM
        MOBILEMPLS.M_VEHICLE_USER_TYPE
      ORDER BY
        DISPLAY_ORDER
    `,
      connection,
    );

    const rows = result.rows ?? [];

    return rows.map((row) => ({
      code: row.VEHICLE_USER_TYPE_CODE,
      name: row.VEHICLE_USER_TYPE_NAME,
      displayOrder: row.DISPLAY_ORDER,
      remarkTextType: row.REMARK_TEXT_TYPE,
    }));
  }

  // ============================================================
  // Restructure Reasons
  // (public: also used directly by the controller)
  // ============================================================

  async getRestructureReasonsDisplay(
    connection?: Connection,
  ): Promise<RestructureReasonMasterDataDto[]> {
    const result = await this.run<{
      REASON_CODE: string;
      REASON_NAME: string;
      IS_REMARK: string | null;
      DISPLAY_ORDER: number;
    }>(
      `
      SELECT
        REASON_CODE,
        REASON_NAME,
        IS_REMARK,
        DISPLAY_ORDER
      FROM MOBILEMPLS.M_RESTRUCTURE_REASON
      WHERE IS_ACTIVE = 'Y'
      ORDER BY DISPLAY_ORDER
    `,
      connection,
    );

    const rows = result.rows ?? [];

    this.validateDisplayOrder('restructureReasons', rows);

    return rows.map((row) => ({
      code: row.REASON_CODE,
      name: row.REASON_NAME,
      requireRemark: row.IS_REMARK === 'Y',
      displayOrder: row.DISPLAY_ORDER,
    }));
  }

  // ============================================================
  // Address Types
  // ============================================================

  private async getAddressTypeDisplay(
    connection?: Connection,
  ): Promise<AddressTypeDisplayDto[]> {
    const result = await this.run<{
      ADDRESS_TYPE_CODE: string;
      ADDRESS_TYPE_NAME: string;
      DISPLAY_ORDER: number;
    }>(
      `
      SELECT
        ADDRESS_TYPE_CODE,
        ADDRESS_TYPE_NAME,
        DISPLAY_ORDER
      FROM MOBILEMPLS.M_ADDRESS_TYPE
      ORDER BY DISPLAY_ORDER
    `,
      connection,
    );

    const rows = result.rows ?? [];

    this.validateDisplayOrder('addressTypes', rows);

    return rows.map((row) => ({
      code: row.ADDRESS_TYPE_CODE,
      name: row.ADDRESS_TYPE_NAME,
      displayOrder: row.DISPLAY_ORDER,
    }));
  }

  // ============================================================
  // Assessment
  // ============================================================

  private async getAssessmentDisplay(
    connection?: Connection,
  ): Promise<AssessmentGroupDisplayDto[]> {
    const rows = await this.queryAssessmentDisplay(connection);

    this.validateAssessmentDisplayOrder(rows);

    return this.buildAssessmentTree(rows);
  }

  // ============================================================
  // Assessment Query
  // ============================================================

  private async queryAssessmentDisplay(
    connection?: Connection,
  ): Promise<AssessmentDisplayRow[]> {
    const result = await this.run<AssessmentDisplayRow>(
      `
        SELECT
          g.GROUP_ID,
          g.GROUP_CODE,
          g.GROUP_NAME,
          g.DISPLAY_ORDER
            AS GROUP_DISPLAY_ORDER,

          c.CATEGORY_ID,
          c.CATEGORY_CODE,
          c.CATEGORY_NAME,
          c.DISPLAY_ORDER
            AS CATEGORY_DISPLAY_ORDER,

          i.ITEM_ID,
          i.ITEM_CODE,
          i.ITEM_NAME,
          i.DISPLAY_ORDER
            AS ITEM_DISPLAY_ORDER,

          i.REQUIRE_REMARK,
          i.REMARK_TEXT_TYPE

        FROM MOBILEMPLS.M_ASSESSMENT_GROUP g

        LEFT JOIN
          MOBILEMPLS.M_ASSESSMENT_CATEGORY c
          ON c.GROUP_ID = g.GROUP_ID
          AND c.IS_ACTIVE = 'Y'

        LEFT JOIN
          MOBILEMPLS.M_ASSESSMENT_ITEM i
          ON i.CATEGORY_ID = c.CATEGORY_ID
          AND i.IS_ACTIVE = 'Y'

        WHERE g.IS_ACTIVE = 'Y'

        ORDER BY
          g.DISPLAY_ORDER,
          c.DISPLAY_ORDER,
          i.DISPLAY_ORDER
      `,
      connection,
    );

    return result.rows ?? [];
  }

  // ============================================================
  // Attachment Types
  // ============================================================

  async getAttachmentTypesDisplay(
    connection?: Connection,
  ): Promise<AttachmentTypeDisplayDto[]> {
    const result = await this.run<{
      ATTACHMENT_TYPE_ID: number;
      ATTACHMENT_CODE: string;
      ATTACHMENT_NAME: string;
      DISPLAY_ORDER: number;
      IS_REQUIRED: string | null;
      ALLOW_MULTIPLE: string | null;
      ACCEPT_FILE_TYPE: string | null;
      MAX_FILE_SIZE_MB: number | null;
      LABEL_REQUIRED: string | null;
      LABEL_REQUIRED_COLOR: string | null;
    }>(
      `
      SELECT
        ATTACHMENT_TYPE_ID,
        ATTACHMENT_CODE,
        ATTACHMENT_NAME,
        DISPLAY_ORDER,
        IS_REQUIRED,
        ALLOW_MULTIPLE,
        ACCEPT_FILE_TYPE,
        MAX_FILE_SIZE_MB,
        LABEL_REQUIRED,
        LABEL_REQUIRED_COLOR
      FROM MOBILEMPLS.M_ATTACHMENT_TYPE
      WHERE IS_ACTIVE = 'Y'
      ORDER BY DISPLAY_ORDER
    `,
      connection,
    );

    const rows = result.rows ?? [];

    this.validateDisplayOrder('attachmentTypes', rows);

    return rows.map((row) => ({
      attachmentTypeId: row.ATTACHMENT_TYPE_ID,
      attachmentCode: row.ATTACHMENT_CODE,
      attachmentName: row.ATTACHMENT_NAME,
      displayOrder: row.DISPLAY_ORDER,
      isRequired: row.IS_REQUIRED === 'Y',
      allowMultiple: row.ALLOW_MULTIPLE === 'Y',
      acceptFileType: row.ACCEPT_FILE_TYPE,
      maxFileSizeMb: row.MAX_FILE_SIZE_MB,
      labelRequired: row.LABEL_REQUIRED,
      labelRequiredColor: row.LABEL_REQUIRED_COLOR,
    }));
  }

  // ============================================================
  // Status Codes
  // ============================================================

  async getStatusCodesDisplay(
    connection?: Connection,
  ): Promise<StatusCodeDisplayDto[]> {
    const result = await this.run<{
      STATUS_ID: number;
      STATUS_CODE: string;
      STATUS_NAME: string;
      DISPLAY_ORDER: number;
    }>(
      `
      SELECT
        STATUS_ID,
        STATUS_CODE,
        STATUS_NAME,
        DISPLAY_ORDER
      FROM MOBILEMPLS.M_STATUS_CODE
      WHERE IS_ACTIVE = 'Y'
      ORDER BY DISPLAY_ORDER
    `,
      connection,
    );

    const rows = result.rows ?? [];

    this.validateDisplayOrder('statusCodes', rows);

    return rows.map((row) => ({
      statusId: row.STATUS_ID,
      statusCode: row.STATUS_CODE,
      statusName: row.STATUS_NAME,
      displayOrder: row.DISPLAY_ORDER,
    }));
  }

  // ============================================================
  // Assessment Validation
  // ============================================================

  private validateAssessmentDisplayOrder(rows: AssessmentDisplayRow[]): void {
    this.validateGroupDisplayOrder(rows);

    this.validateCategoryDisplayOrder(rows);

    this.validateItemDisplayOrder(rows);
  }

  // ============================================================
  // Group Validation
  // ============================================================

  private validateGroupDisplayOrder(rows: AssessmentDisplayRow[]): void {
    const groups = new Map<number, number>();

    for (const row of rows) {
      if (!groups.has(row.GROUP_ID)) {
        groups.set(row.GROUP_ID, row.GROUP_DISPLAY_ORDER);
      }
    }

    this.validateUniqueDisplayOrder(
      Array.from(groups.entries()).map(([groupId, displayOrder]) => ({
        id: groupId,
        displayOrder,
      })),

      'assessment.groups',
    );
  }

  // ============================================================
  // Category Validation
  // ============================================================

  private validateCategoryDisplayOrder(rows: AssessmentDisplayRow[]): void {
    const categories = new Map<
      number,
      {
        groupId: number;
        displayOrder: number;
      }
    >();

    for (const row of rows) {
      if (row.CATEGORY_ID === null || row.CATEGORY_DISPLAY_ORDER === null) {
        continue;
      }

      if (!categories.has(row.CATEGORY_ID)) {
        categories.set(row.CATEGORY_ID, {
          groupId: row.GROUP_ID,
          displayOrder: row.CATEGORY_DISPLAY_ORDER,
        });
      }
    }

    this.validateUniqueDisplayOrderByParent(
      Array.from(categories.entries()).map(([categoryId, category]) => ({
        id: categoryId,
        parentId: category.groupId,
        displayOrder: category.displayOrder,
      })),

      'assessment.categories',
    );
  }

  // ============================================================
  // Item Validation
  // ============================================================

  private validateItemDisplayOrder(rows: AssessmentDisplayRow[]): void {
    const items = new Map<
      number,
      {
        categoryId: number;
        displayOrder: number;
      }
    >();

    for (const row of rows) {
      if (
        row.ITEM_ID === null ||
        row.CATEGORY_ID === null ||
        row.ITEM_DISPLAY_ORDER === null
      ) {
        continue;
      }

      if (!items.has(row.ITEM_ID)) {
        items.set(row.ITEM_ID, {
          categoryId: row.CATEGORY_ID,
          displayOrder: row.ITEM_DISPLAY_ORDER,
        });
      }
    }

    this.validateUniqueDisplayOrderByParent(
      Array.from(items.entries()).map(([itemId, item]) => ({
        id: itemId,
        parentId: item.categoryId,
        displayOrder: item.displayOrder,
      })),

      'assessment.items',
    );
  }

  // ============================================================
  // Build Assessment Tree
  // ============================================================

  private buildAssessmentTree(
    rows: AssessmentDisplayRow[],
  ): AssessmentGroupDisplayDto[] {
    const groupMap = new Map<number, AssessmentGroupDisplayDto>();

    const categoryMap = new Map<number, AssessmentCategoryDisplayDto>();

    for (const row of rows) {
      const group = this.getOrCreateGroup(groupMap, row);

      if (row.CATEGORY_ID === null || row.CATEGORY_CODE === null) {
        continue;
      }

      const category = this.getOrCreateCategory(categoryMap, group, row);

      if (row.ITEM_ID === null || row.ITEM_CODE === null) {
        continue;
      }

      category.items.push({
        itemId: row.ITEM_ID,
        itemCode: row.ITEM_CODE.trim(),
        itemName: row.ITEM_NAME ?? '',
        displayOrder: row.ITEM_DISPLAY_ORDER!,
        requireRemark: row.REQUIRE_REMARK === 'Y',
        remarkTextType: row.REMARK_TEXT_TYPE,
      });
    }

    return Array.from(groupMap.values());
  }

  // ============================================================
  // Get / Create Group
  // ============================================================

  private getOrCreateGroup(
    groupMap: Map<number, AssessmentGroupDisplayDto>,

    row: AssessmentDisplayRow,
  ): AssessmentGroupDisplayDto {
    let group = groupMap.get(row.GROUP_ID);

    if (group) {
      return group;
    }

    group = {
      groupId: row.GROUP_ID,
      groupCode: row.GROUP_CODE,
      groupName: row.GROUP_NAME,
      displayOrder: row.GROUP_DISPLAY_ORDER,
      categories: [],
    };

    groupMap.set(row.GROUP_ID, group);

    return group;
  }

  // ============================================================
  // Get / Create Category
  // ============================================================

  private getOrCreateCategory(
    categoryMap: Map<number, AssessmentCategoryDisplayDto>,

    group: AssessmentGroupDisplayDto,

    row: AssessmentDisplayRow,
  ): AssessmentCategoryDisplayDto {
    if (row.CATEGORY_ID === null) {
      throw new InternalServerErrorException('CATEGORY_ID is required.');
    }

    let category = categoryMap.get(row.CATEGORY_ID);

    if (category) {
      return category;
    }

    if (row.CATEGORY_DISPLAY_ORDER === null) {
      throw new InternalServerErrorException(
        `CATEGORY_DISPLAY_ORDER is required ` +
          `for CATEGORY_ID ${row.CATEGORY_ID}.`,
      );
    }

    category = {
      categoryId: row.CATEGORY_ID,
      categoryCode: row.CATEGORY_CODE!,
      categoryName: row.CATEGORY_NAME ?? '',
      displayOrder: row.CATEGORY_DISPLAY_ORDER,
      items: [],
    };

    categoryMap.set(row.CATEGORY_ID, category);

    group.categories.push(category);

    return category;
  }

  // ============================================================
  // Generic Validation
  // ============================================================

  private validateUniqueDisplayOrder(
    records: Array<{
      id: number;
      displayOrder: number;
    }>,

    schemaName: string,
  ): void {
    const displayOrderToId = new Map<number, number>();

    for (const record of records) {
      const existingId = displayOrderToId.get(record.displayOrder);

      if (existingId !== undefined && existingId !== record.id) {
        throw new InternalServerErrorException(
          `Invalid display configuration "${schemaName}". ` +
            `DISPLAY_ORDER ${record.displayOrder} ` +
            `is duplicated between ID ` +
            `${existingId} and ${record.id}.`,
        );
      }

      displayOrderToId.set(record.displayOrder, record.id);
    }
  }

  // ============================================================
  // Generic Parent Validation
  // ============================================================

  private validateUniqueDisplayOrderByParent(
    records: Array<{
      id: number;
      parentId: number;
      displayOrder: number;
    }>,

    schemaName: string,
  ): void {
    const parentDisplayOrders = new Map<number, Map<number, number>>();

    for (const record of records) {
      let displayOrders = parentDisplayOrders.get(record.parentId);

      if (!displayOrders) {
        displayOrders = new Map<number, number>();

        parentDisplayOrders.set(record.parentId, displayOrders);
      }

      const existingId = displayOrders.get(record.displayOrder);

      if (existingId !== undefined && existingId !== record.id) {
        throw new InternalServerErrorException(
          `Invalid display configuration "${schemaName}". ` +
            `DISPLAY_ORDER ${record.displayOrder} ` +
            `is duplicated within parent ID ` +
            `${record.parentId}. ` +
            `Conflicting IDs: ` +
            `${existingId} and ${record.id}.`,
        );
      }

      displayOrders.set(record.displayOrder, record.id);
    }
  }

  // ============================================================
  // Simple Display Validation
  // ============================================================

  private validateDisplayOrder(
    schemaName: string,

    rows: Array<{
      DISPLAY_ORDER: number;
    }>,
  ): void {
    const displayOrders = new Set<number>();

    for (const row of rows) {
      if (displayOrders.has(row.DISPLAY_ORDER)) {
        throw new InternalServerErrorException(
          `Invalid display configuration "${schemaName}". ` +
            `DISPLAY_ORDER ${row.DISPLAY_ORDER} ` +
            `is duplicated.`,
        );
      }

      displayOrders.add(row.DISPLAY_ORDER);
    }
  }
}
