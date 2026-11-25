import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PictureElementsEditorBridge } from "../../../../../src/panels/lovelace/cards/picture-elements/editor-bridge";
import { PictureElementsEditorPreviewController } from "../../../../../src/panels/lovelace/cards/picture-elements/editor-preview-controller";
import type {
  LovelaceElement,
  LovelaceElementConfig,
} from "../../../../../src/panels/lovelace/elements/types";

// The image is 400x300 px; elements are placed by inline left/top in px, which
// is what getComputedStyle reports for them. jsdom has no layout, so the
// image's computed size comes from its inline size as well.
const setup = ({
  configs = [{ type: "icon" }] as LovelaceElementConfig[],
  active = true,
  selectedIndex = undefined as number | undefined,
} = {}) => {
  const root = document.createElement("div");
  root.style.width = "400px";
  root.style.height = "300px";
  root.getBoundingClientRect = () => new DOMRect(0, 0, 400, 300);
  Object.defineProperty(root, "offsetWidth", { value: 400 });
  Object.defineProperty(root, "offsetHeight", { value: 300 });
  root.setPointerCapture = vi.fn();
  document.body.appendChild(root);

  const elements = configs.map(() => {
    const el = document.createElement("div") as unknown as LovelaceElement;
    el.style.left = "100px";
    el.style.top = "60px";
    el.getBoundingClientRect = () => new DOMRect(88, 48, 24, 24);
    // Rendered, unlike in jsdom.
    el.getClientRects = () =>
      [el.getBoundingClientRect()] as unknown as DOMRectList;
    root.appendChild(el);
    return el;
  });

  const host = {
    preview: true,
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
  const controller = new PictureElementsEditorPreviewController(host, () => ({
    root,
    elements,
    configs,
  }));
  const handlers = {
    selectElement: vi.fn(),
    moveElement: vi.fn(),
  };
  const bridge = new PictureElementsEditorBridge(handlers);
  bridge.setState(active, selectedIndex);
  controller.hostConnected();
  controller.bridge = bridge;

  // Bound like the card's template binds them.
  const bind = (
    type: string,
    listener: EventListener | { handleEvent: EventListener; capture: true }
  ) =>
    typeof listener === "function"
      ? root.addEventListener(type, listener)
      : root.addEventListener(type, listener.handleEvent, true);
  bind("pointerdown", controller.pointerDown as never);
  bind("pointermove", controller.pointerMove as never);
  bind("pointerup", controller.pointerUp as never);
  bind("pointercancel", controller.pointerCancel as never);
  bind("keydown", controller.keyDown as never);
  for (const type of ["mousedown", "click", "contextmenu", "dragstart"]) {
    bind(type, controller.blockAction as never);
  }
  bind("touchstart", controller.blockTouch as never);

  const pointer = (
    type: string,
    target: EventTarget,
    x: number,
    y: number,
    init: PointerEventInit = {}
  ) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        composed: true,
        cancelable: true,
        pointerId: 1,
        isPrimary: true,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        clientX: x,
        clientY: y,
        ...init,
      })
    );
  // Pointer capture retargets the move and release to the root.
  const gesture = (
    target: EventTarget,
    from: [number, number],
    to: [number, number] = from
  ) => {
    pointer("pointerdown", target, ...from);
    pointer("pointermove", root, ...to);
    pointer("pointerup", root, ...to);
  };

  return {
    root,
    elements,
    host,
    controller,
    bridge,
    handlers,
    pointer,
    gesture,
  };
};

describe("PictureElementsEditorPreviewController", () => {
  it("selects a clicked element", () => {
    const { elements, handlers, gesture } = setup({
      configs: [{ type: "icon" }, { type: "icon" }],
    });
    gesture(elements[1], [100, 60]);
    expect(handlers.selectElement).toHaveBeenCalledWith(1);
    expect(handlers.moveElement).not.toHaveBeenCalled();
  });

  it("treats a move below the drag threshold as a click", () => {
    const { elements, handlers, gesture } = setup();
    gesture(elements[0], [100, 60], [102, 61]);
    expect(handlers.selectElement).toHaveBeenCalledWith(0);
    expect(handlers.moveElement).not.toHaveBeenCalled();
  });

  it("moves a dragged element by the pointer delta", () => {
    const { elements, handlers, gesture } = setup();
    gesture(elements[0], [100, 60], [140, 90]);
    // +40px of 400px and +30px of 300px from 25%/20%.
    expect(handlers.moveElement).toHaveBeenCalledWith(0, { left: 35, top: 30 });
    expect(elements[0].style.left).toBe("35%");
    expect(handlers.selectElement).not.toHaveBeenCalled();
  });

  it("keeps a dragged element on the image", () => {
    const { elements, handlers, gesture } = setup();
    gesture(elements[0], [100, 60], [-500, 900]);
    expect(handlers.moveElement).toHaveBeenCalledWith(0, { left: 0, top: 100 });
  });

  describe("elements placed from the right or bottom", () => {
    // 300px from the right and 240px from the bottom, where left/top put it.
    // The card's transform centers an element on its left/top point only, so
    // from the right or bottom its center is its own size further left or up.
    const setupFrom = (style: Record<string, string>) => {
      const test = setup({ configs: [{ type: "icon", style }] });
      const element = test.elements[0];
      element.style.right = "300px";
      element.style.bottom = "240px";
      element.getBoundingClientRect = () =>
        new DOMRect(style.right ? 64 : 88, style.bottom ? 24 : 48, 24, 24);
      return test;
    };

    it.each([
      [
        { right: "75%", bottom: "80%" },
        { right: 65, bottom: 70 },
      ],
      [
        { left: "25%", bottom: "80%" },
        { left: 35, bottom: 70 },
      ],
      [
        { right: "75%", top: "20%" },
        { right: 65, top: 30 },
      ],
    ])("moves an element styled %j along its sides", (style, moved) => {
      const { elements, handlers, gesture } = setupFrom(style);
      // +40px of 400px and +30px of 300px.
      gesture(elements[0], [100, 60], [140, 90]);
      expect(handlers.moveElement).toHaveBeenCalledWith(0, moved);
      for (const [prop, value] of Object.entries(moved)) {
        expect(elements[0].style.getPropertyValue(prop)).toBe(`${value}%`);
      }
    });

    // The center goes from 19%/12% to the top left or bottom right corner.
    it.each([
      [[-500, -500], { right: 94, bottom: 92 }],
      [[900, 900], { right: -6, bottom: -8 }],
    ])(
      "keeps the center of an element dragged to %j on the image",
      (to, moved) => {
        const { elements, handlers, gesture } = setupFrom({
          right: "75%",
          bottom: "80%",
        });
        gesture(elements[0], [100, 60], to as [number, number]);
        expect(handlers.moveElement).toHaveBeenCalledWith(0, moved);
      }
    );

    it("moves an element placed past a side of the image", () => {
      const { elements, handlers, gesture } = setupFrom({
        right: "-5%",
        top: "20%",
      });
      // 20px past the right side, which puts its center 4px inside.
      elements[0].style.right = "-20px";
      elements[0].getBoundingClientRect = () => new DOMRect(384, 48, 24, 24);
      gesture(elements[0], [396, 60], [388, 60]);
      expect(handlers.moveElement).toHaveBeenCalledWith(0, {
        right: -3,
        top: 20,
      });
    });

    it("moves the element's center to a click on the image", () => {
      const { root, bridge, handlers, gesture } = setupFrom({
        right: "75%",
        bottom: "80%",
      });
      bridge.setState(true, 0);
      // From 19%/12% to 50%/25%.
      gesture(root, [200, 75]);
      expect(handlers.moveElement).toHaveBeenCalledWith(0, {
        right: 44,
        bottom: 67,
      });
    });

    it("puts an element back when the drag is cancelled", () => {
      const { root, elements, pointer } = setupFrom({
        right: "75%",
        bottom: "80%",
      });
      pointer("pointerdown", elements[0], 100, 60);
      pointer("pointermove", root, 140, 90);
      pointer("pointercancel", root, 140, 90);
      expect(elements[0].style.right).toBe("75%");
      expect(elements[0].style.bottom).toBe("80%");
      expect(elements[0].style.left).toBe("100px");
      expect(elements[0].style.top).toBe("60px");
    });
  });

  it("only drags a large overlay once it is selected", () => {
    const { elements, bridge, handlers, gesture } = setup();
    elements[0].getBoundingClientRect = () => new DOMRect(0, 0, 400, 300);
    gesture(elements[0], [100, 60], [140, 90]);
    expect(handlers.moveElement).not.toHaveBeenCalled();
    expect(elements[0].style.left).toBe("100px");

    bridge.setState(true, 0);
    gesture(elements[0], [100, 60], [140, 90]);
    expect(handlers.moveElement).toHaveBeenCalledWith(0, { left: 35, top: 30 });
  });

  it("never drags elements it can't write back", () => {
    const { elements, handlers, gesture } = setup({
      configs: [
        { type: "conditional" },
        { type: "icon", style: { left: "5%", right: "5%" } },
        { type: "icon", style: { left: "100px" } },
      ],
    });
    elements.forEach((el) => gesture(el, [100, 60], [160, 60]));
    expect(handlers.moveElement).not.toHaveBeenCalled();
    expect(elements.map((el) => el.style.left)).toEqual([
      "100px",
      "100px",
      "100px",
    ]);
  });

  it("selects a conditional through its child", () => {
    const { elements, handlers, gesture } = setup({
      configs: [{ type: "conditional" }],
    });
    const child = document.createElement("div");
    elements[0].appendChild(child);
    gesture(child, [100, 60]);
    expect(handlers.selectElement).toHaveBeenCalledWith(0);
  });

  it("puts an element back when the drag is cancelled", () => {
    const { root, elements, handlers, pointer } = setup({
      configs: [{ type: "icon", style: { left: "25%" } }],
    });
    pointer("pointerdown", elements[0], 100, 60);
    pointer("pointermove", root, 140, 90);
    pointer("pointercancel", root, 140, 90);
    expect(elements[0].style.left).toBe("25%");
    expect(elements[0].style.top).toBe("");
    expect(handlers.moveElement).not.toHaveBeenCalled();
  });

  it("puts an element back whose sides changed during the drag", () => {
    const configs: LovelaceElementConfig[] = [
      { type: "icon", style: { left: "25%", top: "20%" } },
    ];
    const { root, elements, handlers, pointer } = setup({ configs });
    pointer("pointerdown", elements[0], 100, 60);
    pointer("pointermove", root, 140, 90);
    configs[0] = { type: "icon", style: { right: "75%", top: "20%" } };
    pointer("pointerup", root, 140, 90);
    expect(handlers.moveElement).not.toHaveBeenCalled();
    expect(elements[0].style.left).toBe("");
    expect(elements[0].style.top).toBe("20%");
  });

  it("puts an element placed at a YAML zero back when cancelled", () => {
    const { root, elements, pointer } = setup({
      configs: [{ type: "icon", style: { left: 0 as never, top: "20%" } }],
    });
    elements[0].style.left = "0";
    pointer("pointerdown", elements[0], 0, 60);
    pointer("pointermove", root, 40, 90);
    pointer("pointercancel", root, 40, 90);
    expect(elements[0].style.left).toBe("0px");
    expect(elements[0].style.top).toBe("20%");
  });

  it("cancels a drag whose release went missing", () => {
    const { root, elements, handlers, pointer } = setup();
    pointer("pointerdown", elements[0], 100, 60);
    pointer("pointermove", root, 140, 90);
    pointer("pointermove", root, 180, 90, { buttons: 0 });
    pointer("pointerup", root, 180, 90);
    expect(elements[0].style.left).toBe("");
    expect(handlers.moveElement).not.toHaveBeenCalled();
  });

  it("drops a drag when the visual editor goes away meanwhile", () => {
    const { root, elements, bridge, handlers, pointer } = setup();
    pointer("pointerdown", elements[0], 100, 60);
    pointer("pointermove", root, 140, 90);
    bridge.setState(false);
    pointer("pointermove", root, 180, 90);
    expect(elements[0].style.left).toBe("");
    pointer("pointerup", root, 180, 90);
    expect(elements[0].style.left).toBe("");
    expect(handlers.moveElement).not.toHaveBeenCalled();
  });

  it("moves the selected element's center to a click on the image", () => {
    const { root, bridge, handlers, gesture } = setup();
    gesture(root, [200, 75]);
    expect(handlers.moveElement).not.toHaveBeenCalled();

    bridge.setState(true, 0);
    gesture(root, [200, 75]);
    expect(handlers.moveElement).toHaveBeenCalledWith(0, { left: 50, top: 25 });
  });

  describe("an image with a fractional size", () => {
    // Its height is its width times the aspect ratio, while offsetWidth and
    // offsetHeight stay rounded to 400x300. The element is at 25%/25%.
    const setupFractional = (selectedIndex?: number) => {
      const test = setup({ selectedIndex });
      test.root.style.width = "399.5px";
      test.root.style.height = "300.5px";
      test.root.getBoundingClientRect = () => new DOMRect(0, 0, 399.5, 300.5);
      const element = test.elements[0];
      element.style.left = "99.875px";
      element.style.top = "75.125px";
      element.getBoundingClientRect = () => new DOMRect(87.875, 63.125, 24, 24);
      return test;
    };

    it("moves the selected element's center exactly to a click", () => {
      const { root, handlers, gesture } = setupFractional(0);
      gesture(root, [99.875, 75.125]);
      expect(handlers.moveElement).toHaveBeenCalledWith(0, {
        left: 25,
        top: 25,
      });
    });

    it("stops a dragged element exactly at a side of the image", () => {
      const { elements, handlers, gesture } = setupFractional();
      gesture(elements[0], [99.875, 75.125], [-500, 75.125]);
      expect(handlers.moveElement).toHaveBeenCalledWith(0, {
        left: 0,
        top: 25,
      });
    });
  });

  describe("an image scaled by an ancestor", () => {
    // Laid out at 400x300 px but shown at 320x240 px, like under scale(0.8).
    // The element's computed left/top stay in layout px (25%/20%), while its
    // rect is scaled like the image's.
    const setupScaled = (selectedIndex?: number) => {
      const test = setup({
        configs: [{ type: "icon", style: { left: "25%", top: "20%" } }],
        selectedIndex,
      });
      test.root.getBoundingClientRect = () => new DOMRect(0, 0, 320, 240);
      test.elements[0].getBoundingClientRect = () =>
        new DOMRect(72, 40, 16, 16);
      return test;
    };

    it("moves the selected element's center to a click", () => {
      const { root, handlers, gesture } = setupScaled(0);
      gesture(root, [160, 120]);
      expect(handlers.moveElement).toHaveBeenCalledWith(0, {
        left: 50,
        top: 50,
      });
    });

    it("moves a dragged element by the pointer delta", () => {
      const { elements, handlers, gesture } = setupScaled();
      // +40 of 320 visual px.
      gesture(elements[0], [80, 48], [120, 48]);
      expect(handlers.moveElement).toHaveBeenCalledWith(0, {
        left: 37.5,
        top: 20,
      });
      expect(elements[0].style.left).toBe("37.5%");
    });
  });

  it("leaves elements alone while the image has no height", () => {
    const { root, elements, handlers, gesture } = setup({ selectedIndex: 0 });
    root.style.height = "0px";
    root.getBoundingClientRect = () => new DOMRect(0, 0, 400, 0);
    gesture(elements[0], [100, 60], [140, 90]);
    gesture(root, [200, 0]);
    expect(handlers.moveElement).not.toHaveBeenCalled();
    expect(elements[0].style.left).toBe("100px");
  });

  it("leaves a selected element alone while it is hidden", () => {
    const { root, elements, handlers, gesture } = setup({
      configs: [{ type: "icon", style: { left: "50%", top: "50%" } }],
      selectedIndex: 0,
    });
    // With display: none it has no layout, and its computed left/top stay in
    // percent.
    elements[0].style.left = "50%";
    elements[0].style.top = "50%";
    elements[0].getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
    elements[0].getClientRects = () => [] as unknown as DOMRectList;
    gesture(root, [200, 75]);
    gesture(elements[0], [0, 0], [40, 30]);
    expect(handlers.moveElement).not.toHaveBeenCalled();
    expect(elements[0].style.left).toBe("50%");
  });

  it("ignores a drag across the image", () => {
    const { root, handlers, gesture } = setup({ selectedIndex: 0 });
    gesture(root, [200, 75], [500, -20]);
    expect(handlers.moveElement).not.toHaveBeenCalled();
  });

  it("ignores ctrl-clicks, which open the context menu on macOS", () => {
    const { elements, handlers, pointer } = setup();
    const press = vi.fn();
    elements[0].addEventListener("pointerdown", press);
    pointer("pointerdown", elements[0], 100, 60, { ctrlKey: true });
    pointer("pointerup", elements[0], 100, 60);
    expect(handlers.selectElement).not.toHaveBeenCalled();
    expect(press).not.toHaveBeenCalled();
  });

  it("selects a focused element with Enter but leaves text fields alone", () => {
    const { elements, handlers } = setup();
    const enter = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    elements[0].dispatchEvent(enter);
    expect(handlers.selectElement).toHaveBeenCalledWith(0);
    expect(enter.defaultPrevented).toBe(true);

    const input = document.createElement("input");
    elements[0].appendChild(input);
    const space = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(space);
    expect(handlers.selectElement).toHaveBeenCalledTimes(1);
    expect(space.defaultPrevented).toBe(false);
  });

  it("selects an element activated by a click alone", () => {
    const { elements, handlers } = setup({
      configs: [{ type: "icon" }, { type: "icon" }],
    });
    elements[1].click();
    expect(handlers.selectElement).toHaveBeenCalledWith(1);
  });

  it("keeps element actions from running while editing", () => {
    const { elements } = setup();
    const action = vi.fn();
    elements[0].addEventListener("click", action);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    elements[0].dispatchEvent(click);
    expect(action).not.toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(true);
  });

  describe("size changes", () => {
    let observed: Set<Element>;
    let notify: () => void;

    beforeEach(() => {
      observed = new Set();
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(callback: ResizeObserverCallback) {
            notify = () => callback([], this as unknown as ResizeObserver);
          }

          observe(target: Element) {
            observed.add(target);
          }

          disconnect() {
            observed.clear();
          }
        }
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("watches the image and its elements while editing", () => {
      const { root, elements, host, controller } = setup();
      controller.hostUpdated();
      expect(observed).toEqual(new Set([root, ...elements]));
      host.requestUpdate.mockClear();
      notify();
      expect(host.requestUpdate).toHaveBeenCalled();
    });

    it("watches again after the card was moved", () => {
      const { root, elements, controller } = setup();
      controller.hostUpdated();
      controller.hostDisconnected();
      expect(observed.size).toBe(0);
      controller.hostConnected();
      controller.hostUpdated();
      expect(observed).toEqual(new Set([root, ...elements]));
    });

    it("stops watching when editing stops", () => {
      const { controller, bridge } = setup();
      controller.hostUpdated();
      bridge.setState(false);
      controller.hostUpdated();
      expect(observed.size).toBe(0);
    });
  });

  it("leaves the card alone while the visual editor is hidden", () => {
    const { elements, handlers, gesture } = setup({ active: false });
    const action = vi.fn();
    elements[0].addEventListener("click", action);
    gesture(elements[0], [100, 60], [140, 90]);
    elements[0].click();
    expect(action).toHaveBeenCalled();
    expect(handlers.selectElement).not.toHaveBeenCalled();
    expect(handlers.moveElement).not.toHaveBeenCalled();
    expect(elements[0].style.left).toBe("100px");
  });
});
