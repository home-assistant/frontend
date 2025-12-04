import type { FuseIndex, FuseResult, IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";

export interface FuseWeightedKey<T> {
  getFn?: (obj: T) => string;
  name: string;
  weight?: number;
}

function singleTermSortedSearch<T>(
  items: T[],
  search: string,
  fuseIndex?: FuseIndex<T>,
  options: IFuseOptions<T> = {}
) {
  const fuse = new Fuse<T>(
    items,
    {
      ignoreDiacritics: true,
      isCaseSensitive: false,
      threshold: 0.3,
      minMatchCharLength: Math.min(search.length, 2),
      ...options,
    },
    fuseIndex
  );

  return fuse.search(search);
}

export function multiTermsSortedSearch<T>(
  items: T[],
  search: string,
  searchKeys: FuseWeightedKey<T>[],
  getItemId: (item: T) => string,
  fuseIndex?: FuseIndex<T>,
  options: IFuseOptions<T> = {}
) {
  const terms = search.toLowerCase().split(" ");

  if (!terms.length) {
    return items;
  }

  if (terms.length === 1) {
    return singleTermSortedSearch<T>(items, terms[0], fuseIndex, options).map(
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

    const termResults = singleTermSortedSearch<T>(items, term, fuseIndex, {
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

  const results = Object.values(searchResults).filter(
    ({ hits }) => hits === terms.length
  );

  results.sort((a, b) => b.score - a.score);

  return results.map(({ item }) => item);
}

function _getMatchedKeyHighestWeight<T>(
  result: FuseResult<T>,
  searchKeys: FuseWeightedKey<T>[]
): number {
  if (!result.matches || result.matches.length === 0) {
    return 1;
  }

  // Find the highest weighted key that matched
  let maxWeight = 1;
  for (const match of result.matches) {
    const keyConfig = searchKeys.find((k) => k.name === match.key);
    if (keyConfig && keyConfig.weight && keyConfig.weight > maxWeight) {
      maxWeight = keyConfig.weight;
    }
  }

  return maxWeight;
}
