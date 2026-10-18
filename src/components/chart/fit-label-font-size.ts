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
  const fits = (fontSize: number) => {
    const scale = fontSize / baseFontSize;
    const wrapWidth = fitWidth / scale;
    const wrapped = measure(text, wrapWidth);
    // zrender moves a space that doesn't fit to the next line, indenting it
    const badBreak =
      words.some((word) => measure(word, wrapWidth).lines.length > 1) ||
      wrapped.lines.some((line, i) => i > 0 && line.startsWith(" "));
    const wrappedHeight =
      unwrappedHeight + wrapped.contentHeight - unwrappedContentHeight;
    return !badBreak && wrappedHeight * scale <= height;
  };
  let low = 0;
  let high = Math.min(baseFontSize, (height / unwrappedHeight) * baseFontSize);
  if (fits(high)) {
    return high;
  }
  for (let i = 0; i < 10; i++) {
    const mid = (low + high) / 2;
    if (fits(mid)) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return low;
}
