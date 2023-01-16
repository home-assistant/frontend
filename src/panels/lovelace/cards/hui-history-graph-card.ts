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
import "../../../components/ha-card";
import "../../../components/chart/state-history-charts";
import {
  HistoryResult,
  subscribeHistoryStatesWindow,
  computeHistory,
} from "../../../data/history";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntitiesChanged } from "../common/has-changed";
import { processConfigEntities } from "../common/process-config-entities";
import { EntityConfig } from "../entity-rows/types";
import { LovelaceCard } from "../types";
import { HistoryGraphCardConfig } from "./types";

@customElement("hui-history-graph-card")
export class HuiHistoryGraphCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import("../editor/config-elements/hui-history-graph-card-editor");
    return document.createElement("hui-history-graph-card-editor");
  }

  public static getStubConfig(): HistoryGraphCardConfig {
    // Hard coded to sun.sun to prevent high server load when it would pick an entity with a lot of state changes
    return { type: "history-graph", entities: ["sun.sun"] };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _stateHistory?: HistoryResult;

  @state() private _config?: HistoryGraphCardConfig;

  private _configEntities?: EntityConfig[];

  private _names: Record<string, string> = {};

  private _entityIds: string[] = [];

  private _hoursToShow = 24;

  private _error?: string;

  private _interval?: number;

  private _subscribed?: Promise<(() => Promise<void>) | void>;

  public getCardSize(): number {
    return this._config?.title
      ? 2
      : 0 + 2 * (this._configEntities?.length || 1);
  }

  public setConfig(config: HistoryGraphCardConfig): void {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("Entities need to be an array");
    }

    if (!config.entities.length) {
      throw new Error("You must include at least one entity");
    }

    this._configEntities = config.entities
      ? processConfigEntities(config.entities)
      : [];

    this._configEntities.forEach((entity) => {
      this._entityIds.push(entity.entity);
      if (entity.name) {
        this._names[entity.entity] = entity.name;
      }
    });

    this._hoursToShow = config.hours_to_show || 24;

    this._config = config;
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._subscribeHistoryWindow();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeHistoryWindow();
  }

  private _subscribeHistoryWindow() {
    if (this._subscribed) {
      return;
    }
    this._subscribed = subscribeHistoryStatesWindow(
      this.hass!,
      (combinedHistory) => {
        if (!this._subscribed) {
          // Message came in before we had a chance to unload
          return;
        }
        this._stateHistory = computeHistory(
          this.hass!,
          combinedHistory,
          this.hass!.localize
        );
      },
      this._hoursToShow,
      this._entityIds
    ).catch((err) => {
      this._subscribed = undefined;
      this._error = err;
    });
    this._setRedrawTimer();
  }

  private _redrawGraph() {
    if (this._stateHistory) {
      this._stateHistory = { ...this._stateHistory };
    }
  }

  private _setRedrawTimer() {
    // redraw the graph every minute to update the time axis
    clearInterval(this._interval);
    this._interval = window.setInterval(() => this._redrawGraph(), 1000 * 60);
  }

  private _unsubscribeHistoryWindow() {
    if (!this._subscribed) {
      return;
    }
    clearInterval(this._interval);
    this._subscribed.then((unsubscribe) => {
      if (unsubscribe) {
        unsubscribe();
      }
      this._subscribed = undefined;
    });
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_stateHistory")) {
      return true;
    }
    return hasConfigOrEntitiesChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (
      !this._config ||
      !this.hass ||
      !this._hoursToShow ||
      !this._entityIds.length
    ) {
      return;
    }

    if (!changedProps.has("_config") && !changedProps.has("hass")) {
      return;
    }

    const oldConfig = changedProps.get("_config") as
      | HistoryGraphCardConfig
      | undefined;

    if (
      changedProps.has("_config") &&
      (oldConfig?.entities !== this._config.entities ||
        oldConfig?.hours_to_show !== this._hoursToShow)
    ) {
      this._unsubscribeHistoryWindow();
      this._subscribeHistoryWindow();
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    if (this._error) {
      return html`<div class="errors">${this._error}</div>`;
    }

    return html`
      <ha-card .header=${this._config.title}>
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
          })}"
        >
          <state-history-charts
            .hass=${this.hass}
            .isLoadingData=${!this._stateHistory}
            .historyData=${this._stateHistory}
            .names=${this._names}
            up-to-now
            .showNames=${this._config.show_names !== undefined
              ? this._config.show_names
              : true}
          ></state-history-charts>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        height: 100%;
      }
      .content {
        padding: 16px;
      }
      .has-header {
        padding-top: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-history-graph-card": HuiHistoryGraphCard;
  }
}
