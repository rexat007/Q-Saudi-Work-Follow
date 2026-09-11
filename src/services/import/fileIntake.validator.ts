/**
 * File Intake Validator for Excel and CSV
 * BLOCK 31: Validates incoming files before parsing
 */

import { FileIntakeValidationResult } from '../../types/excelCsvImport';

export const MAX_IMPORT_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const VALID_EXCEL_EXTENSIONS = ['.xlsx', '.xls'];
const VALID_CSV_EXTENSIONS = ['.csv'];

const VALID_EXCEL_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msexcel',
  'application/x-msexcel',
  'application/octet-stream', // Often provided by browsers for binary downloads
];

const VALID_CSV_MIMES = [
  'text/csv',
  'application/csv',
  'text/plain',
  'text/x-csv',
  'application/vnd.ms-excel', // Windows sometimes associates CSV with Excel MIME
  'application/octet-stream',
];

export class FileIntakeValidator {
  public static validate(
    fileName: string,
    fileSize: number,
    mimeType?: string
  ): FileIntakeValidationResult {
    const errors: string[] = [];

    if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
      return {
        isValid: false,
        fileType: 'UNSUPPORTED',
        fileName: fileName || '',
        fileSize,
        mimeType,
        errors: ['اسم الملف مفقود أو غير صالح'],
      };
    }

    const trimmedName = fileName.trim();
    const lastDotIndex = trimmedName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return {
        isValid: false,
        fileType: 'UNSUPPORTED',
        fileName: trimmedName,
        fileSize,
        mimeType,
        errors: ['امتداد الملف مفقود. يجب أن يكون .xlsx أو .xls أو .csv'],
      };
    }

    const extension = trimmedName.substring(lastDotIndex).toLowerCase();

    // Determine type
    let fileType: 'EXCEL' | 'CSV' | 'UNSUPPORTED' = 'UNSUPPORTED';
    if (VALID_EXCEL_EXTENSIONS.includes(extension)) {
      fileType = 'EXCEL';
    } else if (VALID_CSV_EXTENSIONS.includes(extension)) {
      fileType = 'CSV';
    } else {
      errors.push(`امتداد الملف (${extension}) غير مدعوم. الصيغ المقبولة: .xlsx, .xls, .csv`);
    }

    // Size validation
    if (fileSize <= 0) {
      errors.push('الملف فارغ (0 بايت) ولا يحتوي على أي بيانات');
    } else if (fileSize > MAX_IMPORT_FILE_SIZE_BYTES) {
      errors.push(`حجم الملف (${(fileSize / (1024 * 1024)).toFixed(1)} ميغابايت) يتجاوز الحد الأقصى المسموح به (25 ميغابايت)`);
    }

    // MIME type check if available
    if (mimeType && mimeType.trim() !== '') {
      const cleanMime = mimeType.trim().toLowerCase();
      if (fileType === 'EXCEL' && !VALID_EXCEL_MIMES.includes(cleanMime)) {
        errors.push(`نوع وسائط الملف (${mimeType}) لا يتطابق مع ملفات إكسل المعتمدة`);
      } else if (fileType === 'CSV' && !VALID_CSV_MIMES.includes(cleanMime)) {
        errors.push(`نوع وسائط الملف (${mimeType}) لا يتطابق مع ملفات CSV المعتمدة`);
      }
    }

    return {
      isValid: errors.length === 0,
      fileType,
      fileName: trimmedName,
      fileSize,
      mimeType,
      errors,
    };
  }
}
