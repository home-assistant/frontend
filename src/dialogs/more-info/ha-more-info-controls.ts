import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import { computeDomain } from "../../common/entity/compute_domain";
import { removeEntityRegistryEntry } from "../../data/entity_registry";
import type { HomeAssistant } from "../../types";
import { showConfirmationDialog } from "../generic/show-dialog-box";
import {
  computeShowHistoryComponent,
  computeShowLogBookComponent,
  DOMAINS_NO_INFO,
  DOMAINS_WITH_MORE_INFO,
} from "./const";
import "./ha-more-info-history";
import "./ha-more-info-logbook";

@customElement("ha-more-info-controls")
export class MoreInfoHistoryAndLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  protected render() {
    const entityId = this.entityId;
    const stateObj = this.hass.states[entityId];
    const domain = computeDomain(entityId);

    return html`
      ${DOMAINS_NO_INFO.includes(domain)
        ? ""
        : html`
            <state-card-content
              in-dialog
              .stateObj=${stateObj}
              .hass=${this.hass}
            ></state-card-content>
          `}
      ${DOMAINS_WITH_MORE_INFO.includes(domain) ||
      !computeShowHistoryComponent(this.hass, entityId)
        ? ""
        : html`<ha-more-info-history
            .hass=${this.hass}
            .entityId=${entityId}
          ></ha-more-info-history>`}
      ${DOMAINS_WITH_MORE_INFO.includes(domain) ||
      !computeShowLogBookComponent(this.hass, entityId)
        ? ""
        : html`<ha-more-info-logbook
            .hass=${this.hass}
            .entityId=${entityId}
          ></ha-more-info-logbook>`}
      <more-info-content
        .stateObj=${stateObj}
        .hass=${this.hass}
      ></more-info-content>
      ${stateObj.attributes.restored
        ? html`
            <p>
              ${this.hass.localize(
                "ui.dialogs.more_info_control.restored.not_provided"
              )}
            </p>
            <p>
              ${this.hass.localize(
                "ui.dialogs.more_info_control.restored.remove_intro"
              )}
            </p>
            <mwc-button class="warning" @click=${this._removeEntity}>
              ${this.hass.localize(
                "ui.dialogs.more_info_control.restored.remove_action"
              )}
            </mwc-button>
          `
        : ""}
    `;
  }

  private _removeEntity() {
    const entityId = this.entityId!;
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.dialogs.more_info_control.restored.confirm_remove_title"
      ),
      text: this.hass.localize(
        "ui.dialogs.more_info_control.restored.confirm_remove_text"
      ),
      confirmText: this.hass.localize("ui.common.remove"),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: () => {
        removeEntityRegistryEntry(this.hass, entityId);
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-controls": MoreInfoHistoryAndLogbook;
  }
}
