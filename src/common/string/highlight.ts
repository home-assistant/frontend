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

interface HighlightController {
  applyFromMarks: (key?: string) => void;
  applyFromRanges: (ranges: Range[], key?: string) => void;
  clear: () => void;
}

const HIGHLIGHT_NAME_PREFIX = "ha-search";
let highlightId = 0;
const highlightControllers = new WeakMap<ShadowRoot, HighlightController>();

const ensureHighlightStyle = (root: ShadowRoot, name: string) => {
  const style = document.createElement("style");
  style.textContent = `::highlight(${name}) {
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

  let lastKey: string | undefined;
  let lastMarkCount = -1;

  const controller: HighlightController = {
    applyFromMarks: (key?: string) => {
      if (!CSS.highlights) {
        return;
      }

      const marks = root.querySelectorAll("mark.ha-highlight");
      const markCount = marks.length;
      if (key === lastKey && markCount === lastMarkCount) {
        return;
      }

      lastKey = key;
      lastMarkCount = markCount;

      const host = root.host as HTMLElement;
      if (!markCount) {
        CSS.highlights.delete(name);
        host.removeAttribute("data-custom-highlight");
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
        CSS.highlights.set(name, new Highlight(...ranges));
        host.setAttribute("data-custom-highlight", "");
      } else {
        CSS.highlights.delete(name);
        host.removeAttribute("data-custom-highlight");
      }
    },
    applyFromRanges: (ranges: Range[], key?: string) => {
      if (!CSS.highlights) {
        return;
      }

      const rangeCount = ranges.length;
      if (key === lastKey && rangeCount === lastMarkCount) {
        return;
      }

      lastKey = key;
      lastMarkCount = rangeCount;

      const host = root.host as HTMLElement;
      if (!rangeCount) {
        CSS.highlights.delete(name);
        host.removeAttribute("data-custom-highlight");
        return;
      }

      CSS.highlights.set(name, new Highlight(...ranges));
      host.setAttribute("data-custom-highlight", "");
    },
    clear: () => {
      if (CSS.highlights) {
        CSS.highlights.delete(name);
      }
      (root.host as HTMLElement).removeAttribute("data-custom-highlight");
    },
  };

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
