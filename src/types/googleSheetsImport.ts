/**
 * Google Sheets Import Types
 * BLOCK 33: Google Sheets Integration into Unified Import Pipeline
 * 
 * Complies with Operation Source Model (BLOCK 29) & Unified Import Center (BLOCK 30)
 */

import { ColumnMappingMatch } from './excelCsvImport';

export interface GoogleSheetTabItem {
  sheetId: number;
  title: string;
  index: number;
  rowCount?: number;
  columnCount?: number;
}

export interface GoogleSpreadsheetItem {
  id: string;
  name: string;
  mimeType: 'application/vnd.google-apps.spreadsheet';
  modifiedTime?: string;
  webViewLink?: string;
  sheets?: GoogleSheetTabItem[];
  rowCountEstimate?: number;
  description?: string;
}

export interface GoogleSheetsProcessOptions {
  sheetName?: string;
  headerRowIndex?: number;
  customMappings?: Record<string, string>;
  maxRows?: number;
}

export interface GoogleSheetsListResponse {
  success: boolean;
  spreadsheets: GoogleSpreadsheetItem[];
  totalCount: number;
  projectId: string;
  error?: string;
}

export interface GoogleSheetMetadataResponse {
  success: boolean;
  spreadsheetId: string;
  title: string;
  sheets: GoogleSheetTabItem[];
  error?: string;
}

export interface GoogleSheetValuesResponse {
  success: boolean;
  spreadsheetId: string;
  spreadsheetTitle: string;
  sheetTitle: string;
  values: any[][];
  totalRows: number;
  totalColumns: number;
  error?: string;
}
