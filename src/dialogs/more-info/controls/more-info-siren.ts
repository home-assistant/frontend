import { mdiVolumeHigh, mdiVolumeOff } from "@mdi/js";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-attributes";
import { LightEntity } from "../../../data/light";
import type { HomeAssistant } from "../../../types";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/ha-more-info-state-header";
import "../components/ha-more-info-toggle";

@customElement("more-info-siren")
class MoreInfoSiren extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: LightEntity;

  protected render(): TemplateResult | null {
    if (!this.hass || !this.stateObj) {
      return null;
    }

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
      ></ha-more-info-state-header>
      <div class="controls">
        <ha-more-info-toggle
          .stateObj=${this.stateObj}
          .hass=${this.hass}
          .iconPathOn=${mdiVolumeHigh}
          .iconPathOff=${mdiVolumeOff}
        ></ha-more-info-toggle>
      </div>
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
