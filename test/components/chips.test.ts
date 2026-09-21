import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "../../src/components/chips/ha-chip-set";
import { HaFilterChip } from "../../src/components/chips/ha-filter-chip";
import { HaInputChip } from "../../src/components/chips/ha-input-chip";
import type { HaChipBase } from "../../src/components/chips/ha-chip-base";

const mounted: HTMLElement[] = [];

beforeAll(() => {
  // jsdom's ElementInternals lacks the validity API used by Web Awesome.
  Object.defineProperties(ElementInternals.prototype, {
    setValidity: { configurable: true, value: vi.fn() },
    setFormValue: { configurable: true, value: vi.fn() },
    validity: { configurable: true, get: () => ({ valid: true }) },
  });
});

const mountChip = async <T extends HaChipBase>(
  chip: T,
  props: Partial<T> = {}
) => {
  Object.assign(chip, props);
  document.body.append(chip);
  mounted.push(chip);
  await chip.updateComplete;
  return chip;
};

const action = (chip: HaChipBase, name: "primary" | "remove" = "primary") =>
  chip.shadowRoot!.querySelector<HTMLButtonElement>(`.${name}`)!;

const pressKey = (chip: HaChipBase, key: string) => {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  chip.shadowRoot!.activeElement!.dispatchEvent(event);
  return event;
};

afterEach(() => {
  mounted.forEach((element) => element.remove());
  mounted.length = 0;
});

describe("chip interactions", () => {
  it("reflects disabled property changes to the host attribute", async () => {
    const chip = await mountChip(new HaInputChip(), { disabled: true });
    expect(chip.hasAttribute("disabled")).toBe(true);
    expect(action(chip).disabled).toBe(true);

    chip.disabled = false;
    await chip.updateComplete;
    expect(chip.hasAttribute("disabled")).toBe(false);
    expect(action(chip).disabled).toBe(false);
  });

  it.each([
    { disabled: true },
    { disabled: true, alwaysFocusable: true },
    { softDisabled: true },
  ])("blocks clicks and removal when %j", async (props) => {
    const chip = await mountChip(new HaInputChip(), props);
    const click = vi.fn();
    const remove = vi.fn();
    chip.addEventListener("click", click);
    chip.addEventListener("remove", remove);

    chip.click();
    action(chip, "remove").click();
    const event = new MouseEvent("click", {
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    chip.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(click).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(chip.isConnected).toBe(true);
  });

  it("delivers enabled clicks", async () => {
    const chip = await mountChip(new HaInputChip());
    const click = vi.fn();
    chip.addEventListener("click", click);
    chip.click();
    expect(click).toHaveBeenCalledOnce();
  });

  it.each([
    ["ltr", "ArrowRight", "ArrowLeft"],
    ["rtl", "ArrowLeft", "ArrowRight"],
  ])(
    "moves between primary and remove actions in %s",
    async (direction, forward, backward) => {
      const chip = await mountChip(new HaInputChip());
      chip.style.direction = direction;
      chip.focus();
      expect(chip.shadowRoot!.activeElement).toBe(action(chip));

      expect(pressKey(chip, forward).defaultPrevented).toBe(true);
      await chip.updateComplete;
      expect(chip.shadowRoot!.activeElement).toBe(action(chip, "remove"));
      expect(action(chip).tabIndex).toBe(-1);

      expect(pressKey(chip, backward).defaultPrevented).toBe(true);
      await chip.updateComplete;
      expect(chip.shadowRoot!.activeElement).toBe(action(chip));
      expect(action(chip).tabIndex).toBe(0);

      expect(pressKey(chip, backward).defaultPrevented).toBe(false);
    }
  );

  it.each([false, true])(
    "removes the chip only when the remove event is not canceled (%s)",
    async (prevent) => {
      const chip = await mountChip(new HaInputChip());
      const click = vi.fn();
      const remove = vi.fn((event: Event) => {
        expect(chip.isConnected).toBe(true);
        expect(event.cancelable).toBe(true);
        if (prevent) {
          event.preventDefault();
        }
      });
      chip.addEventListener("click", click);
      chip.addEventListener("remove", remove);

      action(chip, "remove").click();

      expect(remove).toHaveBeenCalledOnce();
      expect(click).not.toHaveBeenCalled();
      expect(chip.isConnected).toBe(prevent);
    }
  );
});

describe("chip set keyboard navigation", () => {
  const mountSet = async (props: Partial<HaInputChip>[] = [{}, {}, {}]) => {
    const set = document.createElement("ha-chip-set");
    const chips = props.map((properties) => {
      const chip = new HaInputChip();
      Object.assign(chip, { removable: false }, properties);
      return chip;
    });
    set.append(...chips);
    document.body.append(set);
    mounted.push(set);
    await set.updateComplete;
    await Promise.all(chips.map((chip) => chip.updateComplete));
    return { set, chips };
  };

  const expectFocused = (chips: HaInputChip[], index: number) => {
    expect(document.activeElement).toBe(chips[index]);
    expect(chips.map((chip) => chip.tabIndex)).toEqual(
      chips.map((_, position) => (position === index ? 0 : -1))
    );
  };

  it("moves Home and End to the first and last enabled chips", async () => {
    const { chips } = await mountSet([
      { disabled: true },
      {},
      {},
      {},
      { disabled: true },
    ]);
    chips[2].focus();
    expect(pressKey(chips[2], "Home").defaultPrevented).toBe(true);
    expectFocused(chips, 1);

    expect(pressKey(chips[1], "End").defaultPrevented).toBe(true);
    expectFocused(chips, 3);
  });

  it.each([
    ["ltr", "ArrowRight", "ArrowLeft"],
    ["rtl", "ArrowLeft", "ArrowRight"],
  ])(
    "wraps and skips disabled chips in %s",
    async (direction, forward, backward) => {
      const { set, chips } = await mountSet([{}, { disabled: true }, {}]);
      set.style.direction = direction;
      chips[0].focus();

      pressKey(chips[0], forward);
      expectFocused(chips, 2);
      pressKey(chips[2], forward);
      expectFocused(chips, 0);
      pressKey(chips[0], backward);
      expectFocused(chips, 2);
      pressKey(chips[2], backward);
      expectFocused(chips, 0);
    }
  );

  it.each([
    ["ltr", "ArrowRight", "ArrowLeft"],
    ["rtl", "ArrowLeft", "ArrowRight"],
  ])(
    "enters a removable chip on the appropriate action in %s",
    async (direction, forward, backward) => {
      const { set, chips } = await mountSet([{}, { removable: true }, {}]);
      set.style.direction = direction;
      chips.forEach((chip) => {
        chip.style.direction = direction;
      });
      chips[2].focus();

      pressKey(chips[2], backward);
      expectFocused(chips, 1);
      expect(chips[1].shadowRoot!.activeElement).toBe(
        action(chips[1], "remove")
      );
      pressKey(chips[1], backward);
      expectFocused(chips, 1);
      expect(chips[1].shadowRoot!.activeElement).toBe(action(chips[1]));
      pressKey(chips[1], backward);
      expectFocused(chips, 0);

      pressKey(chips[0], forward);
      expectFocused(chips, 1);
      expect(chips[1].shadowRoot!.activeElement).toBe(action(chips[1]));
      pressKey(chips[1], forward);
      expectFocused(chips, 1);
      expect(chips[1].shadowRoot!.activeElement).toBe(
        action(chips[1], "remove")
      );
      pressKey(chips[1], forward);
      expectFocused(chips, 2);
    }
  );

  it("enters the last chip on its remove action with End", async () => {
    const { chips } = await mountSet([{}, { removable: true }]);
    chips[0].focus();
    pressKey(chips[0], "End");
    expectFocused(chips, 1);
    expect(chips[1].shadowRoot!.activeElement).toBe(action(chips[1], "remove"));
  });
});

describe("filter chip clicks", () => {
  it("toggles selection before notifying click listeners", async () => {
    const chip = await mountChip(new HaFilterChip());
    const selections: boolean[] = [];
    chip.addEventListener("click", () => selections.push(chip.selected));

    chip.click();
    expect(chip.selected).toBe(true);
    chip.click();
    expect(chip.selected).toBe(false);
    expect(selections).toEqual([true, false]);
  });

  it.each([false, true])(
    "rolls back a canceled click from selected=%s",
    async (selected) => {
      const chip = await mountChip(new HaFilterChip(), { selected });
      const click = vi.fn((event: MouseEvent) => {
        expect(chip.selected).toBe(!selected);
        event.preventDefault();
      });
      chip.addEventListener("click", click);
      const original = new MouseEvent("click", {
        bubbles: true,
        composed: true,
        cancelable: true,
      });

      action(chip).dispatchEvent(original);

      expect(click).toHaveBeenCalledOnce();
      expect(chip.selected).toBe(selected);
      expect(original.defaultPrevented).toBe(true);
    }
  );

  it.each([
    ["MouseEvent", MouseEvent],
    ["PointerEvent", PointerEvent],
  ] as const)(
    "preserves pointer and modifier information for %s",
    async (_name, EventClass) => {
      const chip = await mountChip(new HaFilterChip());
      const init: PointerEventInit = {
        bubbles: true,
        composed: true,
        cancelable: true,
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
        metaKey: true,
        clientX: 42,
        clientY: 23,
        button: 0,
        buttons: 1,
        detail: 2,
        pointerId: 7,
        pointerType: "pen",
        pressure: 0.5,
        isPrimary: true,
      };
      const original = new EventClass("click", init);
      const click = vi.fn<(event: MouseEvent) => void>();
      chip.addEventListener("click", click);

      action(chip).dispatchEvent(original);

      expect(click).toHaveBeenCalledOnce();
      const replacement = click.mock.calls[0][0];
      expect(replacement).not.toBe(original);
      expect(replacement).toBeInstanceOf(EventClass);
      expect(replacement.target).toBe(chip);
      for (const field of [
        "bubbles",
        "composed",
        "cancelable",
        "ctrlKey",
        "altKey",
        "shiftKey",
        "metaKey",
        "clientX",
        "clientY",
        "button",
        "buttons",
        "detail",
      ] as const) {
        expect(replacement[field]).toBe(original[field]);
      }
      if (original instanceof PointerEvent) {
        expect(replacement).toMatchObject({
          pointerId: original.pointerId,
          pointerType: original.pointerType,
          pressure: original.pressure,
          isPrimary: original.isPrimary,
        });
      }
    }
  );

  it.each([{ disabled: true }, { softDisabled: true }])(
    "does not toggle or deliver clicks when %j",
    async (props) => {
      const chip = await mountChip(new HaFilterChip(), props);
      const click = vi.fn();
      chip.addEventListener("click", click);
      chip.click();
      expect(chip.selected).toBe(false);
      expect(click).not.toHaveBeenCalled();
    }
  );
});
