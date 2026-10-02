import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { DatabaseService } from '../database.service';

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
  constructor(private readonly db: DatabaseService) {}

  // ============================================================
  // Master Data
  // ============================================================

  async getMasterData(): Promise<MasterDataResponseDto> {
    const [
      // --------------------------------------------------------
      // Parameters
      // --------------------------------------------------------

      titles,
      locations,
      marriedStatus,
      brands,
      models,
      currentVehicleConditionTypes,

      // --------------------------------------------------------
      // Display
      // --------------------------------------------------------

      motorcyclePhotoTypes,
      vehicleUserTypes,
      restructureReasons,
      addressTypes,
      assessment,
      attachmentTypes,
      statusCodes,
    ] = await Promise.all([
      // --------------------------------------------------------
      // Parameters
      // --------------------------------------------------------

      this.getTitles(),
      this.getLocations(),
      this.getMarriedStatus(),
      this.getBrands(),
      this.getModels(),
      this.getCurrentVehicleCondition(),

      // --------------------------------------------------------
      // Display
      // --------------------------------------------------------

      this.getMotorcyclePhotoTypesDisplay(),
      this.getVehicleUserTypes(),
      this.getRestructureReasonsDisplay(),
      this.getAddressTypeDisplay(),
      this.getAssessmentDisplay(),
      this.getAttachmentTypesDisplay(),
      this.getStatusCodesDisplay(),
    ]);

    return {
      // ========================================================
      // Parameters
      // ========================================================

      parameters: {
        titles,
        locations,
        marriedStatus,
        brands,
        models,
        currentVehicleConditionTypes
      },

      // ========================================================
      // Display
      // ========================================================

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
  }

  // ============================================================
  // Parameters
  // ============================================================

  // ============================================================
  // Titles
  // ============================================================

  private async getTitles(): Promise<TitleDto[]> {
    const result = await this.db.query<{
      TITLE_ID: string;

      TITLE_NAME: string;

      SEX: string | null;

      STATUS_SHOW_RECT: string | null;

      STATUS_SHOW_VAT: string | null;

      STATUS_SHOW_DEALER: string | null;
    }>(`

      SELECT

        TITLE_ID,

        TITLE_NAME,

        SEX,

        STATUS_SHOW_RECT,

        STATUS_SHOW_VAT,

        STATUS_SHOW_DEALER

      FROM BTW.TITLE_P

      ORDER BY TITLE_ID

    `);

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

  private async getLocations(): Promise<LocationDto[]> {
    const result = await this.db.query<{
      POST_CODE: string;

      SUB_DISTRICT: string;

      DISTRICT: string;

      PROVINCE: string;

      LOCATION_CODE: string | null;

      PROVINCE_CODE: string | null;

      FLOOD_EFFECT: string | null;
    }>(`

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

    `);

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

  private async getMarriedStatus(): Promise<MarriedStatusDto[]> {
    const result = await this.db.query<{
      CODE: string;

      NAME: string;
    }>(`

      SELECT
        CODE,
        NAME
    FROM
        BTW.X_MARRIED_STATUS_P
    WHERE
        CODE NOT IN ('0')
    ORDER BY
        CODE ASC
    `);

    const rows = result.rows ?? [];

    return rows.map((row) => ({
      code: row.CODE,

      name: row.NAME,
    }));
  }

  // ============================================================
  // BRAND
  // ============================================================

  private async getBrands(): Promise<BrandDto[]> {
    const result = await this.db.query<{
      BRAND_CODE: string;
      BRAND_NAME: string;
    }>(`
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
    `);

    const rows = result.rows ?? [];

    return rows.map((row) => ({
      brand_code: row.BRAND_CODE,
      brand_name: row.BRAND_NAME,
    }));
  }

  // ============================================================
  // MODEL
  // ============================================================

  private async getModels(): Promise<ModelDto[]> {
    const result = await this.db.query<{
      BRAND_CODE: string;
      MODEL_CODE: string;
      MODEL_NAME: string;
      MODEL_KEY: string;
    }>(`
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
    `);

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

  private async getCurrentVehicleCondition(): Promise<CurrentVehicleConditionDto[]> {
    const result = await this.db.query<{
      CODE: string;
      NAME: string;
      ORDER_INDEX: number;
    }>(`
      SELECT 
          CONDITION_CODE AS CODE, 
          CONDITION_NAME AS NAME,
          ORDER_INDEX
      FROM
          MOBILEMPLS.M_CURRENT_VEHICLE_CONDITION
    `);

    const rows = result.rows ?? [];

    return rows.map((row) => ({
      code: row.CODE,
      name: row.NAME,
      order_index: row.ORDER_INDEX
    }));
  }

  // ============================================================
  // Display
  // ============================================================

  // ============================================================
  // Motorcycle Photo Types
  // ============================================================

  async getMotorcyclePhotoTypesDisplay(): Promise<MotorcyclePhotoTypeDto[]> {
    const result = await this.db.query<{
      PHOTO_TYPE_CODE: string;

      PHOTO_TYPE_NAME: string;

      DISPLAY_ORDER: number;
    }>(`

      SELECT

        PHOTO_TYPE_CODE,

        PHOTO_TYPE_NAME,

        DISPLAY_ORDER

      FROM MOBILEMPLS.M_MOTORCYCLE_PHOTO_TYPE

      WHERE IS_ACTIVE = 'Y'

      ORDER BY DISPLAY_ORDER

    `);

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

  private async getVehicleUserTypes(): Promise<VehicleUserTypeDto[]> {
    const result = await this.db.query<{
      CODE: string;

      NAME: string;
    }>(`

      SELECT
        VEHICLE_USER_TYPE_CODE,
        VEHICLE_USER_TYPE_NAME,
        DISPLAY_ORDER,
        REMARK_TEXT_TYPE
      FROM 
        MOBILEMPLS.M_VEHICLE_USER_TYPE
      ORDER BY 
        DISPLAY_ORDER
    `);

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
  // ============================================================

  async getRestructureReasonsDisplay(): Promise<
    RestructureReasonMasterDataDto[]
  > {
    const result = await this.db.query<{
      REASON_CODE: string;

      REASON_NAME: string;

      IS_REMARK: string | null;

      DISPLAY_ORDER: number;
    }>(`

      SELECT

        REASON_CODE,

        REASON_NAME,

        IS_REMARK,

        DISPLAY_ORDER

      FROM MOBILEMPLS.M_RESTRUCTURE_REASON

      WHERE IS_ACTIVE = 'Y'

      ORDER BY DISPLAY_ORDER

    `);

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

  private async getAddressTypeDisplay(): Promise<AddressTypeDisplayDto[]> {
    const result = await this.db.query<{
      ADDRESS_TYPE_CODE: string;

      ADDRESS_TYPE_NAME: string;

      DISPLAY_ORDER: number;
    }>(`

      SELECT

        ADDRESS_TYPE_CODE,

        ADDRESS_TYPE_NAME,

        DISPLAY_ORDER

      FROM MOBILEMPLS.M_ADDRESS_TYPE

      ORDER BY DISPLAY_ORDER

    `);

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

  private async getAssessmentDisplay(): Promise<AssessmentGroupDisplayDto[]> {
    const rows = await this.queryAssessmentDisplay();

    this.validateAssessmentDisplayOrder(rows);

    return this.buildAssessmentTree(rows);
  }

  // ============================================================
  // Assessment Query
  // ============================================================

  private async queryAssessmentDisplay(): Promise<AssessmentDisplayRow[]> {
    const result = await this.db.query<AssessmentDisplayRow>(`

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

      `);

    return result.rows ?? [];
  }

  // ============================================================
  // Attachment Types
  // ============================================================

  async getAttachmentTypesDisplay(): Promise<AttachmentTypeDisplayDto[]> {
    const result = await this.db.query<{
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
    }>(`

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

    `);

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

  async getStatusCodesDisplay(): Promise<StatusCodeDisplayDto[]> {
    const result = await this.db.query<{
      STATUS_ID: number;

      STATUS_CODE: string;

      STATUS_NAME: string;

      DISPLAY_ORDER: number;
    }>(`

      SELECT

        STATUS_ID,

        STATUS_CODE,

        STATUS_NAME,

        DISPLAY_ORDER

      FROM MOBILEMPLS.M_STATUS_CODE

      WHERE IS_ACTIVE = 'Y'

      ORDER BY DISPLAY_ORDER

    `);

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
