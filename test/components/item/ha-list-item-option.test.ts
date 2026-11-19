import { ContextProvider } from "@lit/context";
import { afterEach, describe, expect, it } from "vitest";
import "../../../src/components/item/ha-list-item-option";
import type { HaListItemOption } from "../../../src/components/item/ha-list-item-option";
import { internationalizationContext } from "../../../src/data/context";
import type { HomeAssistantInternationalization } from "../../../src/types";

const renderOption = async () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: {
      localize: (key: string) => key,
    } as unknown as HomeAssistantInternationalization,
  });
  const option = document.createElement(
    "ha-list-item-option"
  ) as HaListItemOption;
  host.appendChild(option);
  await option.updateComplete;
  return option;
};

describe("ha-list-item-option", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("describes an indeterminate row as partly selected", async () => {
    const option = await renderOption();
    expect(option.getAttribute("aria-selected")).toBe("false");
    expect(option.hasAttribute("aria-description")).toBe(false);

    option.indeterminate = true;
    await option.updateComplete;
    expect(option.getAttribute("aria-description")).toBe(
      "ui.components.list-item-option.partly_selected"
    );

    option.indeterminate = false;
    await option.updateComplete;
    expect(option.hasAttribute("aria-description")).toBe(false);
  });
});
