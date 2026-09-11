/**
 * BLOCK 35: Centralized Entity Normalization Service
 * 
 * Provides unified, deterministic text, numeral, and domain-specific normalization
 * for Saudi logistics operations (Arabic, English, Plate numbers, Corporate names).
 * 
 * CORE INVARIANT:
 * The raw value is NEVER mutated or overwritten.
 * Both `rawValue` and `normalizedValue` are retained.
 */

// Arabic-Indic Digits (٠-٩) mapping to ASCII standard digits
const EASTERN_ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

// Arabic Tashkeel (Harakat/Diacritics): U+064B to U+065F + U+0670 (Superscript Alef)
const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u0670]/g;

// Arabic Tatweel / Kashida (ـ) U+0640
const ARABIC_TATWEEL_REGEX = /\u0640/g;

export class EntityNormalizationService {
  /**
   * Normalizes numerals: Eastern Arabic-Indic digits (٠-٩) to Western standard (0-9).
   */
  public static normalizeDigits(value: string | null | undefined): string {
    if (!value) return '';
    return value.replace(/[٠-٩]/g, (digit) => EASTERN_ARABIC_DIGITS[digit] || digit);
  }

  /**
   * Trims and collapses multiple spaces, tabs, and invisible zero-width unicode chars.
   */
  public static normalizeWhitespace(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalizes general Arabic text while preserving core semantics.
   * - Strips diacritics (tashkeel)
   * - Strips tatweel (kashida)
   * - Standardizes alef variations (أ, إ, آ, ٱ -> ا)
   * - Standardizes alef maqsura (ى -> ي)
   * - Standardizes taa marbuta (ة -> ه)
   * - Converts Eastern Arabic-Indic digits to Western standard
   * - Trims and collapses whitespaces
   */
  public static normalizeArabicText(value: string | null | undefined): string {
    if (!value) return '';

    return this.normalizeDigits(value)
      .replace(ARABIC_DIACRITICS_REGEX, '')
      .replace(ARABIC_TATWEEL_REGEX, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Standardizes Saudi and international vehicle plate numbers.
   * - Converts Eastern Arabic digits
   * - Standardizes Arabic letters
   * - Removes punctuation, dashes, slashes, brackets
   * - Collapses internal spaces
   * Example: 'أ ب ج  ١ ٢ ٣ ٤' -> 'ا ب ج 1234'
   * Example: 'ABC-1234' -> 'ABC 1234'
   */
  public static normalizePlate(plate: string | null | undefined): string {
    if (!plate) return '';

    const cleaned = this.normalizeArabicText(plate)
      .replace(/[-_.,/\\|()[\]{}:#*]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract letters and digits
    const letters = cleaned.replace(/[0-9]/g, '').trim().replace(/\s+/g, ' ');
    const numbers = cleaned.replace(/[^0-9]/g, '').trim();

    if (letters && numbers) {
      return `${letters} ${numbers}`;
    }

    return cleaned;
  }

  /**
   * Normalizes entity names (Carriers, Drivers, Materials, Projects).
   * - Converts digits and normalizes Arabic glyphs
   * - Lowercases English characters
   * - Standardizes compound words (e.g. "عبد الله" -> "عبدالله")
   */
  public static normalizeName(name: string | null | undefined): string {
    if (!name) return '';

    let normalized = this.normalizeArabicText(name).toLowerCase();

    // Standardize compound name spaces
    normalized = normalized.replace(/عبد\s+الله/g, 'عبدالله');
    normalized = normalized.replace(/ابو\s+/g, 'أبو ');

    return normalized.trim();
  }

  /**
   * Strips common corporate prefixes and legal suffixes for token/variant matching.
   * (e.g. "شركة الفلاح للنقل" -> "الفلاح", "Al Falah Transport Co." -> "al falah")
   */
  public static stripCorporateAffixes(name: string | null | undefined): string {
    if (!name) return '';

    let s = this.normalizeName(name);

    // Arabic prefixes
    s = s
      .replace(/^شركة\s+/, '')
      .replace(/^مؤسسة\s+/, '')
      .replace(/^مجموعة\s+/, '')
      .replace(/^مصنع\s+/, '')
      .replace(/^نقليات\s+/, '')
      .replace(/^مكتب\s+/, '');

    // Arabic suffixes
    s = s
      .replace(/\s+المحدودة$/i, '')
      .replace(/\s+للنقل\s+والتجارة$/i, '')
      .replace(/\s+اللوجستية$/i, '')
      .replace(/\s+للنقل\s+الثقيل$/i, '')
      .replace(/\s+للنقل$/i, '')
      .replace(/\s+للمقاولات$/i, '');

    // English prefixes / suffixes
    s = s
      .replace(/^co\.\s+/, '')
      .replace(/^company\s+/, '')
      .replace(/\s+co\.?$/i, '')
      .replace(/\s+ltd\.?$/i, '')
      .replace(/\s+corp\.?$/i, '')
      .replace(/\s+transport$/i, '')
      .replace(/\s+logistics$/i, '');

    return s.trim();
  }

  /**
   * Wraps an entity input into an immutable pair of raw and normalized representations.
   */
  public static wrapValue(rawValue: string, entityType: 'CARRIER' | 'TRUCK' | 'DRIVER' | 'MATERIAL' | 'PROJECT'): {
    rawValue: string;
    normalizedValue: string;
  } {
    const raw = String(rawValue ?? '');
    let normalized = '';

    switch (entityType) {
      case 'TRUCK':
        normalized = this.normalizePlate(raw);
        break;
      case 'CARRIER':
      case 'DRIVER':
      case 'MATERIAL':
      case 'PROJECT':
      default:
        normalized = this.normalizeName(raw);
        break;
    }

    return {
      rawValue: raw,
      normalizedValue: normalized,
    };
  }
}
