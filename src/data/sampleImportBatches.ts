/**
 * Sample Import Batches and CSV Presets
 * Designed to demonstrate the 12-stage pipeline, CRITICAL blocking, and WARNING confirmation.
 */

import { ImportBatch } from '../types/importCenter';
import { SAMPLE_QUALITY_CONTEXT } from './sampleQualityData';
import { ImportCenterService } from '../services/dataQuality/importCenterService';

export const SAMPLE_RAW_CSV_TEXT = `الناقل,رقم اللوحة,اسم السائق,المادة,الوزن الفارغ,الوزن الإجمالي,رقم البوليصة
شركة الفازي للنقل,س ص ع 9988,سلطان فهد الفزي,ركام بازلتي مقاس 20 ملم,14200,45000,WB-NEOM-8801
مجموعة بن لادن للنقل,أ ب ج 1234,محمد إبراهيم الزهراني,رمل أحمر ردميات ناعم,15000,45000,WB-NEOM-8802
مؤسسة الشرقي للتجارة والنقل,د هـ و 5678,خالد عبدالله الشمري,خلطة إسفلتية ساخنة درجة 60/70,14500,45000,WB-NEOM-8803
شركة المجدوعي اللوجستية,أ ب ج 1234,خالد عبدالله الشمري,ركام بازلتي مقاس 20 ملم,14200,45000,WB-NEOM-8804
شركة المجدوعي اللوجستية,أ ب ج 1234,خالد عبدالله الشمري,ركام بازلتي مقاس 20 ملم,20000,15000,WB-NEOM-8805
شركة المجدوعي اللوجستية,أ ب ج 1234,خالد عبدالله الشمري,ركام بازلتي مقاس 20 ملم,14200,45000,WB-NEOM-8801`;

/**
 * Builds the initial demonstration batch from the preset CSV
 */
export function createInitialSampleBatch(): ImportBatch {
  const { headers, rows } = ImportCenterService.parseRawText(SAMPLE_RAW_CSV_TEXT);
  return ImportCenterService.processImportBatch({
    importBatchId: 'BATCH-NEOM-2026-0901',
    projectId: 'PRJ-NEOM-001',
    fileName: 'كشف_شحنات_الركام_الأسبوعي_نيوم.csv',
    uploadedBy: 'م. عبدالرحمن السبيعي (مدير حركة النقل)',
    rawRows: rows,
    headers,
    context: SAMPLE_QUALITY_CONTEXT,
    existingTripNumbers: ['WB-EXISTING-999'],
  });
}
