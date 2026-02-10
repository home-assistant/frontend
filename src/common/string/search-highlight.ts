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
  const normalizedWhole = stripDiacritics(text).toLocaleLowerCase(language);

  if (normalizedWhole.length === text.length) {
    const mapStart = Array.from({ length: text.length }, (_, i) => i);
    const mapEnd = Array.from({ length: text.length }, (_, i) => i + 1);
    return { normalized: normalizedWhole, mapStart, mapEnd };
  }

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

class HighlightController {
  private _lastKey?: string;

  private _lastCount = -1;

  public constructor(
    private _root: ShadowRoot,
    private _name: string
  ) {}

  public applyFromMarks(key?: string) {
    if (!CSS.highlights) {
      return;
    }

    const marks = this._root.querySelectorAll("mark.ha-highlight");
    const markCount = marks.length;
    if (key === this._lastKey && markCount === this._lastCount) {
      return;
    }

    this._lastKey = key;
    this._lastCount = markCount;

    if (!markCount) {
      this.clear();
      return;
    }

    const ranges: Range[] = [];
    marks.forEach((mark) => {
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

    if (ranges.length) {
      CSS.highlights.set(this._name, new Highlight(...ranges));
      (this._root.host as HTMLElement).classList.add("custom-highlight-active");
    } else {
      this.clear();
    }
  }

  public applyFromRanges(ranges: Range[], key?: string) {
    if (!CSS.highlights) {
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

    CSS.highlights.set(this._name, new Highlight(...ranges));
    (this._root.host as HTMLElement).classList.add("custom-highlight-active");
  }

  public clear() {
    if (CSS.highlights) {
      CSS.highlights.delete(this._name);
    }
    (this._root.host as HTMLElement).classList.remove(
      "custom-highlight-active"
    );
  }
}

const HIGHLIGHT_NAME_PREFIX = "ha-search";
let highlightId = 0;
const highlightControllers = new WeakMap<ShadowRoot, HighlightController>();

const ensureHighlightStyle = (root: ShadowRoot, name: string) => {
  const style = document.createElement("style");
  style.textContent = `.ha-highlight {
  background-color: var(--ha-highlight-bg, var(--ha-color-fill-primary-normal-hover));
  color: var(--ha-highlight-color, var(--primary-text-color));
  border-radius: 2px;
  padding: 0;
  box-shadow: inset 0 0 0 1px transparent;
}

:host(.custom-highlight-active) .ha-highlight {
  background-color: transparent;
  color: inherit;
}

::highlight(${name}) {
  background-color: var(--ha-highlight-bg, var(--ha-color-fill-primary-normal-hover));
  color: var(--ha-highlight-color, var(--primary-text-color));
}`;
  root.appendChild(style);
};

const getHighlightController = (root: ShadowRoot): HighlightController => {
  const existing = highlightControllers.get(root);
  if (existing) {
    return existing;
  }

  const name = `${HIGHLIGHT_NAME_PREFIX}-${highlightId++}`;
  if (CSS.highlights) {
    ensureHighlightStyle(root, name);
  }

  const controller = new HighlightController(root, name);
  highlightControllers.set(root, controller);
  return controller;
};

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

export const applyCustomHighlights = (root: ShadowRoot) => {
  if (!CSS.highlights) {
    return;
  }

  const controller = getHighlightController(root);
  controller.applyFromMarks();
};

export const applyCustomHighlightsWithKey = (
  root: ShadowRoot,
  key?: string
) => {
  if (!CSS.highlights) {
    return;
  }

  const controller = getHighlightController(root);
  controller.applyFromMarks(key);
};

export const applyCustomHighlightRanges = (
  root: ShadowRoot,
  ranges: Range[],
  key?: string
) => {
  if (!CSS.highlights) {
    return;
  }

  const controller = getHighlightController(root);
  controller.applyFromRanges(ranges, key);
};

export const clearCustomHighlights = (root: ShadowRoot) => {
  const controller = highlightControllers.get(root);
  controller?.clear();
};
