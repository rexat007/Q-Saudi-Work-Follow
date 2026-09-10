/**
 * Saudi Logistics Normalization Utility
 * Standardizes Arabic names, Saudi plate numbers, phone numbers, and National/Iqama IDs.
 * Ensures duplicate prevention, clean search queries, and historical integrity.
 */

// Arabic-Indic digits map (٠ - ٩)
const ARABIC_INDIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/**
 * Normalizes Arabic text by:
 * - Removing Arabic diacritics (tashkeel/harakat)
 * - Standardizing alef variations (أ, إ, آ, ٱ -> ا)
 * - Standardizing taa marbuta (ة -> ه)
 * - Standardizing alef maqsura (ى -> ي)
 * - Collapsing multiple spaces and trimming
 */
export function normalizeArabicText(text: string | null | undefined): string {
  if (!text) return '';

  return text
    // Remove diacritics (tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize alefs
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize taa marbuta to haa
    .replace(/ة/g, 'ه')
    // Normalize alef maqsura to yaa
    .replace(/ى/g, 'ي')
    // Convert Arabic-Indic digits to Western
    .replace(/[٠-٩]/g, (digit) => ARABIC_INDIC_DIGITS[digit] || digit)
    // Replace multiple spaces with a single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes entity name for indexing, unique checking, and search
 */
export function normalizeName(name: string | null | undefined): string {
  return normalizeArabicText(name).toLowerCase();
}

/**
 * Normalizes Saudi vehicle plate numbers.
 * Converts digits, standardizes Arabic letters, and provides a uniform compact representation.
 * Example: 'أ ب ج  ١ ٢ ٣ ٤' -> 'ا ب ج 1234'
 */
export function normalizePlate(plate: string | null | undefined): string {
  if (!plate) return '';

  const normalized = normalizeArabicText(plate)
    // Remove symbols and dashes
    .replace(/[-_.,/\\|]/g, ' ')
    // Collapse spacing
    .replace(/\s+/g, ' ')
    .trim();

  // Separate letters and digits cleanly
  const letters = normalized.replace(/[0-9]/g, '').trim().replace(/\s+/g, ' ');
  const numbers = normalized.replace(/[^0-9]/g, '').trim();

  if (letters && numbers) {
    return `${letters} ${numbers}`;
  }

  return normalized;
}

/**
 * Normalizes Saudi phone number into standard 05xxxxxxxx or +9665xxxxxxxx format
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';

  // Convert Arabic-indic digits
  let cleaned = phone.replace(/[٠-٩]/g, (digit) => ARABIC_INDIC_DIGITS[digit] || digit);
  // Remove non-digits except leading +
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/[^0-9]/g, '');

  if (hasPlus) {
    return `+${cleaned}`;
  }

  // If starts with 966, prepend +
  if (cleaned.startsWith('9665')) {
    return `+${cleaned}`;
  }

  // If 5xxxxxxxx (9 digits), prepend 0
  if (cleaned.startsWith('5') && cleaned.length === 9) {
    return `0${cleaned}`;
  }

  return cleaned;
}

/**
 * Normalizes Saudi National ID or Iqama number (10 digits)
 */
export function normalizeIdNumber(id: string | null | undefined): string {
  if (!id) return '';
  return id
    .replace(/[٠-٩]/g, (digit) => ARABIC_INDIC_DIGITS[digit] || digit)
    .replace(/[^0-9]/g, '')
    .trim();
}

/**
 * Normalizes material or project code (e.g. uppercase, trimmed, dash-delimited)
 */
export function normalizeCode(code: string | null | undefined): string {
  if (!code) return '';
  return code.trim().toUpperCase().replace(/\s+/g, '-');
}
