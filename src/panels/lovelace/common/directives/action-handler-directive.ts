import type { AttributePart } from "lit";
import { noChange } from "lit";
import { customElement } from "lit/decorators";
import type { DirectiveParameters } from "lit/directive";
import { directive, Directive } from "lit/directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { deepEqual } from "../../../../common/util/deep-equal";
import type {
  ActionHandlerDetail,
  ActionHandlerOptions,
  ActionHandlerResolution,
} from "../../../../data/lovelace/action_handler";
import { isTouch } from "../../../../util/is_touch";

interface ActionHandlerType extends HTMLElement {
  holdTime: number;
  bind(element: Element, options?: ActionHandlerOptions): void;
}
interface ActionHandlerElement extends HTMLElement {
  actionHandler?: {
    options: ActionHandlerOptions;
    start?: (ev: Event) => void;
    end?: (ev: Event) => void;
    handleKeyDown?: (ev: KeyboardEvent) => void;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "action-handler": ActionHandler;
  }
  interface HASSDomEvents {
    action: ActionHandlerDetail;
  }
}

const DOUBLE_CLICK_TIME = 250;

// The coordinates of the pointer that changed: for touch events the finger
// that just went down/up (touches[0] would be the *first* finger during a
// multi-touch), for mouse events the pointer itself.
const eventCoordinates = (ev: Event): { x: number; y: number } => {
  const touch = (ev as TouchEvent).changedTouches?.[0];
  return touch
    ? { x: touch.clientX, y: touch.clientY }
    : { x: (ev as MouseEvent).clientX, y: (ev as MouseEvent).clientY };
};

const activeTouchCount = (ev: Event): number =>
  (ev as TouchEvent).touches?.length ?? 0;

@customElement("action-handler")
class ActionHandler extends HTMLElement implements ActionHandlerType {
  public holdTime = 500;

  protected timer?: number;

  protected held = false;

  private cancelled = false;

  private dblClickTimeout?: number;

  // The double-tap window only pairs two taps on the same target; a quick tap
  // on a different target starts its own window instead of completing one.
  private dblClickTarget?: HTMLElement;

  // The delegated target of the gesture in flight on a container binding
  // (options.resolve); undefined while no resolved gesture is active.
  private resolved?: ActionHandlerResolution;

  // eslint-disable-next-line lit/lifecycle-super -- not a LitElement
  public connectedCallback() {
    Object.assign(this.style, {
      position: "fixed",
      width: isTouch ? "100px" : "50px",
      height: isTouch ? "100px" : "50px",
      transform: "translate(-50%, -50%) scale(0)",
      pointerEvents: "none",
      zIndex: "999",
      background: "var(--primary-color)",
      display: null,
      opacity: "0.2",
      borderRadius: "50%",
      transition: "transform 180ms ease-in-out",
    });

    [
      "touchcancel",
      "mouseout",
      "mouseup",
      "touchmove",
      "mousewheel",
      "wheel",
      "scroll",
    ].forEach((ev) => {
      document.addEventListener(
        ev,
        () => {
          this.cancelled = true;
          if (this.timer) {
            this._stopAnimation();
            clearTimeout(this.timer);
            this.timer = undefined;
          }
        },
        { passive: true }
      );
    });
  }

  public bind(
    element: ActionHandlerElement,
    options: ActionHandlerOptions = {}
  ) {
    if (
      element.actionHandler &&
      deepEqual(options, element.actionHandler.options)
    ) {
      return;
    }

    if (element.actionHandler) {
      element.removeEventListener("touchstart", element.actionHandler.start!);
      element.removeEventListener("touchend", element.actionHandler.end!);
      element.removeEventListener("touchcancel", element.actionHandler.end!);

      element.removeEventListener("mousedown", element.actionHandler.start!);
      element.removeEventListener("click", element.actionHandler.end!);

      element.removeEventListener(
        "keydown",
        element.actionHandler.handleKeyDown!
      );
    } else if (options.resolve) {
      // A container binding suppresses the context menu only while it owns a
      // gesture (a touch long-press); a plain right-click keeps its menu.
      element.addEventListener("contextmenu", (ev: Event) => {
        if (!this.resolved) {
          return;
        }
        ev.preventDefault();
        ev.stopPropagation();
      });
    } else {
      element.addEventListener("contextmenu", (ev: Event) => {
        const e = ev || window.event;
        if (e.preventDefault) {
          e.preventDefault();
        }
        if (e.stopPropagation) {
          e.stopPropagation();
        }
        e.cancelBubble = true;
        e.returnValue = false;
        return false;
      });
    }

    element.actionHandler = { options };

    if (options.disabled) {
      return;
    }

    element.actionHandler.start = (ev: Event) => {
      this.cancelled = false;
      const { x, y } = eventCoordinates(ev);

      if (options.resolve) {
        this.resolved = undefined;
        // More than one finger is a pinch or scroll, not a gesture.
        if (activeTouchCount(ev) > 1) {
          if (this.timer) {
            this._stopAnimation();
            clearTimeout(this.timer);
            this.timer = undefined;
          }
          return;
        }
        const resolution = options.resolve(x, y, ev);
        if (!resolution) {
          return;
        }
        this.resolved = resolution;
      } else {
        this.resolved = undefined;
      }

      const opts = options.resolve ? this.resolved!.options : options;
      if (opts.hasHold) {
        this.held = false;
        this.timer = window.setTimeout(() => {
          this._startAnimation(x, y);
          this.held = true;
        }, this.holdTime);
      }
    };

    element.actionHandler.end = (ev: Event) => {
      // Don't respond when moved or scrolled while touch
      if (
        ev.type === "touchcancel" ||
        (ev.type === "touchend" && this.cancelled)
      ) {
        if (options.resolve) {
          this.resolved = undefined;
        }
        return;
      }

      let target = ev.target as HTMLElement;
      let opts = options;
      if (options.resolve) {
        const resolved = this.resolved;
        // Only handle gestures the resolver claimed at their start (not a
        // click bubbling from an interactive child or keyboard activation).
        if (!resolved) {
          return;
        }
        // An end while other fingers remain belongs to a pinch or scroll:
        // drop the claimed gesture so lifting the last finger cannot fire a
        // stray tap from what was a multi-touch gesture.
        if (activeTouchCount(ev) > 0) {
          this.resolved = undefined;
          if (this.timer) {
            this._stopAnimation();
            clearTimeout(this.timer);
            this.timer = undefined;
          }
          return;
        }
        this.resolved = undefined;
        // The release must still resolve to the same target, so dragging
        // away from the press target aborts, as it does on a per-element
        // binding where the click never reaches the element.
        const { x, y } = eventCoordinates(ev);
        if (options.resolve(x, y, ev)?.target !== resolved.target) {
          if (this.timer) {
            this._stopAnimation();
            clearTimeout(this.timer);
            this.timer = undefined;
          }
          return;
        }
        target = resolved.target;
        opts = resolved.options;
      }

      // Prevent mouse event if touch event
      if (ev.cancelable) {
        ev.preventDefault();
      }
      if (opts.hasHold) {
        clearTimeout(this.timer);
        this._stopAnimation();
        this.timer = undefined;
      }
      if (opts.hasHold && this.held) {
        fireEvent(target, "action", { action: "hold" });
      } else if (opts.hasDoubleClick) {
        if (
          (ev.type === "click" && (ev as MouseEvent).detail < 2) ||
          !this.dblClickTimeout ||
          this.dblClickTarget !== target
        ) {
          const timeoutId = window.setTimeout(() => {
            // Only clear the shared pending state if a later tap has not
            // re-armed it for another target.
            if (this.dblClickTimeout === timeoutId) {
              this.dblClickTimeout = undefined;
              this.dblClickTarget = undefined;
            }
            if (opts.hasTap !== false) {
              fireEvent(target, "action", { action: "tap" });
            }
          }, DOUBLE_CLICK_TIME);
          this.dblClickTimeout = timeoutId;
          this.dblClickTarget = target;
        } else {
          clearTimeout(this.dblClickTimeout);
          this.dblClickTimeout = undefined;
          this.dblClickTarget = undefined;
          fireEvent(target, "action", { action: "double_tap" });
        }
      } else if (opts.hasTap !== false) {
        fireEvent(target, "action", { action: "tap" });
      }
    };

    element.actionHandler.handleKeyDown = (ev: KeyboardEvent) => {
      if (!["Enter", " "].includes(ev.key)) {
        return;
      }
      (ev.currentTarget as ActionHandlerElement).actionHandler!.end!(ev);
    };

    if (!options.keyboardOnly) {
      element.addEventListener("touchstart", element.actionHandler.start, {
        passive: true,
      });
      element.addEventListener("touchend", element.actionHandler.end);
      element.addEventListener("touchcancel", element.actionHandler.end);

      element.addEventListener("mousedown", element.actionHandler.start, {
        passive: true,
      });
      element.addEventListener("click", element.actionHandler.end);
    }

    element.addEventListener("keydown", element.actionHandler.handleKeyDown);
  }

  private _startAnimation(x: number, y: number) {
    Object.assign(this.style, {
      left: `${x}px`,
      top: `${y}px`,
      transform: "translate(-50%, -50%) scale(1)",
    });
  }

  private _stopAnimation() {
    Object.assign(this.style, {
      left: null,
      top: null,
      transform: "translate(-50%, -50%) scale(0)",
    });
  }
}

const getActionHandler = (): ActionHandlerType => {
  const body = document.body;
  if (body.querySelector("action-handler")) {
    return body.querySelector("action-handler") as ActionHandlerType;
  }

  const actionhandler = document.createElement("action-handler");
  body.appendChild(actionhandler);

  return actionhandler as ActionHandlerType;
};

export const actionHandlerBind = (
  element: ActionHandlerElement,
  options?: ActionHandlerOptions
) => {
  const actionhandler: ActionHandlerType = getActionHandler();
  if (!actionhandler) {
    return;
  }
  actionhandler.bind(element, options);
};

export const actionHandler = directive(
  class extends Directive {
    update(part: AttributePart, [options]: DirectiveParameters<this>) {
      actionHandlerBind(part.element as ActionHandlerElement, options);
      return noChange;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    render(_options?: ActionHandlerOptions) {}
  }
);
