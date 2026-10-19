import { beforeAll, describe, expect, it } from "vitest";
import { setPlatformAPI } from "zrender/lib/core/platform.js";
import { parsePlainText } from "zrender/lib/graphic/helper/parseText.js";
import { fitLabelFontSize } from "../../../src/components/chart/fit-label-font-size";

const FONT_SIZE = 12;
// jsdom has no canvas, so measure every character as 0.6em wide
const EM = 0.6;
const LINE_HEIGHT = EM * FONT_SIZE;

const fit = (text: string, width: number, height: number) =>
  fitLabelFontSize(text, {
    fontSize: FONT_SIZE,
    width,
    height,
    unwrappedHeight: text.split("\n").length * LINE_HEIGHT,
  });

// wrap like ECharts does at the returned font size
const wrap = (text: string, fontSize: number, width: number) =>
  text.split("\n").map(
    (paragraph) =>
      parsePlainText(
        paragraph,
        {
          font: `${fontSize}px Roboto, Noto, sans-serif`,
          width,
          overflow: "break",
        },
        undefined,
        undefined
      ).lines
  );

beforeAll(() => {
  setPlatformAPI({
    measureText: (text, font) => ({
      width: text.length * EM * parseFloat(/([\d.]+)px/.exec(font!)![1]),
    }),
  });
});

describe("fitLabelFontSize", () => {
  it("keeps the font size when the label fits", () => {
    expect(fit("Kitchen", 100, 20)).toBe(FONT_SIZE);
  });

  it("ignores indentation after an explicit newline", () => {
    expect(fit("Kitchen\n light", 100, 30)).toBe(FONT_SIZE);
  });

  it.each([
    ["narrow wrapped label", "Untracked consumption", 70, 22],
    ["long word", "Geschirrspülmaschine", 70, 40],
    ["word that fills the width", "Electric vehicle charger", 40, 20],
    ["label and value", "Electric vehicle charger\n140 kWh", 70, 20],
    ["small height", "Coffee machine", 70, 9],
  ])("fits a %s without breaking words", (_name, text, width, height) => {
    const fontSize = fit(text, width, height);
    expect(fontSize).toBeGreaterThan(0);
    expect(fontSize).toBeLessThanOrEqual(FONT_SIZE);

    const paragraphs = wrap(text, fontSize, width);
    const lines = paragraphs.flat();
    expect(lines.length * EM * fontSize).toBeLessThanOrEqual(height);
    for (const word of text.split(/\s+/)) {
      expect(lines.some((line) => line.includes(word))).toBe(true);
    }
    for (const paragraph of paragraphs) {
      expect(paragraph.slice(1).some((line) => line.startsWith(" "))).toBe(
        false
      );
    }
  });
});
