import type { TemplateResult } from "lit";
import { css, html, unsafeCSS } from "lit";
import { normalizeSearchText, splitSearchTerms } from "./search-query";

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
// Shared selector so range extraction and mutation checks stay in sync.
const HIGHLIGHT_MARK_SELECTOR = "mark.ha-highlight";

const tokenizeSearchQuery = (query: string): string[] => [
  ...new Set(splitSearchTerms(query)),
];

/**
 * Build normalized text and an index map back to original indexes.
 * Needed because normalization can change character length/index positions.
 */
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
    const normalizedChar = normalizeSearchText(char, language);

    normalizedText += normalizedChar;

    // One original character can normalize into multiple UTF-16 code units.
    // Keep a mapping entry for each normalized code unit because String#indexOf
    // and String#length operate on UTF-16 indexes.
    for (const _codeUnit of normalizedChar.split("")) {
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

/**
 * Convert rendered `<mark>` nodes into DOM Ranges for `CSS.highlights`.
 * We walk text nodes because Lit templates can place comment markers before
 * text inside `<mark>`, so `firstChild` is not reliably the text node.
 */
const getHighlightRangesFromMarks = (root: ShadowRoot): Range[] => {
  const ranges: Range[] = [];

  root.querySelectorAll(HIGHLIGHT_MARK_SELECTOR).forEach((mark) => {
    const textWalker = document.createTreeWalker(mark, NodeFilter.SHOW_TEXT);
    let textNode = textWalker.nextNode();

    while (textNode) {
      const text = textNode.textContent;
      if (text) {
        const range = new Range();
        range.setStart(textNode, 0);
        range.setEnd(textNode, text.length);
        ranges.push(range);
      }

      textNode = textWalker.nextNode();
    }
  });

  return ranges;
};

const createHighlightStyle = (highlightName: string): string => css`
  .ha-highlight {
    /* Visual highlight comes from ::highlight(...), not the <mark> itself. */
    background-color: transparent;
    color: inherit;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
  }

  ::highlight(${unsafeCSS(highlightName)}) {
    background-color: var(
      --ha-highlight-bg,
      var(--ha-color-fill-primary-normal-hover)
    );
    color: var(--ha-highlight-color, var(--primary-text-color));
  }
`.cssText;

const renderHighlightedParts = (
  text: string,
  ranges: HighlightRange[]
): (string | TemplateResult)[] => {
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
};

/**
 * Search highlighting helper with two integration paths:
 * 1) call `renderHighlightedText` + `applyFromMarks` when updates are driven
 * by known state changes (like filter changes),
 * 2) call `startAutoSyncFromMarks` when highlighted DOM can change
 * independently of filter changes (like virtualized rows).
 */
export class SearchHighlight {
  // `CSS.highlights` is document-global, not per shadow root.
  // Each instance needs a unique key so that components do not overwrite each
  // other's highlight ranges.
  private static _nextHighlightId = 0;

  // Fingerprints include Node identity, so map nodes to stable numeric IDs.
  private static _nodeIds = new WeakMap<Node, number>();

  private static _nextNodeId = 0;

  // Cache the last apply inputs to avoid re-registering identical highlights.
  private _lastCacheKey?: string;

  private _lastFingerprint?: string;

  private readonly _highlightName?: string;

  private _autoSyncObserver?: MutationObserver;

  private _autoSyncQueued = false;

  private _autoSyncCacheKeyProvider?: () => string | null | undefined;

  private _autoSyncObservedTarget?: Node;

  public constructor(private readonly _root?: ShadowRoot) {
    if (this._root) {
      this._highlightName = `${HIGHLIGHT_NAME_PREFIX}-${SearchHighlight._nextHighlightId++}`;
      this._addHighlightStyle();
    }
  }

  /**
   * Return text ranges that should be highlighted for the given query.
   * Useful when the caller needs ranges without rendering `<mark>` output.
   */
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
      const normalizedTerm = normalizeSearchText(term, language);
      // Some tokens normalize to empty (like combining marks); skip them.
      if (!normalizedTerm) {
        continue;
      }

      let matchIndex = normalizedText.indexOf(normalizedTerm);

      while (matchIndex !== -1) {
        // Convert normalized-text match indexes back to original-text indexes.
        // `indexOf` guarantees the full normalized term is within bounds, and
        // we append one mapping item per normalized UTF-16 code unit.
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
   * `<mark>` nodes are used as stable anchors for range extraction.
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

    return renderHighlightedParts(text, ranges);
  }

  /**
   * Read rendered `<mark>` nodes from the root and apply matching
   * `CSS.highlights` ranges.
   * `cacheKey` should represent the current query/filter used to build marks.
   */
  public applyFromMarks(cacheKey?: string): void {
    if (!this._root) {
      return;
    }

    this.applyFromRanges(getHighlightRangesFromMarks(this._root), cacheKey);
  }

  /**
   * Apply precomputed ranges directly to `CSS.highlights`.
   * Use this when ranges are built outside this class.
   * `cacheKey` should represent the inputs used to build `ranges`.
   */
  public applyFromRanges(ranges: Range[], cacheKey?: string): void {
    if (!this._root || !this._highlightName) {
      return;
    }

    const highlightRegistry = globalThis.CSS?.highlights;
    if (!highlightRegistry || typeof Highlight === "undefined") {
      return;
    }

    if (!ranges.length) {
      this.clear();
      return;
    }

    const fingerprint = this._getRangesFingerprint(ranges);
    // Skip writes only when both the caller key and concrete range positions
    // are unchanged.
    if (
      cacheKey === this._lastCacheKey &&
      fingerprint === this._lastFingerprint
    ) {
      return;
    }

    this._lastCacheKey = cacheKey;
    this._lastFingerprint = fingerprint;

    highlightRegistry.set(this._highlightName, new Highlight(...ranges));
  }

  /**
   * Auto-sync `CSS.highlights` from `<mark>` nodes whenever marked DOM changes.
   * Use this for components where highlighted DOM can change without filter
   * changes (for example, virtualized lists).
   * `cacheKeyProvider` should return the current query/filter string.
   * `observedTarget` allows callers to scope observation to a subtree.
   */
  public startAutoSyncFromMarks(
    cacheKeyProvider: () => string | null | undefined,
    observedTarget?: Node
  ): void {
    if (!this._root || !this._highlightName) {
      return;
    }

    this._autoSyncCacheKeyProvider = cacheKeyProvider;
    this._autoSyncObservedTarget = observedTarget ?? this._root;

    if (!this._autoSyncObserver) {
      this._autoSyncObserver = new MutationObserver((records) => {
        if (
          !records.some((record) => this._mutationAffectsHighlights(record))
        ) {
          return;
        }
        this._queueAutoSyncFromMarks();
      });
    }

    this._autoSyncObserver.disconnect();
    this._autoSyncObserver.observe(this._autoSyncObservedTarget, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    this._queueAutoSyncFromMarks();
  }

  /**
   * Stop auto-sync started via `startAutoSyncFromMarks`.
   */
  public stopAutoSyncFromMarks(): void {
    this._autoSyncObserver?.disconnect();
    this._autoSyncQueued = false;
    this._autoSyncCacheKeyProvider = undefined;
    this._autoSyncObservedTarget = undefined;
  }

  public clear(): void {
    if (!this._root) {
      return;
    }

    globalThis.CSS?.highlights?.delete(this._highlightName!);
    this._lastCacheKey = undefined;
    this._lastFingerprint = undefined;
  }

  private _getNodeId(node: Node): number {
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
  private _getRangesFingerprint(ranges: Range[]): string {
    return ranges
      .map((range) => {
        const startNodeId = this._getNodeId(range.startContainer);
        const endNodeId = this._getNodeId(range.endContainer);
        return `${startNodeId}:${range.startOffset}-${endNodeId}:${range.endOffset}`;
      })
      .join("|");
  }

  private _queueAutoSyncFromMarks(): void {
    if (this._autoSyncQueued) {
      return;
    }

    this._autoSyncQueued = true;
    // Coalesce bursts of mutations into a single highlight recomputation.
    queueMicrotask(() => {
      this._autoSyncQueued = false;
      if (!this._root || !(this._root.host as HTMLElement).isConnected) {
        return;
      }

      const cacheKey = this._autoSyncCacheKeyProvider?.()?.trim();
      if (!cacheKey) {
        this.clear();
        return;
      }

      this.applyFromMarks(cacheKey);
    });
  }

  private _mutationAffectsHighlights(mutation: MutationRecord): boolean {
    if (mutation.type === "characterData") {
      return this._nodeContainsHighlightMark(mutation.target);
    }

    if (mutation.type !== "childList") {
      return false;
    }

    if (this._nodeContainsHighlightMark(mutation.target)) {
      return true;
    }

    for (const node of mutation.addedNodes) {
      if (this._nodeContainsHighlightMark(node)) {
        return true;
      }
    }

    for (const node of mutation.removedNodes) {
      if (this._nodeContainsHighlightMark(node)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns true when a node is a highlight mark, contains one, or is a text/comment
   * node inside one. The text/comment case covers Lit marker nodes.
   */
  private _nodeContainsHighlightMark(node: Node): boolean {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      return (
        element.matches(HIGHLIGHT_MARK_SELECTOR) ||
        Boolean(element.querySelector(HIGHLIGHT_MARK_SELECTOR))
      );
    }

    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      return Boolean(
        (node as DocumentFragment).querySelector?.(HIGHLIGHT_MARK_SELECTOR)
      );
    }

    if (
      node.nodeType === Node.TEXT_NODE ||
      node.nodeType === Node.COMMENT_NODE
    ) {
      const parentElement = (node as ChildNode).parentElement;
      return Boolean(parentElement?.closest(HIGHLIGHT_MARK_SELECTOR));
    }

    return false;
  }

  /**
   * Inject marker styles and `::highlight()` theme colors.
   */
  private _addHighlightStyle(): void {
    if (!this._root || !this._highlightName) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = createHighlightStyle(this._highlightName);
    this._root.appendChild(style);
  }
}
