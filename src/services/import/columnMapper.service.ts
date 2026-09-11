/**
 * Intelligent Column Mapper
 * BLOCK 31: Maps arbitrary headers to CanonicalTripRow properties
 * Strictly implements IImportMapper from BLOCK 30
 * 
 * Rules:
 * - Do NOT assume column order
 * - Support exact header matching
 * - Support normalized header matching
 * - Support comprehensive Arabic and English aliases
 * - Confidence score evaluation (1.0, 0.92, 0.88, 0.75)
 * - Ambiguous / low confidence (< 0.70) => requires_review
 */

import { IImportMapper } from './contracts';
import { PipelineContext } from '../../types/unifiedImport';
import { CanonicalTripRow, ColumnMappingMatch } from '../../types/excelCsvImport';

interface FieldAliasDefinition {
  canonicalField: keyof CanonicalTripRow;
  exactNames: string[];
  aliases: string[];
}

const CANONICAL_FIELD_DEFINITIONS: FieldAliasDefinition[] = [
  {
    canonicalField: 'ticketId',
    exactNames: ['ticketid', 'ticket_id', 'ticketno', 'ticket_no', 'ticket', 'رقم_التذكرة', 'رقم_البوليصة', 'رقم_الشحنة'],
    aliases: ['تذكرة', 'بوليصة', 'شحنة', 'waybill', 'bill_no', 'doc_no', 'weighbill', 'ticket number', 'رقم التذكرة', 'رقم البوليصة', 'رقم الشحنة', 'رقم الوصل', 'وصل'],
  },
  {
    canonicalField: 'truckNo',
    exactNames: ['truckno', 'truck_no', 'truckid', 'truck_id', 'plate', 'plateno', 'plate_no', 'رقم_اللوحة', 'اللوحة', 'الشاحنة', 'رقم_الشاحنة'],
    aliases: ['لوحة', 'شاحنة', 'رأس تريلا', 'رقم اللوحة', 'رقم الشاحنة', 'رقم المركبة', 'المركبة', 'vehicle', 'vehicle_no', 'truck', 'truck_plate'],
  },
  {
    canonicalField: 'carrier',
    exactNames: ['carrier', 'carrierid', 'carrier_id', 'transporter', 'transporter_id', 'الناقل', 'شركة_النقل', 'اسم_الناقل', 'المقاول'],
    aliases: ['مؤسسة النقل', 'شركة النقل', 'الناقل', 'اسم الناقل', 'المقاول', 'المورد', 'transport_company', 'carrier_name', 'hauler', 'vendor'],
  },
  {
    canonicalField: 'driverName',
    exactNames: ['driver', 'drivername', 'driver_name', 'driverid', 'driver_id', 'السائق', 'اسم_السائق'],
    aliases: ['سائق', 'اسم السائق', 'قائد الشاحنة', 'قائد المركبة', 'driver_full_name', 'chauffeur'],
  },
  {
    canonicalField: 'materialType',
    exactNames: ['material', 'materialtype', 'material_type', 'materialid', 'material_id', 'materialcode', 'المادة', 'نوع_المادة', 'الصنف'],
    aliases: ['مادة', 'نوع المادة', 'الصنف', 'المنتج', 'اسم المادة', 'نوع الشحنة', 'item', 'item_name', 'cargo', 'product', 'substance'],
  },
  {
    canonicalField: 'shiftDate',
    exactNames: ['date', 'shiftdate', 'shift_date', 'tripdate', 'trip_date', 'التاريخ', 'تاريخ', 'تاريخ_الوردية'],
    aliases: ['تاريخ الحركة', 'تاريخ الوردية', 'تاريخ الشحنة', 'تاريخ النقل', 'تاريخ اليوم', 'trip_day', 'log_date', 'entry_date'],
  },
  {
    canonicalField: 'tareWeight',
    exactNames: ['tare', 'tareweight', 'tare_weight', 'tare_kg', 'tareweightkg', 'الوزن_الفارغ', 'فارغ', 'وزن_فارغ'],
    aliases: ['فارغ كجم', 'الوزن الفارغ', 'وزن فارغ', 'فارغ', 'وزن الشاحنة فارغة', 'tare_tons', 'empty_weight'],
  },
  {
    canonicalField: 'grossWeight',
    exactNames: ['gross', 'grossweight', 'gross_weight', 'gross_kg', 'grossweightkg', 'الوزن_القائم', 'الإجمالي', 'وزن_إجمالي', 'قائم'],
    aliases: ['قائم كجم', 'الوزن الإجمالي', 'وزن إجمالي', 'الوزن القائم', 'قائم', 'ممتلئ', 'full_weight', 'total_weight'],
  },
  {
    canonicalField: 'netWeight',
    exactNames: ['net', 'netweight', 'net_weight', 'net_kg', 'netweightkg', 'الوزن_الصافي', 'الصافي', 'وزن_صافي'],
    aliases: ['صافي كجم', 'الوزن الصافي', 'وزن صافي', 'الصافي', 'حمولة صافية', 'net_payload', 'payload_weight'],
  },
  {
    canonicalField: 'destNetWeight',
    exactNames: ['destnet', 'dest_net', 'destnetweight', 'dest_net_weight', 'وزن_الوصول_الصافي', 'صافي_الوصول', 'صافي_التفريغ'],
    aliases: ['صافي الوصول', 'صافي موقع التفريغ', 'وزن الوصول الصافي', 'arrival_net', 'unload_net_weight', 'dest_weight'],
  },
  {
    canonicalField: 'loader',
    exactNames: ['loader', 'loader_name', 'scaleoperator', 'scale_operator', 'الموزن', 'محطة_التحميل', 'المشغل'],
    aliases: ['مسؤول الميزان', 'مشغل الميزان', 'الموزن', 'محطة التحميل', 'scale_user', 'weigher'],
  },
  {
    canonicalField: 'unloader',
    exactNames: ['unloader', 'unloader_name', 'محطة_التفريغ', 'مشغل_التفريغ'],
    aliases: ['مستلم الموقع', 'مشغل التفريغ', 'محطة التفريغ', 'site_receiver'],
  },
  {
    canonicalField: 'pricingRule',
    exactNames: ['pricingrule', 'pricing_rule', 'rate', 'price', 'فئة_السعر', 'السعر'],
    aliases: ['سعر الطن', 'سعر الرد', 'فئة السعر', 'قاعدة التسعير', 'rate_sar', 'price_tier'],
  },
  {
    canonicalField: 'weighTime',
    exactNames: ['time', 'weightime', 'weigh_time', 'الوقت', 'وقت_الوزن'],
    aliases: ['ساعة الوزن', 'وقت الحركة', 'زمن التحميل', 'time_in'],
  },
  {
    canonicalField: 'unloadTime',
    exactNames: ['unloadtime', 'unload_time', 'وقت_التفريغ'],
    aliases: ['ساعة التفريغ', 'زمن الوصول', 'time_out'],
  },
  {
    canonicalField: 'note',
    exactNames: ['note', 'notes', 'remark', 'remarks', 'ملاحظات', 'ملاحظة', 'بيان'],
    aliases: ['تعليق', 'ملاحظات إضافية', 'بيان الرحلة', 'comment', 'comments'],
  },
];

export class ExcelCsvColumnMapper implements IImportMapper<Record<string, any>, CanonicalTripRow> {
  private customMappings?: Record<string, keyof CanonicalTripRow>;

  constructor(customMappings?: Record<string, keyof CanonicalTripRow>) {
    this.customMappings = customMappings;
  }

  /**
   * Evaluates mapping for a set of raw headers
   */
  public static mapHeaders(headers: string[]): Record<string, ColumnMappingMatch> {
    const mappings: Record<string, ColumnMappingMatch> = {};
    const claimedFields = new Set<string>();

    for (const rawHeader of headers) {
      const match = ExcelCsvColumnMapper.findBestMatch(rawHeader, claimedFields);
      mappings[rawHeader] = match;
      if (match.confidence >= 0.70 && !match.isAmbiguous) {
        claimedFields.add(match.canonicalField as string);
      }
    }

    return mappings;
  }

  /**
   * Matches a single header against canonical fields
   */
  private static findBestMatch(header: string, alreadyClaimed: Set<string>): ColumnMappingMatch {
    const cleanHeader = header.trim();
    const normalized = ExcelCsvColumnMapper.normalizeHeaderString(cleanHeader);

    // 1. Check Exact Match
    for (const def of CANONICAL_FIELD_DEFINITIONS) {
      if (def.exactNames.includes(normalized) || def.exactNames.includes(cleanHeader.toLowerCase())) {
        return {
          headerName: header,
          canonicalField: def.canonicalField,
          confidence: 1.0,
          matchType: 'EXACT',
        };
      }
    }

    // 2. Check Normalized Match
    for (const def of CANONICAL_FIELD_DEFINITIONS) {
      for (const exactName of def.exactNames) {
        if (normalized === ExcelCsvColumnMapper.normalizeHeaderString(exactName)) {
          return {
            headerName: header,
            canonicalField: def.canonicalField,
            confidence: 0.92,
            matchType: 'NORMALIZED',
          };
        }
      }
    }

    // 3. Check Aliases
    let bestAliasMatch: { field: keyof CanonicalTripRow; confidence: number } | null = null;

    for (const def of CANONICAL_FIELD_DEFINITIONS) {
      for (const alias of def.aliases) {
        const normAlias = ExcelCsvColumnMapper.normalizeHeaderString(alias);
        if (normalized === normAlias) {
          return {
            headerName: header,
            canonicalField: def.canonicalField,
            confidence: 0.88,
            matchType: 'ALIAS',
          };
        }
        // Substring token match
        if (normalized.includes(normAlias) || normAlias.includes(normalized)) {
          if (!bestAliasMatch || bestAliasMatch.confidence < 0.75) {
            bestAliasMatch = { field: def.canonicalField, confidence: 0.75 };
          }
        }
      }
    }

    if (bestAliasMatch && bestAliasMatch.confidence >= 0.70) {
      const isClaimed = alreadyClaimed.has(bestAliasMatch.field as string);
      return {
        headerName: header,
        canonicalField: bestAliasMatch.field,
        confidence: isClaimed ? 0.60 : bestAliasMatch.confidence,
        matchType: 'TOKEN',
        isAmbiguous: isClaimed,
      };
    }

    // Unmapped or ambiguous
    return {
      headerName: header,
      canonicalField: `unmapped_${normalized || 'col'}`,
      confidence: 0.0,
      matchType: 'TOKEN',
      isAmbiguous: true,
    };
  }

  /**
   * Strips spaces, symbols, and normalizes Arabic characters
   */
  public static normalizeHeaderString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[\s\-_.\/\\()[\]]+/g, '')
      .trim();
  }

  public map(
    canonicalNormalized: Record<string, any>,
    rowNumber: number,
    context: PipelineContext
  ): CanonicalTripRow {
    const mapped: CanonicalTripRow = {
      projectId: context.projectId,
      _sourceRowIndex: canonicalNormalized._sourceRowIndex || rowNumber,
    };

    // Auto-map using header intelligence or custom mappings
    for (const [key, value] of Object.entries(canonicalNormalized)) {
      if (key.startsWith('_')) {
        (mapped as any)[key] = value;
        continue;
      }

      // Check explicit custom mappings
      if (this.customMappings && this.customMappings[key]) {
        const targetProp = this.customMappings[key];
        (mapped as any)[targetProp] = value;
        continue;
      }

      // Detect match
      const match = ExcelCsvColumnMapper.findBestMatch(key, new Set());
      if (match.confidence >= 0.70 && !match.isAmbiguous) {
        (mapped as any)[match.canonicalField] = value;
      } else {
        // Keep unmapped properties under their original name so data is never lost
        (mapped as any)[key] = value;
      }
    }

    // Auto-calculate netWeight if gross and tare are present
    if (mapped.netWeight === undefined || mapped.netWeight === null) {
      if (
        typeof mapped.grossWeight === 'number' &&
        typeof mapped.tareWeight === 'number' &&
        !isNaN(mapped.grossWeight) &&
        !isNaN(mapped.tareWeight)
      ) {
        mapped.netWeight = Math.round((mapped.grossWeight - mapped.tareWeight) * 100) / 100;
      }
    }

    return mapped;
  }
}
