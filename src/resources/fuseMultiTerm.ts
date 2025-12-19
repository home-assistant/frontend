import type {
  Expression,
  FuseIndex,
  FuseOptionKey,
  FuseResult,
  IFuseOptions,
} from "fuse.js";
import Fuse from "fuse.js";

export interface FuseWeightedKey {
  name: string | string[];
  weight: number;
}

const DEFAULT_OPTIONS: IFuseOptions<any> = {
  ignoreDiacritics: true,
  isCaseSensitive: false,
  threshold: 0.3,
  minMatchCharLength: 2,
  ignoreLocation: true, // don't care where the pattern is
};

const DEFAULT_MIN_CHAR_LENGTH = 2;

/**
 * Searches for a term within a collection of items using Fuse.js fuzzy search.
 * @param items - The array of items to search through.
 * @param search - The search term to look for.
 * @param fuseIndex - Optional pre-built Fuse index for improved performance.
 * @param options - Optional Fuse.js configuration options to override defaults.
 * @returns An array of search results matching the search term.
 */
function searchTerm<T>(
  items: T[],
  search: string | Expression,
  fuseIndex?: FuseIndex<T>,
  options?: IFuseOptions<T>,
  minMatchCharLength?: number
) {
  const fuse = new Fuse<T>(
    items,
    {
      ...DEFAULT_OPTIONS,
      minMatchCharLength:
        minMatchCharLength ??
        (typeof search === "string" && search.length < DEFAULT_MIN_CHAR_LENGTH
          ? search.length
          : DEFAULT_MIN_CHAR_LENGTH),
      ...(options || {}),
    },
    fuseIndex
  );

  return fuse.search(search);
}

/**
 * Performs a multi-term search across an array of items using Fuse.js.
 * All search terms must match for an item to be included in the results.
 * Result is NOT sorted by relevance.
 *
 * @template T - The type of items being searched
 * @param items - The array of items to search through
 * @param search - The search string containing one or more space-separated terms
 * @param searchKeys - An array of weighted keys defining which properties to search
 * @param fuseIndex - Optional pre-built Fuse index for improved performance
 * @param options - Optional Fuse.js configuration options
 * @returns An array of items that match all search terms
 */
export function multiTermSearch<T>(
  items: T[],
  search: string,
  searchKeys: FuseOptionKey<T>[],
  fuseIndex?: FuseIndex<T>,
  options: IFuseOptions<T> = {}
): T[] {
  const terms = search
    .toLowerCase()
    .split(" ")
    .filter((t) => t.trim());

  if (!terms.length) {
    return items;
  }

  // be sure that all terms are used in the search
  // just use DEFAULT_MIN_CHAR_LENGTH if the terms are at least that long
  let minLength = DEFAULT_MIN_CHAR_LENGTH;
  terms.forEach((term) => {
    if (term.length < minLength) {
      minLength = term.length;
    }
  });

  const expression: Expression = {
    $and: terms.map((term) => ({
      $or: searchKeys.map((key) => ({
        $path:
          typeof key === "string"
            ? key
            : Array.isArray(key)
              ? key.join(".")
              : typeof key.name === "string"
                ? key.name
                : key.name.join("."),
        $val: term,
      })),
    })),
  };

  return searchTerm<T>(
    items,
    expression,
    fuseIndex,
    {
      ...options,
      shouldSort: false,
    },
    minLength
  ).map((r) => r.item);
}

/**
 * Performs a multi-term search across items using Fuse.js, returning results sorted by relevance.
 *
 * This function splits the search string into individual terms and searches for each term
 * independently. Results are aggregated and scored based on:
 * - Number of terms matched (items must match ALL terms to be included)
 * - Fuse.js match score for each term
 * - Weight of the matched keys
 *
 * @template T - The type of items being searched
 * @param items - The array of items to search through
 * @param search - The search string, which will be split by spaces into multiple terms
 * @param searchKeys - Array of weighted keys configuration for Fuse.js search
 * @param getItemId - Function to extract a unique identifier from each item
 * @param fuseIndex - Optional but highly recommended! Pre-built Fuse.js index for improved performance
 * @param options - Optional Fuse.js options to customize search behavior
 * @returns An array of items that match all search terms, sorted by relevance score (highest first).
 *          Returns all items if search is empty, or empty array if not all terms have matches.
 */
export function multiTermSortedSearch<T>(
  items: T[],
  search: string,
  searchKeys: FuseWeightedKey[],
  getItemId: (item: T) => string,
  fuseIndex?: FuseIndex<T>,
  options: IFuseOptions<T> = {}
) {
  const terms = search
    .toLowerCase()
    .split(" ")
    .filter((t) => t.trim());

  if (!terms.length) {
    return items;
  }

  if (terms.length === 1) {
    return searchTerm<T>(items, terms[0], fuseIndex, options).map(
      (r) => r.item
    );
  }

  const searchResults: Record<
    string,
    { item: T; hits: number; score: number }
  > = {};

  let termHits = 0;

  terms.forEach((term) => {
    if (!term.trim()) {
      return;
    }

    const termResults = searchTerm<T>(items, term, fuseIndex, {
      ...options,
      shouldSort: false,
      includeScore: true,
      includeMatches: true,
    });

    if (termResults.length) {
      termHits++;
      termResults.forEach((r) => {
        const itemId = getItemId(r.item);
        if (!searchResults[itemId]) {
          searchResults[itemId] = {
            item: r.item,
            hits: 0,
            score: 0,
          };
        }

        searchResults[itemId].hits += 1;

        const weight = _getMatchedKeyHighestWeight<T>(r, searchKeys);

        const score = r.score ? 1 - r.score : 0;
        const weightedScore = score * weight;

        searchResults[itemId].score += weightedScore;
      });
    }
  });

  // just return smth if for the full terms combination are results
  if (termHits !== terms.length) {
    return [];
  }

  // Filter to only items that matched all terms
  const results = Object.values(searchResults).filter(
    ({ hits }) => hits === terms.length
  );

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.map(({ item }) => item);
}

/**
 * Finds the highest weight among all matched keys in a Fuse.js search result.
 *
 * @typeParam T - The type of items being searched
 * @param result - A single Fuse.js search result containing match information
 * @param searchKeys - Array of weighted search keys configured for the Fuse instance
 * @returns The highest weight value among matched keys, or 1 if no matches exist or no weights are defined
 */
function _getMatchedKeyHighestWeight<T>(
  result: FuseResult<T>,
  searchKeys: FuseWeightedKey[]
): number {
  if (!result.matches || result.matches.length === 0) {
    return 1;
  }

  // Find the highest weighted key that matched
  let maxWeight = 1;
  for (const match of result.matches) {
    const keyConfig = searchKeys.find((k) => {
      if (typeof k.name === "string") {
        return k.name === match.key;
      }
      return k.name.join(".") === match.key;
    });
    if (keyConfig && keyConfig.weight && keyConfig.weight > maxWeight) {
      maxWeight = keyConfig.weight;
    }
  }

  return maxWeight;
}
