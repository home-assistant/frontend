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
  const row: number[] = [0];
  for (let i = 1; i <= _maxLen; i++) {
    row.push(-i);
  }
  for (let i = 0; i <= _maxLen; i++) {
    const thisRow = row.slice(0);
    thisRow[0] = -i;
    table.push(thisRow);
  }
  return table;
}

const _table = initTable();
const _scores = initTable();
const _arrows = <Arrow[][]>initTable();

function isSeparatorAtPos(value: string, index: number): boolean {
  if (index < 0 || index >= value.length) {
    return false;
  }
  const code = value.charCodeAt(index);
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
      return true;
    default:
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

export function isPatternInWord(pattern: string, word: string): boolean {
  return _isPatternInWord(
    pattern.toLowerCase(),
    0,
    pattern.length,
    word.toLowerCase(),
    0,
    word.length
  );
}

export function _isPatternInWord(
  patternLow: string,
  patternPos: number,
  patternLen: number,
  wordLow: string,
  wordPos: number,
  wordLen: number
): boolean {
  while (patternPos < patternLen && wordPos < wordLen) {
    if (patternLow[patternPos] === wordLow[wordPos]) {
      patternPos += 1;
    }
    wordPos += 1;
  }
  return patternPos === patternLen; // pattern must be exhausted
}

enum Arrow {
  Top = 0b1,
  Diag = 0b10,
  Left = 0b100,
}

/**
 * A tuple of three values.
 * 0. the score
 * 1. the matches encoded as bitmask (2^53)
 * 2. the offset at which matching started
 */
export type FuzzyScore = [number, number, number];

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
    !_isPatternInWord(
      patternLow,
      patternStart,
      patternLen,
      wordLow,
      wordStart,
      wordLen
    )
  ) {
    return undefined;
  }

  let row = 1;
  let column = 1;
  let patternPos = patternStart;
  let wordPos = wordStart;

  let hasStrongFirstMatch = false;

  // There will be a match, fill in tables
  for (
    row = 1, patternPos = patternStart;
    patternPos < patternLen;
    row++, patternPos++
  ) {
    for (
      column = 1, wordPos = wordStart;
      wordPos < wordLen;
      column++, wordPos++
    ) {
      const score = _doScore(
        pattern,
        patternLow,
        patternPos,
        patternStart,
        word,
        wordLow,
        wordPos
      );

      if (patternPos === patternStart && score > 1) {
        hasStrongFirstMatch = true;
      }

      _scores[row][column] = score;

      const diag = _table[row - 1][column - 1] + (score > 1 ? 1 : score);
      const top = _table[row - 1][column] + -1;
      const left = _table[row][column - 1] + -1;

      if (left >= top) {
        // left or diag
        if (left > diag) {
          _table[row][column] = left;
          _arrows[row][column] = Arrow.Left;
        } else if (left === diag) {
          _table[row][column] = left;
          _arrows[row][column] = Arrow.Left || Arrow.Diag;
        } else {
          _table[row][column] = diag;
          _arrows[row][column] = Arrow.Diag;
        }
      } else if (top > diag) {
        _table[row][column] = top;
        _arrows[row][column] = Arrow.Top;
      } else if (top === diag) {
        _table[row][column] = top;
        _arrows[row][column] = Arrow.Top || Arrow.Diag;
      } else {
        _table[row][column] = diag;
        _arrows[row][column] = Arrow.Diag;
      }
    }
  }

  if (_debug) {
    printTables(pattern, patternStart, word, wordStart);
  }

  if (!hasStrongFirstMatch && !firstMatchCanBeWeak) {
    return undefined;
  }

  _matchesCount = 0;
  _topScore = -100;
  _wordStart = wordStart;
  _firstMatchCanBeWeak = firstMatchCanBeWeak;

  _findAllMatches2(
    row - 1,
    column - 1,
    patternLen === wordLen ? 1 : 0,
    0,
    false
  );
  if (_matchesCount === 0) {
    return undefined;
  }

  return [_topScore, _topMatch2, wordStart];
}

function _doScore(
  pattern: string,
  patternLow: string,
  patternPos: number,
  patternStart: number,
  word: string,
  wordLow: string,
  wordPos: number
) {
  if (patternLow[patternPos] !== wordLow[wordPos]) {
    return -1;
  }
  if (wordPos === patternPos - patternStart) {
    // common prefix: `foobar <-> foobaz`
    //                            ^^^^^
    if (pattern[patternPos] === word[wordPos]) {
      return 7;
    }
    return 5;
  }

  if (
    isUpperCaseAtPos(wordPos, word, wordLow) &&
    (wordPos === 0 || !isUpperCaseAtPos(wordPos - 1, word, wordLow))
  ) {
    // hitting upper-case: `foo <-> forOthers`
    //                              ^^ ^
    if (pattern[patternPos] === word[wordPos]) {
      return 7;
    }
    return 5;
  }

  if (
    isSeparatorAtPos(wordLow, wordPos) &&
    (wordPos === 0 || !isSeparatorAtPos(wordLow, wordPos - 1))
  ) {
    // hitting a separator: `. <-> foo.bar`
    //                                ^
    return 5;
  }

  if (
    isSeparatorAtPos(wordLow, wordPos - 1) ||
    isWhitespaceAtPos(wordLow, wordPos - 1)
  ) {
    // post separator: `foo <-> bar_foo`
    //                              ^^^
    return 5;
  }
  return 1;
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
  console.log(printTable(_scores, pattern, pattern.length, word, word.length));
}

let _matchesCount = 0;
let _topMatch2 = 0;
let _topScore = 0;
let _wordStart = 0;
let _firstMatchCanBeWeak = false;

function _findAllMatches2(
  row: number,
  column: number,
  total: number,
  matches: number,
  lastMatched: boolean
): void {
  if (_matchesCount >= 10 || total < -25) {
    // stop when having already 10 results, or
    // when a potential alignment as already 5 gaps
    return;
  }

  let simpleMatchCount = 0;

  while (row > 0 && column > 0) {
    const score = _scores[row][column];
    const arrow = _arrows[row][column];

    if (arrow === Arrow.Left) {
      // left -> no match, skip a word character
      column -= 1;
      if (lastMatched) {
        total -= 5; // new gap penalty
      } else if (matches !== 0) {
        total -= 1; // gap penalty after first match
      }
      lastMatched = false;
      simpleMatchCount = 0;
    } else if (arrow && Arrow.Diag) {
      if (arrow && Arrow.Left) {
        // left
        _findAllMatches2(
          row,
          column - 1,
          matches !== 0 ? total - 1 : total, // gap penalty after first match
          matches,
          lastMatched
        );
      }

      // diag
      total += score;
      row -= 1;
      column -= 1;
      lastMatched = true;

      // match -> set a 1 at the word pos
      matches += 2 ** (column + _wordStart);

      // count simple matches and boost a row of
      // simple matches when they yield in a
      // strong match.
      if (score === 1) {
        simpleMatchCount += 1;

        if (row === 0 && !_firstMatchCanBeWeak) {
          // when the first match is a weak
          // match we discard it
          return;
        }
      } else {
        // boost
        total += 1 + simpleMatchCount * (score - 1);
        simpleMatchCount = 0;
      }
    } else {
      return;
    }
  }

  total -= column >= 3 ? 9 : column * 3; // late start penalty

  // dynamically keep track of the current top score
  // and insert the current best score at head, the rest at tail
  _matchesCount += 1;
  if (total > _topScore) {
    _topScore = total;
    _topMatch2 = matches;
  }
}

// #endregion
