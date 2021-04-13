import { html, TemplateResult } from "lit-html";
import { createMatches, FuzzyScore, fuzzyScore } from "./filter";
import { unsafeHTML } from "lit-html/directives/unsafe-html";

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
  item: ScorableTextItem
) => ScorableTextItem | undefined;

export const fuzzySequentialMatch: FuzzySequentialMatcher = (filter, item) => {
  let topScore = Number.NEGATIVE_INFINITY;
  const decoratedStrings: TemplateResult[][] = [];

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

    decoratedStrings.push(decorateMatch(word, scores));

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
  decoratedStrings?: TemplateResult[][];
}

type FuzzyFilterSort = <T extends ScorableTextItem>(
  filter: string,
  items: T[]
) => T[];

export const fuzzyFilterSort: FuzzyFilterSort = (filter, items) => {
  return items
    .map((item) => {
      const match = fuzzySequentialMatch(filter, item);

      item.score = match?.score;
      item.decoratedStrings = match?.decoratedStrings;

      return item;
    })
    .filter((item) => item.score !== undefined)
    .sort(({ score: scoreA = 0 }, { score: scoreB = 0 }) =>
      scoreA > scoreB ? -1 : scoreA < scoreB ? 1 : 0
    );
};

type MatchDecorator = (word: string, scores?: FuzzyScore) => TemplateResult[];
export const decorateMatch: MatchDecorator = (word, scores) => {
  if (!scores) {
    return [html`${word}`];
  }

  const decoratedText: TemplateResult[] = [];
  const matches = createMatches(scores);
  let pos = 0;

  let actualWord = "";
  for (const match of matches) {
    actualWord += word.substring(pos, match.start);
    actualWord += `<span class="highlight-letter">${word.substring(
      match.start,
      match.end
    )}</span>`;
    pos = match.end;
  }
  actualWord += word.substring(pos);

  const fragments = actualWord.split("::");

  for (let i = 0; i < fragments.length; i++) {
    const fragment = fragments[i];
    decoratedText.push(html`${unsafeHTML(fragment)}`);
  }

  return decoratedText;
};
