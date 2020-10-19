import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import { getLogbookData, LogbookEntry } from "../../../data/logbook";
import { haStyleScrollbar } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "../../logbook/ha-logbook";
import { findEntities } from "../common/find-entites";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import "./hui-error-card";
import { LogbookCardConfig } from "./types";

@customElement("hui-logbook-card")
export class HuiLogbookCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-logbook-card-editor" */ "../editor/config-elements/hui-logbook-card-editor"
    );
    return document.createElement("hui-logbook-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFill: string[]
  ) {
    const includeDomains = ["sensor", "light", "switch"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFill,
      includeDomains
    );

    return {
      entity: foundEntities[0] || "",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: LogbookCardConfig;

  @internalProperty() private _logbookEntries?: LogbookEntry[];

  @internalProperty() private _persons = {};

  private _lastLogbookDate?: Date;

  private _logbookRefreshInterval?: number;

  public getCardSize(): number {
    return 5;
  }

  public setConfig(config: LogbookCardConfig): void {
    if (config.entity && !isValidEntityId(config.entity)) {
      throw new Error("Invalid Entity");
    }

    this._config = {
      hours_to_show: 24,
      ...config,
    };
  }

  public connectedCallback() {
    super.connectedCallback();

    if (!this._logbookRefreshInterval) {
      this._logbookRefreshInterval = window.setInterval(() => {
        this._getLogBookData();
      }, 60 * 1000);
    }
  }

  public disconnectedCallback() {
    clearInterval(this._logbookRefreshInterval);
  }

  protected firstUpdated(): void {
    this._fetchPersonNames();
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (!changedProperties.has("_config")) {
      return;
    }

    const oldConfig = changedProperties.get("_config") as LogbookCardConfig;

    if (
      oldConfig?.entity !== this._config!.entity ||
      oldConfig?.hours_to_show !== this._config!.hours_to_show
    ) {
      clearInterval(this._logbookRefreshInterval);

      this._logbookEntries = undefined;
      this._lastLogbookDate = undefined;
      this._getLogBookData();

      this._logbookRefreshInterval = window.setInterval(() => {
        this._getLogBookData();
      }, 60 * 1000);
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    if (!isComponentLoaded(this.hass, "logbook")) {
      return html`
        <hui-warning>
          ${this.hass.localize(
            "ui.components.logbook.component_not_loaded"
          )}</hui-warning
        >
      `;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <ha-card
        .header=${this._config!.title}
        class=${classMap({ "no-header": !this._config!.title })}
      >
        <div class="content">
          ${!this._logbookEntries
            ? html`
                <ha-circular-progress
                  active
                  alt=${this.hass.localize("ui.common.loading")}
                ></ha-circular-progress>
              `
            : this._logbookEntries.length
            ? html`
                <ha-logbook
                  narrow
                  relative-time
                  class="ha-scrollbar"
                  .hass=${this.hass}
                  .entries=${this._logbookEntries}
                  .userIdToName=${this._persons}
                ></ha-logbook>
              `
            : html`
                <div class="no-entries">
                  ${this.hass.localize(
                    "ui.components.logbook.entries_not_found"
                  )}
                </div>
              `}
        </div>
      </ha-card>
    `;
  }

  private async _getLogBookData() {
    if (
      !this.hass ||
      !this._config ||
      !isComponentLoaded(this.hass, "logbook")
    ) {
      return;
    }

    const hoursToShowDate = new Date(
      new Date().getTime() - this._config!.hours_to_show! * 60 * 60 * 1000
    );
    const lastDate = this._lastLogbookDate || hoursToShowDate;
    const now = new Date();

    const newEntries = await getLogbookData(
      this.hass,
      lastDate.toISOString(),
      now.toISOString(),
      this._config.entity,
      true
    );

    const logbookEntries = this._logbookEntries
      ? [...newEntries, ...this._logbookEntries]
      : newEntries;

    this._logbookEntries = logbookEntries.filter(
      (logEntry) => new Date(logEntry.when) > hoursToShowDate
    );

    this._lastLogbookDate = now;
  }

  private _fetchPersonNames() {
    if (!this.hass) {
      return;
    }

    Object.values(this.hass!.states).forEach((entity) => {
      if (
        entity.attributes.user_id &&
        computeStateDomain(entity) === "person"
      ) {
        this._persons[entity.attributes.user_id] =
          entity.attributes.friendly_name;
      }
    });
  }

  static get styles(): CSSResultArray {
    return [
      haStyleScrollbar,
      css`
        ha-card {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .content {
          padding: 0 16px 16px;
        }

        .no-header .content {
          padding-top: 16px;
        }

        .no-entries {
          text-align: center;
          padding: 16px;
          color: var(--secondary-text-color);
        }

        ha-logbook {
          height: 385px;
          overflow: auto;
          display: block;
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
    "hui-logbook-card": HuiLogbookCard;
  }
}
