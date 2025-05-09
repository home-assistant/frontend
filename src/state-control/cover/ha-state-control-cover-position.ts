import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeAttributeNameDisplay } from "../../common/entity/compute_attribute_display";
import { stateColorCss } from "../../common/entity/state_color";
import "../../components/ha-control-slider";
import type { CoverEntity } from "../../data/cover";
import { UNAVAILABLE } from "../../data/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../data/entity_attributes";
import type { HomeAssistant } from "../../types";

@customElement("ha-state-control-cover-position")
export class HaStateControlCoverPosition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CoverEntity;

  @state() value?: number;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      const currentPosition = this.stateObj?.attributes.current_position;
      this.value =
        currentPosition != null ? Math.round(currentPosition) : undefined;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass.callService("cover", "set_cover_position", {
      entity_id: this.stateObj!.entity_id,
      position: value,
    });
  }

  protected render(): TemplateResult {
    const openColor = stateColorCss(this.stateObj, "open");
    const color = stateColorCss(this.stateObj);

    return html`
      <ha-control-slider
        touch-action="none"
        vertical
        .value=${this.value}
        min="0"
        max="100"
        show-handle
        mode="end"
        @value-changed=${this._valueChanged}
        .ariaLabel=${computeAttributeNameDisplay(
          this.hass.localize,
          this.stateObj,
          this.hass.entities,
          "current_position"
        )}
        style=${styleMap({
          // Use open color for inactive state to avoid grey slider that looks disabled
          "--state-cover-inactive-color": openColor,
          "--control-slider-color": color,
          "--control-slider-background": color,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        .unit=${DOMAIN_ATTRIBUTES_UNITS.cover.current_position}
        .locale=${this.hass.locale}
      >
      </ha-control-slider>
    `;
  }

  static styles = css`
    ha-control-slider {
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      --control-slider-thickness: 130px;
      --control-slider-border-radius: 36px;
      --control-slider-color: var(--primary-color);
      --control-slider-background: var(--disabled-color);
      --control-slider-background-opacity: 0.2;
      --control-slider-tooltip-font-size: var(--ha-font-size-xl);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-cover-position": HaStateControlCoverPosition;
  }
}
