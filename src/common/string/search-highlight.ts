import type { TemplateResult } from "lit";
import { html } from "lit";
import { stripDiacritics } from "./strip-diacritics";

export interface HighlightRange {
  start: number;
  end: number;
}

interface NormalizedIndexMap {
  normalizedText: string;
  normalizedIndexMap: HighlightRange[];
}

export type HighlightedText =
  | string
  | TemplateResult
  | (string | TemplateResult)[]
  | null
  | undefined;

const HIGHLIGHT_NAME_PREFIX = "ha-search";
const ACTIVE_HOST_CLASS = "custom-highlight-active";

const normalizeForSearch = (text: string, language?: string): string =>
  stripDiacritics(text).toLocaleLowerCase(language);

const supportsCustomHighlights = (): boolean =>
  typeof CSS !== "undefined" && CSS.highlights !== undefined;

const tokenizeSearchQuery = (query: string): string[] => {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  return [...new Set(terms)];
};

const buildNormalizedIndexMap = (
  text: string,
  language?: string
): NormalizedIndexMap => {
  let normalizedText = "";
  const normalizedIndexMap: HighlightRange[] = [];

  let originalIndex = 0;

  for (const char of text) {
    const start = originalIndex;
    const end = start + char.length;
    const normalizedChar = normalizeForSearch(char, language);

    // One original character can normalize into multiple characters.
    // Keep a mapping for every normalized character back to original indexes.
    for (const normalizedPart of normalizedChar) {
      normalizedText += normalizedPart;
      normalizedIndexMap.push({ start, end });
    }

    originalIndex = end;
  }

  return { normalizedText, normalizedIndexMap };
};

const mergeHighlightRanges = (ranges: HighlightRange[]): HighlightRange[] => {
  if (!ranges.length) {
    return [];
  }

  const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
  const mergedRanges: HighlightRange[] = [{ ...sortedRanges[0] }];

  // Merge overlapping/adjacent ranges so the rendered marks stay minimal.
  for (let i = 1; i < sortedRanges.length; i++) {
    const previousRange = mergedRanges[mergedRanges.length - 1];
    const currentRange = sortedRanges[i];

    if (currentRange.start <= previousRange.end) {
      previousRange.end = Math.max(previousRange.end, currentRange.end);
      continue;
    }

    mergedRanges.push({ ...currentRange });
  }

  return mergedRanges;
};

const getHighlightRangesFromMarks = (root: ShadowRoot): Range[] => {
  const ranges: Range[] = [];

  root.querySelectorAll("mark.ha-highlight").forEach((mark) => {
    const textNode = mark.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      return;
    }

    const text = textNode.textContent;
    if (!text) {
      return;
    }

    const range = new Range();
    range.setStart(textNode, 0);
    range.setEnd(textNode, text.length);
    ranges.push(range);
  });

  return ranges;
};

const createHighlightStyle = (highlightName: string): string => `.ha-highlight {
  background-color: var(--ha-highlight-bg, var(--ha-color-fill-primary-normal-hover));
  color: var(--ha-highlight-color, var(--primary-text-color));
  border-radius: 2px;
  padding: 0;
  box-shadow: inset 0 0 0 1px transparent;
}

:host(.${ACTIVE_HOST_CLASS}) .ha-highlight {
  background-color: transparent;
  color: inherit;
}

::highlight(${highlightName}) {
  background-color: var(--ha-highlight-bg, var(--ha-color-fill-primary-normal-hover));
  color: var(--ha-highlight-color, var(--primary-text-color));
}`;

export class SearchHighlight {
  // `CSS.highlights` is document-global, not per shadow root.
  // Each instance needs a unique key so that components do not overwrite each
  // other's highlight ranges.
  private static _nextHighlightId = 0;

  private _lastKey?: string;

  private _lastCount = -1;

  private readonly _highlightName?: string;

  public constructor(private readonly _root?: ShadowRoot) {
    // Use Custom Highlight API for a cleaner paint path.
    if (this._root && supportsCustomHighlights()) {
      this._highlightName = `${HIGHLIGHT_NAME_PREFIX}-${SearchHighlight._nextHighlightId++}`;
      this._ensureHighlightStyle();
    }
  }

  public getHighlightRanges(
    text: string,
    query: string,
    language?: string
  ): HighlightRange[] {
    if (!text) {
      return [];
    }

    const terms = tokenizeSearchQuery(query);
    if (!terms.length) {
      return [];
    }

    const { normalizedText, normalizedIndexMap } = buildNormalizedIndexMap(
      text,
      language
    );

    // Text can normalize to empty (for example, combining marks only).
    if (!normalizedText) {
      return [];
    }

    const ranges: HighlightRange[] = [];

    for (const term of terms) {
      const normalizedTerm = normalizeForSearch(term, language);
      // Some tokens normalize to empty (like combining marks); skip them.
      if (!normalizedTerm) {
        continue;
      }

      let matchIndex = normalizedText.indexOf(normalizedTerm);

      while (matchIndex !== -1) {
        // Convert normalized-text match indexes back to original-text indexes.
        // `indexOf` guarantees the full normalized term is within bounds, and
        // we append one mapping item per normalized character.
        const start = normalizedIndexMap[matchIndex]!.start;
        const end =
          normalizedIndexMap[matchIndex + normalizedTerm.length - 1]!.end;
        ranges.push({ start, end });

        matchIndex = normalizedText.indexOf(
          normalizedTerm,
          matchIndex + normalizedTerm.length
        );
      }
    }

    return mergeHighlightRanges(ranges);
  }

  /**
   * Render plain text with matching segments wrapped in `<mark>`.
   * This is the baseline highlight path and has fallbacks for when Custom Highlights
   * are not supported by the browser.
   */
  public renderHighlightedText(
    text: string | null | undefined,
    query: string | null | undefined,
    language?: string
  ): HighlightedText {
    if (!text) {
      return text;
    }

    const ranges = this.getHighlightRanges(text, query ?? "", language);
    if (!ranges.length) {
      return text;
    }

    return SearchHighlight._renderHighlightedParts(text, ranges);
  }

  /**
   * Build highlight ranges from rendered mark nodes in the shadow root and
   * apply them using the Custom Highlight API when available.
   */
  public applyFromMarks(key?: string): void {
    if (!this._root) {
      return;
    }

    this._applyFromRanges(getHighlightRangesFromMarks(this._root), key);
  }

  public applyFromRanges(ranges: Range[], key?: string): void {
    if (!this._root) {
      return;
    }

    this._applyFromRanges(ranges, key);
  }

  public clear(): void {
    if (!this._root) {
      return;
    }

    if (supportsCustomHighlights() && this._highlightName) {
      CSS.highlights.delete(this._highlightName);
    }

    (this._root.host as HTMLElement).classList.remove(ACTIVE_HOST_CLASS);
    this._lastKey = undefined;
    this._lastCount = -1;
  }

  private static _renderHighlightedParts(
    text: string,
    ranges: HighlightRange[]
  ): (string | TemplateResult)[] {
    const parts: (string | TemplateResult)[] = [];
    let previousIndex = 0;

    for (const range of ranges) {
      if (range.start > previousIndex) {
        parts.push(text.slice(previousIndex, range.start));
      }

      parts.push(
        html`<mark class="ha-highlight"
          >${text.slice(range.start, range.end)}</mark
        >`
      );

      previousIndex = range.end;
    }

    if (previousIndex < text.length) {
      parts.push(text.slice(previousIndex));
    }

    return parts;
  }

  private _applyFromRanges(ranges: Range[], key?: string): void {
    if (!this._root || !supportsCustomHighlights() || !this._highlightName) {
      return;
    }

    const rangeCount = ranges.length;
    if (key === this._lastKey && rangeCount === this._lastCount) {
      return;
    }

    this._lastKey = key;
    this._lastCount = rangeCount;

    if (!rangeCount) {
      this.clear();
      return;
    }

    CSS.highlights.set(this._highlightName, new Highlight(...ranges));
    (this._root.host as HTMLElement).classList.add(ACTIVE_HOST_CLASS);
  }

  private _ensureHighlightStyle(): void {
    if (!this._root || !this._highlightName) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = createHighlightStyle(this._highlightName);
    this._root.appendChild(style);
  }
}
