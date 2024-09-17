import { stripDiacritics } from "../strip-diacritics";
import { fuzzyScore } from "./filter";

/**
 * Determine whether a sequence of letters exists in another string,
 * in that order, allowing for skipping. Ex: "chdr" exists in "chandelier".
 * All strings in `item.strings` are matched and the score and match
 * information of the best match is returned.
 *
 * @param {string} filter - Sequence of letters to check for
 * @param {ScorableTextItem} item - Item against whose strings will be checked
 *
 * @return {Object | undefined} An object containing the score as a number
 *         and match information (index of the best match in `item.strings`
 *         and its matching segments), or undefined if no match
 */
export const fuzzySequentialMatch = (
  filter: string,
  item: ScorableTextItem
): { score: number; matchInfo: MatchInfo } | undefined => {
  let topScore = Number.NEGATIVE_INFINITY;
  let matchInfo: MatchInfo | undefined;

  for (let index = 0; index < item.strings.length; index++) {
    const word = item.strings[index];
    const scores = fuzzyScore(
      filter,
      stripDiacritics(filter.toLowerCase()),
      0,
      word,
      stripDiacritics(word.toLowerCase()),
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
      // matching positions of filter's chars start at scores[2] in reverse order
      const matchingPositions = scores.slice(2).reverse();
      matchInfo = {
        index: index,
        segments: _getContinuousRuns(matchingPositions, word.length),
      };
    }
  }

  if (topScore === Number.NEGATIVE_INFINITY || matchInfo === undefined) {
    return undefined;
  }

  return { score: topScore, matchInfo: matchInfo };
};

/**
 * Returns an array of match segments representing continuous runs and gaps in the input array.
 * Each segment is represented by a tuple containing the start value, length of the run,
 * and a boolean indicating whether the run is part of the input array or a gap.
 *
 * The input array `matchingPositions` must be sorted in ascending order and be strictly monotonous.
 *
 * @param {number[]} matchingPositions - The input array of numbers (sorted and strictly monotonous) to process.
 * @param {number} targetLength - The target length of the sequence to check for missing segments.
 * @returns {MatchSegment[]} An array of match segments representing continuous runs and gaps.
 *
 * @example
 * // Input: [0, 1, 2, 10, 11, 12], targetLength: 15
 * // Output: [[0, 3, true], [3, 7, false], [10, 3, true], [13, 2, false]]
 * _getContinuousRuns([0, 1, 2, 10, 11, 12], 15);
 */
function _getContinuousRuns(
  matchingPositions: number[],
  targetLength: number
): MatchSegment[] {
  if (matchingPositions.length === 0)
    return targetLength ? [[0, targetLength, false]] : [];

  const result: MatchSegment[] = [];
  let start = matchingPositions[0];
  let length = 1;

  // Handle missing numbers at the beginning
  if (start > 0) {
    result.push([0, start, false]);
  }

  for (let i = 1; i < matchingPositions.length; i++) {
    if (matchingPositions[i] === matchingPositions[i - 1] + 1) {
      length++;
      continue;
    }

    result.push([start, length, true]);

    // Handle gaps
    if (matchingPositions[i] > matchingPositions[i - 1] + 1) {
      const gapStart = matchingPositions[i - 1] + 1;
      const gapLength = matchingPositions[i] - matchingPositions[i - 1] - 1;
      result.push([gapStart, gapLength, false]);
    }

    start = matchingPositions[i];
    length = 1;
  }

  result.push([start, length, true]);

  // Handle missing numbers at the end
  const lastNumber = matchingPositions[matchingPositions.length - 1];
  if (lastNumber < targetLength - 1) {
    result.push([lastNumber + 1, targetLength - lastNumber - 1, false]);
  }

  return result;
}

/**
 * A type containing a single token of a fuzzy sequential match operation.
 *
 * @param {string} text - The text of the token
 *
 * @param {match} boolean - `true` if `text` matched the query, `false` otherwise.
 * @see tokenizeMatchInfo for details.
 */
export type MatchToken = { text: string; match: boolean };

/**
 * Tokenizes a matched string against match segments (as returned by {@link fuzzySequentialMatch}) as an array of tokens, each consisting of the textual element and a flag indicating whether the token matched the original query.
 *
 * @param {string} matchingElement - The actually matched str
 *
 * @param {MatchSegment[]} matchSegments - An array containing the matched segments (as offset and length information).
 *
 * @example
 * const result = tokenizeMatchInfo("Hello World", [[0,3,true], [3,5,false], [8,3,true]]);
 * // result == [{text: "Hel", match: true}, {text: "lo Wo", match: false}, {text: "rld", match: true}]
 */
export const tokenizeMatchInfo = (
  matchingElement: string,
  matchSegments: MatchSegment[] | undefined
): MatchToken[] =>
  _tokenize(
    [matchingElement],
    matchSegments === undefined ? undefined : [matchSegments]
  )[0];

/**
 * Tokenizes the segments of a concatenated string against match segments (as
 * returned by {@link fuzzySequentialMatch}) as an array of arrays of tokens,
 * containing one array for each input string, each consisting of the textual
 * element and a flag indicating whether the token of that string matched the original query.
 *
 * This method can be used in cases when several distinct string parts have been
 * concatenated for a fuzzy sequential search in just one continous string, but
 * need to be tokenized as the original distinct strings.
 *
 * @example
 * // Set up a search for the "virtual" String "Reload Automations"
 * const action = "Reload";
 * const target = "Automations";
 * const matchingString = action + " " + target;
 * const item: ScorableTextItem = { strings: [matchingString] };
 * // Search matches filter "relauto" against the concatenated string;
 * // thus result contains matching segments for the concatenated string
 * const result = fuzzySequentialMatch("relauto", item);
 *
 * // In order to display the matching in action and target separately,
 * // the tokenization must split the matching segments according to the
 * // concatenated string:
 * const tokens = tokenizeConcatenatedMatchInfo(
 *   [action, " ", target],
 *   result
 * );
 * const [matchAction, matchTarget] = [tokents[0], tokens[2]];
 *
 * // matchAction = [{text: "Rel", match: true}, {text: "oad", match: false}]
 * // matchTarget = [{text: "Auto", match: true}, {text: "mations", match: false}]
 *
 * @param {string[]} matchingElements - Single segments of a concatenated string that has been passed to {@link fuzzySequentialMatch} before.
 *
 * @param {MatchSegment[]} matchSegments - An array containing the matched segments (as offset and length information) of the concatenated string.
 */
export const tokenizeConcatenatedMatchInfo = (
  matchingElements: string[],
  matchSegments: MatchSegment[] | undefined
): MatchToken[][] => {
  const split = _splitMatchInfo(matchingElements, matchSegments);
  return _tokenize(matchingElements, split);
};

function _splitMatchInfo(
  matchingElements: string[],
  matchSegments: MatchSegment[] | undefined
): MatchSegment[][] {
  if (matchingElements.length === 0) {
    return [];
  }

  if (!matchSegments || matchSegments.length === 0) {
    return matchingElements.map((element) => [[0, element.length, false]]);
  }

  const result: MatchSegment[][] = [];

  let curSegments: MatchSegment[] = [];
  let globalOffset = 0;
  let idxMatchInfo = 0;
  let idxElement = 0;

  while (
    idxMatchInfo < matchSegments.length &&
    idxElement < matchingElements.length
  ) {
    const curSegment = matchSegments[idxMatchInfo];
    const curElement = matchingElements[idxElement];

    const [segmentStart, segmentLength, match] = [
      curSegment[0],
      curSegment[1],
      curSegment[2],
    ];
    const segmentEnd = segmentStart + segmentLength;

    // shift current token to "match-info" space
    const elementStart = globalOffset;
    const elementLength = curElement.length;
    const elementEnd = elementStart + elementLength;

    // Intersect current segment and current string element
    const localStart = Math.max(segmentStart, elementStart);
    const localEnd = Math.min(segmentEnd, elementEnd);
    const localLength = localEnd - localStart;

    // shift local start back to per-token-offset space
    curSegments.push([localStart - globalOffset, localLength, match]);

    if (localEnd === segmentEnd) {
      // segment is fully consumed; advance to next segment
      idxMatchInfo++;
    }

    if (localEnd === elementEnd) {
      // advance to next string element and output current segments
      globalOffset += elementLength;
      idxElement++;
      result.push(curSegments);
      curSegments = [];
    }
  }

  // Invariant after loop: both arrays have been fully consumed

  return result;
}

function _tokenize(
  matchingElements: string[],
  split?: MatchSegment[][]
): MatchToken[][] {
  if (!split) {
    return [matchingElements.map((cur) => ({ text: cur, match: false }))];
  }

  const result: MatchToken[][] = [];

  for (let i = 0; i < matchingElements.length; i++) {
    const curElement = matchingElements[i];
    const curSegments = split[i];

    result.push(
      curSegments.map((segment) => ({
        text: curElement.substring(segment[0], segment[0] + segment[1]),
        match: segment[2],
      }))
    );
  }

  return result;
}

/**
 * Singular segment of an (un)matched string sequence.
 *
 * @param {number} start - Starting index inside the matched string of this segment
 * @param {number} length - Length of the segment in the matched string
 * @param {number} match - `true` if this segment actually matched the string, `false` if it is a gap in the match
 */
export type MatchSegment = [start: number, length: number, match: boolean];

/**
 * Detailled data about a fuzzy match.
 *
 * @param {number} index - The index of the match
 *
 * @param {MatchSegment[]} segments - Distribution of the matched parts of the filter in the string as an array of continuous runs.
 */
export type MatchInfo = {
  index: number;
  segments: MatchSegment[];
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
 * @param {MatchInfo} matchInfo - The matching information of the best matched element in `strings`, containing its index in the string array and its matching segments. Its value will be `undefined` exactly if `score === undefined` (there was no match).
 */

export interface ScorableTextItem {
  score?: number;
  strings: string[];
  matchInfo?: MatchInfo;
}

type FuzzyFilterSort = <T extends ScorableTextItem>(
  filter: string,
  items: T[]
) => T[];

/**
 * Filters and sorts an array of items based on a fuzzy string matching
 * algorithm.
 *
 * The resulting list is filtered for matches and sorted by their score in
 * descending order. The items of the result list will contain score and matchin
 * information that can be used to tokenize the actually matched parts of the
 * input strings later.
 *
 * @param filter - The string to match against each item's strings.
 * @param items - An array of items to be filtered and sorted.
 *
 * @returns A new array containing the filtered and sorted items. Each
 *                item in the returned array will have its `score` and
 *                `matchInfo` properties updated based on the best match found.
 *                Items are sorted in descending order of their scores (better
 *                matches appear first).
 *
 * @see {@link fuzzySequentialMatch} for details on how individual items are matched and scored.
 * @see {@link ScorableTextItem} for the structure of items that can be filtered and sorted.
 */
export const fuzzyFilterSort: FuzzyFilterSort = (filter, items) =>
  items
    .map((item) => {
      const match = fuzzySequentialMatch(filter, item);
      if (match !== undefined) {
        const { score, matchInfo } = match;
        item.score = score;
        item.matchInfo = matchInfo;
      } else {
        item.score = undefined;
        item.matchInfo = undefined;
      }
      return item;
    })
    .filter((item) => item.score !== undefined)
    .sort(({ score: scoreA = 0 }, { score: scoreB = 0 }) =>
      scoreA > scoreB ? -1 : scoreA < scoreB ? 1 : 0
    );
