import Slider from "@home-assistant/webawesome/dist/components/slider/slider";
import { css, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import { mainWindow } from "../common/dom/get_main_window";

@customElement("ha-slider")
export class HaSlider extends Slider {
  @property({ reflect: true }) size: "small" | "medium" = "small";

  public connectedCallback() {
    super.connectedCallback();
    this.dir = mainWindow.document.dir;
  }

  static get styles(): CSSResultGroup {
    return [
      Slider.styles,
      css`
        :host {
          --wa-form-control-activated-color: var(--primary-color);
          --track-size: var(--ha-slider-track-size, 4px);
          --wa-color-surface-default: var(--card-background-color);
          --wa-color-neutral-fill-normal: var(--disabled-color);
          min-width: 100px;
          min-inline-size: 100px;
          width: 200px;
        }

        #thumb {
          border: none;
        }

        .marker {
          --marker-height: 0.125em;
          --marker-width: 0.125em;
        }

        :host([size="medium"]) {
          --thumb-width: var(--ha-font-size-l, 1.25em);
          --thumb-height: var(--ha-font-size-l, 1.25em);
        }

        :host([size="small"]) {
          --thumb-width: var(--ha-font-size-m, 1em);
          --thumb-height: var(--ha-font-size-m, 1em);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-slider": HaSlider;
  }
}
