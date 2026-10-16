import { Injectable } from '@nestjs/common';
import { Connection } from 'oracledb';
import * as path from 'path';

// import { DatabaseService } from 'src/database/database.service';
import { DatabaseService } from '../../database.service';
import { FileStorageService } from '../../../common/file-storage/file-storage.service';

import { CreateTdrAssessmentDto } from '../dto/create-tdr-assessment.dto';
import { ResolvedTdrFiles } from '../validators/tdr-assessment-file.validator';

type IType = 'Address' | 'Photo' | 'Finalcial' | 'Attachment' | 'Log' | 'Reason';

@Injectable()
export class TdrAssessmentRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileStorage: FileStorageService,
  ) {}

  // ============================================================
  // Customer Request
  // ============================================================

  /**
   * Insert main TDR request.
   */
  async insertCustomerRequest(
    connection: Connection,
    reqId: string,
    request: CreateTdrAssessmentDto,
  ): Promise<void> {
    const customer = request.customerInformation;
    const product = request.productInformation;

    await this.databaseService.executeOnConnection(
      connection,
      `
        INSERT INTO MOBILEMPLS.T_CUSTOMER_REQ (
          REQ_ID,
          FNAME,
          NAME,
          SNAME,
          CONTRACT_REF,
          CITIZEN_ID,
          MP_PHONE_NO,
          MARITAL_STATUS,
          NUMBER_OF_CHILDREN,
          NUMBER_OF_DEPENDENTS,
          OCCUPATION1,
          JOB_POSITION,
          NATURE_OF_WORK,
          COMPANY_NAME,
          OFFICE_TEL,
          REFERNCE_NAME1,
          RELATION_REF1,
          RF1_PHONE_NO,
          REFERNCE_NAME2,
          RELATION_REF2,
          RF2_PHONE_NO,
          BRAND_CODE,
          MODELCODE,
          COLOR,
          REG_NO,
          VEHICLE_USER_TYPE,
          VEHICLE_USER_REMARK,
          CURRENT_VEHICLE_USER_NAME,
          RELATIONSHIP_TO_APPLICANT,
          CURRENT_VEHICLE_USER_PHONE,
          VEHICLE_USAGE_ADDRESS,
          VEHICLE_USAGE_PROVINCE,
          VEHICLE_USAGE_ZIPCODE,
          VEHICLE_CONDITION,
          CURRENT_ODOMETER_READING,
          CREATE_DATE,
          CREATE_BY,
          STATUS_CODE,
          STATUS_DATE
        )
        VALUES (
          :reqId,
          :title,
          :firstName,
          :lastName,
          :contractNo,
          :citizenId,
          :phoneNo,
          :maritalStatus,
          :numberOfChildren,
          :dependents,
          :occupation,
          :position,
          :jobDescription,
          :workplaceName,
          :workplacePhone,
          :reference1Name,
          :reference1Relationship,
          :reference1Phone,
          :reference2Name,
          :reference2Relationship,
          :reference2Phone,
          :brand,
          :model,
          :color,
          :registrationNo,
          :vehicleUserType,
          :additionalInfo,
          :currentUserName,
          :relationship,
          :currentUserPhone,
          :vehicleUsageAddress,
          :carUserProvince,
          :carUserPostalCode,
          :currentVehicleCondition,
          :currentMileage,
          SYSDATE,
          :createBy,
          :statusCode,
          SYSDATE
        )
      `,
      {
        reqId,
        title: customer.title,
        firstName: customer.firstName,
        lastName: customer.lastName,
        contractNo: customer.contractNo,
        citizenId: customer.citizenId,
        phoneNo: customer.phoneNo,
        maritalStatus: customer.maritalStatus,

        numberOfChildren: this.toNumber(customer.numberOfChildren),

        dependents: this.toNumber(customer.dependents),

        occupation: customer.occupation,
        position: customer.position,
        jobDescription: customer.jobDescription,
        workplaceName: customer.workplaceName,

        workplacePhone: customer.workplaceAddress?.workplacePhone,

        reference1Name: customer.reference1?.name,

        reference1Relationship: customer.reference1?.relationship,

        reference1Phone: customer.reference1?.phone,

        reference2Name: customer.reference2?.name,

        reference2Relationship: customer.reference2?.relationship,

        reference2Phone: customer.reference2?.phone,

        brand: product.brand,
        model: product.model,
        color: product.color,
        registrationNo: product.registrationNo,
        vehicleUserType: product.vehicleUserType,
        additionalInfo: product.additionalInfo,
        currentUserName: product.currentUserName,
        relationship: product.relationship,
        currentUserPhone: product.currentUserPhone,
        vehicleUsageAddress: product.vehicleUsageAddress,

        carUserProvince: product.carUserAddress?.province,

        carUserPostalCode: product.carUserAddress?.postalCode,
        currentVehicleCondition: product.currentVehicleCondition,

        currentMileage: this.toNumber(product.currentMileage),

        createBy: 'CUSTOMER',
        statusCode: 'SUBMITTED',
      },
    );
  }

  // ============================================================
  // Customer Addresses
  // ============================================================

  /**
   * Insert all customer-related addresses.
   */
  async insertCustomerAddresses(
    connection: Connection,
    reqId: string,
    request: CreateTdrAssessmentDto,
  ): Promise<void> {
    const customer = request.customerInformation;

    // ----------------------------------------------------------
    // ID Card Address
    // ADDRESS_TYPE_CODE = '02'
    // ----------------------------------------------------------

    const idCardAddressId = this.generateId('Address');

    await this.insertAddress(
      connection,
      reqId,
      idCardAddressId,
      customer.citizenId,
      '02',
      customer.idCardAddress,
    );

    // ----------------------------------------------------------
    // Registered Address
    // ADDRESS_TYPE_CODE = '01'
    // ----------------------------------------------------------

    const registerAddressId = this.generateId('Address');

    if (customer.registeredAddressSameAsIdCard) {
      await this.insertAddress(
        connection,
        reqId,
        registerAddressId,
        customer.citizenId,
        '01',
        customer.idCardAddress,
      );
    } else if (customer.registeredAddress) {
      await this.insertAddress(
        connection,
        reqId,
        registerAddressId,
        customer.citizenId,
        '01',
        customer.registeredAddress,
      );
    }

    // ----------------------------------------------------------
    // Current Address
    // ADDRESS_TYPE_CODE = '03'
    // ----------------------------------------------------------

    const currentAddressId = this.generateId('Address');

    if (customer.currentAddressSameAsIdCard) {
      await this.insertAddress(
        connection,
        reqId,
        currentAddressId,
        customer.citizenId,
        '03',
        customer.idCardAddress,
      );
    } else if (customer.currentAddress) {
      await this.insertAddress(
        connection,
        reqId,
        currentAddressId,
        customer.citizenId,
        '03',
        customer.currentAddress,
      );
    }

    // ----------------------------------------------------------
    // Workplace Address
    // ADDRESS_TYPE_CODE = '04'
    // ----------------------------------------------------------

    const workAddressId = this.generateId('Address');

    if (customer.workplaceAddress) {
      await this.insertAddress(
        connection,
        reqId,
        workAddressId,
        customer.citizenId,
        '04',
        customer.workplaceAddress,
      );
    }

    // ----------------------------------------------------------
    // Vehicle User Address
    // ----------------------------------------------------------
    //
    // Currently not inserted because there is no confirmed
    // ADDRESS_TYPE_CODE for vehicle user address.
    //
    // Keep this disabled until the database mapping is confirmed.
    //
    // const vehicleUserAddress =
    //   request.productInformation?.carUserAddress;
    //
    // const vehicleUserAddressId =
    //   this.generateId('Address');
    //
    // if (vehicleUserAddress) {
    //   await this.insertAddress(
    //     connection,
    //     reqId,
    //     vehicleUserAddressId,
    //     customer.citizenId,
    //     'VEHICLE_USER',
    //     vehicleUserAddress,
    //   );
    // }
  }

  // ============================================================
  // Address
  // ============================================================

  /**
   * Insert one customer address.
   *
   * addressTypeCode:
   *   01 = Registered address
   *   02 = ID card address
   *   03 = Current address
   *   04 = Workplace address
   */
  private async insertAddress(
    connection: Connection,
    reqId: string,
    addressId: string,
    citizenId: string,
    addressTypeCode: string,
    address: any,
  ): Promise<void> {
    if (!address) {
      return;
    }

    await this.databaseService.executeOnConnection(
      connection,
      `
        INSERT INTO MOBILEMPLS.T_CUSTOMER_ADDRESS (
          ADDRESS_ID,
          REQ_ID,
          CITIZEN_ID,
          ADDRESS_TYPE_CODE,
          HOUSE_NO,
          ALLEY,
          SOI,
          ROAD,
          SUB_DISTRICT,
          DISTRICT,
          PROV_CODE,
          POST_CODE,
          LOCATION_CODE,
          REMARK,
          CREATED_DATE
        )
        VALUES (
          :addressId,
          :reqId,
          :citizenId,
          :addressTypeCode,
          :houseNo,
          :alley,
          :soi,
          :road,
          :subDistrict,
          :district,
          :provCode,
          :postalCode,
          :locationCode,
          :remark,
          SYSDATE
        )
      `,
      {
        addressId,
        reqId,
        citizenId,
        addressTypeCode,

        houseNo: address.houseNo,
        alley: address.alley,
        soi: address.soi,
        road: address.road,
        subDistrict: address.subDistrict,
        district: address.district,
        provCode: address.provCode,
        postalCode: address.postalCode,
        locationCode: address.postalCodeLookup,
        remark: address.workplaceDescription ?? null,
      },
    );
  }

  // ============================================================
  // Motorcycle Photos
  // ============================================================

  /**
   * Insert motorcycle photos.
   *
   * The binaries arrive in the multipart field `motorcyclePhoto`. They were
   * already matched to `productInformation.motorcyclePhotos[]` (by file name /
   * photoType prefix) by TdrAssessmentFileValidator, so here we only save them.
   */
  async insertMotorcyclePhotos(
    connection: Connection,
    reqId: string,
    request: CreateTdrAssessmentDto,
    files: ResolvedTdrFiles,
    writtenFiles: string[],
  ): Promise<void> {
    const photos = request.productInformation?.motorcyclePhoto ?? [];

    for (const photo of photos) {
      const photoTypeCode = photo.photoType;

      const resolved = files.photos.get(photoTypeCode);

      if (!resolved) {
        // Cannot happen after TdrAssessmentFileValidator.resolve(); guard anyway.
        continue;
      }

      const { file: uploadedFile, originalName } = resolved;

      // --------------------------------------------------------
      // Save physical file (name built from the master code, not
      // from user input, so it is always a safe file name)
      // --------------------------------------------------------

      const extension = this.resolveFileExtension(originalName);

      const fileName = `${photoTypeCode}.${extension}`;

      const fullPath = await this.fileStorage.saveFile(
        reqId,
        'T_MOTORCYCLE_PHOTO',
        fileName,
        uploadedFile.buffer,
      );

      // If a later DB operation fails, the service deletes this file.
      writtenFiles.push(fullPath);

      // --------------------------------------------------------
      // Insert database record
      // --------------------------------------------------------

      const motorcyclePhotoId = this.generateId('Photo');

      await this.databaseService.executeOnConnection(
        connection,
        `
          INSERT INTO MOBILEMPLS.T_MOTORCYCLE_PHOTO (
            PHOTO_ID,
            REQ_ID,
            PHOTO_TYPE_CODE,
            FILE_NAME,
            FILE_PATH,
            FILE_SIZE,
            MIME_TYPE,
            CREATED_DATE,
            CREATED_BY
          )
          VALUES (
            :photoId,
            :reqId,
            :photoTypeCode,
            :fileName,
            :filePath,
            :fileSize,
            :mimeType,
            SYSDATE,
            'CUSTOMER'
          )
        `,
        {
          photoId: motorcyclePhotoId,
          reqId,
          photoTypeCode,

          fileName,
          filePath: fullPath,

          fileSize: uploadedFile.size,
          mimeType: uploadedFile.mimetype,
        },
      );
    }
  }

  /**
   * Insert financial (income) assessment details.
   *
   * estimateIncome contains:
   *
   *   - <MONTHLY_INCOME>
   */

  async insertEstimateIncome(
    connection: Connection,
    reqId: string,
    request: CreateTdrAssessmentDto,
  ): Promise<void> {
    const incomes = request.estimateIncome.incomes;

    for (const income of Object.values(incomes)) {
      const financialId = this.generateId('Finalcial');

      await connection.execute(
        `
        INSERT INTO MOBILEMPLS.T_FINANCIAL_ASSESSMENT_DTL (
            DETAIL_ID,
            REQ_ID,
            ITEM_ID,
            REMARK,
            AMOUNT,
            CREATED_DATE
          )
          VALUES (
            :detailId,
            :reqId,
            :itemId,
            :remark,
            :amount,
            SYSDATE
          )
        `,
        {
          detailId: financialId,
          reqId,

          itemId: income.itemId,

          remark: income.remark ?? null,

          amount: income.amount ?? 0,
        },
      );
    }
  }

  // ============================================================
  // Financial Assessment
  // ============================================================

  /**
   * Insert financial assessment details.
   *
   * estimatePayment contains:
   *
   *   - NECESSARY_EXPENSE
   *   - DEBT_OBLIGATION
   */
  async insertFinancialAssessment(
    connection: Connection,
    reqId: string,
    request: CreateTdrAssessmentDto,
  ): Promise<void> {
    const estimatePayment = request.estimatePayment;

    if (!estimatePayment) {
      return;
    }

    await this.insertFinancialGroup(
      connection,
      reqId,
      estimatePayment.NECESSARY_EXPENSE,
    );

    await this.insertFinancialGroup(
      connection,
      reqId,
      estimatePayment.DEBT_OBLIGATION,
    );
  }

  // ============================================================
  // Financial Group
  // ============================================================

  /**
   * Insert one dynamic financial group.
   */
  private async insertFinancialGroup(
    connection: Connection,
    reqId: string,
    group: Record<string, any> | undefined,
  ): Promise<void> {
    if (!group) {
      return;
    }

    for (const item of Object.values(group)) {
      if (!item?.itemId) {
        continue;
      }

      const financialId = this.generateId('Finalcial');

      await this.databaseService.executeOnConnection(
        connection,
        `
          INSERT INTO MOBILEMPLS.T_FINANCIAL_ASSESSMENT_DTL (
            DETAIL_ID,
            REQ_ID,
            ITEM_ID,
            REMARK,
            AMOUNT,
            CREATED_DATE
          )
          VALUES (
            :detailId,
            :reqId,
            :itemId,
            :remark,
            :amount,
            SYSDATE
          )
        `,
        {
          detailId: financialId,
          reqId,

          itemId: item.itemId,

          remark: item.remark ?? null,

          amount: item.amount ?? 0,
        },
      );
    }
  }

  // ============================================================
  // T_CUSTOMER_REASON
  // ============================================================

  async insertCustomerReasons(
    connection: Connection,
    reqId: string,
    request: CreateTdrAssessmentDto,
  ): Promise<void> {
    const reasons = request.restructureReason?.reasons;

    if (!reasons?.length) {
      return;
    }

    for (const reason of reasons) {
      if (reason.selected !== true) {
        continue;
      }

      const reasonId = this.generateId('Reason');

      await this.databaseService.executeOnConnection(
        connection,
        `
        INSERT INTO MOBILEMPLS.T_CUSTOMER_REASON (
          ID,
          REQ_ID,
          REASON_CODE,
          OTHER_REASON
        )
        VALUES (
          :reasonId,
          :reqId,
          :reasonCode,
          :otherReason
        )
      `,
        {
          reasonId,
          reqId,
          reasonCode: reason.reasonCode,
          otherReason: reason.otherReason?.trim() || null,
        },
      );
    }
  }

  // ============================================================
  // T_REQUEST_STATUS_LOG
  // ============================================================

  /**
   * Insert request status.
   *
   * default from this API is set FROM_STATUS_CODE to null and TO_STATUS_CODE SUBMITED
   *
   */
  async insertRequestStatusLog(
    connection: Connection,
    reqId: string,
    ipAddress: string | null,
    deviceInfo: string | null,
  ): Promise<void> {
    const logId = this.generateId('Log');

    await this.databaseService.executeOnConnection(
      connection,
      `
      INSERT INTO MOBILEMPLS.T_REQUEST_STATUS_LOG (
        LOG_ID,
        REQ_ID,
        FROM_STATUS_CODE,
        TO_STATUS_CODE,
        IP_ADDRESS,
        DEVICE_INFO,
        CREATED_BY,
        CREATED_DATE
      )
      VALUES (
        :logId,
        :reqId,
        :fromStatusCode,
        :toStatusCode,
        :ipAddress,
        :deviceInfo,
        :createdBy,
        SYSDATE
      )
    `,
      {
        logId,
        reqId,
        fromStatusCode: null,
        toStatusCode: 'SUBMITTED',
        ipAddress,
        deviceInfo,
        createdBy: 'CUSTOMER',
      },
    );
  }

  // ============================================================
  // Document Attachments
  // ============================================================

  /**
   * Insert document attachments.
   *
   * The binaries arrive in the multipart field `documentAttach`. They were
   * already linked to `documentAttachments.attachments[]` (by file name /
   * attachmentTypeId prefix) by TdrAssessmentFileValidator, so here we only
   * save them.
   */
  async insertAttachments(
    connection: Connection,
    reqId: string,
    request: CreateTdrAssessmentDto,
    files: ResolvedTdrFiles,
    attachmentTypeIds: Map<string, number>,
    writtenFiles: string[],
  ): Promise<void> {
    const attachments = request.documentAttachments?.attachments ?? [];

    for (const attachment of attachments) {
      const attachmentTypeId = attachmentTypeIds.get(attachment.attachmentCode);

      if (!attachmentTypeId) {
        continue;
      }

      const resolvedFiles =
        files.attachments.get(attachment.attachmentCode) ?? [];

      for (const [index, resolved] of resolvedFiles.entries()) {
        const { file: uploadedFile, originalName } = resolved;

        const attachmentId = this.generateId('Attachment');

        const fileExt = this.resolveFileExtension(originalName);

        // ------------------------------------------------------
        // Physical file name is built from the master code + index,
        // NOT from the user's file name: two documents both called
        // "scan.pdf" must not overwrite each other, and the name
        // can never contain path characters.
        // The original name is kept in FILE_NAME.
        // ------------------------------------------------------

        const storedName = `${attachment.attachmentCode}_${index + 1}.${fileExt}`;

        const fullPath = await this.fileStorage.saveFile(
          reqId,
          'T_ATTACHMENT',
          storedName,
          uploadedFile.buffer,
        );

        writtenFiles.push(fullPath);

        await this.databaseService.executeOnConnection(
          connection,
          `
            INSERT INTO MOBILEMPLS.T_ATTACHMENT (
              ATTACHMENT_ID,
              REQ_ID,
              ATTACHMENT_TYPE_ID,
              FILE_NAME,
              FILE_PATH,
              FILE_SIZE,
              MIME_TYPE,
              FILE_EXT,
              REMARK,
              UPLOAD_DATE,
              CREATED_BY
            )
            VALUES (
              :attachmentId,
              :reqId,
              :attachmentTypeId,
              :fileName,
              :filePath,
              :fileSize,
              :mimeType,
              :fileExt,
              :remark,
              SYSDATE,
              'CUSTOMER'
            )
          `,
          {
            attachmentId,
            reqId,
            attachmentTypeId,

            fileName: originalName,
            filePath: fullPath,

            fileSize: uploadedFile.size,
            mimeType: uploadedFile.mimetype,
            fileExt,

            remark: resolved.remark ?? null,
          },
        );
      }
    }
  }

  // ============================================================
  // Utility
  // ============================================================

  private toNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numberValue = Number(value);

    return Number.isNaN(numberValue) ? null : numberValue;
  }

  /**
   * Get extension from original filename.
   *
   * Example:
   *
   *   "01-รูปหน้ารถ.jpg" -> "jpg"
   *   "id-card.pdf"       -> "pdf"
   */
  private resolveFileExtension(fileName: string): string {
    const extension = path.extname(fileName).replace('.', '').toLowerCase();

    // Only plain [a-z0-9] extensions are used to build file names on disk.
    return /^[a-z0-9]{1,10}$/.test(extension) ? extension : 'bin';
  }

  // ============================================================
  // ID Generator
  // ============================================================

  private generateId(type: IType): string {
    const prefixMap: Record<IType, string> = {
      Address: 'ADDR',
      Photo: 'PHOTO',
      Finalcial: 'FIN',
      Attachment: 'ATM',
      Log: 'LOG',
      Reason: 'REAS'
    };

    return `${prefixMap[type]}-${crypto.randomUUID()}`;
  }
}
