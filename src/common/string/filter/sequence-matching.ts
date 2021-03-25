import { createMatches, FuzzyScore, fuzzyScore } from "./filter";

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
  let topScores: FuzzyScore | undefined;

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
    const score = scores[0] === 0 ? 1 : scores[0];

    if (score > topScore) {
      topScore = score;
      topScores = scores;
    }
  }

  if (topScore === Number.NEGATIVE_INFINITY) {
    return undefined;
  }

  return {
    score: topScore,
    decoratedText: getDecoratedText(filter, words[0]), // Need to change this to account for any N words
  };
};

export interface ScorableTextItem {
  score?: number;
  text: string;
  altText?: string;
  decoratedText?: string;
}

type FuzzyFilterSort = <T extends ScorableTextItem>(
  filter: string,
  items: T[]
) => T[];

export const fuzzyFilterSort: FuzzyFilterSort = (filter, items) => {
  return items
    .map((item) => {
      const match = item.altText
        ? fuzzySequentialMatch(filter, item.text, item.altText)
        : fuzzySequentialMatch(filter, item.text);

      item.score = match?.score;
      item.decoratedText = match?.decoratedText;

      return item;
    })
    .filter((item) => item.score !== undefined)
    .sort(({ score: scoreA = 0 }, { score: scoreB = 0 }) =>
      scoreA > scoreB ? -1 : scoreA < scoreB ? 1 : 0
    );
};

export const getDecoratedText = (pattern: string, word: string) => {
  const r = fuzzyScore(
    pattern,
    pattern.toLowerCase(),
    0,
    word,
    word.toLowerCase(),
    0,
    true
  );

  if (r) {
    const matches = createMatches(r);
    let actualWord = "";
    let pos = 0;
    for (const match of matches) {
      actualWord += word.substring(pos, match.start);
      actualWord +=
        "^" + word.substring(match.start, match.end).split("").join("^");
      pos = match.end;
    }
    actualWord += word.substring(pos);
    console.log(actualWord);
    return actualWord;
  }
  return undefined;
};
