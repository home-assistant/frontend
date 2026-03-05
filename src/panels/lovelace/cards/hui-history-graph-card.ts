import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { createSearchParam } from "../../../common/url/search-params";
import "../../../components/chart/state-history-charts";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-tooltip";
import {
  computeHistory,
  convertStatisticsToHistory,
  mergeHistoryResults,
  subscribeHistoryStatesTimeWindow,
  type HistoryResult,
} from "../../../data/history";
import { fetchStatistics } from "../../../data/recorder";
import { getSensorNumericDeviceClasses } from "../../../data/sensor";
import type { HomeAssistant } from "../../../types";
import { computeLovelaceEntityName } from "../common/entity/compute-lovelace-entity-name";
import { hasConfigOrEntitiesChanged } from "../common/has-changed";
import { processConfigEntities } from "../common/process-config-entities";
import type { EntityConfig } from "../entity-rows/types";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import type { HistoryGraphCardConfig } from "./types";

export const DEFAULT_HOURS_TO_SHOW = 24;

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

  @state() private _history?: HistoryResult;

  @state() private _statisticsHistory?: HistoryResult;

  @state() private _config?: HistoryGraphCardConfig;

  @state() private _error?: { code: string; message: string };

  private _names: Record<string, string> = {};

  private _entityIds: string[] = [];

  private _entities: EntityConfig[] = [];

  private _historyLinkId = `history-${Math.random().toString(36).substring(2, 9)}`;

  private _hoursToShow = DEFAULT_HOURS_TO_SHOW;

  private _interval?: number;

  private _subscribed?: Promise<(() => Promise<void>) | undefined>;

  private _stateHistory?: HistoryResult;

  public getCardSize(): number {
    return this._config?.title ? 2 : 0 + 2 * (this._entityIds?.length || 1);
  }

  getGridOptions(): LovelaceGridOptions {
    return {
      columns: 12,
      min_columns: 6,
      min_rows: 2,
    };
  }

  public setConfig(config: HistoryGraphCardConfig): void {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("Entities need to be an array");
    }

    if (!config.entities.length) {
      throw new Error("You must include at least one entity");
    }

    this._entities = config.entities
      ? processConfigEntities(config.entities)
      : [];
    this._entityIds = this._entities.map((entity) => entity.entity);

    this._hoursToShow = config.hours_to_show || DEFAULT_HOURS_TO_SHOW;

    this._config = config;
    this._computeNames();
  }

  private _computeNames() {
    if (!this.hass || !this._config) {
      return;
    }
    this._names = {};
    this._entities.forEach((entity) => {
      const stateObj = this.hass!.states[entity.entity];
      this._names[entity.entity] = stateObj
        ? computeLovelaceEntityName(this.hass!, stateObj, entity.name)
        : entity.entity;
    });
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (changedProps.has("hass")) {
      this._computeNames();
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._subscribeHistory();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeHistory();
  }

  private async _subscribeHistory() {
    if (!isComponentLoaded(this.hass!, "history") || this._subscribed) {
      return;
    }

    const { numeric_device_classes: sensorNumericDeviceClasses } =
      await getSensorNumericDeviceClasses(this.hass!);

    if (!this.isConnected) {
      return; // Skip subscribe if we already disconnected while awaiting
    }

    this._subscribed = subscribeHistoryStatesTimeWindow(
      this.hass!,
      (combinedHistory) => {
        if (!this._subscribed) {
          // Message came in before we had a chance to unload
          return;
        }

        this._stateHistory = computeHistory(
          this.hass!,
          combinedHistory,
          this._entityIds,
          this.hass!.localize,
          sensorNumericDeviceClasses,
          this._config?.split_device_classes
        );

        this._mergeHistory();
      },
      this._hoursToShow,
      this._entityIds
    ).catch((err) => {
      this._subscribed = undefined;
      this._error = err;
      return undefined;
    });

    await this._fetchStatistics(sensorNumericDeviceClasses);

    this._setRedrawTimer();
  }

  private _mergeHistory() {
    if (this._stateHistory) {
      this._history = mergeHistoryResults(
        this._stateHistory,
        this._statisticsHistory,
        this._config?.split_device_classes
      );
    }
  }

  private async _fetchStatistics(sensorNumericDeviceClasses: string[]) {
    const now = new Date();
    const start = new Date();
    start.setHours(start.getHours() - this._hoursToShow - 1);

    const statistics = await fetchStatistics(
      this.hass!,
      start,
      now,
      this._entityIds,
      "hour",
      undefined,
      ["mean", "state"]
    );

    this._statisticsHistory = convertStatisticsToHistory(
      this.hass!,
      statistics,
      this._entityIds,
      sensorNumericDeviceClasses,
      this._config?.split_device_classes
    );

    this._mergeHistory();
  }

  private _redrawGraph() {
    if (this._history) {
      this._history = { ...this._history };
    }
  }

  private _setRedrawTimer() {
    // redraw the graph every minute to update the time axis
    clearInterval(this._interval);
    if (this.isConnected) {
      this._interval = window.setInterval(() => this._redrawGraph(), 1000 * 60);
    }
  }

  private _unsubscribeHistory() {
    clearInterval(this._interval);
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.());
      this._subscribed = undefined;
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigOrEntitiesChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    );
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
        oldConfig?.hours_to_show !== this._config.hours_to_show)
    ) {
      this._unsubscribeHistory();
      this._subscribeHistory();
    }
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const now = new Date();
    now.setHours(now.getHours() - this._hoursToShow);
    const configUrl = `/history?${createSearchParam({
      entity_id: this._entityIds.join(","),
      back: "1",
      start_date: now.toISOString(),
    })}`;

    const columns = this._config.grid_options?.columns ?? 12;
    const narrow = typeof columns === "number" && columns <= 12;
    const hasFixedHeight = typeof this._config.grid_options?.rows === "number";

    return html`
      <ha-card>
        ${this._config.title
          ? html`
              <h1 class="card-header">
                ${this._config.title}
                <a
                  id=${this._historyLinkId}
                  href=${configUrl}
                  aria-label=${this.hass.localize("panel.history")}
                >
                  <ha-icon-next></ha-icon-next>
                </a>
                <ha-tooltip for=${this._historyLinkId} placement="left">
                  ${this.hass.localize("panel.history")}
                </ha-tooltip>
              </h1>
            `
          : nothing}
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
            "has-rows": !!this._config.grid_options?.rows,
            "has-height": hasFixedHeight,
          })}"
        >
          ${this._error
            ? html`
                <ha-alert alert-type="error">
                  ${this.hass.localize("ui.components.history_charts.error")}:
                  ${this._error.message || this._error.code}
                </ha-alert>
              `
            : html`
                <state-history-charts
                  .hass=${this.hass}
                  .isLoadingData=${!this._history}
                  .historyData=${this._history}
                  .names=${this._names}
                  up-to-now
                  .hoursToShow=${this._hoursToShow}
                  .showNames=${this._config.show_names !== undefined
                    ? this._config.show_names
                    : true}
                  .logarithmicScale=${this._config.logarithmic_scale || false}
                  .minYAxis=${this._config.min_y_axis}
                  .maxYAxis=${this._config.max_y_axis}
                  .fitYData=${this._config.fit_y_data || false}
                  .height=${hasFixedHeight ? "100%" : undefined}
                  .narrow=${narrow}
                  .expandLegend=${this._config.expand_legend}
                ></state-history-charts>
              `}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .card-header {
      justify-content: space-between;
      display: flex;
      padding-bottom: 0;
    }
    .card-header ha-icon-next {
      --mdc-icon-button-size: 24px;
      line-height: 24px;
      color: var(--primary-text-color);
    }
    .content {
      padding: 0 16px 8px;
      flex: 1;
      overflow: hidden;
    }
    .has-header {
      padding-top: 0;
    }
    state-history-charts {
      --timeline-top-margin: 16px;
    }
    .has-height state-history-charts {
      height: 100%;
    }
    .has-rows {
      --chart-max-height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-history-graph-card": HuiHistoryGraphCard;
  }
}
