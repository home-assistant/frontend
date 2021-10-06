/* eslint-disable no-console */
// MIT License

// Copyright (c) 2015 - present Microsoft Corporation

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { CharCode } from "./char-code";

const _debug = false;

export interface Match {
  start: number;
  end: number;
}

const _maxLen = 128;

function initTable() {
  const table: number[][] = [];
  const row: number[] = [];
  for (let i = 0; i <= _maxLen; i++) {
    row[i] = 0;
  }
  for (let i = 0; i <= _maxLen; i++) {
    table.push(row.slice(0));
  }
  return table;
}

function isSeparatorAtPos(value: string, index: number): boolean {
  if (index < 0 || index >= value.length) {
    return false;
  }
  const code = value.codePointAt(index);
  switch (code) {
    case CharCode.Underline:
    case CharCode.Dash:
    case CharCode.Period:
    case CharCode.Space:
    case CharCode.Slash:
    case CharCode.Backslash:
    case CharCode.SingleQuote:
    case CharCode.DoubleQuote:
    case CharCode.Colon:
    case CharCode.DollarSign:
    case CharCode.LessThan:
    case CharCode.OpenParen:
    case CharCode.OpenSquareBracket:
      return true;
    case undefined:
      return false;
    default:
      if (isEmojiImprecise(code)) {
        return true;
      }
      return false;
  }
}

function isWhitespaceAtPos(value: string, index: number): boolean {
  if (index < 0 || index >= value.length) {
    return false;
  }
  const code = value.charCodeAt(index);
  switch (code) {
    case CharCode.Space:
    case CharCode.Tab:
      return true;
    default:
      return false;
  }
}

function isUpperCaseAtPos(pos: number, word: string, wordLow: string): boolean {
  return word[pos] !== wordLow[pos];
}

export function isPatternInWord(
  patternLow: string,
  patternPos: number,
  patternLen: number,
  wordLow: string,
  wordPos: number,
  wordLen: number,
  fillMinWordPosArr = false
): boolean {
  while (patternPos < patternLen && wordPos < wordLen) {
    if (patternLow[patternPos] === wordLow[wordPos]) {
      if (fillMinWordPosArr) {
        // Remember the min word position for each pattern position
        _minWordMatchPos[patternPos] = wordPos;
      }
      patternPos += 1;
    }
    wordPos += 1;
  }
  return patternPos === patternLen; // pattern must be exhausted
}

enum Arrow {
  Diag = 1,
  Left = 2,
  LeftLeft = 3,
}

/**
 * An array representing a fuzzy match.
 *
 * 0. the score
 * 1. the offset at which matching started
 * 2. `<match_pos_N>`
 * 3. `<match_pos_1>`
 * 4. `<match_pos_0>` etc
 */
// export type FuzzyScore = [score: number, wordStart: number, ...matches: number[]];// [number, number, number];
export type FuzzyScore = Array<number>;

export function fuzzyScore(
  pattern: string,
  patternLow: string,
  patternStart: number,
  word: string,
  wordLow: string,
  wordStart: number,
  firstMatchCanBeWeak: boolean
): FuzzyScore | undefined {
  const patternLen = pattern.length > _maxLen ? _maxLen : pattern.length;
  const wordLen = word.length > _maxLen ? _maxLen : word.length;

  if (
    patternStart >= patternLen ||
    wordStart >= wordLen ||
    patternLen - patternStart > wordLen - wordStart
  ) {
    return undefined;
  }

  // Run a simple check if the characters of pattern occur
  // (in order) at all in word. If that isn't the case we
  // stop because no match will be possible
  if (
    !isPatternInWord(
      patternLow,
      patternStart,
      patternLen,
      wordLow,
      wordStart,
      wordLen,
      true
    )
  ) {
    return undefined;
  }

  // Find the max matching word position for each pattern position
  // NOTE: the min matching word position was filled in above, in the `isPatternInWord` call
  _fillInMaxWordMatchPos(
    patternLen,
    wordLen,
    patternStart,
    wordStart,
    patternLow,
    wordLow
  );

  let row: number;
  let column = 1;
  let patternPos: number;
  let wordPos: number;

  const hasStrongFirstMatch = [false];

  // There will be a match, fill in tables
  for (
    row = 1, patternPos = patternStart;
    patternPos < patternLen;
    row++, patternPos++
  ) {
    // Reduce search space to possible matching word positions and to possible access from next row
    const minWordMatchPos = _minWordMatchPos[patternPos];
    const maxWordMatchPos = _maxWordMatchPos[patternPos];
    const nextMaxWordMatchPos =
      patternPos + 1 < patternLen ? _maxWordMatchPos[patternPos + 1] : wordLen;

    for (
      column = minWordMatchPos - wordStart + 1, wordPos = minWordMatchPos;
      wordPos < nextMaxWordMatchPos;
      column++, wordPos++
    ) {
      let score = Number.MIN_SAFE_INTEGER;
      let canComeDiag = false;

      if (wordPos <= maxWordMatchPos) {
        score = _doScore(
          pattern,
          patternLow,
          patternPos,
          patternStart,
          word,
          wordLow,
          wordPos,
          wordLen,
          wordStart,
          _diag[row - 1][column - 1] === 0,
          hasStrongFirstMatch
        );
      }

      let diagScore = 0;
      if (score !== Number.MAX_SAFE_INTEGER) {
        canComeDiag = true;
        diagScore = score + _table[row - 1][column - 1];
      }

      const canComeLeft = wordPos > minWordMatchPos;
      const leftScore = canComeLeft
        ? _table[row][column - 1] + (_diag[row][column - 1] > 0 ? -5 : 0)
        : 0; // penalty for a gap start

      const canComeLeftLeft =
        wordPos > minWordMatchPos + 1 && _diag[row][column - 1] > 0;
      const leftLeftScore = canComeLeftLeft
        ? _table[row][column - 2] + (_diag[row][column - 2] > 0 ? -5 : 0)
        : 0; // penalty for a gap start

      if (
        canComeLeftLeft &&
        (!canComeLeft || leftLeftScore >= leftScore) &&
        (!canComeDiag || leftLeftScore >= diagScore)
      ) {
        // always prefer choosing left left to jump over a diagonal because that means a match is earlier in the word
        _table[row][column] = leftLeftScore;
        _arrows[row][column] = Arrow.LeftLeft;
        _diag[row][column] = 0;
      } else if (canComeLeft && (!canComeDiag || leftScore >= diagScore)) {
        // always prefer choosing left since that means a match is earlier in the word
        _table[row][column] = leftScore;
        _arrows[row][column] = Arrow.Left;
        _diag[row][column] = 0;
      } else if (canComeDiag) {
        _table[row][column] = diagScore;
        _arrows[row][column] = Arrow.Diag;
        _diag[row][column] = _diag[row - 1][column - 1] + 1;
      } else {
        throw new Error(`not possible`);
      }
    }
  }

  if (_debug) {
    printTables(pattern, patternStart, word, wordStart);
  }

  if (!hasStrongFirstMatch[0] && !firstMatchCanBeWeak) {
    return undefined;
  }

  row--;
  column--;

  const result: FuzzyScore = [_table[row][column], wordStart];

  let backwardsDiagLength = 0;
  let maxMatchColumn = 0;

  while (row >= 1) {
    // Find the column where we go diagonally up
    let diagColumn = column;
    do {
      const arrow = _arrows[row][diagColumn];
      if (arrow === Arrow.LeftLeft) {
        diagColumn -= 2;
      } else if (arrow === Arrow.Left) {
        diagColumn -= 1;
      } else {
        // found the diagonal
        break;
      }
    } while (diagColumn >= 1);

    // Overturn the "forwards" decision if keeping the "backwards" diagonal would give a better match
    if (
      backwardsDiagLength > 1 && // only if we would have a contiguous match of 3 characters
      patternLow[patternStart + row - 1] === wordLow[wordStart + column - 1] && // only if we can do a contiguous match diagonally
      !isUpperCaseAtPos(diagColumn + wordStart - 1, word, wordLow) && // only if the forwards chose diagonal is not an uppercase
      backwardsDiagLength + 1 > _diag[row][diagColumn] // only if our contiguous match would be longer than the "forwards" contiguous match
    ) {
      diagColumn = column;
    }

    if (diagColumn === column) {
      // this is a contiguous match
      backwardsDiagLength++;
    } else {
      backwardsDiagLength = 1;
    }

    if (!maxMatchColumn) {
      // remember the last matched column
      maxMatchColumn = diagColumn;
    }

    row--;
    column = diagColumn - 1;
    result.push(column);
  }

  if (wordLen === patternLen) {
    // the word matches the pattern with all characters!
    // giving the score a total match boost (to come up ahead other words)
    result[0] += 2;
  }

  // Add 1 penalty for each skipped character in the word
  const skippedCharsCount = maxMatchColumn - patternLen;
  result[0] -= skippedCharsCount;

  return result;
}

function _doScore(
  pattern: string,
  patternLow: string,
  patternPos: number,
  patternStart: number,
  word: string,
  wordLow: string,
  wordPos: number,
  wordLen: number,
  wordStart: number,
  newMatchStart: boolean,
  outFirstMatchStrong: boolean[]
): number {
  if (patternLow[patternPos] !== wordLow[wordPos]) {
    return Number.MIN_SAFE_INTEGER;
  }

  let score = 1;
  let isGapLocation = false;
  if (wordPos === patternPos - patternStart) {
    // common prefix: `foobar <-> foobaz`
    //                            ^^^^^
    score = pattern[patternPos] === word[wordPos] ? 7 : 5;
  } else if (
    isUpperCaseAtPos(wordPos, word, wordLow) &&
    (wordPos === 0 || !isUpperCaseAtPos(wordPos - 1, word, wordLow))
  ) {
    // hitting upper-case: `foo <-> forOthers`
    //                              ^^ ^
    score = pattern[patternPos] === word[wordPos] ? 7 : 5;
    isGapLocation = true;
  } else if (
    isSeparatorAtPos(wordLow, wordPos) &&
    (wordPos === 0 || !isSeparatorAtPos(wordLow, wordPos - 1))
  ) {
    // hitting a separator: `. <-> foo.bar`
    //                                ^
    score = 5;
  } else if (
    isSeparatorAtPos(wordLow, wordPos - 1) ||
    isWhitespaceAtPos(wordLow, wordPos - 1)
  ) {
    // post separator: `foo <-> bar_foo`
    //                              ^^^
    score = 5;
    isGapLocation = true;
  }

  if (score > 1 && patternPos === patternStart) {
    outFirstMatchStrong[0] = true;
  }

  if (!isGapLocation) {
    isGapLocation =
      isUpperCaseAtPos(wordPos, word, wordLow) ||
      isSeparatorAtPos(wordLow, wordPos - 1) ||
      isWhitespaceAtPos(wordLow, wordPos - 1);
  }

  //
  if (patternPos === patternStart) {
    // first character in pattern
    if (wordPos > wordStart) {
      // the first pattern character would match a word character that is not at the word start
      // so introduce a penalty to account for the gap preceding this match
      score -= isGapLocation ? 3 : 5;
    }
  } else if (newMatchStart) {
    // this would be the beginning of a new match (i.e. there would be a gap before this location)
    score += isGapLocation ? 2 : 0;
  } else {
    // this is part of a contiguous match, so give it a slight bonus, but do so only if it would not be a prefered gap location
    score += isGapLocation ? 0 : 1;
  }

  if (wordPos + 1 === wordLen) {
    // we always penalize gaps, but this gives unfair advantages to a match that would match the last character in the word
    // so pretend there is a gap after the last character in the word to normalize things
    score -= isGapLocation ? 3 : 5;
  }

  return score;
}

function printTable(
  table: number[][],
  pattern: string,
  patternLen: number,
  word: string,
  wordLen: number
): string {
  function pad(s: string, n: number, _pad = " ") {
    while (s.length < n) {
      s = _pad + s;
    }
    return s;
  }
  let ret = ` |   |${word
    .split("")
    .map((c) => pad(c, 3))
    .join("|")}\n`;

  for (let i = 0; i <= patternLen; i++) {
    if (i === 0) {
      ret += " |";
    } else {
      ret += `${pattern[i - 1]}|`;
    }
    ret +=
      table[i]
        .slice(0, wordLen + 1)
        .map((n) => pad(n.toString(), 3))
        .join("|") + "\n";
  }
  return ret;
}

function printTables(
  pattern: string,
  patternStart: number,
  word: string,
  wordStart: number
): void {
  pattern = pattern.substr(patternStart);
  word = word.substr(wordStart);
  console.log(printTable(_table, pattern, pattern.length, word, word.length));
  console.log(printTable(_arrows, pattern, pattern.length, word, word.length));
  console.log(printTable(_diag, pattern, pattern.length, word, word.length));
}

const _minWordMatchPos = initArr(2 * _maxLen); // min word position for a certain pattern position
const _maxWordMatchPos = initArr(2 * _maxLen); // max word position for a certain pattern position
const _diag = initTable(); // the length of a contiguous diagonal match
const _table = initTable();
const _arrows = <Arrow[][]>initTable();

function initArr(maxLen: number) {
  const row: number[] = [];
  for (let i = 0; i <= maxLen; i++) {
    row[i] = 0;
  }
  return row;
}

function _fillInMaxWordMatchPos(
  patternLen: number,
  wordLen: number,
  patternStart: number,
  wordStart: number,
  patternLow: string,
  wordLow: string
) {
  let patternPos = patternLen - 1;
  let wordPos = wordLen - 1;
  while (patternPos >= patternStart && wordPos >= wordStart) {
    if (patternLow[patternPos] === wordLow[wordPos]) {
      _maxWordMatchPos[patternPos] = wordPos;
      patternPos--;
    }
    wordPos--;
  }
}

export interface FuzzyScorer {
  (
    pattern: string,
    lowPattern: string,
    patternPos: number,
    word: string,
    lowWord: string,
    wordPos: number,
    firstMatchCanBeWeak: boolean
  ): FuzzyScore | undefined;
}

export function createMatches(score: undefined | FuzzyScore): Match[] {
  if (typeof score === "undefined") {
    return [];
  }
  const res: Match[] = [];
  const wordPos = score[1];
  for (let i = score.length - 1; i > 1; i--) {
    const pos = score[i] + wordPos;
    const last = res[res.length - 1];
    if (last && last.end === pos) {
      last.end = pos + 1;
    } else {
      res.push({ start: pos, end: pos + 1 });
    }
  }
  return res;
}

/**
 * A fast function (therefore imprecise) to check if code points are emojis.
 * Generated using https://github.com/alexdima/unicode-utils/blob/master/generate-emoji-test.js
 */
export function isEmojiImprecise(x: number): boolean {
  return (
    (x >= 0x1f1e6 && x <= 0x1f1ff) ||
    x === 8986 ||
    x === 8987 ||
    x === 9200 ||
    x === 9203 ||
    (x >= 9728 && x <= 10175) ||
    x === 11088 ||
    x === 11093 ||
    (x >= 127744 && x <= 128591) ||
    (x >= 128640 && x <= 128764) ||
    (x >= 128992 && x <= 129003) ||
    (x >= 129280 && x <= 129535) ||
    (x >= 129648 && x <= 129750)
  );
}
