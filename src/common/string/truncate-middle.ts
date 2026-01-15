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
  const maxContent = text.length - 1;
  let low = 1;
  let high = maxContent;
  let bestHead = 1;
  let bestTail = 1;

  while (low <= high) {
    const total = Math.floor((low + high) / 2);
    const headLen = Math.ceil(total / 2);
    const tailLen = total - headLen;
    if (tailLen < 1) {
      low = total + 1;
      continue;
    }
    const candidate = `${text.slice(0, headLen)}${ellipsis}${text.slice(
      -tailLen
    )}`;
    if (getTextWidth(candidate, font) <= maxWidth) {
      bestHead = headLen;
      bestTail = tailLen;
      low = total + 1;
    } else {
      high = total - 1;
    }
  }

  return `${text.slice(0, bestHead)}${ellipsis}${text.slice(-bestTail)}`;
};
