/**
 * Arabic-Aware Semantic Normalization Utilities
 * Designed specifically for Saudi Logistics & Enterprise Master Data.
 * 
 * CORE PRINCIPLE:
 * Meaning Preservation (الحفاظ على المعنى):
 * Normalization removes typographic noise (diacritics, tatweel, glyph variants)
 * WITHOUT collapsing phonetically distinct names.
 * For example: 'الفازي' and 'الفزي' remain DISTINCT strings, allowing the
 * subsequent fuzzy matcher to recognize them as a 'Possible Match' (FUZZY)
 * rather than falsely collapsing them into an EXACT match (preventing unsafe Auto-Merge).
 */

// Arabic-Indic Digits (٠-٩) to ASCII standard
const ARABIC_INDIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

// Arabic Tashkeel (Harakat/Diacritics) Unicode Range: U+064B to U+0652 + U+0670 (Superscript Alef)
const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u0670]/g;

// Arabic Tatweel / Kashida (ـ) U+0640
const ARABIC_TATWEEL_REGEX = /\u0640/g;

/**
 * Meaning-preserving Arabic text normalizer.
 * - Strips diacritics (tashkeel/harakat)
 * - Strips tatweel (kashida)
 * - Standardizes alef variations (أ, إ, آ, ٱ -> ا)
 * - Standardizes alef maqsura (ى -> ي)
 * - Standardizes taa marbuta at word ends (ة -> ه)
 * - Converts Arabic-Indic numbers to Western digits
 * - Preserves distinct consonants and vowels ('الفازي' != 'الفزي')
 */
export function normalizeArabicText(text: string | null | undefined): string {
  if (!text) return '';

  return text
    // Remove diacritics
    .replace(ARABIC_DIACRITICS_REGEX, '')
    // Remove decorative tatweel
    .replace(ARABIC_TATWEEL_REGEX, '')
    // Standardize alef glyphs (with hamza) to plain alef
    .replace(/[أإآٱ]/g, 'ا')
    // Standardize alef maqsura to yaa
    .replace(/ى/g, 'ي')
    // Standardize taa marbuta to haa for neutral root indexing
    .replace(/ة/g, 'ه')
    // Convert Arabic-Indic numerals
    .replace(/[٠-٩]/g, (digit) => ARABIC_INDIC_DIGITS[digit] || digit)
    // Collapse punctuation and invisible unicode spaces
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Collapse multiple whitespaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes entity names (Carriers, Drivers, Projects) for duplicate detection.
 * Cleans excessive corporate legal noise while preserving distinct family/company names.
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';

  let normalized = normalizeArabicText(name).toLowerCase();

  // Normalize common corporate prefixes for cleaner token comparison
  // (e.g. "شركة المجدوعي" vs "المجدوعي")
  normalized = normalized
    .replace(/^شركة\s+/, '')
    .replace(/^مؤسسة\s+/, '')
    .replace(/^مجموعة\s+/, '')
    .replace(/^مكتب\s+/, '')
    .trim();

  // Normalize honorifics or common suffixes if isolated
  normalized = normalized
    .replace(/\s+المحدودة$/i, '')
    .replace(/\s+للنقل\s+والتجارة$/i, '')
    .replace(/\s+اللوجستية$/i, '')
    .replace(/\s+للنقل\s+الثقيل$/i, '')
    .replace(/\s+للنقل$/i, '')
    .trim();

  // Standardize spaces between compound words like "عبد الله" -> "عبدالله" for canonical indexing
  normalized = normalized.replace(/عبد\s+الله/g, 'عبدالله');

  return normalized;
}

/**
 * Normalizes Saudi vehicle plate numbers.
 * Converts digits, standardizes Arabic letters, removes symbols and dashes.
 * Example: 'أ ب ج  ١ ٢ ٣ ٤' -> 'ا ب ج 1234'
 */
export function normalizePlate(plate: string | null | undefined): string {
  if (!plate) return '';

  const normalized = normalizeArabicText(plate)
    // Remove dashes, slashes, periods, brackets
    .replace(/[-_.,/\\|()[\]{}:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract letters and digits
  const letters = normalized.replace(/[0-9]/g, '').trim().replace(/\s+/g, ' ');
  const numbers = normalized.replace(/[^0-9]/g, '').trim();

  if (letters && numbers) {
    return `${letters} ${numbers}`;
  }

  return normalized;
}

/**
 * Normalizes Saudi phone number into standard 05xxxxxxxx or +9665xxxxxxxx format.
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';

  // Convert Arabic-Indic numerals first
  let cleaned = phone.replace(/[٠-٩]/g, (digit) => ARABIC_INDIC_DIGITS[digit] || digit);
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/[^0-9]/g, '');

  if (hasPlus) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith('9665')) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith('05') && cleaned.length === 10) {
    return cleaned;
  }

  if (cleaned.startsWith('5') && cleaned.length === 9) {
    return `0${cleaned}`;
  }

  return cleaned;
}

/**
 * Normalizes 10-digit Saudi National ID or Iqama number.
 */
export function normalizeIdNumber(id: string | null | undefined): string {
  if (!id) return '';
  return id
    .replace(/[٠-٩]/g, (digit) => ARABIC_INDIC_DIGITS[digit] || digit)
    .replace(/[^0-9]/g, '')
    .trim();
}
