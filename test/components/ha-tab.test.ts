import { afterEach, describe, expect, it, vi } from "vitest";
import "../../src/components/ha-tab";
import type { HaTab } from "../../src/components/ha-tab";

vi.mock("../../src/components/ha-ripple", () => ({}));

const openTab = async (badge?: string) => {
  const tab = document.createElement("ha-tab") as HaTab;
  tab.name = "Installed";
  tab.badge = badge;
  document.body.append(tab);
  await tab.updateComplete;
  return tab.shadowRoot!.querySelector('[role="tab"]')!;
};

describe("ha-tab", () => {
  afterEach(() => document.body.replaceChildren());

  it("tells a screen reader about its badge too", async () => {
    const tab = await openTab("3 updates");

    const describedBy = tab.getAttribute("aria-describedby")!;
    expect(tab.querySelector(`#${describedBy}`)!.textContent).toBe("3 updates");
  });

  it("describes nothing without a badge", async () => {
    const tab = await openTab();

    expect(tab.hasAttribute("aria-describedby")).toBe(false);
  });
});
