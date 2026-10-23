import { mdiClose, mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent, type HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/entity/ha-entities-picker";
import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-settings-row";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import type { ConfigEntry } from "../../../data/config_entries";
import { getConfigEntries } from "../../../data/config_entries";
import type { ConfigFlowInProgressMessage } from "../../../data/config_flow";
import {
  DISCOVERY_SOURCES,
  localizeConfigFlowTitle,
  subscribeConfigFlowInProgress,
} from "../../../data/config_flow";
import type { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import type { WeatherFrontendSystemData } from "../../../data/frontend";
import { domainToName } from "../../../data/integration";
import type { IntegrationCategories } from "../../../data/weather_page";
import {
  AIR_QUALITY_DEVICE_CLASSES,
  domainsInCategories,
  findRainGauge,
  getAirQualityEntities,
  getIntegrationCategories,
  getPollenEntities,
  getWeatherSources,
  WEATHER_PAGE_CATEGORIES,
} from "../../../data/weather_page";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showAddIntegrationDialog } from "../../config/integrations/show-add-integration-dialog";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

// Location based discovery (home-assistant/architecture#954) creates
// discovery flows with this source. They show up here as suggestions.
const SUGGESTION_SOURCES = [...DISCOVERY_SOURCES, "location_discovery"];

/**
 * Inline edit mode of the weather page: what powers it and its settings.
 * Changes are sent with `value-changed` right away, like dashboards do.
 */
@customElement("weather-page-editor")
export class WeatherPageEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config: WeatherFrontendSystemData = {};

  @property({ type: Boolean }) public narrow = false;

  @state() private _categories?: IntegrationCategories;

  @state() private _configEntries?: ConfigEntry[];

  @state() private _flows: DataEntryFlowProgress[] = [];

  private _unsubFlows?: Promise<UnsubscribeFunc>;

  public connectedCallback(): void {
    super.connectedCallback();
    this._unsubFlows = subscribeConfigFlowInProgress(
      this.hass,
      (messages: ConfigFlowInProgressMessage[]) => {
        let flows = [...this._flows];
        for (const message of messages) {
          flows = flows.filter((flow) => flow.flow_id !== message.flow_id);
          if (message.type !== "removed") {
            flows.push(message.flow);
          }
        }
        this._flows = flows;
      }
    ).catch(() => () => undefined);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubFlows?.then((unsub) => unsub());
    this._unsubFlows = undefined;
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._loadServices();
  }

  private async _loadServices() {
    const [categories, configEntries] = await Promise.all([
      getIntegrationCategories(this.hass),
      getConfigEntries(this.hass),
    ]);
    this._categories = categories;
    this._configEntries = configEntries;
  }

  private _serviceDomains = memoizeOne((categories: IntegrationCategories) =>
    domainsInCategories(categories, WEATHER_PAGE_CATEGORIES)
  );

  private _changed(update: Partial<WeatherFrontendSystemData>) {
    fireEvent(this, "value-changed", { value: { ...this.config, ...update } });
  }

  protected render() {
    return html`
      <div class="content">
        ${this._renderSources()} ${this._renderAddService()}
        ${this._renderSensors()} ${this._renderSettings()}
      </div>
    `;
  }

  private _renderSources() {
    const localize = this.hass.localize;
    const sources = getWeatherSources(this.hass, this.config);
    const excluded = (this.config.excluded_weather_entities ?? []).filter(
      (entityId) => entityId in this.hass.states
    );

    return html`
      <section>
        <h2>${localize("ui.panel.weather.editor.sources.title")}</h2>
        <p class="description">
          ${localize("ui.panel.weather.editor.sources.description")}
        </p>
        <ha-card outlined>
          ${
            sources.length
              ? html`<ha-sortable
                  handle-selector=".handle"
                  @item-moved=${this._sourceMoved}
                >
                  <div class="list">
                    ${repeat(
                      sources,
                      (entityId) => entityId,
                      (entityId) => this._renderSource(entityId)
                    )}
                  </div>
                </ha-sortable>`
              : html`<p class="empty">
                  ${localize("ui.panel.weather.editor.sources.empty")}
                </p>`
          }
          ${
            excluded.length
              ? html`<div class="add-source">
                  <ha-entity-picker
                    add-button
                    .addButtonLabel=${localize(
                      "ui.panel.weather.editor.sources.add"
                    )}
                    .includeEntities=${excluded}
                    @value-changed=${this._includeSource}
                  ></ha-entity-picker>
                </div>`
              : nothing
          }
        </ha-card>
      </section>
    `;
  }

  private _renderSource(entityId: string) {
    const stateObj = this.hass.states[entityId];
    const platform = this.hass.entities[entityId]?.platform;
    return html`
      <div class="source">
        <div class="handle">
          <ha-svg-icon .path=${mdiDragHorizontalVariant}></ha-svg-icon>
        </div>
        ${
          platform
            ? html`<img
                alt=""
                crossorigin="anonymous"
                referrerpolicy="no-referrer"
                src=${brandsUrl({
                  domain: platform,
                  type: "icon",
                  darkOptimized: this.hass.themes?.darkMode,
                })}
              />`
            : html`<span class="brand-placeholder"></span>`
        }
        <div class="text">
          <span class="primary">
            ${stateObj ? this.hass.formatEntityName(stateObj) : entityId}
          </span>
          ${
            platform
              ? html`<span class="secondary">
                  ${domainToName(this.hass.localize, platform)}
                </span>`
              : nothing
          }
        </div>
        <ha-icon-button
          .path=${mdiClose}
          .label=${this.hass.localize("ui.panel.weather.editor.sources.remove")}
          data-entity-id=${entityId}
          @click=${this._excludeSource}
        ></ha-icon-button>
      </div>
    `;
  }

  private _renderAddService() {
    const localize = this.hass.localize;
    const domains = this._categories
      ? this._serviceDomains(this._categories)
      : [];
    const configured = new Set(
      (this._configEntries ?? []).map((entry) => entry.domain)
    );
    const suggestions = this._flows.filter(
      (flow) =>
        domains.includes(flow.handler) &&
        !configured.has(flow.handler) &&
        SUGGESTION_SOURCES.includes(flow.context.source)
    );

    return html`
      <section>
        <h2>${localize("ui.panel.weather.editor.add_service.title")}</h2>
        <p class="description">
          ${localize("ui.panel.weather.editor.add_service.description")}
        </p>
        <ha-card outlined>
          ${
            suggestions.length
              ? html`<div class="list">
                  ${suggestions.map(
                    (flow) => html`
                      <div class="source">
                        <img
                          alt=""
                          crossorigin="anonymous"
                          referrerpolicy="no-referrer"
                          src=${brandsUrl({
                            domain: flow.handler,
                            type: "icon",
                            darkOptimized: this.hass.themes?.darkMode,
                          })}
                        />
                        <div class="text">
                          <span class="primary">
                            ${localizeConfigFlowTitle(localize, flow)}
                          </span>
                          <span class="secondary">
                            ${localize(
                              "ui.panel.weather.editor.add_service.suggested"
                            )}
                          </span>
                        </div>
                        <ha-button
                          appearance="filled"
                          size="s"
                          data-flow-id=${flow.flow_id}
                          @click=${this._continueFlow}
                        >
                          ${localize("ui.panel.weather.editor.add_service.add")}
                        </ha-button>
                      </div>
                    `
                  )}
                </div>`
              : nothing
          }
          <div class="card-actions ${suggestions.length ? "divider" : ""}">
            <ha-button appearance="plain" @click=${this._browseServices}>
              <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
              ${localize("ui.panel.weather.editor.add_service.browse")}
            </ha-button>
          </div>
        </ha-card>
      </section>
    `;
  }

  private _renderSensors() {
    const localize = this.hass.localize;
    const categories = this._categories ?? {};
    const rainGauge =
      this.config.rain_gauge_entity === null
        ? undefined
        : (this.config.rain_gauge_entity ?? findRainGauge(this.hass));

    return html`
      <section>
        <h2>${localize("ui.panel.weather.editor.sensors.title")}</h2>
        <p class="description">
          ${localize("ui.panel.weather.editor.sensors.description")}
        </p>
        <ha-card outlined>
          <div class="fields">
            <ha-entity-picker
              .label=${localize("ui.panel.weather.editor.sensors.rain_gauge")}
              .helper=${localize(
                "ui.panel.weather.editor.sensors.rain_gauge_helper"
              )}
              .value=${rainGauge}
              .includeDomains=${["sensor"]}
              .includeDeviceClasses=${["precipitation"]}
              @value-changed=${this._rainGaugeChanged}
            ></ha-entity-picker>
            <ha-entities-picker
              .label=${localize("ui.panel.weather.editor.sensors.air_quality")}
              .helper=${localize(
                "ui.panel.weather.editor.sensors.air_quality_helper"
              )}
              .value=${getAirQualityEntities(
                this.hass,
                categories,
                this.config
              )}
              .includeDomains=${["sensor"]}
              .includeDeviceClasses=${AIR_QUALITY_DEVICE_CLASSES}
              @value-changed=${this._airQualityChanged}
            ></ha-entities-picker>
            <ha-entities-picker
              .label=${localize("ui.panel.weather.editor.sensors.pollen")}
              .helper=${localize(
                "ui.panel.weather.editor.sensors.pollen_helper"
              )}
              .value=${getPollenEntities(this.hass, categories, this.config)}
              .includeDomains=${["sensor"]}
              @value-changed=${this._pollenChanged}
            ></ha-entities-picker>
          </div>
        </ha-card>
      </section>
    `;
  }

  private _renderSettings() {
    const localize = this.hass.localize;
    return html`
      <section>
        <h2>${localize("ui.panel.weather.editor.settings.title")}</h2>
        <ha-card outlined>
          <ha-settings-row .narrow=${this.narrow}>
            <span slot="heading">
              ${localize("ui.panel.weather.editor.settings.show_on_home")}
            </span>
            <span slot="description">
              ${localize(
                "ui.panel.weather.editor.settings.show_on_home_description"
              )}
            </span>
            <ha-switch
              .checked=${this.config.show_on_home !== false}
              @change=${this._showOnHomeChanged}
            ></ha-switch>
          </ha-settings-row>
        </ha-card>
      </section>
    `;
  }

  private _sourceMoved(ev: HASSDomEvent<HASSDomEvents["item-moved"]>) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const sources = getWeatherSources(this.hass, this.config);
    const [moved] = sources.splice(oldIndex, 1);
    sources.splice(newIndex, 0, moved);
    this._changed({ weather_entities: sources });
  }

  private _excludeSource(ev: Event) {
    const entityId = (ev.currentTarget as HTMLElement).dataset.entityId!;
    this._changed({
      weather_entities: getWeatherSources(this.hass, this.config).filter(
        (id) => id !== entityId
      ),
      excluded_weather_entities: [
        ...(this.config.excluded_weather_entities ?? []),
        entityId,
      ],
    });
  }

  private _includeSource(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    const entityId = ev.detail.value;
    if (!entityId || computeDomain(entityId) !== "weather") {
      return;
    }
    (ev.currentTarget as any).value = "";
    this._changed({
      excluded_weather_entities: (
        this.config.excluded_weather_entities ?? []
      ).filter((id) => id !== entityId),
      weather_entities: [
        ...getWeatherSources(this.hass, this.config),
        entityId,
      ],
    });
  }

  private _continueFlow(ev: Event) {
    const flowId = (ev.currentTarget as HTMLElement).dataset.flowId!;
    showConfigFlowDialog(this, {
      continueFlowId: flowId,
      dialogClosedCallback: () => this._loadServices(),
    });
  }

  private _browseServices() {
    const domains = this._serviceDomains(this._categories ?? {});
    // Without category information, show all integrations.
    showAddIntegrationDialog(
      this,
      domains.length ? { integrationFilter: { domains } } : undefined
    );
  }

  private _rainGaugeChanged(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    // An empty picker turns the rain card off, instead of detecting again.
    this._changed({ rain_gauge_entity: ev.detail.value || null });
  }

  private _airQualityChanged(ev: ValueChangedEvent<string[]>) {
    ev.stopPropagation();
    this._changed({ air_quality_entities: ev.detail.value });
  }

  private _pollenChanged(ev: ValueChangedEvent<string[]>) {
    ev.stopPropagation();
    this._changed({ pollen_entities: ev.detail.value });
  }

  private _showOnHomeChanged(ev: Event) {
    this._changed({ show_on_home: (ev.target as HaSwitch).checked });
  }

  static styles = css`
    :host {
      display: block;
    }
    .content {
      max-width: 720px;
      margin: 0 auto;
      padding: var(--ha-space-6) var(--ha-space-4) var(--ha-space-12);
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-8);
    }
    section {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }
    h2 {
      margin: 0;
      padding-inline-start: var(--ha-space-4);
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-bold);
    }
    .description {
      margin: 0 0 var(--ha-space-2);
      padding-inline-start: var(--ha-space-4);
      color: var(--secondary-text-color);
    }
    .list {
      display: flex;
      flex-direction: column;
    }
    .source {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
      padding: var(--ha-space-2) var(--ha-space-4);
      min-height: 56px;
      box-sizing: border-box;
    }
    .source + .source {
      border-top: 1px solid var(--divider-color);
    }
    .handle {
      cursor: grab;
      color: var(--secondary-text-color);
      display: flex;
    }
    img,
    .brand-placeholder {
      width: 32px;
      height: 32px;
      flex: none;
      object-fit: contain;
    }
    .text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .primary,
    .secondary {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .secondary {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
    .empty {
      margin: 0;
      padding: var(--ha-space-4);
      color: var(--secondary-text-color);
    }
    .add-source,
    .fields {
      padding: var(--ha-space-4);
    }
    .fields {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
    }
    .add-source {
      border-top: 1px solid var(--divider-color);
    }
    .card-actions {
      padding: var(--ha-space-2);
    }
    .card-actions.divider {
      border-top: 1px solid var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "weather-page-editor": WeatherPageEditor;
  }
}
