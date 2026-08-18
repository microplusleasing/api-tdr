import {
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';

import { DatabaseService } from '../database.service';

import {
    AddressTypeDisplayDto,
    AssessmentCategoryDisplayDto,
    AssessmentGroupDisplayDto,
    AttachmentTypeDisplayDto,
    DocumentTypeDisplayDto,
    MasterDataResponseDto,
    MotorcyclePhotoTypeDto,
    RestructureReasonDto,
    StatusCodeDisplayDto,
} from './dto/master-data.dto';

/**
 * Flat result returned from the assessment JOIN query.
 *
 * Database structure:
 *
 * GROUP
 *   └── CATEGORY
 *         └── ITEM
 *
 * SQL JOIN returns a flat structure, so the service
 * converts this into a nested structure afterwards.
 */
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
    constructor(
        private readonly db: DatabaseService,
    ) {}

    // ============================================================
    // Master Data
    // ============================================================

    /**
     * Get all master data.
     */
    async getMasterData(): Promise<MasterDataResponseDto> {
        const [
            motorcyclePhotoTypes,
            restructureReasons,

            addressTypes,
            assessment,
            attachmentTypes,
            documentTypes,
            statusCodes,
        ] = await Promise.all([
            // Display
            this.getMotorcyclePhotoTypesDisplay(),
            this.getRestructureReasonsDisplay(),

            this.getAddressTypeDisplay(),
            this.getAssessmentDisplay(),
            this.getAttachmentTypesDisplay(),
            this.getDocumentTypesDisplay(),
            this.getStatusCodesDisplay(),
        ]);

        return {
            /**
             * Keep parameters for backward compatibility.
             *
             * Both motorcyclePhotoTypes and restructureReasons
             * have DISPLAY_ORDER now, so they belong to display.
             */
            parameters: {},

            display: {
                motorcyclePhotoTypes,
                restructureReasons,

                addressTypes,
                assessment,
                attachmentTypes,
                documentTypes,
                statusCodes,
            },
        };
    }

    // ============================================================
    // Display
    // ============================================================

    /**
     * Get motorcycle photo type display configuration.
     *
     * Table:
     * MOBILEMPLS.M_MOTORCYCLE_PHOTO_TYPE
     *
     * DISPLAY_ORDER must be globally unique.
     */
    // private async getMotorcyclePhotoTypesDisplay(): Promise<
    async getMotorcyclePhotoTypesDisplay(): Promise<
        MotorcyclePhotoTypeDto[]
    > {
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

        this.validateDisplayOrder(
            'motorcyclePhotoTypes',
            rows,
        );

        return rows.map(row => ({
            code: row.PHOTO_TYPE_CODE,
            name: row.PHOTO_TYPE_NAME,
            displayOrder: row.DISPLAY_ORDER,
        }));
    }

    /**
     * Get restructure reason display configuration.
     *
     * Table:
     * MOBILEMPLS.M_RESTRUCTURE_REASON
     *
     * DISPLAY_ORDER must be globally unique.
     */
    // private async getRestructureReasonsDisplay(): Promise<
    async getRestructureReasonsDisplay(): Promise<
        RestructureReasonDto[]
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

        this.validateDisplayOrder(
            'restructureReasons',
            rows,
        );

        return rows.map(row => ({
            code: row.REASON_CODE,
            name: row.REASON_NAME,
            requireRemark: row.IS_REMARK === 'Y',
            displayOrder: row.DISPLAY_ORDER,
        }));
    }

    /**
     * Get address type display configuration.
     *
     * DISPLAY_ORDER must be globally unique.
     */
    private async getAddressTypeDisplay(): Promise<
        AddressTypeDisplayDto[]
    > {
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

        this.validateDisplayOrder(
            'addressTypes',
            rows,
        );

        return rows.map(row => ({
            code: row.ADDRESS_TYPE_CODE,
            name: row.ADDRESS_TYPE_NAME,
            displayOrder: row.DISPLAY_ORDER,
        }));
    }

    /**
     * Get assessment display configuration.
     *
     * Database structure:
     *
     * GROUP
     *   └── CATEGORY
     *         └── ITEM
     *
     * The SQL result is flat, so it is converted into
     * a nested structure before being returned.
     */
    private async getAssessmentDisplay(): Promise<
        AssessmentGroupDisplayDto[]
    > {
        const rows = await this.queryAssessmentDisplay();

        this.validateAssessmentDisplayOrder(rows);

        return this.buildAssessmentTree(rows);
    }

    /**
     * Query assessment configuration.
     */
    private async queryAssessmentDisplay(): Promise<
        AssessmentDisplayRow[]
    > {
        const result = await this.db.query<AssessmentDisplayRow>(`
            SELECT
                g.GROUP_ID,
                g.GROUP_CODE,
                g.GROUP_NAME,
                g.DISPLAY_ORDER AS GROUP_DISPLAY_ORDER,

                c.CATEGORY_ID,
                c.CATEGORY_CODE,
                c.CATEGORY_NAME,
                c.DISPLAY_ORDER AS CATEGORY_DISPLAY_ORDER,

                i.ITEM_ID,
                i.ITEM_CODE,
                i.ITEM_NAME,
                i.DISPLAY_ORDER AS ITEM_DISPLAY_ORDER,
                i.REQUIRE_REMARK,
                i.REMARK_TEXT_TYPE

            FROM MOBILEMPLS.M_ASSESSMENT_GROUP g

            LEFT JOIN MOBILEMPLS.M_ASSESSMENT_CATEGORY c
                ON c.GROUP_ID = g.GROUP_ID
                AND c.IS_ACTIVE = 'Y'

            LEFT JOIN MOBILEMPLS.M_ASSESSMENT_ITEM i
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

    /**
     * Get attachment type display configuration.
     */
    async getAttachmentTypesDisplay(): Promise<
        AttachmentTypeDisplayDto[]
    > {
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

        this.validateDisplayOrder(
            'attachmentTypes',
            rows,
        );

        return rows.map(row => ({
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

    /**
     * Get document type display configuration.
     */
    async getDocumentTypesDisplay(): Promise<
        DocumentTypeDisplayDto[]
    > {
        const result = await this.db.query<{
            DOCUMENT_CODE: string;
            DOCUMENT_NAME: string;
            IS_REQUIRE_REMARK: string | null;
            DISPLAY_ORDER: number;
            ALLOW_MULTIPLE: string | null;
        }>(`
            SELECT
                DOCUMENT_CODE,
                DOCUMENT_NAME,
                IS_REQUIRE_REMARK,
                DISPLAY_ORDER,
                ALLOW_MULTIPLE
            FROM MOBILEMPLS.M_DOCUMENT_TYPE
            WHERE IS_ACTIVE = 'Y'
            ORDER BY DISPLAY_ORDER
        `);

        const rows = result.rows ?? [];

        this.validateDisplayOrder(
            'documentTypes',
            rows,
        );

        return rows.map(row => ({
            documentCode: row.DOCUMENT_CODE,
            documentName: row.DOCUMENT_NAME,
            requireRemark: row.IS_REQUIRE_REMARK === 'Y',
            displayOrder: row.DISPLAY_ORDER,
            allowMultiple: row.ALLOW_MULTIPLE === 'Y',
        }));
    }

    /**
     * Get status code display configuration.
     */
    async getStatusCodesDisplay(): Promise<
        StatusCodeDisplayDto[]
    > {
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

        this.validateDisplayOrder(
            'statusCodes',
            rows,
        );

        return rows.map(row => ({
            statusId: row.STATUS_ID,
            statusCode: row.STATUS_CODE,
            statusName: row.STATUS_NAME,
            displayOrder: row.DISPLAY_ORDER,
        }));
    }

    // ============================================================
    // Assessment Validation
    // ============================================================

    /**
     * Validate all assessment DISPLAY_ORDER rules.
     *
     * GROUP:
     *     DISPLAY_ORDER must be globally unique.
     *
     * CATEGORY:
     *     DISPLAY_ORDER must be unique within GROUP_ID.
     *
     * ITEM:
     *     DISPLAY_ORDER must be unique within CATEGORY_ID.
     */
    private validateAssessmentDisplayOrder(
        rows: AssessmentDisplayRow[],
    ): void {
        this.validateGroupDisplayOrder(rows);
        this.validateCategoryDisplayOrder(rows);
        this.validateItemDisplayOrder(rows);
    }

    /**
     * Validate group DISPLAY_ORDER.
     */
    private validateGroupDisplayOrder(
        rows: AssessmentDisplayRow[],
    ): void {
        const groups = new Map<number, number>();

        for (const row of rows) {
            /**
             * Because the query contains child rows,
             * the same group can appear many times.
             */
            if (!groups.has(row.GROUP_ID)) {
                groups.set(
                    row.GROUP_ID,
                    row.GROUP_DISPLAY_ORDER,
                );
            }
        }

        this.validateUniqueDisplayOrder(
            Array.from(groups.entries()).map(
                ([groupId, displayOrder]) => ({
                    id: groupId,
                    displayOrder,
                }),
            ),
            'assessment.groups',
        );
    }

    /**
     * Validate category DISPLAY_ORDER.
     *
     * DISPLAY_ORDER only needs to be unique
     * within its parent GROUP_ID.
     */
    private validateCategoryDisplayOrder(
        rows: AssessmentDisplayRow[],
    ): void {
        const categories = new Map<
            number,
            {
                groupId: number;
                displayOrder: number;
            }
        >();

        for (const row of rows) {
            if (
                row.CATEGORY_ID === null ||
                row.CATEGORY_DISPLAY_ORDER === null
            ) {
                continue;
            }

            if (!categories.has(row.CATEGORY_ID)) {
                categories.set(row.CATEGORY_ID, {
                    groupId: row.GROUP_ID,
                    displayOrder:
                        row.CATEGORY_DISPLAY_ORDER,
                });
            }
        }

        this.validateUniqueDisplayOrderByParent(
            Array.from(categories.entries()).map(
                ([categoryId, category]) => ({
                    id: categoryId,
                    parentId: category.groupId,
                    displayOrder: category.displayOrder,
                }),
            ),
            'assessment.categories',
        );
    }

    /**
     * Validate item DISPLAY_ORDER.
     *
     * DISPLAY_ORDER only needs to be unique
     * within its parent CATEGORY_ID.
     */
    private validateItemDisplayOrder(
        rows: AssessmentDisplayRow[],
    ): void {
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
                    displayOrder:
                        row.ITEM_DISPLAY_ORDER,
                });
            }
        }

        this.validateUniqueDisplayOrderByParent(
            Array.from(items.entries()).map(
                ([itemId, item]) => ({
                    id: itemId,
                    parentId: item.categoryId,
                    displayOrder: item.displayOrder,
                }),
            ),
            'assessment.items',
        );
    }

    // ============================================================
    // Assessment Tree
    // ============================================================

    /**
     * Convert flat SQL rows into:
     *
     * Group
     *   └── Category
     *         └── Item
     */
    private buildAssessmentTree(
        rows: AssessmentDisplayRow[],
    ): AssessmentGroupDisplayDto[] {
        const groupMap = new Map<
            number,
            AssessmentGroupDisplayDto
        >();

        const categoryMap = new Map<
            number,
            AssessmentCategoryDisplayDto
        >();

        for (const row of rows) {
            const group = this.getOrCreateGroup(
                groupMap,
                row,
            );

            if (
                row.CATEGORY_ID === null ||
                row.CATEGORY_CODE === null
            ) {
                continue;
            }

            const category = this.getOrCreateCategory(
                categoryMap,
                group,
                row,
            );

            if (
                row.ITEM_ID === null ||
                row.ITEM_CODE === null
            ) {
                continue;
            }

            category.items.push({
                itemId: row.ITEM_ID,
                itemCode: row.ITEM_CODE.trim(),
                itemName: row.ITEM_NAME ?? '',
                displayOrder:
                    row.ITEM_DISPLAY_ORDER!,
                requireRemark:
                    row.REQUIRE_REMARK === 'Y',
                remarkTextType:
                    row.REMARK_TEXT_TYPE,
            });
        }

        return Array.from(groupMap.values());
    }

    /**
     * Get existing group or create a new one.
     */
    private getOrCreateGroup(
        groupMap: Map<
            number,
            AssessmentGroupDisplayDto
        >,
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
            displayOrder:
                row.GROUP_DISPLAY_ORDER,
            categories: [],
        };

        groupMap.set(
            row.GROUP_ID,
            group,
        );

        return group;
    }

    /**
     * Get existing category or create a new one.
     */
    private getOrCreateCategory(
        categoryMap: Map<
            number,
            AssessmentCategoryDisplayDto
        >,
        group: AssessmentGroupDisplayDto,
        row: AssessmentDisplayRow,
    ): AssessmentCategoryDisplayDto {
        if (row.CATEGORY_ID === null) {
            throw new InternalServerErrorException(
                'CATEGORY_ID is required.',
            );
        }

        let category =
            categoryMap.get(row.CATEGORY_ID);

        if (category) {
            return category;
        }

        if (
            row.CATEGORY_DISPLAY_ORDER === null
        ) {
            throw new InternalServerErrorException(
                `CATEGORY_DISPLAY_ORDER is required ` +
                `for CATEGORY_ID ${row.CATEGORY_ID}.`,
            );
        }

        category = {
            categoryId: row.CATEGORY_ID,
            categoryCode: row.CATEGORY_CODE!,
            categoryName:
                row.CATEGORY_NAME ?? '',
            displayOrder:
                row.CATEGORY_DISPLAY_ORDER,
            items: [],
        };

        categoryMap.set(
            row.CATEGORY_ID,
            category,
        );

        group.categories.push(category);

        return category;
    }

    // ============================================================
    // Generic Validation Helpers
    // ============================================================

    /**
     * Validate globally unique DISPLAY_ORDER.
     */
    private validateUniqueDisplayOrder(
        records: Array<{
            id: number;
            displayOrder: number;
        }>,
        schemaName: string,
    ): void {
        const displayOrderToId =
            new Map<number, number>();

        for (const record of records) {
            const existingId =
                displayOrderToId.get(
                    record.displayOrder,
                );

            if (
                existingId !== undefined &&
                existingId !== record.id
            ) {
                throw new InternalServerErrorException(
                    `Invalid display configuration "${schemaName}". ` +
                    `DISPLAY_ORDER ${record.displayOrder} ` +
                    `is duplicated between ID ` +
                    `${existingId} and ${record.id}.`,
                );
            }

            displayOrderToId.set(
                record.displayOrder,
                record.id,
            );
        }
    }

    /**
     * Validate DISPLAY_ORDER uniqueness within a parent.
     */
    private validateUniqueDisplayOrderByParent(
        records: Array<{
            id: number;
            parentId: number;
            displayOrder: number;
        }>,
        schemaName: string,
    ): void {
        const parentDisplayOrders =
            new Map<
                number,
                Map<number, number>
            >();

        for (const record of records) {
            let displayOrders =
                parentDisplayOrders.get(
                    record.parentId,
                );

            if (!displayOrders) {
                displayOrders = new Map<
                    number,
                    number
                >();

                parentDisplayOrders.set(
                    record.parentId,
                    displayOrders,
                );
            }

            const existingId =
                displayOrders.get(
                    record.displayOrder,
                );

            if (
                existingId !== undefined &&
                existingId !== record.id
            ) {
                throw new InternalServerErrorException(
                    `Invalid display configuration "${schemaName}". ` +
                    `DISPLAY_ORDER ${record.displayOrder} ` +
                    `is duplicated within parent ID ` +
                    `${record.parentId}. ` +
                    `Conflicting IDs: ` +
                    `${existingId} and ${record.id}.`,
                );
            }

            displayOrders.set(
                record.displayOrder,
                record.id,
            );
        }
    }

    /**
     * Validate globally unique DISPLAY_ORDER
     * for simple display schemas.
     */
    private validateDisplayOrder(
        schemaName: string,
        rows: Array<{
            DISPLAY_ORDER: number;
        }>,
    ): void {
        const displayOrders =
            new Set<number>();

        for (const row of rows) {
            if (
                displayOrders.has(
                    row.DISPLAY_ORDER,
                )
            ) {
                throw new InternalServerErrorException(
                    `Invalid display configuration "${schemaName}". ` +
                    `DISPLAY_ORDER ${row.DISPLAY_ORDER} ` +
                    `is duplicated.`,
                );
            }

            displayOrders.add(
                row.DISPLAY_ORDER,
            );
        }
    }
}