import { stripDiacritics } from "./strip-diacritics";

/**
 * Normalize text for search comparisons (case-insensitive + diacritics-insensitive).
 */
export const normalizeSearchText = (text: string, language?: string): string =>
  stripDiacritics(text).toLocaleLowerCase(language);

/**
 * Split a user query into whitespace-delimited search terms.
 */
export const splitSearchTerms = (query: string): string[] =>
  query.trim().split(/\s+/).filter(Boolean);
