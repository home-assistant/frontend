import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { AlarmControlPanelEntity } from "../../../data/alarm_control_panel";
import type { HomeAssistant } from "../../../types";
import "../components/alarm_control_panel/ha-more-info-alarm_control_panel-modes";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/ha-more-info-state-header";

@customElement("more-info-alarm_control_panel")
class MoreAlarmControlPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: AlarmControlPanelEntity;

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
        <ha-more-info-alarm_control_panel-modes
          .stateObj=${this.stateObj}
          .hass=${this.hass}
        >
        </ha-more-info-alarm_control_panel-modes>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [moreInfoControlStyle, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-alarm_control_panel": MoreAlarmControlPanel;
  }
}
