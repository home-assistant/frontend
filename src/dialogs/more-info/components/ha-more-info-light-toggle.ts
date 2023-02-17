import { mdiLightbulbOff, mdiLightbulbOn } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { hsv2rgb, rgb2hex, rgb2hsv } from "../../../common/color/convert-color";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-bar-switch";
import { isUnavailableState } from "../../../data/entity";
import { LightEntity } from "../../../data/light";
import { HomeAssistant } from "../../../types";

@customElement("ha-more-info-light-toggle")
export class HaMoreInfoLightToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @state() value?: number;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      this.value =
        this.stateObj.attributes.brightness != null
          ? Math.max(
              Math.round((this.stateObj.attributes.brightness * 100) / 255),
              1
            )
          : undefined;
    }
  }

  private _valueChanged(ev) {
    const checked = ev.target.checked as boolean;

    this.hass.callService("light", checked ? "turn_on" : "turn_off", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  protected render(): TemplateResult {
    let color = stateColorCss(this.stateObj);

    if (this.stateObj.attributes.rgb_color) {
      const hsvColor = rgb2hsv(this.stateObj.attributes.rgb_color);

      // Modify the real rgb color for better contrast
      if (hsvColor[1] < 0.4) {
        // Special case for very light color (e.g: white)
        if (hsvColor[1] < 0.1) {
          hsvColor[2] = 225;
        } else {
          hsvColor[1] = 0.4;
        }
      }
      color = rgb2hex(hsv2rgb(hsvColor));
    }

    const checked = this.stateObj.state === "on";

    return html`
      <ha-bar-switch
        .pathOn=${mdiLightbulbOn}
        .pathOff=${mdiLightbulbOff}
        vertical
        reversed
        .checked=${checked}
        .showHandle=${stateActive(this.stateObj)}
        @change=${this._valueChanged}
        aria-label="Light switch"
        style=${styleMap({
          "--switch-bar-on-color": color,
        })}
        .disabled=${isUnavailableState(this.stateObj.state)}
      >
      </ha-bar-switch>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-bar-switch {
        height: 320px;
        --switch-bar-thickness: 100px;
        --switch-bar-border-radius: 24px;
        --switch-bar-padding: 6px;
        --mdc-icon-size: 24px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-light-toggle": HaMoreInfoLightToggle;
  }
}
