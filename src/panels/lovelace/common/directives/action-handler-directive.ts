import { directive, PropertyPart } from "lit-html";
import "@material/mwc-ripple";
import {
  ActionHandlerOptions,
  ActionHandlerDetail,
} from "../../../../data/lovelace";
import { fireEvent } from "../../../../common/dom/fire_event";

const isTouch =
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0 ||
  navigator.msMaxTouchPoints > 0;

interface ActionHandler extends HTMLElement {
  holdTime: number;
  bind(element: Element, options): void;
}
interface ActionHandlerElement extends HTMLElement {
  actionHandler?: boolean;
}

declare global {
  interface HASSDomEvents {
    action: ActionHandlerDetail;
  }
}

class ActionHandler extends HTMLElement implements ActionHandler {
  public holdTime: number;
  public ripple: any;
  protected timer: number | undefined;
  protected held: boolean;
  protected cooldownStart: boolean;
  protected cooldownEnd: boolean;
  private dblClickTimeout: number | undefined;

  constructor() {
    super();
    this.holdTime = 500;
    this.ripple = document.createElement("mwc-ripple");
    this.timer = undefined;
    this.held = false;
    this.cooldownStart = false;
    this.cooldownEnd = false;
  }

  public connectedCallback() {
    Object.assign(this.style, {
      position: "absolute",
      width: isTouch ? "100px" : "50px",
      height: isTouch ? "100px" : "50px",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
    });

    this.appendChild(this.ripple);
    this.ripple.primary = true;

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
          clearTimeout(this.timer);
          this.stopAnimation();
          this.timer = undefined;
        },
        { passive: true }
      );
    });
  }

  public bind(element: ActionHandlerElement, options) {
    if (element.actionHandler) {
      return;
    }
    element.actionHandler = true;

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

    const clickStart = (ev: Event) => {
      if (this.cooldownStart) {
        return;
      }
      this.held = false;
      let x;
      let y;
      if ((ev as TouchEvent).touches) {
        x = (ev as TouchEvent).touches[0].pageX;
        y = (ev as TouchEvent).touches[0].pageY;
      } else {
        x = (ev as MouseEvent).pageX;
        y = (ev as MouseEvent).pageY;
      }

      this.timer = window.setTimeout(() => {
        this.startAnimation(x, y);
        this.held = true;
      }, this.holdTime);

      this.cooldownStart = true;
      window.setTimeout(() => (this.cooldownStart = false), 100);
    };

    const clickEnd = (ev: Event) => {
      if (
        this.cooldownEnd ||
        (["touchend", "touchcancel"].includes(ev.type) &&
          this.timer === undefined)
      ) {
        return;
      }
      clearTimeout(this.timer);
      this.stopAnimation();
      this.timer = undefined;
      if (this.held) {
        fireEvent(element, "action", { action: "hold" });
      } else if (options.hasDoubleClick) {
        if ((ev as MouseEvent).detail === 1 || ev.type === "keyup") {
          this.dblClickTimeout = window.setTimeout(() => {
            fireEvent(element, "action", { action: "tap" });
          }, 250);
        } else {
          clearTimeout(this.dblClickTimeout);
          fireEvent(element, "action", { action: "double_tap" });
        }
      } else {
        fireEvent(element, "action", { action: "tap" });
      }
      this.cooldownEnd = true;
      window.setTimeout(() => (this.cooldownEnd = false), 100);
    };

    const handleEnter = (ev: Event) => {
      if ((ev as KeyboardEvent).keyCode === 13) {
        return clickEnd(ev);
      }
    };

    element.addEventListener("touchstart", clickStart, { passive: true });
    element.addEventListener("touchend", clickEnd);
    element.addEventListener("touchcancel", clickEnd);
    element.addEventListener("keyup", handleEnter);

    // iOS 13 sends a complete normal touchstart-touchend series of events followed by a mousedown-click series.
    // That might be a bug, but until it's fixed, this should make action-handler work.
    // If it's not a bug that is fixed, this might need updating with the next iOS version.
    // Note that all events (both touch and mouse) must be listened for in order to work on computers with both mouse and touchscreen.
    const isIOS13 = /iPhone OS 13_/.test(window.navigator.userAgent);
    if (!isIOS13) {
      element.addEventListener("mousedown", clickStart, { passive: true });
      element.addEventListener("click", clickEnd);
    }
  }

  private startAnimation(x: number, y: number) {
    Object.assign(this.style, {
      left: `${x}px`,
      top: `${y}px`,
      display: null,
    });
    this.ripple.disabled = false;
    this.ripple.active = true;
    this.ripple.unbounded = true;
  }

  private stopAnimation() {
    this.ripple.active = false;
    this.ripple.disabled = true;
    this.style.display = "none";
  }
}

customElements.define("action-handler", ActionHandler);

const getActionHandler = (): ActionHandler => {
  const body = document.body;
  if (body.querySelector("action-handler")) {
    return body.querySelector("action-handler") as ActionHandler;
  }

  const actionhandler = document.createElement("action-handler");
  body.appendChild(actionhandler);

  return actionhandler as ActionHandler;
};

export const actionHandlerBind = (
  element: ActionHandlerElement,
  options: ActionHandlerOptions
) => {
  const actionhandler: ActionHandler = getActionHandler();
  if (!actionhandler) {
    return;
  }
  actionhandler.bind(element, options);
};

export const actionHandler = directive(
  (options: ActionHandlerOptions = {}) => (part: PropertyPart) => {
    actionHandlerBind(part.committer.element as ActionHandlerElement, options);
  }
);
