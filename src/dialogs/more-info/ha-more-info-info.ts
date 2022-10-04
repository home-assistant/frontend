import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../common/entity/compute_domain";
import { subscribeOne } from "../../common/util/subscribe-one";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../data/entity_registry";
import type { HomeAssistant } from "../../types";
import {
  computeShowHistoryComponent,
  computeShowLogBookComponent,
  DOMAINS_NO_INFO,
  DOMAINS_WITH_MORE_INFO,
} from "./const";
import "./ha-more-info-history";
import "./ha-more-info-logbook";

@customElement("ha-more-info-info")
export class MoreInfoInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @state() private _entityEntry?: EntityRegistryEntry;

  protected render() {
    const entityId = this.entityId;
    const stateObj = this.hass.states[entityId];
    const domain = computeDomain(entityId);

    return html`
      ${stateObj.attributes.restored && this._entityEntry
        ? html`<ha-alert alert-type="warning">
            ${this.hass.localize(
              "ui.dialogs.more_info_control.restored.no_longer_provided",
              {
                integration: this._entityEntry.platform,
              }
            )}
          </ha-alert>`
        : ""}
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
            .entityId=${this.entityId}
          ></ha-more-info-history>`}
      ${DOMAINS_WITH_MORE_INFO.includes(domain) ||
      !computeShowLogBookComponent(this.hass, entityId)
        ? ""
        : html`<ha-more-info-logbook
            .hass=${this.hass}
            .entityId=${this.entityId}
          ></ha-more-info-logbook>`}
      <more-info-content
        .stateObj=${stateObj}
        .hass=${this.hass}
      ></more-info-content>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    subscribeOne(this.hass.connection, subscribeEntityRegistry).then(
      (entries) => {
        this._entityEntry = entries.find(
          (entry) => entry.entity_id === this.entityId
        );
      }
    );
  }

  static get styles() {
    return css`
      state-card-content,
      ha-more-info-history,
      ha-more-info-logbook:not(:last-child) {
        display: block;
        margin-bottom: 16px;
      }

      ha-alert {
        display: block;
        margin: calc(-1 * var(--dialog-content-padding, 24px))
          calc(-1 * var(--dialog-content-padding, 24px)) 16px
          calc(-1 * var(--dialog-content-padding, 24px));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-info": MoreInfoInfo;
  }
}
