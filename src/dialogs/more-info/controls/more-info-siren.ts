import { mdiVolumeHigh, mdiVolumeOff } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-attributes";
import "../../../state-control/ha-state-control-toggle";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import "../components/ha-more-info-control-select-container";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { SirenEntityFeature } from "../../../data/siren";
import { stopPropagation } from "../../../common/dom/stop_propagation";

@customElement("more-info-siren")
class MoreInfoSiren extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const supportsTones =
      supportsFeature(this.stateObj, SirenEntityFeature.TONES) &&
      this.stateObj.attributes.available_tones;

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
      ></ha-more-info-state-header>
      <div class="controls">
        <ha-state-control-toggle
          .stateObj=${this.stateObj}
          .hass=${this.hass}
          .iconPathOn=${mdiVolumeHigh}
          .iconPathOff=${mdiVolumeOff}
        ></ha-state-control-toggle>
      </div>
      ${supportsTones
        ? html`
            <ha-more-info-control-select-container>
              <ha-control-select-menu
                .hass=${this.hass}
                .label=${this.hass.localize("ui.components.siren.tone")}
                @closed=${stopPropagation}
              >
                ${Object.entries(this.stateObj.attributes.available_tones).map(
                  ([toneId, toneName]) => html`
                    <ha-list-item .value=${toneId}>${toneName}</ha-list-item>
                  `
                )}
              </ha-control-select-menu>
            </ha-more-info-control-select-container>
          `
        : nothing}
      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
      ></ha-attributes>
    `;
  }

  static get styles(): CSSResultGroup {
    return moreInfoControlStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-siren": MoreInfoSiren;
  }
}
