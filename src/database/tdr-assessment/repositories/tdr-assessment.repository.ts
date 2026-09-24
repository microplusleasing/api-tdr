import { Injectable } from '@nestjs/common';
import { Connection } from 'oracledb';
import * as path from 'path';
import type { Express } from 'express';

// import { DatabaseService } from 'src/database/database.service';
import { DatabaseService } from '../../database.service';
import { FileStorageService } from '../../../common/file-storage/file-storage.service';

import { CreateTdrAssessmentDto } from '../dto/create-tdr-assessment.dto';
import { UploadedFile } from '../../../common/types/uploaded-file.type';

type IType = 'Address' | 'Photo' | 'Finalcial' | 'Attachment';

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
          :currentCondition,
          :carUserProvince,
          :carUserPostalCode,
          :currentCondition,
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

        numberOfChildren: this.toNumber(
          customer.numberOfChildren,
        ),

        dependents: this.toNumber(
          customer.dependents,
        ),

        occupation: customer.occupation,
        position: customer.position,
        jobDescription: customer.jobDescription,
        workplaceName: customer.workplaceName,

        workplacePhone:
          customer.workplaceAddress?.workplacePhone,

        reference1Name:
          customer.reference1?.name,

        reference1Relationship:
          customer.reference1?.relationship,

        reference1Phone:
          customer.reference1?.phone,

        reference2Name:
          customer.reference2?.name,

        reference2Relationship:
          customer.reference2?.relationship,

        reference2Phone:
          customer.reference2?.phone,

        brand: product.brand,
        model: product.model,
        color: product.color,
        registrationNo: product.registrationNo,
        vehicleUserType: product.vehicleUserType,
        additionalInfo: product.additionalInfo,
        currentUserName: product.currentUserName,
        relationship: product.relationship,
        currentUserPhone: product.currentUserPhone,
        currentCondition: product.currentCondition,

        carUserProvince:
          product.carUserAddress?.province,

        carUserPostalCode:
          product.carUserAddress?.postalCode,

        currentMileage:
          this.toNumber(product.currentMileage),

        createBy: 'CUSTOMER',
        statusCode: 'DRAFT',
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

    const registerAddressId =
      this.generateId('Address');

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

    const currentAddressId =
      this.generateId('Address');

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

    const workAddressId =
      this.generateId('Address');

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
          :province,
          :postalCode,
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
        province: address.province,
        postalCode: address.postalCode,

        remark:
          address.workplaceDescription ?? null,
      },
    );
  }

  // ============================================================
  // Motorcycle Photos
  // ============================================================

  /**
   * Insert motorcycle photos.
   *
   * Actual files are received from Multer.
   *
   * Example Angular field names:
   *
   *   motorcyclePhoto_01
   *   motorcyclePhoto_02
   *   motorcyclePhoto_03
   */
  async insertMotorcyclePhotos(
    connection: Connection,
    reqId: string,
    request: CreateTdrAssessmentDto,
    files: UploadedFile[],
    writtenFiles: string[],
  ): Promise<void> {
    const photos =
      request.productInformation?.motorcyclePhotos ?? [];

    for (const photo of photos) {
      const photoTypeCode = photo.photoType;

      // --------------------------------------------------------
      // Find uploaded file by field name
      // --------------------------------------------------------

      const fieldName =
        `motorcyclePhoto_${photoTypeCode}`;

      const uploadedFile =
        files.find(
          (file) => file.fieldname === fieldName,
        );

      if (!uploadedFile) {
        // File is not present.
        //
        // Whether this should throw an error depends on your
        // business rule. Currently we simply skip it.
        continue;
      }

      // --------------------------------------------------------
      // File information
      // --------------------------------------------------------

      const extension =
        this.resolveFileExtension(
          uploadedFile.originalname,
        );

      const fileName =
        `${photoTypeCode}.${extension}`;

      // --------------------------------------------------------
      // Save physical file
      // --------------------------------------------------------

      const fullPath =
        await this.fileStorage.saveFile(
          reqId,
          'T_MOTOCYCLE_PHOTO',
          fileName,
          uploadedFile.buffer,
        );

      // --------------------------------------------------------
      // Track written file
      //
      // If a later DB operation fails, the service can delete
      // this file.
      // --------------------------------------------------------

      writtenFiles.push(fullPath);

      // --------------------------------------------------------
      // Insert database record
      // --------------------------------------------------------

      const motorcyclePhotoId =
        this.generateId('Photo');

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

  // ============================================================
  // Financial Assessment
  // ============================================================

  /**
   * Insert financial assessment details.
   *
   * estimatePayment contains:
   *
   *   - necessaryExpense
   *   - debtObligation
   */
  async insertFinancialAssessment(
    connection: Connection,
    reqId: string,
    request: CreateTdrAssessmentDto,
  ): Promise<void> {
    const estimatePayment =
      request.estimatePayment;

    if (!estimatePayment) {
      return;
    }

    await this.insertFinancialGroup(
      connection,
      reqId,
      estimatePayment.necessaryExpense,
    );

    await this.insertFinancialGroup(
      connection,
      reqId,
      estimatePayment.debtObligation,
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

      const financialId =
        this.generateId('Finalcial');

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

          remark:
            item.remark ?? null,

          amount:
            item.amount ?? 0,
        },
      );
    }
  }

  // ============================================================
  // Document Attachments
  // ============================================================

  /**
   * Insert document attachments.
   *
   * Actual uploaded files are received from Multer.
   *
   * Example Angular field names:
   *
   *   attachment_ID_CARD
   *   attachment_HOUSE_REGISTRATION
   *   attachment_SALARY_SLIP
   *   attachment_BANK_STATEMENT
   *
   * Multiple files can use the same field name.
   */
  async insertAttachments(
    connection: Connection,
    reqId: string,
    request: CreateTdrAssessmentDto,
    files: UploadedFile[],
    attachmentTypeIds: Map<string, number>,
    writtenFiles: string[],
  ): Promise<void> {
    const attachments =
      request.documentAttachments?.attachments ?? [];

    for (const attachment of attachments) {
      // --------------------------------------------------------
      // Find attachment type ID from master data
      // --------------------------------------------------------

      const attachmentTypeId =
        attachmentTypeIds.get(
          attachment.attachmentCode,
        );

      if (!attachmentTypeId) {
        continue;
      }

      // --------------------------------------------------------
      // Find actual uploaded files
      // --------------------------------------------------------

      const fieldName =
        `attachment_${attachment.attachmentCode}`;

      const uploadedFiles =
        files.filter(
          (file) => file.fieldname === fieldName,
        );

      if (uploadedFiles.length === 0) {
        continue;
      }

      // --------------------------------------------------------
      // Process each uploaded file
      // --------------------------------------------------------

      for (const uploadedFile of uploadedFiles) {
        const attachmentId =
          this.generateId('Attachment');

        // ------------------------------------------------------
        // Resolve extension from actual uploaded file
        // ------------------------------------------------------

        const fileExt =
          this.resolveFileExtension(
            uploadedFile.originalname,
          );

        // ------------------------------------------------------
        // Use original filename
        // ------------------------------------------------------

        const fileName =
          uploadedFile.originalname;

        // ------------------------------------------------------
        // Save physical file
        // ------------------------------------------------------

        const fullPath =
          await this.fileStorage.saveFile(
            reqId,
            'T_ATTACHMENT',
            fileName,
            uploadedFile.buffer,
          );

        // ------------------------------------------------------
        // Track physical file
        //
        // If DB transaction fails later, service will delete
        // everything in writtenFiles.
        // ------------------------------------------------------

        writtenFiles.push(fullPath);

        // ------------------------------------------------------
        // Find optional metadata from DTO
        //
        // The DTO only contains metadata, NOT the binary file.
        //
        // If you need per-file remark later, we can map metadata
        // to uploaded files by index.
        // ------------------------------------------------------

        const metadata =
          this.findAttachmentMetadata(
            attachment,
            uploadedFile,
            uploadedFiles,
          );

        // ------------------------------------------------------
        // Insert database record
        // ------------------------------------------------------

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

            fileName,
            filePath: fullPath,

            fileSize: uploadedFile.size,
            mimeType: uploadedFile.mimetype,
            fileExt,

            remark:
              metadata?.remark ?? null,
          },
        );
      }
    }
  }

  // ============================================================
  // Attachment Metadata
  // ============================================================

  /**
   * Find DTO metadata belonging to an uploaded file.
   *
   * Currently the Angular request normally sends:
   *
   *   files: [
   *     File,
   *     File,
   *   ]
   *
   * and the JSON contains:
   *
   *   files: [
   *     { fileName: '...' },
   *     { fileName: '...' }
   *   ]
   *
   * We match them using the original filename.
   */
  private findAttachmentMetadata(
    attachment: CreateTdrAssessmentDto['documentAttachments']['attachments'][number],
    uploadedFile: UploadedFile,
    uploadedFiles: UploadedFile[],
  ) {
    const metadataFiles =
      attachment.files ?? [];

    if (metadataFiles.length === 0) {
      return undefined;
    }

    const uploadedIndex =
      uploadedFiles.findIndex(
        (file) => file === uploadedFile,
      );

    if (
      uploadedIndex < 0 ||
      uploadedIndex >= metadataFiles.length
    ) {
      return undefined;
    }

    const metadata =
      metadataFiles[uploadedIndex];

    if (
      metadata.fileName &&
      metadata.fileName !== uploadedFile.originalname
    ) {
      return undefined;
    }

    return metadata;
  }

  // ============================================================
  // Utility
  // ============================================================

  private toNumber(
    value: string | number | null | undefined,
  ): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const numberValue = Number(value);

    return Number.isNaN(numberValue)
      ? null
      : numberValue;
  }

  /**
   * Get extension from original filename.
   *
   * Example:
   *
   *   "01-รูปหน้ารถ.jpg" -> "jpg"
   *   "id-card.pdf"       -> "pdf"
   */
  private resolveFileExtension(
    fileName: string,
  ): string {
    const extension =
      path.extname(fileName);

    return extension
      ? extension.replace('.', '').toLowerCase()
      : 'bin';
  }

  // ============================================================
  // ID Generator
  // ============================================================

  private generateId(
    type: IType,
  ): string {
    const prefixMap: Record<IType, string> = {
      Address: 'ADDR',
      Photo: 'PHOTO',
      Finalcial: 'FIN',
      Attachment: 'ATM',
    };

    return `${prefixMap[type]}-${crypto.randomUUID()}`;
  }
}