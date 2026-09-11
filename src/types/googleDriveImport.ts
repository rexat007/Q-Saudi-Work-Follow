/**
 * Google Drive Import Integration Domain Types
 * BLOCK 32: Google Drive File Source for Unified Import Center
 * 
 * Rules:
 * - Source Type: 'GOOGLE_DRIVE'
 * - Routes to Unified Import Pipeline (BLOCK 30)
 * - File parsing delegates to existing Excel/CSV parsers (BLOCK 31)
 * - Strictly NO OAuth secrets/tokens stored in Firestore or Trip documents
 * - Pre-commit gate enforced: zero writes before COMMIT stage
 */

import { CanonicalTripRow, ColumnMappingMatch } from './excelCsvImport';

export type GoogleDriveFileFormat = 'EXCEL' | 'CSV' | 'UNSUPPORTED';

export interface GoogleDriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
  folderId?: string;
  folderName?: string;
  format: GoogleDriveFileFormat;
  isSupported: boolean;
}

export interface GoogleDriveProcessOptions {
  sheetName?: string;
  headerRowIndex?: number;
  customMappings?: Record<string, keyof CanonicalTripRow>;
}

export interface GoogleDriveFileListResponse {
  success: boolean;
  files: GoogleDriveFileItem[];
  folderId?: string;
  folderName?: string;
  totalCount: number;
  error?: string;
}

export interface GoogleDriveFileContentResponse {
  success: boolean;
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  contentBase64?: string;
  error?: string;
}
