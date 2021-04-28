import { TemplateResult } from "lit-html";
import {
  createMatches,
  createMatchesFragmented,
  FuzzyScore,
  fuzzyScore,
} from "./filter";

/**
 * Determine whether a sequence of letters exists in another string,
 *   in that order, allowing for skipping. Ex: "chdr" exists in "chandelier")
 *
 * @param {string} filter - Sequence of letters to check for
 * @param {string} word - Word to check for sequence
 *
 * @return {number} Score representing how well the word matches the filter. Return of 0 means no match.
 */

type FuzzySequentialMatcher = (
  filter: string,
  item: ScorableTextItem,
  decorate?: MatchDecorator
) => ScorableTextItem | undefined;

export const fuzzySequentialMatch: FuzzySequentialMatcher = (
  filter,
  item,
  decorate = createMatchDecorator((letter) => `[${letter}]`)
) => {
  let topScore = Number.NEGATIVE_INFINITY;
  const decoratedStrings: Decoration[][][] = [];
  const strings = item.treatArrayAsSingleString
    ? [item.strings.join("")]
    : item.strings;

  for (const word of strings) {
    const scores = fuzzyScore(
      filter,
      filter.toLowerCase(),
      0,
      word,
      word.toLowerCase(),
      0,
      true
    );

    if (decorate) {
      decoratedStrings.push(decorate(word, item, scores));
    }

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

  return {
    score: topScore,
    strings: item.strings,
    decoratedStrings,
  };
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
  decoratedStrings?: Decoration[][][];
  treatArrayAsSingleString?: boolean;
}

type FuzzyFilterSort = <T extends ScorableTextItem>(
  filter: string,
  items: T[],
  decorate?: MatchDecorator
) => T[];

export const fuzzyFilterSort: FuzzyFilterSort = (
  filter,
  items,
  decorate = createMatchDecorator((letter) => `[${letter}]`)
) => {
  return items
    .map((item) => {
      const match = fuzzySequentialMatch(filter, item, decorate);

      item.score = match?.score;
      item.decoratedStrings = match?.decoratedStrings;

      return item;
    })
    .filter((item) => item.score !== undefined)
    .sort(({ score: scoreA = 0 }, { score: scoreB = 0 }) =>
      scoreA > scoreB ? -1 : scoreA < scoreB ? 1 : 0
    );
};

type Decoration = string | TemplateResult;

export type Surrounder = (matchedChunk: Decoration) => Decoration;

type MatchDecorator = (
  word: string,
  item: ScorableTextItem,
  scores?: FuzzyScore
) => Decoration[][];

export const createMatchDecorator: (
  surrounder: Surrounder
) => MatchDecorator = (surrounder) => (word, item, scores) =>
  _decorateMatch(word, surrounder, item, scores);

const _decorateMatch: (
  word: string,
  surrounder: Surrounder,
  item: ScorableTextItem,
  scores?: FuzzyScore
) => Decoration[][] = (word, surrounder, item, scores) => {
  if (!scores) {
    return [[word]];
  }

  const decoratedText: Decoration[][] = [];
  const matches = item.treatArrayAsSingleString
    ? createMatchesFragmented(scores, item.strings)
    : [createMatches(scores)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const _word = item.treatArrayAsSingleString ? item.strings[i] : word;
    let pos = 0;
    const actualWord: Decoration[] = [];

    for (const fragmentedMatch of match) {
      const unmatchedChunk = _word.substring(pos, fragmentedMatch.start);
      const matchedChunk = _word.substring(
        fragmentedMatch.start,
        fragmentedMatch.end
      );

      actualWord.push(unmatchedChunk);
      actualWord.push(surrounder(matchedChunk));

      pos = fragmentedMatch.end;
    }

    actualWord.push(_word.substring(pos));
    decoratedText.push(actualWord);
  }
  return decoratedText;
};
