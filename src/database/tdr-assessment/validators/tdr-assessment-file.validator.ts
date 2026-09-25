import { BadRequestException, Injectable } from '@nestjs/common';

import { UploadedFile } from '../../../common/types/uploaded-file.type';
import { CreateTdrAssessmentDto } from '../dto/create-tdr-assessment.dto';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  FORM_FIELD_DOCUMENT_ATTACH,
  FORM_FIELD_MOTORCYCLE_PHOTO,
  MAX_UPLOAD_FILE_SIZE,
} from '../constants/tdr-assessment.constants';

/** Files received from Multer, grouped by form field name. */
export interface TdrUploadedFiles {
  [FORM_FIELD_MOTORCYCLE_PHOTO]?: UploadedFile[];
  [FORM_FIELD_DOCUMENT_ATTACH]?: UploadedFile[];
}

export interface ResolvedFile {
  file: UploadedFile;
  /** Original file name, already decoded to proper UTF-8 (Thai names). */
  originalName: string;
}

export interface ResolvedAttachmentFile extends ResolvedFile {
  remark?: string;
}

/** Uploaded files linked to the JSON metadata. Built BEFORE the DB transaction. */
export interface ResolvedTdrFiles {
  /** photoType -> file */
  photos: Map<string, ResolvedFile>;
  /** attachmentCode -> files */
  attachments: Map<string, ResolvedAttachmentFile[]>;
}

/**
 * Multer (busboy) decodes the multipart file name as latin1, so a browser's
 * UTF-8 Thai name "01-รูปหน้ารถ.jpg" arrives as mojibake and would never equal
 * the same name inside the JSON. Re-decode it.
 */
export function decodeUploadedFileName(name: string): string {
  // Any char above 0xFF means it is already properly decoded.
  if ([...name].some((char) => char.charCodeAt(0) > 0xff)) {
    return name;
  }

  const decoded = Buffer.from(name, 'latin1').toString('utf8');

  return decoded.includes('\uFFFD') ? name : decoded;
}

/** "01-front.jpg" -> 1, "3_salary.pdf" -> 3, "front.jpg" -> undefined */
function leadingNumber(name: string): number | undefined {
  const match = /^\s*(\d+)/.exec(name);

  return match ? Number(match[1]) : undefined;
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Does an attached file belong to this key (photoType / attachmentTypeId)?
 *
 *   key "01" or "1"  ->  "01.jpg", "1.pdf", "01-front.jpg", "1_id-card.pdf"
 *
 * Numeric keys are compared as numbers, so "01" and "1" are the same.
 * Non-numeric keys must equal the file name without its extension.
 */
function fileNameMatchesKey(fileName: string, key: string): boolean {
  const numericKey = toNumber(key);

  if (numericKey !== undefined) {
    return leadingNumber(fileName) === numericKey;
  }

  const stem = fileName.replace(/\.[^./\\]*$/, '');

  return stem.toLowerCase() === key.toLowerCase();
}

interface Candidate extends ResolvedFile {
  used: boolean;
}

/**
 * Checks that the files really attached to the multipart request agree with
 * the names declared in the `data` JSON, and links each file to its owner.
 */
@Injectable()
export class TdrAssessmentFileValidator {
  resolve(
    request: CreateTdrAssessmentDto,
    uploaded: TdrUploadedFiles | undefined,
  ): ResolvedTdrFiles {
    const photoFiles = this.toCandidates(
      uploaded?.[FORM_FIELD_MOTORCYCLE_PHOTO],
      FORM_FIELD_MOTORCYCLE_PHOTO,
    );

    const documentFiles = this.toCandidates(
      uploaded?.[FORM_FIELD_DOCUMENT_ATTACH],
      FORM_FIELD_DOCUMENT_ATTACH,
    );

    const photos = this.resolvePhotos(request, photoFiles);
    const attachments = this.resolveAttachments(request, documentFiles);

    return { photos, attachments };
  }

  // ===========================================================================
  // Motorcycle photos
  // ===========================================================================

  private resolvePhotos(
    request: CreateTdrAssessmentDto,
    files: Candidate[],
  ): Map<string, ResolvedFile> {
    const result = new Map<string, ResolvedFile>();
    const declared = request.productInformation?.motorcyclePhoto ?? [];

    this.assertNoDuplicates(
      declared.map((photo) => photo.photoType),
      'DUPLICATE_MOTORCYCLE_PHOTO_TYPE',
      'productInformation.motorcyclePhoto',
      'photoType is declared more than once',
    );

    // The attached file's own name decides which photo it is:
    // photoType "01" <- "01.jpg" / "01-front.jpg".
    // `fileName` inside the JSON is informational and is NOT compared.
    for (const photo of declared) {
      const matches = files.filter(
        (f) => !f.used && fileNameMatchesKey(f.originalName, photo.photoType),
      );

      if (matches.length === 0) {
        throw new BadRequestException({
          code: 'MOTORCYCLE_PHOTO_FILE_MISSING',
          message: `No file was attached to "${FORM_FIELD_MOTORCYCLE_PHOTO}" for photoType ${photo.photoType}. Name the file "${photo.photoType}" (e.g. "${photo.photoType}.jpg").`,
          field: 'productInformation.motorcyclePhoto',
          attachedFileNames: files.map((f) => f.originalName),
        });
      }

      if (matches.length > 1) {
        throw new BadRequestException({
          code: 'MOTORCYCLE_PHOTO_FILE_AMBIGUOUS',
          message: `More than one attached file matches photoType ${photo.photoType}.`,
          field: FORM_FIELD_MOTORCYCLE_PHOTO,
          values: matches.map((f) => f.originalName),
        });
      }

      matches[0].used = true;
      result.set(photo.photoType, this.publicFile(matches[0]));
    }

    this.assertAllUsed(files, FORM_FIELD_MOTORCYCLE_PHOTO);

    return result;
  }

  // ===========================================================================
  // Document attachments
  // ===========================================================================

  private resolveAttachments(
    request: CreateTdrAssessmentDto,
    files: Candidate[],
  ): Map<string, ResolvedAttachmentFile[]> {
    const result = new Map<string, ResolvedAttachmentFile[]>();
    const declared = request.documentAttachments?.attachments ?? [];

    this.assertNoDuplicates(
      declared.map((attachment) => attachment.attachmentCode),
      'DUPLICATE_ATTACHMENT_CODE',
      'documentAttachments.attachments',
      'attachmentCode is declared more than once',
    );

    for (const attachment of declared) {
      result.set(attachment.attachmentCode, []);
    }

    // The attached file's own name decides which document type it is:
    // attachmentTypeId "1" <- "1.pdf" / "1-id-card.pdf".
    // `files[].fileName` inside the JSON is informational and is NOT compared.
    // A declared attachment with no file attached is allowed (optional document).
    for (const attachment of declared) {
      const key = attachment.attachmentTypeId;

      if (!key) continue;

      const matched = files.filter(
        (f) => !f.used && fileNameMatchesKey(f.originalName, key),
      );

      const metadata = attachment.files ?? [];

      matched.forEach((file, index) => {
        file.used = true;

        result.get(attachment.attachmentCode)!.push({
          ...this.publicFile(file),
          // optional per-file remark, paired by position
          remark: metadata[index]?.remark,
        });
      });
    }

    this.assertAllUsed(files, FORM_FIELD_DOCUMENT_ATTACH);

    return result;
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private toCandidates(
    files: UploadedFile[] | undefined,
    fieldName: string,
  ): Candidate[] {
    return (files ?? []).map((file) => {
      if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException({
          code: 'UNSUPPORTED_FILE_TYPE',
          message: `File "${decodeUploadedFileName(file.originalname)}" has unsupported type ${file.mimetype}.`,
          field: fieldName,
          allowed: ALLOWED_UPLOAD_MIME_TYPES,
        });
      }

      if (!file.size || file.size <= 0) {
        throw new BadRequestException({
          code: 'EMPTY_FILE',
          message: `File "${decodeUploadedFileName(file.originalname)}" is empty.`,
          field: fieldName,
        });
      }

      if (file.size > MAX_UPLOAD_FILE_SIZE) {
        throw new BadRequestException({
          code: 'FILE_TOO_LARGE',
          message: `File "${decodeUploadedFileName(file.originalname)}" is larger than ${MAX_UPLOAD_FILE_SIZE / 1024 / 1024} MB.`,
          field: fieldName,
        });
      }

      return {
        file,
        originalName: decodeUploadedFileName(file.originalname),
        used: false,
      };
    });
  }

  private publicFile(candidate: Candidate): ResolvedFile {
    return { file: candidate.file, originalName: candidate.originalName };
  }

  private assertAllUsed(files: Candidate[], fieldName: string): void {
    const unmatched = files.filter((f) => !f.used).map((f) => f.originalName);

    if (unmatched.length > 0) {
      throw new BadRequestException({
        code: 'UNEXPECTED_FILE',
        message:
          `These files in "${fieldName}" do not belong to anything declared in "data": ${unmatched.join(', ')}. ` +
          `Name motorcyclePhoto files after the photoType ("01.jpg", "02.jpg") and ` +
          `documentAttach files after the attachmentTypeId ("1.pdf", "2.pdf"), ` +
          `and make sure that photoType / attachmentTypeId is declared in "data".`,
        field: fieldName,
        values: unmatched,
      });
    }
  }

  private assertNoDuplicates(
    values: string[],
    code: string,
    field: string,
    message: string,
  ): void {
    const duplicates = values.filter(
      (value, index) => values.indexOf(value) !== index,
    );

    if (duplicates.length > 0) {
      throw new BadRequestException({
        code,
        message: `${message}: ${[...new Set(duplicates)].join(', ')}`,
        field,
        values: [...new Set(duplicates)],
      });
    }
  }
}
