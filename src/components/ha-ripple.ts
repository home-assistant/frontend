import { AttachableController } from "@material/web/internal/controller/attachable-controller";
import { MdRipple } from "@material/web/ripple/ripple";
import "element-internals-polyfill";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-ripple")
export class HaRipple extends MdRipple {
  private readonly attachableTouchController = new AttachableController(
    this,
    this.onTouchControlChange.bind(this)
  );

  attach(control: HTMLElement) {
    super.attach(control);
    this.attachableTouchController.attach(control);
  }

  detach() {
    super.detach();
    this.attachableTouchController.detach();
  }

  private _handleTouchEnd = () => {
    if (!this.disabled) {
      // @ts-ignore
      super.endPressAnimation();
    }
  };

  private onTouchControlChange(
    prev: HTMLElement | null,
    next: HTMLElement | null
  ) {
    // Add touchend event to clean ripple on touch devices using action handler
    prev?.removeEventListener("touchend", this._handleTouchEnd);
    next?.addEventListener("touchend", this._handleTouchEnd);
  }

  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-ripple-hover-opacity: var(--ha-ripple-hover-opacity, 0.08);
        --md-ripple-pressed-opacity: var(--ha-ripple-pressed-opacity, 0.12);
        --md-ripple-hover-color: var(
          --ha-ripple-hover-color,
          var(--ha-ripple-color, var(--secondary-text-color))
        );
        --md-ripple-pressed-color: var(
          --ha-ripple-pressed-color,
          var(--ha-ripple-color, var(--secondary-text-color))
        );
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-ripple": HaRipple;
  }
}
