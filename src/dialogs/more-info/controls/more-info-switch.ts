import { mdiPower, mdiPowerOff } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-attributes";
import { LightEntity } from "../../../data/light";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-state-header";
import "../components/ha-more-info-toggle";

@customElement("more-info-switch")
class MoreInfoSwitch extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: LightEntity;

  protected render(): TemplateResult | null {
    if (!this.hass || !this.stateObj) {
      return null;
    }

    return html`
      <div class="content">
        <ha-more-info-state-header
          .hass=${this.hass}
          .stateObj=${this.stateObj}
        ></ha-more-info-state-header>
        <ha-more-info-toggle
          .stateObj=${this.stateObj}
          .hass=${this.hass}
          .iconPathOn=${mdiPower}
          .iconPathOff=${mdiPowerOff}
        ></ha-more-info-toggle>
        <ha-attributes
          .hass=${this.hass}
          .stateObj=${this.stateObj}
        ></ha-attributes>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .content {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      ha-more-info-toggle {
        margin-bottom: 24px;
      }

      ha-attributes {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-switch": MoreInfoSwitch;
  }
}
