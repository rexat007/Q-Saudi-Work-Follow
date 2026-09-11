/**
 * Legacy Status Mapper — BLOCK 37
 * Explicit, deterministic mapping of legacy 20-column status strings to canonical TripStatus.
 * 
 * Rules:
 * - مكتمل / completed / delivered -> COMPLETED
 * - منقول / في الطريق / in_transit / transit / dispatched / محمل / تم التحميل -> IN_TRANSIT
 * - مرفوض / rejected -> REJECTED
 * - ملغى / ملغي / cancelled / canceled -> CANCELLED
 * - موزون / weighed / وزن اولي -> WEIGHED_ORIGIN
 * - Unknown / Empty -> requiresReview: true
 */

import { TripStatus } from '../../types/entities';

export interface LegacyStatusMappingResult {
  tripStatus: TripStatus;
  isUnknown: boolean;
  requiresReview: boolean;
  matchedRule: string;
}

const EXACT_LEGACY_STATUS_MAP: Record<string, TripStatus> = {
  // COMPLETED
  'مكتمل': 'COMPLETED',
  'مكتملة': 'COMPLETED',
  'تم الانتهاء': 'COMPLETED',
  'تم التفريغ': 'COMPLETED',
  'منجز': 'COMPLETED',
  'completed': 'COMPLETED',
  'delivered': 'COMPLETED',
  'done': 'COMPLETED',
  'finished': 'COMPLETED',

  // IN_TRANSIT
  'منقول': 'IN_TRANSIT',
  'في الطريق': 'IN_TRANSIT',
  'محمل': 'IN_TRANSIT',
  'تم التحميل': 'IN_TRANSIT',
  'جاري النقل': 'IN_TRANSIT',
  'بالطريق': 'IN_TRANSIT',
  'in_transit': 'IN_TRANSIT',
  'in transit': 'IN_TRANSIT',
  'intransit': 'IN_TRANSIT',
  'transit': 'IN_TRANSIT',
  'dispatched': 'IN_TRANSIT',
  'moving': 'IN_TRANSIT',
  'loaded': 'IN_TRANSIT',

  // REJECTED
  'مرفوض': 'REJECTED',
  'مرفوضة': 'REJECTED',
  'تم الرفض': 'REJECTED',
  'rejected': 'REJECTED',
  'declined': 'REJECTED',

  // CANCELLED
  'ملغى': 'CANCELLED',
  'ملغي': 'CANCELLED',
  'ملغية': 'CANCELLED',
  'تم الإلغاء': 'CANCELLED',
  'تم الالغاء': 'CANCELLED',
  'cancelled': 'CANCELLED',
  'canceled': 'CANCELLED',
  'void': 'CANCELLED',

  // WEIGHED_ORIGIN
  'موزون': 'WEIGHED_ORIGIN',
  'موزونة': 'WEIGHED_ORIGIN',
  'وزن اولي': 'WEIGHED_ORIGIN',
  'تم الوزن': 'WEIGHED_ORIGIN',
  'weighed': 'WEIGHED_ORIGIN',
  'weighed_origin': 'WEIGHED_ORIGIN',
};

export function mapLegacyStatusToTripStatus(rawStatus?: string | null): LegacyStatusMappingResult {
  if (!rawStatus || typeof rawStatus !== 'string' || !rawStatus.trim()) {
    return {
      tripStatus: 'DISPATCHED',
      isUnknown: true,
      requiresReview: true,
      matchedRule: 'MISSING_STATUS',
    };
  }

  const normalized = rawStatus.toLowerCase().trim().replace(/[\s\-_]+/g, ' ');
  const directMatch = EXACT_LEGACY_STATUS_MAP[normalized];

  if (directMatch) {
    return {
      tripStatus: directMatch,
      isUnknown: false,
      requiresReview: false,
      matchedRule: `EXACT_${directMatch}`,
    };
  }

  // Substring checks for compound or slightly varied status text
  if (normalized.includes('مكتمل') || normalized.includes('complet') || normalized.includes('deliver')) {
    return { tripStatus: 'COMPLETED', isUnknown: false, requiresReview: false, matchedRule: 'SUBSTRING_COMPLETED' };
  }
  if (normalized.includes('طريق') || normalized.includes('transit') || normalized.includes('منقول') || normalized.includes('تحميل')) {
    return { tripStatus: 'IN_TRANSIT', isUnknown: false, requiresReview: false, matchedRule: 'SUBSTRING_IN_TRANSIT' };
  }
  if (normalized.includes('رفض') || normalized.includes('reject')) {
    return { tripStatus: 'REJECTED', isUnknown: false, requiresReview: false, matchedRule: 'SUBSTRING_REJECTED' };
  }
  if (normalized.includes('لغى') || normalized.includes('لغي') || normalized.includes('cancel')) {
    return { tripStatus: 'CANCELLED', isUnknown: false, requiresReview: false, matchedRule: 'SUBSTRING_CANCELLED' };
  }
  if (normalized.includes('وزن') || normalized.includes('weigh')) {
    return { tripStatus: 'WEIGHED_ORIGIN', isUnknown: false, requiresReview: false, matchedRule: 'SUBSTRING_WEIGHED' };
  }

  // Unknown status must trigger requires_review
  return {
    tripStatus: 'DISPATCHED',
    isUnknown: true,
    requiresReview: true,
    matchedRule: 'UNKNOWN_STATUS_REQUIRES_REVIEW',
  };
}
