import { fuzzyScore } from "./filter";

/**
 * Determine whether a sequence of letters exists in another string,
 *   in that order, allowing for skipping. Ex: "chdr" exists in "chandelier")
 *
 * @param {string} filter - Sequence of letters to check for
 * @param {string} word - Word to check for sequence
 *
 * @return {number} Score representing how well the word matches the filter. Return of 0 means no match.
 */

export const fuzzySequentialMatch = (filter: string, ...words: string[]) => {
  let topScore = Number.NEGATIVE_INFINITY;

  for (const word of words) {
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

    // The VS Code implementation of filter returns a:
    //    - Negative score for a good match that starts in the middle of the string
    //    - Positive score if the match starts at the beginning of the string
    //    - 0 if the filter string is just barely a match
    //    - undefined for no match
    // The "0" return is problematic since .filter() will remove that match, even though a 0 == good match.
    // So, if we encounter a 0 return, set it to 1 so the match will be included, and still respect ordering.
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

export interface ScorableTextItem {
  score?: number;
  filterText: string;
  altText?: string;
}

type FuzzyFilterSort = <T extends ScorableTextItem>(
  filter: string,
  items: T[]
) => T[];

export const fuzzyFilterSort: FuzzyFilterSort = (filter, items) => {
  return items
    .map((item) => {
      item.score = item.altText
        ? fuzzySequentialMatch(filter, item.filterText, item.altText)
        : fuzzySequentialMatch(filter, item.filterText);
      return item;
    })
    .filter((item) => item.score !== undefined)
    .sort(({ score: scoreA = 0 }, { score: scoreB = 0 }) =>
      scoreA > scoreB ? -1 : scoreA < scoreB ? 1 : 0
    );
};
