import { AttachableController } from "@material/web/internal/controller/attachable-controller";
import { Ripple } from "@material/web/ripple/internal/ripple";
import { styles } from "@material/web/ripple/internal/ripple-styles";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-ripple")
export class HaRipple extends Ripple {
  private readonly attachableTouchController = new AttachableController(
    this,
    this._onTouchControlChange.bind(this)
  );

  attach(control: HTMLElement) {
    super.attach(control);
    this.attachableTouchController.attach(control);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // @ts-ignore
    this.hovered = false;
    // @ts-ignore
    this.pressed = false;
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

  private _onTouchControlChange(
    prev: HTMLElement | null,
    next: HTMLElement | null
  ) {
    // Add touchend event to clean ripple on touch devices using action handler
    prev?.removeEventListener("touchend", this._handleTouchEnd);
    next?.addEventListener("touchend", this._handleTouchEnd);
  }

  static override styles = [
    styles,
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
