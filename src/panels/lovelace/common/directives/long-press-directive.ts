import { directive, PropertyPart } from "lit-html";
import "@material/mwc-ripple";

const isTouch =
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0 ||
  navigator.msMaxTouchPoints > 0;

interface LongPress extends HTMLElement {
  holdTime: number;
  bind(element: Element): void;
}
interface LongPressElement extends Element {
  longPress?: boolean;
}

class LongPress extends HTMLElement implements LongPress {
  public holdTime: number;
  protected ripple: any;
  protected timer: number | undefined;
  protected held: boolean;
  protected cooldownStart: boolean;
  protected cooldownEnd: boolean;

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

  public bind(element: LongPressElement) {
    if (element.longPress) {
      return;
    }
    element.longPress = true;

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
      if (this.cooldownEnd) {
        return;
      }
      clearTimeout(this.timer);
      this.stopAnimation();
      this.timer = undefined;
      if (this.held) {
        element.dispatchEvent(new Event("ha-hold"));
      } else {
        element.dispatchEvent(new Event("ha-click"));
      }
      this.cooldownEnd = true;
      window.setTimeout(() => (this.cooldownEnd = false), 100);
    };

    element.addEventListener("touchstart", clickStart);
    element.addEventListener("touchend", clickEnd);
    element.addEventListener("touchcancel", clickEnd);
    element.addEventListener("mousedown", clickStart);
    element.addEventListener("click", clickEnd);
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

customElements.define("long-press", LongPress);

const getLongPress = (): LongPress => {
  const body = document.body;
  if (body.querySelector("long-press")) {
    return body.querySelector("long-press") as LongPress;
  }

  const longpress = document.createElement("long-press");
  body.appendChild(longpress);

  return longpress as LongPress;
};

export const longPressBind = (element: LongPressElement) => {
  const longpress: LongPress = getLongPress();
  if (!longpress) {
    return;
  }
  longpress.bind(element);
};

export const longPress = () =>
  directive((part: PropertyPart) => {
    longPressBind(part.committer.element);
  });
