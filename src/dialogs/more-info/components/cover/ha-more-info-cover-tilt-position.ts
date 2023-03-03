import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../../../common/entity/state_color";
import "../../../../components/ha-control-slider";
import { CoverEntity } from "../../../../data/cover";
import { UNAVAILABLE } from "../../../../data/entity";
import { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-cover-tilt-position")
export class HaMoreInfoCoverTiltPosition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CoverEntity;

  @state() value?: number;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      this.value =
        this.stateObj.attributes.current_tilt_position != null
          ? Math.round(this.stateObj.attributes.current_tilt_position)
          : undefined;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass.callService("cover", "set_cover_tilt_position", {
      entity_id: this.stateObj!.entity_id,
      tilt_position: value,
    });
  }

  protected render(): TemplateResult {
    const color = stateColorCss(this.stateObj);

    return html`
      <ha-control-slider
        vertical
        .value=${this.value}
        min="0"
        max="100"
        mode="cursor"
        @value-changed=${this._valueChanged}
        .ariaLabel=${this.hass.localize(
          "ui.dialogs.more_info_control.cover.tilt_position"
        )}
        style=${styleMap({
          "--control-slider-color": color,
          "--control-slider-background": color,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
      </ha-control-slider>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-control-slider {
        height: 45vh;
        max-height: 320px;
        min-height: 200px;
        --control-slider-thickness: 100px;
        --control-slider-border-radius: 24px;
        --control-slider-color: var(--primary-color);
        --control-slider-background: var(--disabled-color);
        --control-slider-background-opacity: 0.2;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-cover-tilt-position": HaMoreInfoCoverTiltPosition;
  }
}
