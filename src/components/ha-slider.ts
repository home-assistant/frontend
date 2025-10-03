import Slider from "@home-assistant/webawesome/dist/components/slider/slider";
import { css, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import { mainWindow } from "../common/dom/get_main_window";

@customElement("ha-slider")
export class HaSlider extends Slider {
  @property({ reflect: true }) size: "small" | "medium" = "small";

  @property({ type: Boolean, attribute: "with-tooltip" }) withTooltip = true;

  public connectedCallback() {
    super.connectedCallback();
    this.dir = mainWindow.document.dir;
  }

  static get styles(): CSSResultGroup {
    return [
      Slider.styles,
      css`
        :host {
          --wa-form-control-activated-color: var(--ha-control-color);
          --track-size: var(--ha-slider-track-size, 4px);
          --marker-height: calc(var(--ha-slider-track-size, 4px) / 2);
          --marker-width: calc(var(--ha-slider-track-size, 4px) / 2);
          --wa-color-surface-default: var(--card-background-color);
          --wa-color-neutral-fill-normal: var(--disabled-color);
          --wa-tooltip-background-color: var(--secondary-background-color);
          --wa-tooltip-color: var(--primary-text-color);
          --wa-tooltip-font-family: var(
            --ha-tooltip-font-family,
            var(--ha-font-family-body)
          );
          --wa-tooltip-font-size: var(
            --ha-tooltip-font-size,
            var(--ha-font-size-s)
          );
          --wa-tooltip-font-weight: var(
            --ha-tooltip-font-weight,
            var(--ha-font-weight-normal)
          );
          --wa-tooltip-line-height: var(
            --ha-tooltip-line-height,
            var(--ha-line-height-condensed)
          );
          --wa-tooltip-padding: 8px;
          --wa-tooltip-border-radius: var(--ha-tooltip-border-radius, 4px);
          --wa-tooltip-arrow-size: var(--ha-tooltip-arrow-size, 8px);
          --wa-z-index-tooltip: var(--ha-tooltip-z-index, 1000);
          min-width: 100px;
          min-inline-size: 100px;
          width: 200px;
        }

        #thumb {
          border: none;
        }

        #slider:focus-visible:not(.disabled) #thumb,
        #slider:focus-visible:not(.disabled) #thumb-min,
        #slider:focus-visible:not(.disabled) #thumb-max {
          outline: var(--wa-focus-ring);
        }

        :host([size="medium"]) {
          --thumb-width: 20px;
          --thumb-height: 20px;
        }

        :host([size="small"]) {
          --thumb-width: 16px;
          --thumb-height: 16px;
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
