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
  let topScore = 0;

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

    // The VS Code implementation of filter treats a score of "0" as just barely a match
    // But we will typically use this matcher in a .filter(), which interprets 0 as a failure.
    // By shifting all scores up by 1, we allow "0" matches, while retaining score precedence
    const score = scores[0] + 1;

    if (score > topScore) {
      topScore = score;
    }
  }
  return topScore;
};

export interface ScorableTextItem {
  score?: number;
  text: string;
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
        ? fuzzySequentialMatch(filter, item.text, item.altText)
        : fuzzySequentialMatch(filter, item.text);
      return item;
    })
    .filter((item) => item.score === undefined || item.score > 0)
    .sort(({ score: scoreA = 0 }, { score: scoreB = 0 }) =>
      scoreA > scoreB ? -1 : scoreA < scoreB ? 1 : 0
    );
};
