/**
 * BLOCK 41 — i18n Translation-Key Architecture & Generator
 * Generates deterministic, hierarchical, stable semantic keys.
 */

import { SemanticCategory } from './catalog.types';
import { ARABIC_TO_KEY_SLUG_MAP } from './catalog.constants';

/**
 * Clean slugify helper
 */
export function slugifyText(text: string): string {
  // Check exact dictionary match first
  const clean = text.trim();
  if (ARABIC_TO_KEY_SLUG_MAP[clean]) {
    return ARABIC_TO_KEY_SLUG_MAP[clean];
  }

  // If mostly English/ASCII
  if (/^[A-Za-z0-9\s_-]+$/.test(clean)) {
    const parts = clean
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return 'item';
    return parts[0].toLowerCase() + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');
  }

  // If Arabic compound phrase, inspect words
  const words = clean.split(/\s+/).filter(Boolean);
  const matchedSlugs: string[] = [];

  for (const word of words) {
    // Strip Arabic prefixes (الـ, بـ, لـ, و) if needed
    const stripped = word.replace(/^(ال|و|ف|ب|ل)/, '');
    if (ARABIC_TO_KEY_SLUG_MAP[word]) {
      matchedSlugs.push(ARABIC_TO_KEY_SLUG_MAP[word]);
    } else if (ARABIC_TO_KEY_SLUG_MAP[stripped]) {
      matchedSlugs.push(ARABIC_TO_KEY_SLUG_MAP[stripped]);
    }
  }

  if (matchedSlugs.length > 0) {
    const uniqueSlugs = Array.from(new Set(matchedSlugs));
    return uniqueSlugs[0] + uniqueSlugs.slice(1).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  }

  // Deterministic 6-character hex hash from string
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(6, '0').slice(0, 6);
  return `txt_${hex}`;
}

/**
 * Determine sub-category based on context and text semantics
 */
export function inferSubCategory(text: string, context: string): string {
  const lowerContext = context.toLowerCase();

  // Action buttons
  if (
    /action|button|btn|click|handle|submit/i.test(lowerContext) ||
    /^(حفظ|إلغاء|تأكيد|إغلاق|حذف|تعديل|إضافة|إنشاء|تصدير|استيراد|بحث|تصفية|تحديث|عرض|تحميل|رفع|متابعة|رجوع|Save|Cancel|Confirm|Close|Delete|Edit|Add|Export|Import|Search)$/i.test(
      text.trim()
    )
  ) {
    return 'actions';
  }

  // Table columns or report headers
  if (/col|column|header|th|table/i.test(lowerContext)) {
    return 'columns';
  }

  // Form fields or labels
  if (/field|input|label|placeholder|form/i.test(lowerContext) || /رقم|اسم|تاريخ|وزن|كمية|سعر/i.test(text)) {
    return 'fields';
  }

  // Statuses & Badges
  if (/status|badge|state/i.test(lowerContext) || /نشط|مكتمل|معلق|ملغي|فشل|نجاح|مسودة/i.test(text)) {
    return 'status';
  }

  // Messages, alerts, toasts, errors
  if (/error|toast|alert|message|notify|warn|validation|msg/i.test(lowerContext)) {
    return /error|خطأ|فشل/i.test(text) ? 'errors' : 'messages';
  }

  // Tabs or navigation
  if (/nav|tab|menu|breadcrumb|link/i.test(lowerContext)) {
    return 'nav';
  }

  return 'labels';
}

export class KeyGenerator {
  private keyRegistry = new Map<string, string>(); // proposedKey -> normalizedText

  /**
   * Generates a deterministic hierarchical translation key:
   * `<category>.<subCategory>.<item>`
   * 
   * Avoids collisions by adding a deterministic suffix when distinct texts produce the same slug.
   */
  generateKey(category: SemanticCategory, text: string, context: string): string {
    const trimmed = text.trim();
    if (!trimmed) return `${category}.shared.empty`;

    // Fast-path: Common shared actions
    if (category === 'shared' || /^(حفظ|تأكيد|إغلاق|حذف|تعديل)$/.test(trimmed)) {
      if (trimmed === 'حفظ') return 'shared.actions.save';
      if (trimmed === 'تأكيد') return 'shared.actions.confirm';
      if (trimmed === 'إغلاق') return 'shared.actions.close';
      if (trimmed === 'حذف') return 'shared.actions.delete';
      if (trimmed === 'تعديل') return 'shared.actions.edit';
      if (trimmed === 'إلغاء' && category === 'shared') return 'shared.actions.cancel';
    }

    const subCategory = inferSubCategory(trimmed, context);
    const slug = slugifyText(trimmed);

    let baseKey = `${category}.${subCategory}.${slug}`;

    // Check collision in registry
    const registeredText = this.keyRegistry.get(baseKey);
    if (!registeredText || registeredText === trimmed) {
      this.keyRegistry.set(baseKey, trimmed);
      return baseKey;
    }

    // Collision detected with different text! Resolve deterministically
    let suffix = 2;
    let candidateKey = `${baseKey}_${suffix}`;
    while (this.keyRegistry.has(candidateKey) && this.keyRegistry.get(candidateKey) !== trimmed) {
      suffix++;
      candidateKey = `${baseKey}_${suffix}`;
    }

    this.keyRegistry.set(candidateKey, trimmed);
    return candidateKey;
  }

  reset(): void {
    this.keyRegistry.clear();
  }
}
