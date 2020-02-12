import { directive, PropertyPart } from "lit-html";
import "@material/mwc-ripple";
// tslint:disable-next-line
import { Ripple } from "@material/mwc-ripple";
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
  public holdTime = 500;
  public ripple: Ripple;
  protected timer?: number;
  protected held = false;
  protected touch?: boolean;
  private dblClickTimeout?: number;

  constructor() {
    super();
    this.ripple = document.createElement("mwc-ripple");
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

    const touchStart = (ev: TouchEvent) => {
      if (this.touch === false) {
        return;
      }
      this.touch = true;
      start(ev);
    };

    const clickStart = (ev: MouseEvent) => {
      if (this.touch === true) {
        return;
      }
      this.touch = false;
      start(ev);
    };

    const start = (ev: Event) => {
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
    };

    const touchEnd = (ev: TouchEvent) => {
      if (this.touch === false) {
        return;
      }
      end(ev);
    };

    const clickEnd = (ev: MouseEvent) => {
      if (this.touch === true) {
        return;
      }
      end(ev);
    };

    const handleEnter = (ev: KeyboardEvent) => {
      if (this.touch === true || ev.keyCode !== 13) {
        return;
      }
      this.touch = false;
      end(ev);
    };

    const end = (ev: Event) => {
      if (
        ["touchend", "touchcancel"].includes(ev.type) &&
        this.timer === undefined
      ) {
        return;
      }
      clearTimeout(this.timer);
      this.stopAnimation();
      this.timer = undefined;
      if (this.held) {
        fireEvent(element, "action", { action: "hold" });
      } else if (options.hasDoubleClick) {
        if (
          (ev.type === "click" && (ev as MouseEvent).detail < 2) ||
          !this.dblClickTimeout
        ) {
          this.dblClickTimeout = window.setTimeout(() => {
            this.dblClickTimeout = undefined;
            fireEvent(element, "action", { action: "tap" });
          }, 250);
        } else {
          clearTimeout(this.dblClickTimeout);
          this.dblClickTimeout = undefined;
          fireEvent(element, "action", { action: "double_tap" });
        }
      } else {
        fireEvent(element, "action", { action: "tap" });
      }
      window.setTimeout(() => (this.touch = undefined), this.holdTime);
    };

    element.addEventListener("touchstart", touchStart, { passive: true });
    element.addEventListener("touchend", touchEnd);
    element.addEventListener("touchcancel", touchEnd);

    element.addEventListener("mousedown", clickStart, { passive: true });
    element.addEventListener("click", clickEnd);

    element.addEventListener("keyup", handleEnter);
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
