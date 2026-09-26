import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "../../src/components/ha-picker-combo-box";
import type { LitVirtualizer } from "@lit-labs/virtualizer";
import type { HaInputSearch } from "../../src/components/input/ha-input-search";
import type {
  HaPickerComboBox,
  PickerComboBoxItem,
} from "../../src/components/ha-picker-combo-box";

// These cover the rules the highlight depends on, all of which live in focus
// and lifecycle behaviour rather than in the pure cursor helpers: Enter acts
// only where the cursor can be seen, the cursor exists only where Enter can
// reach it, and it stays in view. Each one has been broken at least once.

// Hoisted so the mock factory, which runs when the component is imported, can
// close over it.
const { observe } = vi.hoisted(() => ({ observe: vi.fn() }));

// ScrollableFadeMixin's ResizeController creates no observer under Vitest,
// because Lit resolves its node build and reports isServer. Mocking it keeps
// the mixin's attach path intact, which is what one of these tests checks.
vi.mock("@lit-labs/observers/resize-controller", () => ({
  ResizeController: class {
    public observe = observe;

    public unobserve() {
      // The fades are not under test; only the attachment is.
    }

    public disconnect() {
      // The fades are not under test; only the attachment is.
    }
  },
}));

beforeAll(() => {
  // The virtualizer constructs one of its own, separately from the mixin's.
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      public observe() {
        // Layout is not observable under jsdom anyway.
      }

      public unobserve() {
        // Layout is not observable under jsdom anyway.
      }

      public disconnect() {
        // Layout is not observable under jsdom anyway.
      }
    } as unknown as typeof ResizeObserver;
  }
  // jsdom implements ElementInternals without validation, which Web Awesome's
  // form-associated base class calls on connect.
  const internals = (
    globalThis as unknown as { ElementInternals?: { prototype: object } }
  ).ElementInternals?.prototype as Record<string, unknown> | undefined;
  if (internals && !internals.setValidity) {
    internals.setValidity = () => undefined;
    internals.setFormValue = () => undefined;
    Object.defineProperty(internals, "validity", {
      configurable: true,
      get: () => ({ valid: true }),
    });
  }
  Element.prototype.scrollIntoView = vi.fn();
});

const items: PickerComboBoxItem[] = [
  { id: "light.alpha", primary: "Alpha" },
  { id: "light.bravo", primary: "Bravo" },
  { id: "light.charlie", primary: "Charlie" },
];

let mounted: HaPickerComboBox[] = [];

const mount = async (
  props: Partial<HaPickerComboBox> = {}
): Promise<HaPickerComboBox> => {
  const el = document.createElement("ha-picker-combo-box") as HaPickerComboBox;
  el.getItems = () => items;
  Object.assign(el, props);
  document.body.appendChild(el);
  mounted.push(el);
  await el.updateComplete;
  return el;
};

const searchField = (el: HaPickerComboBox) => {
  const field = el.shadowRoot!.querySelector<HaInputSearch>("ha-input-search")!;
  // jsdom does not render wa-input's native input, so the host stands in as
  // the focus target. The component only reads shadowRoot.activeElement, which
  // retargets to this same element in a browser.
  field.tabIndex = 0;
  return field;
};

const listElement = (el: HaPickerComboBox) =>
  el.shadowRoot!.querySelector<HTMLElement>(".plain-list")!;

/** The row the highlight is on, or undefined when there is no cursor. */
const cursorRow = (el: HaPickerComboBox) =>
  el.shadowRoot!.querySelector(".combo-box-row.selected")?.id;

const pressFrom = async (el: HaPickerComboBox, from: Element, key: string) => {
  // tinykeys ignores events without a code, and the shortcuts are bound to the
  // host, so this has to travel up from inside like a real keypress.
  from.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      code: key,
      bubbles: true,
      composed: true,
    })
  );
  await el.updateComplete;
};

const press = (el: HaPickerComboBox, key: string) =>
  pressFrom(el, el.shadowRoot!.activeElement!, key);

const blurAll = (el: HaPickerComboBox) =>
  (el.shadowRoot!.activeElement as HTMLElement | null)?.blur();

const type = async (el: HaPickerComboBox, search: string) => {
  const field = searchField(el);
  field.value = search;
  field.dispatchEvent(
    new InputEvent("input", { bubbles: true, composed: true })
  );
  await el.updateComplete;
};

afterEach(() => {
  mounted.forEach((el) => el.remove());
  mounted = [];
  observe.mockClear();
  vi.mocked(Element.prototype.scrollIntoView).mockClear();
});

describe("the cursor and the focus that owns it", () => {
  it("starts on the current value when the list takes focus", async () => {
    const el = await mount({ value: "light.bravo" });

    listElement(el).focus();
    await el.updateComplete;

    expect(cursorRow(el)).toBe("list-item-1");
  });

  it("advances from the highlighted row, not from the default", async () => {
    // ArrowDown moves focus to the search field, whose blur handler drops the
    // cursor. Reading the index after that restarted from the default row
    // rather than the one the user had arrowed to.
    const el = await mount({ value: "light.bravo" });
    searchField(el);
    listElement(el).focus();
    await el.updateComplete;
    await press(el, "ArrowUp");
    expect(cursorRow(el)).toBe("list-item-0");

    await press(el, "ArrowDown");

    expect(cursorRow(el)).toBe("list-item-1");
  });

  it("keeps the cursor when focus returns to the search field", async () => {
    const el = await mount({ value: "light.bravo" });
    const field = searchField(el);

    listElement(el).focus();
    await el.updateComplete;
    field.focus();
    await el.updateComplete;

    expect(el.shadowRoot!.activeElement).toBe(field);
    expect(cursorRow(el)).toBe("list-item-1");
  });

  it("has no cursor while focus sits outside the search field and list", async () => {
    const el = await mount({ value: "light.bravo" });

    listElement(el).focus();
    await el.updateComplete;
    blurAll(el);
    await el.updateComplete;

    expect(cursorRow(el)).toBeUndefined();
  });

  it("ignores cursor keys that arrive without that focus", async () => {
    // A focused section chip is the real case; the virtualizer it forces
    // renders no rows under jsdom, so this drops focus instead. Either way the
    // key reaches the host, where the shortcuts are bound.
    const el = await mount({ value: "light.bravo" });

    listElement(el).focus();
    await el.updateComplete;
    blurAll(el);
    await pressFrom(el, listElement(el), "Home");

    expect(cursorRow(el)).toBeUndefined();

    await pressFrom(el, listElement(el), "ArrowUp");
    expect(cursorRow(el)).toBeUndefined();

    await pressFrom(el, listElement(el), "ArrowDown");
    expect(cursorRow(el)).toBeUndefined();
  });

  it("does not take the cursor back when the items change", async () => {
    // Rebuilding the items reseeds the cursor. While something else holds
    // focus — a section chip, say — that would highlight a row Enter refuses.
    const el = await mount({ value: "light.bravo" });
    const outside = document.createElement("button");
    document.body.appendChild(outside);

    listElement(el).focus();
    await el.updateComplete;
    outside.focus();
    el.refreshItems();
    await el.updateComplete;

    expect(cursorRow(el)).toBeUndefined();
    outside.remove();
  });
});

describe("Enter and the row it picks", () => {
  it("fires the highlighted row", async () => {
    const el = await mount({ value: "light.bravo" });
    const picked: string[] = [];
    el.addEventListener("value-changed", (ev) => {
      picked.push((ev as CustomEvent).detail.value);
    });

    listElement(el).focus();
    await el.updateComplete;
    await press(el, "Enter");

    expect(picked).toEqual(["light.bravo"]);
  });

  it("picks nothing when focus is not on the search field or list", async () => {
    // Two things enforce this — the blur handlers drop the cursor, and
    // _pickItem checks focus — so it holds if either survives.
    const el = await mount({ value: "light.bravo" });
    const picked: string[] = [];
    el.addEventListener("value-changed", (ev) => {
      picked.push((ev as CustomEvent).detail.value);
    });

    listElement(el).focus();
    await el.updateComplete;
    blurAll(el);
    await pressFrom(el, listElement(el), "Enter");

    expect(picked).toEqual([]);
  });
});

describe("keeping the cursor usable", () => {
  it("scrolls the row it lands on into view after filtering", async () => {
    const el = await mount();
    const field = searchField(el);
    field.focus();
    await el.updateComplete;

    await type(el, "charlie");
    await el.updateComplete;

    expect(cursorRow(el)).toBe("list-item-0");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("scrolls to the first match only once the virtualizer has the items", async () => {
    // element(index) resolves against the items the virtualizer holds, and it
    // takes the new ones in its own update, after this component's.
    const el = await mount({
      getItems: () =>
        Array.from({ length: 40 }, (_unused, index) => ({
          id: `light.${index}`,
          primary: `Light ${index}`,
        })),
    });
    // The virtualizer arrives by dynamic import, so it is not upgraded yet.
    await customElements.whenDefined("lit-virtualizer");
    await el.updateComplete;
    const list =
      el.shadowRoot!.querySelector<LitVirtualizer>("lit-virtualizer")!;
    const proto = customElements.get("lit-virtualizer")!
      .prototype as LitVirtualizer;
    const order: string[] = [];
    const originalRender = proto.render;
    const render = vi.spyOn(proto, "render").mockImplementation(function (
      this: LitVirtualizer
    ) {
      order.push("virtualizer render");
      return originalRender.call(this);
    });
    const element = vi
      .spyOn(proto, "element")
      .mockImplementation((index: number) => {
        order.push(`scroll to ${index}`);
        // Not called through: the virtualizer's own scroll needs a layout,
        // which it never builds without measurable rows.
        return undefined;
      });
    searchField(el).focus();
    await el.updateComplete;
    order.length = 0;

    await type(el, "Light 39");
    await list.updateComplete;
    await el.updateComplete;

    expect(order).toEqual(["virtualizer render", "scroll to 0"]);
    render.mockRestore();
    element.mockRestore();
  });

  it("attaches the fade mixin's scroll observer", async () => {
    const el = await mount();

    expect(observe).toHaveBeenCalledWith(listElement(el));
  });

  it("reattaches the observer when the list becomes virtualized", async () => {
    // Only the mixin's updated() can catch this second attachment, so an
    // override that skips super leaves the fades frozen on the old element.
    const el = await mount();
    expect(observe).toHaveBeenCalledTimes(1);

    el.getItems = () =>
      Array.from({ length: 40 }, (_unused, index) => ({
        id: `light.${index}`,
        primary: `Light ${index}`,
      }));
    el.refreshItems();
    await el.updateComplete;
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector("lit-virtualizer")).toBeTruthy();
    expect(observe).toHaveBeenCalledTimes(2);
  });
});
