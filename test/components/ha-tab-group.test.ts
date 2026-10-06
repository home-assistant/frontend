import { afterEach, describe, expect, it } from "vitest";
import "../../src/components/ha-tab-group";
import type { HaTabGroup } from "../../src/components/ha-tab-group";
import "../../src/components/ha-tab-group-tab";
import type { HaTabGroupTab } from "../../src/components/ha-tab-group-tab";

// Like the dashboard view tabs, where a disabled tab stands for a hidden view.
// Web Awesome sets attributes in its constructors, which createElement does
// not allow, so the elements are parsed from markup like Lit templates are.
const renderTabGroup = async () => {
  document.body.innerHTML = `
    <ha-tab-group>
      <ha-tab-group-tab slot="nav" panel="0" active></ha-tab-group-tab>
      <ha-tab-group-tab slot="nav" panel="1"></ha-tab-group-tab>
      <ha-tab-group-tab slot="nav" panel="2" disabled></ha-tab-group-tab>
    </ha-tab-group>
  `;
  const group = document.querySelector<HaTabGroup>("ha-tab-group")!;
  const tabs = [...group.querySelectorAll<HaTabGroupTab>("ha-tab-group-tab")];
  await group.updateComplete;
  // Outside a browser the group skips picking its initial tab, so pick it here.
  group.active = "0";
  await group.updateComplete;

  const shown: string[] = [];
  group.addEventListener("wa-tab-show", (ev) => {
    shown.push((ev as CustomEvent<{ name: string }>).detail.name);
  });
  return { tabs, shown };
};

// Navigating to a hidden view marks its tab active without a click. The group
// does not activate disabled tabs, so it keeps tracking the previous tab.
const navigateToHiddenTab = async (tabs: HaTabGroupTab[]) => {
  tabs[0].active = false;
  tabs[2].active = true;
  await Promise.all(tabs.map((tab) => tab.updateComplete));
};

const pressEnter = (tab: HaTabGroupTab) =>
  tab.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      composed: true,
    })
  );

describe("ha-tab-group", () => {
  afterEach(() => document.body.replaceChildren());

  it("shows a tab that is clicked", async () => {
    const { tabs, shown } = await renderTabGroup();

    tabs[1].click();

    expect(shown).toEqual(["1"]);
  });

  it("does not show the active tab again when it is clicked", async () => {
    const { tabs, shown } = await renderTabGroup();

    tabs[0].click();

    expect(shown).toEqual([]);
  });

  it("shows the previous tab when it is clicked from a hidden tab", async () => {
    const { tabs, shown } = await renderTabGroup();
    await navigateToHiddenTab(tabs);

    tabs[0].click();

    expect(shown).toEqual(["0"]);
  });

  it("shows the previous tab when Enter is pressed on it from a hidden tab", async () => {
    const { tabs, shown } = await renderTabGroup();
    await navigateToHiddenTab(tabs);

    pressEnter(tabs[0]);

    expect(shown).toEqual(["0"]);
  });

  it("does not show a disabled tab when it is clicked", async () => {
    const { tabs, shown } = await renderTabGroup();
    await navigateToHiddenTab(tabs);

    tabs[2].click();

    expect(shown).toEqual([]);
  });
});
