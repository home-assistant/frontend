import { afterEach, describe, expect, it } from "vitest";
import "../../../../src/panels/lovelace/card-features/hui-light-color-temp-card-feature";

describe("hui-light-color-temp-card-feature", () => {
  afterEach(() => {
    document.dir = "ltr";
  });

  it("mirrors the gradient direction in RTL", () => {
    document.dir = "rtl";

    const feature = document.createElement(
      "hui-light-color-temp-card-feature"
    );
    document.body.appendChild(feature);

    const styles = Array.from(
      feature.shadowRoot!.querySelectorAll("style")
    )
      .map((style) => style.textContent ?? "")
      .join("\n");

    expect(styles).toMatch(
      /ha-control-slider:dir\(rtl\)[\s\S]*--control-slider-background:[\s\S]*linear-gradient\([\s\S]*to left,[\s\S]*var\(--gradient\)/
    );

    feature.remove();
  });
});
