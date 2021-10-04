import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { throttle } from "../../../common/util/throttle";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import { fetchUsers } from "../../../data/user";
import { getLogbookData, LogbookEntry } from "../../../data/logbook";
import type { HomeAssistant } from "../../../types";
import "../../logbook/ha-logbook";
import { findEntities } from "../common/find-entities";
import { processConfigEntities } from "../common/process-config-entities";
import "../components/hui-warning";
import type { EntityConfig } from "../entity-rows/types";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { LogbookCardConfig } from "./types";

@customElement("hui-logbook-card")
export class HuiLogbookCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-logbook-card-editor");
    return document.createElement("hui-logbook-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFill: string[]
  ) {
    const includeDomains = ["light", "switch"];
    const maxEntities = 3;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFill,
      includeDomains
    );

    return {
      entities: foundEntities,
    };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: LogbookCardConfig;

  @state() private _logbookEntries?: LogbookEntry[];

  @state() private _configEntities?: EntityConfig[];

  @state() private _userIdToName = {};

  private _lastLogbookDate?: Date;

  private _fetchUserPromise?: Promise<void>;

  private _error?: string;

  private _throttleGetLogbookEntries = throttle(() => {
    this._getLogBookData();
  }, 10000);

  public getCardSize(): number {
    return 9 + (this._config?.title ? 1 : 0);
  }

  public setConfig(config: LogbookCardConfig): void {
    if (!config.entities.length) {
      throw new Error("Entities must be specified");
    }

    this._configEntities = processConfigEntities<EntityConfig>(config.entities);

    this._config = {
      hours_to_show: 24,
      ...config,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (
      changedProps.has("_config") ||
      changedProps.has("_persons") ||
      changedProps.has("_logbookEntries")
    ) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      !this._configEntities ||
      !oldHass ||
      oldHass.themes !== this.hass!.themes ||
      oldHass.locale !== this.hass!.locale
    ) {
      return true;
    }

    for (const entity of this._configEntities) {
      if (oldHass.states[entity.entity] !== this.hass!.states[entity.entity]) {
        return true;
      }
    }

    return false;
  }

  protected firstUpdated(): void {
    this._fetchUserPromise = this._fetchUserNames();
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (!this._config || !this.hass) {
      return;
    }

    const configChanged = changedProperties.has("_config");
    const hassChanged = changedProperties.has("hass");
    const oldHass = changedProperties.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProperties.get("_config") as LogbookCardConfig;

    if (
      (hassChanged && oldHass?.themes !== this.hass.themes) ||
      (configChanged && oldConfig?.theme !== this._config.theme)
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }

    if (
      configChanged &&
      (oldConfig?.entities !== this._config.entities ||
        oldConfig?.hours_to_show !== this._config!.hours_to_show)
    ) {
      this._logbookEntries = undefined;
      this._lastLogbookDate = undefined;

      if (!this._configEntities) {
        return;
      }

      this._throttleGetLogbookEntries();
      return;
    }

    if (
      oldHass &&
      this._configEntities!.some(
        (entity) =>
          oldHass.states[entity.entity] !== this.hass!.states[entity.entity]
      )
    ) {
      // wait for commit of data (we only account for the default setting of 1 sec)
      setTimeout(this._throttleGetLogbookEntries, 1000);
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

    return html`
      <ha-card
        .header=${this._config!.title}
        class=${classMap({ "no-header": !this._config!.title })}
      >
        <div class="content">
          ${this._error
            ? html`
                <div class="no-entries">
                  ${`${this.hass.localize(
                    "ui.components.logbook.retrieval_error"
                  )}: ${this._error}`}
                </div>
              `
            : !this._logbookEntries
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
                  virtualize
                  .hass=${this.hass}
                  .entries=${this._logbookEntries}
                  .userIdToName=${this._userIdToName}
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
    let newEntries;

    try {
      [newEntries] = await Promise.all([
        getLogbookData(
          this.hass,
          lastDate.toISOString(),
          now.toISOString(),
          this._configEntities!.map((entity) => entity.entity).toString(),
          true
        ),
        this._fetchUserPromise,
      ]);
    } catch (err: any) {
      this._error = err.message;
    }

    const logbookEntries = this._logbookEntries
      ? [...newEntries, ...this._logbookEntries]
      : newEntries;

    this._logbookEntries = logbookEntries.filter(
      (logEntry) => new Date(logEntry.when) > hoursToShowDate
    );

    this._lastLogbookDate = now;
  }

  private async _fetchUserNames() {
    const userIdToName = {};

    // Start loading users
    const userProm = this.hass.user?.is_admin && fetchUsers(this.hass);

    // Process persons
    Object.values(this.hass!.states).forEach((entity) => {
      if (
        entity.attributes.user_id &&
        computeStateDomain(entity) === "person"
      ) {
        this._userIdToName[entity.attributes.user_id] =
          entity.attributes.friendly_name;
      }
    });

    // Process users
    if (userProm) {
      const users = await userProm;
      for (const user of users) {
        if (!(user.id in userIdToName)) {
          userIdToName[user.id] = user.name;
        }
      }
    }

    this._userIdToName = userIdToName;
  }

  static get styles(): CSSResultGroup {
    return [
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
