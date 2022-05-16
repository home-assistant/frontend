import { fuzzyScore } from "./filter";

/**
 * Determine whether a sequence of letters exists in another string,
 *   in that order, allowing for skipping. Ex: "chdr" exists in "chandelier")
 *
 * @param {string} filter - Sequence of letters to check for
 * @param {ScorableTextItem} item - Item against whose strings will be checked
 *
 * @return {number} Score representing how well the word matches the filter. Return of 0 means no match.
 */

export const fuzzySequentialMatch = (
  filter: string,
  item: ScorableTextItem
) => {
  let topScore = Number.NEGATIVE_INFINITY;

  for (const word of item.strings) {
    const scores = fuzzyScore(
      filter,
      filter.toLowerCase(),
      0,
      word,
      word.toLowerCase(),
      0,
      true
    );

    if (!scores) {
      continue;
    }

    // The VS Code implementation of filter returns a 0 for a weak match.
    // But if .filter() sees a "0", it considers that a failed match and will remove it.
    // So, we set score to 1 in these cases so the match will be included, and mostly respect correct ordering.
    const score = scores[0] === 0 ? 1 : scores[0];

    if (score > topScore) {
      topScore = score;
    }
  }

  if (topScore === Number.NEGATIVE_INFINITY) {
    return undefined;
  }

  return topScore;
};

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

type FuzzyFilterSort = <T extends ScorableTextItem>(
  filter: string,
  items: T[]
) => T[];

export const fuzzyFilterSort: FuzzyFilterSort = (filter, items) =>
  items
    .map((item) => {
      item.score = fuzzySequentialMatch(filter, item);
      return item;
    })
    .filter((item) => item.score !== undefined)
    .sort(({ score: scoreA = 0 }, { score: scoreB = 0 }) =>
      scoreA > scoreB ? -1 : scoreA < scoreB ? 1 : 0
    );
