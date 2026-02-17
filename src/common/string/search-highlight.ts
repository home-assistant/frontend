import type { TemplateResult } from "lit";
import { css, html, unsafeCSS } from "lit";
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

export class SearchHighlight {
  // `CSS.highlights` is document-global, not per shadow root.
  // Each instance needs a unique key so that components do not overwrite each
  // other's highlight ranges.
  private static _nextHighlightId = 0;

  // Fingerprints include Node identity, so map nodes to stable numeric IDs.
  private static _nodeIds = new WeakMap<Node, number>();

  private static _nextNodeId = 0;

  private static _normalizeForSearch(text: string, language?: string): string {
    return stripDiacritics(text).toLocaleLowerCase(language);
  }

  private static _supportsCustomHighlights(): boolean {
    return typeof CSS !== "undefined" && CSS.highlights !== undefined;
  }

  private static _tokenizeSearchQuery(query: string): string[] {
    const terms = query.trim().split(/\s+/).filter(Boolean);
    return [...new Set(terms)];
  }

  /**
   * Build normalized text and an index map back to original indexes.
   * Needed because normalization can change character length/index positions.
   */
  private static _buildNormalizedIndexMap(
    text: string,
    language?: string
  ): NormalizedIndexMap {
    let normalizedText = "";
    const normalizedIndexMap: HighlightRange[] = [];

    let originalIndex = 0;

    for (const char of text) {
      const start = originalIndex;
      const end = start + char.length;
      const normalizedChar = SearchHighlight._normalizeForSearch(
        char,
        language
      );

      // One original character can normalize into multiple characters.
      // Keep a mapping for every normalized character back to original indexes.
      for (const normalizedPart of normalizedChar) {
        normalizedText += normalizedPart;
        normalizedIndexMap.push({ start, end });
      }

      originalIndex = end;
    }

    return { normalizedText, normalizedIndexMap };
  }

  private static _mergeHighlightRanges(
    ranges: HighlightRange[]
  ): HighlightRange[] {
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
  }

  /**
   * Convert rendered `<mark>` fallback nodes into DOM Ranges for `CSS.highlights`.
   */
  private static _getHighlightRangesFromMarks(root: ShadowRoot): Range[] {
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
  }

  private static _createHighlightStyle(highlightName: string): string {
    return css`
      .ha-highlight {
        background-color: var(
          --ha-highlight-bg,
          var(--ha-color-fill-primary-normal-hover)
        );
        color: var(--ha-highlight-color, var(--primary-text-color));
        border-radius: 2px;
        padding: 0;
        box-shadow: inset 0 0 0 1px transparent;
      }

      :host(.${unsafeCSS(ACTIVE_HOST_CLASS)}) .ha-highlight {
        background-color: transparent;
        color: inherit;
      }

      ::highlight(${unsafeCSS(highlightName)}) {
        background-color: var(
          --ha-highlight-bg,
          var(--ha-color-fill-primary-normal-hover)
        );
        color: var(--ha-highlight-color, var(--primary-text-color));
      }
    `.cssText;
  }

  private static _getNodeId(node: Node): number {
    let nodeId = SearchHighlight._nodeIds.get(node);
    if (nodeId !== undefined) {
      return nodeId;
    }

    nodeId = SearchHighlight._nextNodeId++;
    SearchHighlight._nodeIds.set(node, nodeId);
    return nodeId;
  }

  /**
   * Build a stable signature for a set of ranges so we can detect real range
   * changes even when the count stays the same.
   */
  private static _getRangesFingerprint(ranges: Range[]): string {
    return ranges
      .map((range) => {
        const startNodeId = SearchHighlight._getNodeId(range.startContainer);
        const endNodeId = SearchHighlight._getNodeId(range.endContainer);
        return `${startNodeId}:${range.startOffset}-${endNodeId}:${range.endOffset}`;
      })
      .join("|");
  }

  // Cache the last apply inputs to avoid re-registering identical highlights.
  private _lastKey?: string;

  private _lastFingerprint?: string;

  private readonly _highlightName?: string;

  private _marksObserver?: MutationObserver;

  private _marksSyncQueued = false;

  private _marksKeyProvider?: () => string | null | undefined;

  public constructor(private readonly _root?: ShadowRoot) {
    // Use Custom Highlight API for a cleaner paint path.
    if (this._root && SearchHighlight._supportsCustomHighlights()) {
      this._highlightName = `${HIGHLIGHT_NAME_PREFIX}-${SearchHighlight._nextHighlightId++}`;
      this._addHighlightStyle();
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

    const terms = SearchHighlight._tokenizeSearchQuery(query);
    if (!terms.length) {
      return [];
    }

    const { normalizedText, normalizedIndexMap } =
      SearchHighlight._buildNormalizedIndexMap(text, language);

    // Text can normalize to empty (for example, combining marks only).
    if (!normalizedText) {
      return [];
    }

    const ranges: HighlightRange[] = [];

    for (const term of terms) {
      const normalizedTerm = SearchHighlight._normalizeForSearch(
        term,
        language
      );
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

    return SearchHighlight._mergeHighlightRanges(ranges);
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

    this._applyFromRanges(
      SearchHighlight._getHighlightRangesFromMarks(this._root),
      key
    );
  }

  public applyFromRanges(ranges: Range[], key?: string): void {
    if (!this._root) {
      return;
    }

    this._applyFromRanges(ranges, key);
  }

  /**
   * Observe rendered `<mark>` changes and keep custom highlights in sync.
   */
  public startMarkObservation(
    keyProvider: () => string | null | undefined
  ): void {
    if (!this._root || !this._highlightName) {
      return;
    }

    this._marksKeyProvider = keyProvider;

    if (!this._marksObserver) {
      this._marksObserver = new MutationObserver(() => {
        this._queueMarkSync();
      });
    }

    this._marksObserver.disconnect();
    this._marksObserver.observe(this._root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    this._queueMarkSync();
  }

  public stopMarkObservation(): void {
    this._marksObserver?.disconnect();
    this._marksSyncQueued = false;
    this._marksKeyProvider = undefined;
  }

  public clear(): void {
    if (!this._root) {
      return;
    }

    if (SearchHighlight._supportsCustomHighlights() && this._highlightName) {
      CSS.highlights.delete(this._highlightName);
    }

    (this._root.host as HTMLElement).classList.remove(ACTIVE_HOST_CLASS);
    this._lastKey = undefined;
    this._lastFingerprint = undefined;
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

  private _queueMarkSync(): void {
    if (this._marksSyncQueued) {
      return;
    }

    this._marksSyncQueued = true;
    queueMicrotask(() => {
      this._marksSyncQueued = false;
      if (!this._root || !(this._root.host as HTMLElement).isConnected) {
        return;
      }

      const key = this._marksKeyProvider?.()?.trim();
      if (!key) {
        this.clear();
        return;
      }

      this.applyFromMarks(key);
    });
  }

  /**
   * Register custom highlight ranges and skip no-op updates using cached key
   * and range fingerprint.
   */
  private _applyFromRanges(ranges: Range[], key?: string): void {
    if (
      !this._root ||
      !SearchHighlight._supportsCustomHighlights() ||
      !this._highlightName
    ) {
      return;
    }

    if (!ranges.length) {
      this.clear();
      return;
    }

    const fingerprint = SearchHighlight._getRangesFingerprint(ranges);
    // Skip writes only when both the caller key and concrete range positions
    // are unchanged.
    if (key === this._lastKey && fingerprint === this._lastFingerprint) {
      return;
    }

    this._lastKey = key;
    this._lastFingerprint = fingerprint;

    CSS.highlights.set(this._highlightName, new Highlight(...ranges));
    (this._root.host as HTMLElement).classList.add(ACTIVE_HOST_CLASS);
  }

  /**
   * Inject shared styles for both `<mark>` fallback and `::highlight()` rendering.
   */
  private _addHighlightStyle(): void {
    if (!this._root || !this._highlightName) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = SearchHighlight._createHighlightStyle(
      this._highlightName
    );
    this._root.appendChild(style);
  }
}
