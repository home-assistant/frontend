let textMeasureCanvas: HTMLCanvasElement | undefined;

/**
 * Measures the width of text in pixels using a canvas context
 * @param text The text to measure
 * @param fontSize The font size in pixels
 * @param fontFamily The font family to use (defaults to sans-serif)
 * @returns Width of the text in pixels
 */
export function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily = "Roboto, Noto, sans-serif"
): number {
  if (!textMeasureCanvas) {
    textMeasureCanvas = document.createElement("canvas");
  }
  const context = textMeasureCanvas.getContext("2d");
  if (!context) {
    return 0;
  }

  context.font = `${fontSize}px ${fontFamily}`;
  const textMetrics = context.measureText(text);
  return Math.ceil(
    Math.max(
      textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft,
      textMetrics.width
    )
  );
}
