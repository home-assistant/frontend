import { fuzzyScore, isPatternInWord } from "./filter";

/**
 * Determine whether a sequence of letters exists in another string,
 *   in that order, allowing for skipping. Ex: "chdr" exists in "chandelier")
 *
 * filter => sequence of letters
 * word => Word to check for sequence
 *
 * returns either:
 *    number => if word contains sequence, return a score
 *    string => if word is empty, return the word (to allow for alphabetical sorting of all available words)
 *    undefined => if no match was found
 */

export const fuzzySequentialMatch = (filter: string, ...words: string[]) => {
  let topScore: string | number | undefined;

  for (const word of words) {
    if (filter === "") {
      return word;
    }

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

    const isBestScore = !topScore || score > topScore;

    if (isBestScore) {
      topScore = score;
    }
  }
  return topScore;
};

export const isPatternInWords = (filter: string, ...words: string[]) => {
  for (const word of words) {
    if (filter === "") {
      return true;
    }

    const patternFound = isPatternInWord(filter, word);
    if (patternFound) {
      return true;
    }
  }

  return false;
};
