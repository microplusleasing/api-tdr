export const TDR_MODULE_CODE = 'TDR';

export const ADDRESS_TYPE = {
  REGISTERED: '01',
  ID_CARD: '02',
  CURRENT: '03',
  WORKPLACE: '04',
} as const;

// ============================================================
// Multipart form-data contract for POST /tdr-assessment
// ============================================================
//
// Angular sends ONE multipart request:
//
//   data            -> text field: JSON.stringify(payload)   (NO File objects inside)
//   motorcyclePhoto  -> file, repeated once per photo
//   documentAttach  -> file, repeated once per document
//
// If the Angular side uses different names, change them HERE only.

export const FORM_FIELD_DATA = 'data';
export const FORM_FIELD_MOTORCYCLE_PHOTO = 'motorcyclePhoto';
export const FORM_FIELD_DOCUMENT_ATTACH = 'documentAttach';

// ============================================================
// Upload limits
// ============================================================

export const MAX_MOTORCYCLE_PHOTO_FILES = 20;
export const MAX_DOCUMENT_ATTACH_FILES = 50;

/** 10 MB per file. */
export const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;

/** Images and PDF. Add more mime types here if other document types are needed. */
export const ALLOWED_UPLOAD_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];
