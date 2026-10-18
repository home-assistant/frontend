import { parsePlainText } from "zrender/lib/graphic/helper/parseText.js";

const FONT_FAMILY = "Roboto, Noto, sans-serif";
// zrender's overflow "break" only wraps at these characters, see isWordBreakChar
const WORD_BREAK =
  /[ ,&?/;\]]|[^\u0020-\u024F\u0370-\u10FF\u1200-\u13FF\u1E00-\u206F]/;

interface FitLabelOptions {
  /** Font size the label is measured at, and the largest size returned */
  fontSize: number;
  width: number;
  height: number;
  /** Height of the label at `fontSize` before ECharts wraps it */
  unwrappedHeight: number;
}

/**
 * Largest font size at which an ECharts label with `overflow: "break"`,
 * wrapped at `width`, fits in `height` without breaking a word.
 */
export function fitLabelFontSize(
  text: string,
  { fontSize: baseFontSize, width, height, unwrappedHeight }: FitLabelOptions
) {
  const font = `${baseFontSize}px ${FONT_FAMILY}`;
  const measure = (label: string, wrapWidth?: number) =>
    parsePlainText(
      label,
      { font, width: wrapWidth, overflow: "break" },
      undefined,
      undefined
    );
  // ECharts measures at the final font size, leave room for rounding
  const fitWidth = Math.max(width - 1, 1);
  const unwrappedContentHeight = measure(text).contentHeight;
  const words = text.split(WORD_BREAK).filter(Boolean);
  // a label at a smaller font wraps like one at baseFontSize in a wider box
  const wrapWidthAt = (fontSize: number) =>
    (fitWidth * baseFontSize) / fontSize;
  const maxFontSize = (height / unwrappedHeight) * baseFontSize;
  const fits = (fontSize: number) => {
    const wrapWidth = wrapWidthAt(fontSize);
    if (words.some((word) => measure(word, wrapWidth).lines.length > 1)) {
      return false;
    }
    const wrappedHeight =
      unwrappedHeight +
      (measure(text, wrapWidth).contentHeight - unwrappedContentHeight);
    // exact at maxFontSize when the label doesn't wrap
    return fontSize <= maxFontSize * (unwrappedHeight / wrappedHeight);
  };
  let low = 0;
  let high = Math.min(baseFontSize, maxFontSize);
  if (fits(high)) {
    low = high;
  } else {
    for (let i = 0; i < 10; i++) {
      const mid = (low + high) / 2;
      if (fits(mid)) {
        low = mid;
      } else {
        high = mid;
      }
    }
  }
  // zrender moves a space that doesn't fit to the next line, indenting it.
  // Shrinking further only widens the wrap, so the label still fits.
  const spaceWidth = measure(" ").contentWidth;
  const indents = (fontSize: number) =>
    text
      .split("\n")
      .some((paragraph) =>
        measure(paragraph, wrapWidthAt(fontSize)).lines.some(
          (line, i) => i > 0 && line.startsWith(" ")
        )
      );
  let fontSize = low;
  for (let i = 0; i < 3 && indents(fontSize); i++) {
    fontSize = (fitWidth * baseFontSize) / (wrapWidthAt(fontSize) + spaceWidth);
  }
  return fontSize;
}
