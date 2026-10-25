import type { ReactiveController, ReactiveControllerHost } from "lit";
import type {
  LovelaceElement,
  LovelaceElementConfig,
} from "../../elements/types";
import type { PictureElementsEditorBridge } from "./editor-bridge";
import { isMovableElement } from "./movable-element";

// How far (px) a press has to move before it counts as a drag.
const DRAG_THRESHOLD = 4;

// Elements covering more of the image than this (like a floor plan overlay)
// only drag once selected, so that clicks on them don't move them by accident.
const LARGE_ELEMENT_SHARE = 0.5;

export interface EditorPreviewTarget {
  // The container the elements are positioned in.
  root?: HTMLElement;
  // The rendered top-level elements and their configs, index-aligned.
  elements?: LovelaceElement[];
  configs?: LovelaceElementConfig[];
}

// A press on the preview, which ends as a click or a drag.
interface Press {
  pointerId: number;
  clientX: number;
  clientY: number;
  index?: number;
  // Start position (percent) of a movable element.
  start?: { left: number; top: number };
  // Current position (percent) once an element is dragged.
  moved?: { left: number; top: number };
  // The pointer left the threshold, so the press is no click.
  dragged?: boolean;
}

const capture = <T extends Event>(
  handleEvent: (ev: T) => void,
  passive?: boolean
) => ({ handleEvent, capture: true, passive });

/**
 * Makes a picture-elements card editable while it is the preview of the card
 * editor: a click on an element selects it, a drag moves it, and a click on
 * the image positions the selected element. The elements' own actions don't
 * run meanwhile. The host binds the listeners and the `editing`/`dragging`
 * classes on the elements' container; this controller marks the `selected`
 * and `movable` (draggable right away) elements.
 */
export class PictureElementsEditorPreviewController implements ReactiveController {
  private _host: ReactiveControllerHost & { preview: boolean };

  private _target: () => EditorPreviewTarget;

  private _bridge?: PictureElementsEditorBridge;

  private _connected = false;

  private _press?: Press;

  // The elements the classes were last set on while editing.
  private _marked?: LovelaceElement[];

  // Sizes decide what is movable and change as images load, without a host
  // update.
  private _resizeObserver?: ResizeObserver;

  private _observed?: Pick<EditorPreviewTarget, "root" | "elements">;

  constructor(
    host: ReactiveControllerHost & { preview: boolean },
    target: () => EditorPreviewTarget
  ) {
    this._host = host;
    this._target = target;
    host.addController(this);
  }

  public set bridge(bridge: PictureElementsEditorBridge | undefined) {
    if (bridge === this._bridge) {
      return;
    }
    if (this._connected) {
      this._bridge?.removeEventListener("changed", this._bridgeChanged);
      bridge?.addEventListener("changed", this._bridgeChanged);
    }
    this._bridge = bridge;
    this._host.requestUpdate();
  }

  public get editing(): boolean {
    return !!this._editor;
  }

  public get dragging(): boolean {
    return !!this._press?.moved;
  }

  public hostConnected(): void {
    this._connected = true;
    this._bridge?.addEventListener("changed", this._bridgeChanged);
    // The editor may have changed meanwhile.
    this._host.requestUpdate();
  }

  public hostDisconnected(): void {
    this._connected = false;
    this._bridge?.removeEventListener("changed", this._bridgeChanged);
    this._observe(undefined);
  }

  public hostUpdated(): void {
    const { root, elements } = this._target();
    const editor = this._editor;
    this._observe(editor ? { root, elements } : undefined);
    if (!editor && this._marked !== elements) {
      return;
    }
    this._marked = editor ? elements : undefined;
    elements?.forEach((element, index) => {
      element.classList.toggle(
        "selected",
        !!editor && index === editor.selectedIndex
      );
      element.classList.toggle(
        "movable",
        !!editor && !!root && this._canDrag(root, index, editor)
      );
    });
  }

  private _bridgeChanged = (): void => {
    this._host.requestUpdate();
  };

  private _observe(
    targets: Pick<EditorPreviewTarget, "root" | "elements"> | undefined
  ): void {
    const observed = this._observed;
    if (
      observed?.root === targets?.root &&
      observed?.elements === targets?.elements
    ) {
      return;
    }
    this._resizeObserver?.disconnect();
    this._observed = targets;
    if (!targets || typeof ResizeObserver === "undefined") {
      return;
    }
    this._resizeObserver ??= new ResizeObserver(() =>
      this._host.requestUpdate()
    );
    for (const target of [targets.root, ...(targets.elements ?? [])]) {
      if (target) {
        this._resizeObserver.observe(target);
      }
    }
  }

  private get _editor(): PictureElementsEditorBridge | undefined {
    return this._host.preview && this._bridge?.active
      ? this._bridge
      : undefined;
  }

  // Index of the top-level element the event happened on.
  private _elementIndex(ev: Event): number | undefined {
    const { elements } = this._target();
    for (const node of ev.composedPath()) {
      if (node === ev.currentTarget) {
        break;
      }
      const index = elements?.indexOf(node as LovelaceElement) ?? -1;
      if (index !== -1) {
        return index;
      }
    }
    return undefined;
  }

  // Bound in the capture phase, so the elements don't see the press.
  public pointerDown = capture((ev: PointerEvent): void => {
    const root = ev.currentTarget as HTMLElement;
    const editor = this._editor;
    if (!editor) {
      return;
    }
    ev.stopPropagation();
    if (!ev.isPrimary || ev.button !== 0 || ev.ctrlKey) {
      return;
    }
    ev.preventDefault();
    const index = this._elementIndex(ev);
    root.setPointerCapture(ev.pointerId);
    this._press = {
      pointerId: ev.pointerId,
      clientX: ev.clientX,
      clientY: ev.clientY,
      index,
      start:
        index !== undefined && this._canDrag(root, index, editor)
          ? this._position(root, index)
          : undefined,
    };
  });

  private _canDrag(
    root: HTMLElement,
    index: number,
    editor: PictureElementsEditorBridge
  ): boolean {
    const { elements, configs } = this._target();
    if (!configs?.[index] || !isMovableElement(configs[index])) {
      return false;
    }
    if (index === editor.selectedIndex) {
      return true;
    }
    const rect = elements![index].getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    return (
      rect.width * rect.height <=
      rootRect.width * rootRect.height * LARGE_ELEMENT_SHARE
    );
  }

  // The element's left/top in percent, as laid out.
  private _position(root: HTMLElement, index: number): Press["start"] {
    if (!root.offsetWidth || !root.offsetHeight) {
      return undefined;
    }
    const style = getComputedStyle(this._target().elements![index]);
    return {
      left: (parseFloat(style.left) / root.offsetWidth) * 100,
      top: (parseFloat(style.top) / root.offsetHeight) * 100,
    };
  }

  public pointerMove = (ev: PointerEvent): void => {
    const press = this._press;
    if (!press || ev.pointerId !== press.pointerId) {
      return;
    }
    // The release went missing (like to a context menu), or the visual editor
    // went away.
    if (!ev.buttons || !this._editor) {
      this.pointerCancel(ev);
      return;
    }
    const dx = ev.clientX - press.clientX;
    const dy = ev.clientY - press.clientY;
    if (!press.dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
      return;
    }
    press.dragged = true;
    if (!press.start || press.index === undefined) {
      return;
    }
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const wasMoved = !!press.moved;
    press.moved = {
      left: clampPercent(press.start.left + (dx / rect.width) * 100),
      top: clampPercent(press.start.top + (dy / rect.height) * 100),
    };
    const element = this._target().elements?.[press.index];
    element?.style.setProperty("left", `${press.moved.left}%`);
    element?.style.setProperty("top", `${press.moved.top}%`);
    if (!wasMoved) {
      this._host.requestUpdate();
    }
  };

  public pointerUp = (ev: PointerEvent): void => {
    const press = this._press;
    if (!press || ev.pointerId !== press.pointerId) {
      return;
    }
    const editor = this._editor;
    if (!editor) {
      this.pointerCancel(ev);
      return;
    }
    this._endPress();
    if (press.index !== undefined && press.moved) {
      editor.handlers.moveElement(
        press.index,
        press.moved.left,
        press.moved.top
      );
    } else if (press.dragged) {
      // A drag that moved nothing is no click.
    } else if (press.index !== undefined) {
      editor.handlers.selectElement(press.index);
    } else {
      const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
      editor.handlers.clickImage(
        clampPercent(((ev.clientX - rect.left) / rect.width) * 100),
        clampPercent(((ev.clientY - rect.top) / rect.height) * 100)
      );
    }
  };

  // Also bound to lostpointercapture.
  public pointerCancel = (ev: PointerEvent): void => {
    const press = this._press;
    if (!press || ev.pointerId !== press.pointerId) {
      return;
    }
    this._endPress();
    if (press.index === undefined || !press.moved) {
      return;
    }
    // Put the element back where its config places it.
    const { elements, configs } = this._target();
    const element = elements?.[press.index];
    const style = configs?.[press.index]?.style;
    for (const prop of ["left", "top"]) {
      if (style?.[prop] != null && style[prop] !== "") {
        element?.style.setProperty(prop, style[prop]);
      } else {
        element?.style.removeProperty(prop);
      }
    }
  };

  private _endPress(): void {
    const wasMoved = !!this._press?.moved;
    this._press = undefined;
    if (wasMoved) {
      this._host.requestUpdate();
    }
  }

  // Bound in the capture phase, before the elements' own key handling.
  public keyDown = capture((ev: KeyboardEvent): void => {
    const editor = this._editor;
    if (!editor || (ev.key !== "Enter" && ev.key !== " ")) {
      return;
    }
    if (isEditable(ev.composedPath()[0])) {
      return;
    }
    const index = this._elementIndex(ev);
    if (index === undefined) {
      return;
    }
    ev.stopPropagation();
    ev.preventDefault();
    editor.handlers.selectElement(index);
  });

  // Bound in the capture phase to the events that run element actions.
  public blockAction = capture((ev: Event): void => {
    const editor = this._editor;
    if (!editor) {
      return;
    }
    ev.stopPropagation();
    // Stop navigation, the context menu and native image drags.
    ev.preventDefault();
    // Assistive technology can activate an element with a click alone. Clicks
    // after a press land on the root, as it captures the pointer.
    const index = ev.type === "click" ? this._elementIndex(ev) : undefined;
    if (index !== undefined) {
      editor.handlers.selectElement(index);
    }
  });

  // Passive, so that touch scrolling stays smooth on dashboards.
  public blockTouch = capture((ev: TouchEvent): void => {
    if (this._editor) {
      ev.stopPropagation();
    }
  }, true);
}

const clampPercent = (value: number): number =>
  Math.min(100, Math.max(0, value));

const isEditable = (node: EventTarget | undefined): boolean =>
  node instanceof HTMLInputElement ||
  node instanceof HTMLTextAreaElement ||
  node instanceof HTMLSelectElement ||
  (node instanceof HTMLElement && node.isContentEditable);
