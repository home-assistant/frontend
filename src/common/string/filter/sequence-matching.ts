import fuzzysort from "fuzzysort";

/**
 * An interface that objects must extend in order to use the fuzzy sequence matcher
 *
 * @param {number} score - A number representing the existence and strength of a match.
 *    - `< 0` means a good match that starts in the middle of the string
 *    - `> 0` means a good match that starts at the beginning of the string
 *    - `0` means just barely a match
 *    - `undefined` means not a match
 *
 * @param {string} strings - Array of strings (aliases) representing the item. The filter string will be compared against each of these for a match.
 *
 */

export interface ScorableTextItem {
  score?: number;
  strings: string[];
}

export type FuzzyFilterSort = <T extends ScorableTextItem>(
  filter: string,
  items: T[]
) => T[];

export function fuzzyMatcher(search: string | null): (string) => boolean {
  const scorer = fuzzyScorer(search);
  return (value: string) => scorer([value]) !== Number.NEGATIVE_INFINITY;
}

export function fuzzyScorer(
  search: string | null
): (values: string[]) => number {
  const searchTerms = Array.from(search.matchAll(/(?:"([^"]+)"|([^"\s]+))/g), m => m[1] || m[2]);
  if (!searchTerms) {
    return () => 0;
  }
  return (values) =>
    searchTerms
      .map((term) => {
        const resultsForTerm = fuzzysort.go(term, values, {
          allowTypo: true,
        });
        if (resultsForTerm.length > 0) {
          return Math.max(...resultsForTerm.map((result) => result.score));
        }
        return Number.NEGATIVE_INFINITY;
      })
      .reduce((partial, current) => partial + current, 0);
}

export const fuzzySortFilterSort: FuzzyFilterSort = (filter, items) => {
  const scorer = fuzzyScorer(filter);
  return items
    .map((item) => {
      item.score = scorer(item.strings);
      return item;
    })
    .filter((item) => item.score !== undefined && item.score > -100000)
    .sort(({ score: scoreA = 0 }, { score: scoreB = 0 }) =>
      scoreA > scoreB ? -1 : scoreA < scoreB ? 1 : 0
    );
};

export const defaultFuzzyFilterSort = fuzzySortFilterSort;
