import {
  css,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import "../../components/ha-circular-progress";
import "../../components/state-history-charts";
import { getLogbookData, LogbookEntry } from "../../data/logbook";
import "../../panels/logbook/ha-logbook";
import { haStyle, haStyleScrollbar } from "../../resources/styles";
import { HomeAssistant } from "../../types";

@customElement("ha-more-info-logbook")
export class MoreInfoLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @internalProperty() private _logbookEntries?: LogbookEntry[];

  @internalProperty() private _persons = {};

  private _logbookRefreshInterval?: number;

  protected render(): TemplateResult {
    if (!this.entityId) {
      return html``;
    }
    const stateObj = this.hass.states[this.entityId];

    if (!stateObj) {
      return html``;
    }

    return html`
      ${isComponentLoaded(this.hass, "logbook")
        ? !this._logbookEntries
          ? html`
              <ha-circular-progress
                active
                alt=${this.hass.localize("ui.common.loading")}
              ></ha-circular-progress>
            `
          : this._logbookEntries.length
          ? html`
              <ha-logbook
                class="ha-scrollbar"
                narrow
                no-icon
                no-name
                .hass=${this.hass}
                .entries=${this._logbookEntries}
                .userIdToName=${this._persons}
              ></ha-logbook>
            `
          : html`<div class="no-entries">
              ${this.hass.localize("ui.components.logbook.entries_not_found")}
            </div>`
        : ""}
    `;
  }

  protected firstUpdated(): void {
    this._fetchPersonNames();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this.entityId) {
      clearInterval(this._logbookRefreshInterval);
    }

    if (changedProps.has("entityId")) {
      this._logbookEntries = undefined;

      this._getLogBookData();

      clearInterval(this._logbookRefreshInterval);
      this._logbookRefreshInterval = window.setInterval(() => {
        this._getLogBookData();
      }, 60 * 1000);
    }
  }

  private async _getLogBookData() {
    if (!isComponentLoaded(this.hass, "logbook")) {
      return;
    }
    const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();
    this._logbookEntries = await getLogbookData(
      this.hass,
      yesterday.toISOString(),
      now.toISOString(),
      this.entityId,
      true
    );
  }

  private _fetchPersonNames() {
    Object.values(this.hass.states).forEach((entity) => {
      if (
        entity.attributes.user_id &&
        computeStateDomain(entity) === "person"
      ) {
        this._persons[entity.attributes.user_id] =
          entity.attributes.friendly_name;
      }
    });
  }

  static get styles() {
    return [
      haStyle,
      haStyleScrollbar,
      css`
        .no-entries {
          text-align: center;
          padding: 16px;
          color: var(--secondary-text-color);
        }
        ha-logbook {
          max-height: 250px;
          overflow: auto;
          display: block;
          margin-top: 16px;
        }
        ha-circular-progress {
          display: flex;
          justify-content: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-logbook": MoreInfoLogbook;
  }
}
