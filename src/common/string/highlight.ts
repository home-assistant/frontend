import type { TemplateResult } from "lit";
import { html } from "lit";
import { stripDiacritics } from "./strip-diacritics";

export interface HighlightRange {
  start: number;
  end: number;
}

interface NormalizedIndexMap {
  normalized: string;
  mapStart: number[];
  mapEnd: number[];
}

const buildNormalizedIndexMap = (
  text: string,
  language?: string
): NormalizedIndexMap => {
  let normalized = "";
  const mapStart: number[] = [];
  const mapEnd: number[] = [];

  for (let i = 0; i < text.length; ) {
    const code = text.codePointAt(i);
    if (code === undefined) {
      break;
    }
    const char = String.fromCodePoint(code);
    const charLength = char.length;
    const normalizedChar = stripDiacritics(char).toLocaleLowerCase(language);

    for (const _char of normalizedChar) {
      mapStart.push(i);
      mapEnd.push(i + charLength);
    }

    normalized += normalizedChar;
    i += charLength;
  }

  return { normalized, mapStart, mapEnd };
};

export const getHighlightRanges = (
  text: string,
  query: string,
  language?: string
): HighlightRange[] => {
  const trimmed = query.trim();
  if (!trimmed || !text) {
    return [];
  }

  const terms = trimmed.split(/\s+/).filter(Boolean);
  if (!terms.length) {
    return [];
  }

  const { normalized, mapStart, mapEnd } = buildNormalizedIndexMap(
    text,
    language
  );

  if (!normalized) {
    return [];
  }

  const ranges: HighlightRange[] = [];

  for (const term of terms) {
    const normalizedTerm = stripDiacritics(term).toLocaleLowerCase(language);
    if (!normalizedTerm) {
      continue;
    }
    let index = normalized.indexOf(normalizedTerm);
    while (index !== -1) {
      const start = mapStart[index];
      const end = mapEnd[index + normalizedTerm.length - 1];
      if (start !== undefined && end !== undefined) {
        ranges.push({ start, end });
      }
      index = normalized.indexOf(normalizedTerm, index + normalizedTerm.length);
    }
  }

  if (!ranges.length) {
    return [];
  }

  ranges.sort((a, b) => a.start - b.start);

  const merged: HighlightRange[] = [ranges[0]];

  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    const current = ranges[i];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
};

export type HighlightedText =
  | string
  | TemplateResult
  | (string | TemplateResult)[]
  | null
  | undefined;

export const renderHighlightedText = (
  text: string | null | undefined,
  query: string | null | undefined,
  language?: string
): HighlightedText => {
  if (!text) {
    return text;
  }

  const filter = (query ?? "").trim();
  if (!filter) {
    return text;
  }

  const ranges = getHighlightRanges(text, filter, language);

  if (!ranges.length) {
    return text;
  }

  const parts: (string | TemplateResult)[] = [];
  let lastIndex = 0;

  for (const range of ranges) {
    if (range.start > lastIndex) {
      parts.push(text.slice(lastIndex, range.start));
    }
    parts.push(
      html`<mark class="ha-highlight"
        >${text.slice(range.start, range.end)}</mark
      >`
    );
    lastIndex = range.end;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};
