import { afterEach, describe, expect, it } from "vitest";
import "../../src/components/ha-label";

let label: HTMLElementTagNameMap["ha-label"] | undefined;

const mountLabel = async (color?: string) => {
  label = document.createElement("ha-label");
  label.color = color;
  label.description = "Label description";
  label.append("Label");
  document.body.append(label);
  await label.updateComplete;
  return label;
};

afterEach(() => {
  label?.remove();
  label = undefined;
});

describe("ha-label", () => {
  it.each([
    ["#3f51b5", "#ffffff"],
    ["#ffeb3b", "#000000"],
  ])(
    "sets contrasted text and icon colors for %s",
    async (color, contrastColor) => {
      const element = await mountLabel(color);

      expect(
        element.style.getPropertyValue("--ha-label-background-color")
      ).toBe(color);
      expect(element.style.getPropertyValue("--ha-label-text-color")).toBe(
        contrastColor
      );
      expect(element.style.getPropertyValue("--ha-label-icon-color")).toBe(
        contrastColor
      );
    }
  );

  it("does not override the primary text color used by the tooltip", async () => {
    const element = await mountLabel("#3f51b5");

    expect(element.style.getPropertyValue("--primary-text-color")).toBe("");
    expect(element.shadowRoot!.querySelector("ha-tooltip")).not.toBeNull();
  });

  it("sets no inline color variables without a color", async () => {
    const element = await mountLabel(undefined);

    expect(element.style.getPropertyValue("--ha-label-background-color")).toBe(
      ""
    );
    expect(element.style.getPropertyValue("--ha-label-text-color")).toBe("");
  });

  it("falls back to the default background when the color is cleared", async () => {
    const element = await mountLabel("#3f51b5");

    element.color = undefined;
    await element.updateComplete;

    expect(element.style.getPropertyValue("--ha-label-background-color")).toBe(
      "rgba(var(--rgb-primary-text-color), 0.15)"
    );
    expect(element.style.getPropertyValue("--ha-label-text-color")).toBe("");
  });

  it("updates its colors when the color changes", async () => {
    const element = await mountLabel("#3f51b5");

    element.color = "#ffeb3b";
    await element.updateComplete;

    expect(element.style.getPropertyValue("--ha-label-background-color")).toBe(
      "#ffeb3b"
    );
    expect(element.style.getPropertyValue("--ha-label-text-color")).toBe(
      "#000000"
    );
  });
});
