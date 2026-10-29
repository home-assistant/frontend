import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../src/components/item/ha-list-item-base";
import type { HaListItemBase } from "../../../src/components/item/ha-list-item-base";
import "../../../src/components/list/ha-list-base";
import type { HaListBase } from "../../../src/components/list/ha-list-base";

const renderList = async (count: number) => {
  const list = document.createElement("ha-list-base");
  const items = Array.from({ length: count }, () => {
    const item = document.createElement("ha-list-item-base");
    item.interactive = true;
    list.appendChild(item);
    return item;
  });
  document.body.appendChild(list);
  await list.updateComplete;
  await Promise.all(items.map((item) => item.updateComplete));
  return { list, items };
};

const setDisabled = async (items: HaListItemBase[], disabled: boolean) => {
  items.forEach((item) => {
    item.disabled = disabled;
  });
  await Promise.all(items.map((item) => item.updateComplete));
  // Let the batched list update run
  await Promise.resolve();
};

describe("ha-list-base", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("follows rows that change their focusability", async () => {
    const { list, items } = await renderList(3);
    expect(items.map((item) => item.tabIndex)).toEqual([0, -1, -1]);

    const update = vi.spyOn(list as HaListBase, "updateListItems");

    // Rows removed while all are disabled, like during a delete
    await setDisabled(items, true);
    items[0].remove();
    await Promise.resolve();
    expect(items.map((item) => item.hasAttribute("tabindex"))).toEqual([
      false,
      false,
      false,
    ]);

    update.mockClear();
    await setDisabled(items.slice(1), false);
    expect(update).toHaveBeenCalledTimes(1);
    expect(items.slice(1).map((item) => item.tabIndex)).toEqual([0, -1]);
  });
});
