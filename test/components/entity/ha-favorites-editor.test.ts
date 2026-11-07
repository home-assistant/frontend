import { describe, expect, it, vi } from "vitest";
import "../../../src/components/entity/ha-favorites-editor";
import type { HaFavoritesEditor } from "../../../src/components/entity/ha-favorites-editor";

type Handlers = Record<
  "_add" | "_remove" | "_moved",
  (ev: CustomEvent) => void
>;

// What the editor's children report: the entity picker's selection, a row's
// delete button and a drag in the sortable list.
const userActions = (el: HaFavoritesEditor) => {
  const handlers = el as unknown as Handlers;
  const picked = new CustomEvent("value-changed", {
    detail: { value: "light.c" },
  });
  // _add() clears the picker it was called from
  Object.defineProperty(picked, "currentTarget", { value: {} });
  handlers._add(picked);
  handlers._remove(
    new CustomEvent("delete-favorite-entity", { detail: { index: 0 } })
  );
  handlers._moved(
    new CustomEvent("item-moved", { detail: { oldIndex: 0, newIndex: 1 } })
  );
};

describe("ha-favorites-editor", () => {
  const createEditor = (disabled: boolean) => {
    const el = document.createElement("ha-favorites-editor");
    el.favorites = ["light.a", "light.b"];
    el.disabled = disabled;
    const changed = vi.fn();
    el.addEventListener("value-changed", changed);
    return { el, changed };
  };

  it("changes nothing while disabled", () => {
    const { el, changed } = createEditor(true);
    userActions(el);
    expect(changed).not.toHaveBeenCalled();
  });

  it("reports each change when enabled", () => {
    const { el, changed } = createEditor(false);
    userActions(el);
    expect(changed).toHaveBeenCalledTimes(3);
  });
});
