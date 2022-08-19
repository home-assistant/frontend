import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import { computeDomain } from "../../common/entity/compute_domain";
import { HomeAssistant } from "../../types";
import {
  computeShowHistoryComponent,
  computeShowLogBookComponent,
  DOMAINS_NO_INFO,
} from "./const";
import "./ha-more-info-history";
import "./ha-more-info-logbook";

@customElement("ha-more-info-history-and-logbook")
export class MoreInfoHistoryAndLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  protected render() {
    const stateObj = this.hass.states[this.entityId];

    return html`
      ${stateObj && !DOMAINS_NO_INFO.includes(computeDomain(this.entityId))
        ? html`
            <state-card-content
              in-dialog
              .stateObj=${stateObj}
              .hass=${this.hass}
            ></state-card-content>
          `
        : ""}
      ${computeShowHistoryComponent(this.hass, this.entityId)
        ? html`
            <ha-more-info-history
              .hass=${this.hass}
              .entityId=${this.entityId}
            ></ha-more-info-history>
          `
        : ""}
      ${computeShowLogBookComponent(this.hass, this.entityId)
        ? html`
            <ha-more-info-logbook
              .hass=${this.hass}
              .entityId=${this.entityId}
            ></ha-more-info-logbook>
          `
        : ""}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-history-and-logbook": MoreInfoHistoryAndLogbook;
  }
}
