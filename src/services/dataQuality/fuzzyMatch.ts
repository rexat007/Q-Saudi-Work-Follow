/**
 * String Similarity & Fuzzy Matching Engine for Arabic Master Data
 * Combines Levenshtein Distance, Damerau-Levenshtein, and Token-Dice similarity.
 */

import { normalizeArabicText, normalizeName } from './normalization';

/**
 * Standard Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Character Bigram (Dice) coefficient similarity (0.0 to 1.0)
 */
export function bigramSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length < 2 || b.length < 2) return 0.0;

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);

  let intersection = 0;
  bigramsA.forEach((bg) => {
    if (bigramsB.has(bg)) intersection++;
  });

  return (2.0 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Jaro-Winkler similarity tailored for short Arabic names and plate codes
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3.0;

  // Winkler prefix scaling (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1.0 - jaro);
}

/**
 * Comprehensive Arabic Semantic Matching Score (0 - 100)
 * 
 * Returns composite score based on:
 * - Levenshtein distance ratio
 * - Jaro-Winkler similarity
 * - Bigram character overlap
 * - Arabic elongation / root vowel variations awareness
 */
export function computeArabicSimilarity(val1: string, val2: string): {
  score: number;
  isExact: boolean;
  isFuzzy: boolean;
  details: string;
} {
  const norm1 = normalizeName(val1);
  const norm2 = normalizeName(val2);

  if (!norm1 || !norm2) {
    return { score: 0, isExact: false, isFuzzy: false, details: 'أحد القيمتين فارغ' };
  }

  // Exact normalized match
  if (norm1 === norm2) {
    return {
      score: 100,
      isExact: true,
      isFuzzy: false,
      details: 'تطابق تام بعد المعايرة القياسية',
    };
  }

  const maxLen = Math.max(norm1.length, norm2.length);
  const levDist = levenshteinDistance(norm1, norm2);
  const levScore = Math.max(0, (maxLen - levDist) / maxLen);
  const jwScore = jaroWinklerSimilarity(norm1, norm2);
  const bgScore = bigramSimilarity(norm1, norm2);

  // Composite weighted score
  const composite = (levScore * 0.35 + jwScore * 0.45 + bgScore * 0.20) * 100;
  const roundedScore = Math.round(composite);

  // Check specific Arabic elongation differences (e.g. الفازي vs الفزي)
  const isVowelDiffOnly = isOnlyAlifOrVowelDifference(norm1, norm2);

  let details = `نسبة تشابه ${roundedScore}% (المسافة: ${levDist})`;
  if (isVowelDiffOnly) {
    details += ' - اختلاف في حرف المد/الألف (قد يمثل اسماً أو عائلة مختلفة، لا يجوز الدمج التلقائي)';
  }

  return {
    score: roundedScore,
    isExact: false,
    isFuzzy: roundedScore >= 65,
    details,
  };
}

/**
 * Checks if the difference between two Arabic strings is primarily an internal 'ا' (Alif)
 * Example: 'الفازي' vs 'الفزي'
 */
export function isOnlyAlifOrVowelDifference(str1: string, str2: string): boolean {
  // Strip all 'ا' and compare
  const s1WithoutAlif = str1.replace(/ا/g, '');
  const s2WithoutAlif = str2.replace(/ا/g, '');
  return s1WithoutAlif === s2WithoutAlif && str1 !== str2;
}
