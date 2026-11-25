import { describe, expect, it, vi } from "vitest";
import {
  computeCssColor,
  computeCssVariableName,
} from "../../../src/common/color/compute-color";
import * as helpers from "../../../src/panels/lovelace/custom-card-helpers";

// Keep this public API test independent of element registration and rendering.
vi.mock(
  "../../../src/panels/lovelace/create-element/create-badge-element",
  () => ({ createBadgeElement: vi.fn() })
);
vi.mock(
  "../../../src/panels/lovelace/create-element/create-card-element",
  () => ({ createCardElement: vi.fn() })
);
vi.mock(
  "../../../src/panels/lovelace/create-element/create-header-footer-element",
  () => ({ createHeaderFooterElement: vi.fn() })
);
vi.mock(
  "../../../src/panels/lovelace/create-element/create-hui-element",
  () => ({ createHuiElement: vi.fn() })
);
vi.mock(
  "../../../src/panels/lovelace/create-element/create-row-element",
  () => ({ createRowElement: vi.fn() })
);

describe("custom card color helpers", () => {
  it("exposes the canonical color functions through the public helper module", () => {
    expect(helpers.computeCssColor).toBe(computeCssColor);
    expect(helpers.computeCssVariableName).toBe(computeCssVariableName);
  });

  it.each(["primary", "amber", "deep-purple", "primary-text"])(
    "returns theme references for %s without resolving them to fixed colors",
    (color) => {
      expect(helpers.computeCssVariableName(color)).toBe(`--${color}-color`);
      expect(helpers.computeCssColor(color)).toBe(`var(--${color}-color)`);
    }
  );

  it.each(["#488fc2", "rgba(12, 34, 56, 0.5)", "var(--custom-color)"])(
    "leaves the custom CSS color %s unchanged",
    (color) => {
      expect(helpers.computeCssVariableName(color)).toBe(color);
      expect(helpers.computeCssColor(color)).toBe(color);
    }
  );
});
