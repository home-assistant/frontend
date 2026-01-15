const DEFAULT_ELLIPSIS = " ... ";

let measureCanvas: HTMLCanvasElement | undefined;

const getTextWidth = (text: string, font: string): number => {
  measureCanvas ??= document.createElement("canvas");
  const context = measureCanvas.getContext("2d");
  if (!context) {
    return text.length;
  }
  context.font = font;
  return context.measureText(text).width;
};

export const truncateMiddle = (
  text: string,
  maxWidth: number,
  font: string,
  ellipsis = DEFAULT_ELLIPSIS
): string => {
  if (text.length < 2) {
    return text;
  }
  if (getTextWidth(text, font) <= maxWidth) {
    return text;
  }
  if (getTextWidth(ellipsis, font) >= maxWidth) {
    return text;
  }

  let tailLength = Math.min(12, Math.max(6, Math.round(text.length * 0.25)));
  tailLength = Math.min(tailLength, text.length - 1);
  if (tailLength < 1) {
    return text;
  }

  while (tailLength > 1) {
    const width = getTextWidth(
      `${text.slice(0, 1)}${ellipsis}${text.slice(-tailLength)}`,
      font
    );
    if (width <= maxWidth) {
      break;
    }
    tailLength--;
  }

  const tail = text.slice(-tailLength);
  let low = 1;
  let high = text.length - tailLength;
  let best = 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = `${text.slice(0, mid)}${ellipsis}${tail}`;
    if (getTextWidth(candidate, font) <= maxWidth) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return `${text.slice(0, best)}${ellipsis}${tail}`;
};
