import { consume } from "@lit/context";
import { mdiHistory } from "@mdi/js";
import type {
  HassConfig,
  HassEntities,
  HassEntity,
} from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, queryAll, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { zoneColor } from "../../../../common/map/entity-map-colors";
import { contrastingZoneContent } from "../../../../common/map/zone-marker";
import { formatTime } from "../../../../common/datetime/format_time";
import { transform } from "../../../../common/decorators/transform";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { getEntityLocation } from "../../../../common/entity/get_entity_location";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-relative-time";
import "../../../../components/ha-spinner";
import "../../../../components/ha-state-icon";
import "../../../../components/ha-svg-icon";
import type { HaMapEntity } from "../../../../components/map/ha-map";
import {
  apiContext,
  configContext,
  connectionContext,
  formattersContext,
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import type { HistoryStates } from "../../../../data/history";
import { fetchDateWS } from "../../../../data/history";
import { computeUserInitials } from "../../../../data/user";
import type {
  HomeAssistantApi,
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
} from "../../../../types";

type OverviewTab = "people" | "devices" | "zones";

interface ActivityEntry {
  state: string;
  when: Date;
  /** Zone detail: the person that arrived at or left the zone */
  personId?: string;
  arrived?: boolean;
}

const ACTIVITY_HOURS = 24;
const ACTIVITY_MAX_ENTRIES = 20;

declare global {
  interface HASSDomEvents {
    "map-overview-select": { entityId?: string };
    /** Rendered height, so the host can keep map controls clear of it */
    "map-overview-resize": { height: number };
  }
}

@customElement("hui-map-overview")
export class HuiMapOverview extends LitElement {
  @property({ attribute: false }) public entities: HaMapEntity[] = [];

  @property({ attribute: false }) public selected?: string;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: HassEntities;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: HomeAssistantConnection;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _config!: HassConfig;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @queryAll(".tablist button")
  private _tabButtons!: NodeListOf<HTMLButtonElement>;

  @state() private _tab: OverviewTab = "people";

  @state() private _expanded = true;

  @state() private _activity?: ActivityEntry[];

  private _touchStartY?: number;

  private _resizeObserver?: ResizeObserver;

  public connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver ??= new ResizeObserver(() => {
      fireEvent(this, "map-overview-resize", {
        height: this.getBoundingClientRect().height,
      });
    });
    this._resizeObserver.observe(this);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    fireEvent(this, "map-overview-resize", { height: 0 });
  }

  private _getPeople(): HassEntity[] {
    return this.entities
      .map((entity) => this._states[entity.entity_id])
      .filter(
        (stateObj): stateObj is HassEntity =>
          !!stateObj && computeStateDomain(stateObj) === "person"
      )
      .sort((a, b) => {
        const aLocated = !!getEntityLocation(a, this._states);
        const bLocated = !!getEntityLocation(b, this._states);
        if (aLocated !== bLocated) {
          return aLocated ? -1 : 1;
        }
        return computeStateName(a).localeCompare(
          computeStateName(b),
          this._i18n.locale.language
        );
      });
  }

  private _getDevices(): HassEntity[] {
    return this.entities
      .map((entity) => this._states[entity.entity_id])
      .filter(
        (stateObj): stateObj is HassEntity =>
          !!stateObj &&
          computeStateDomain(stateObj) === "device_tracker" &&
          !!getEntityLocation(stateObj, this._states)
      )
      .sort((a, b) =>
        computeStateName(a).localeCompare(
          computeStateName(b),
          this._i18n.locale.language
        )
      );
  }

  private _getZones(): HassEntity[] {
    return this.entities
      .map((entity) => this._states[entity.entity_id])
      .filter(
        (stateObj): stateObj is HassEntity =>
          !!stateObj &&
          computeStateDomain(stateObj) === "zone" &&
          !stateObj.attributes.passive &&
          stateObj.attributes.latitude !== undefined &&
          stateObj.attributes.longitude !== undefined
      )
      .sort((a, b) =>
        computeStateName(a).localeCompare(
          computeStateName(b),
          this._i18n.locale.language
        )
      );
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.size > 1 || !changedProps.has("_states")) {
      return true;
    }
    // Only the map's entities matter; ignore other state churn
    const oldStates = changedProps.get("_states") as HassEntities | undefined;
    return (
      !oldStates ||
      this.entities.some(
        (entity) =>
          oldStates[entity.entity_id] !== this._states[entity.entity_id]
      )
    );
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("selected")) {
      this._activity = undefined;
      if (this.selected) {
        this._expanded = true;
        this._loadActivity(this.selected);
      }
    }
  }

  private async _fetchHistory(
    entityIds: string[]
  ): Promise<HistoryStates | undefined> {
    const end = new Date();
    const start = new Date(end.getTime() - ACTIVITY_HOURS * 3600 * 1000);
    try {
      return await fetchDateWS(
        { states: this._states, callWS: this._api.callWS },
        start,
        end,
        entityIds
      );
    } catch (_err) {
      return undefined;
    }
  }

  private async _loadActivity(entityId: string): Promise<void> {
    if (computeDomain(entityId) === "zone") {
      await this._loadZoneActivity(entityId);
    } else {
      await this._loadPersonActivity(entityId);
    }
  }

  private async _loadPersonActivity(entityId: string): Promise<void> {
    const history = await this._fetchHistory([entityId]);
    if (this.selected !== entityId) {
      // Selection changed while loading
      return;
    }
    const entries: ActivityEntry[] = [];
    for (const entry of history?.[entityId] || []) {
      if (entry.s === "unavailable") {
        continue;
      }
      if (entries.length && entries[entries.length - 1].state === entry.s) {
        continue;
      }
      entries.push({ state: entry.s, when: new Date(entry.lu * 1000) });
    }
    this._activity = entries.reverse().slice(0, ACTIVITY_MAX_ENTRIES);
  }

  private async _loadZoneActivity(entityId: string): Promise<void> {
    const zone = this._states[entityId];
    if (!zone) {
      this._activity = [];
      return;
    }
    const personIds = this._getPeople().map((person) => person.entity_id);
    const history = personIds.length ? await this._fetchHistory(personIds) : {};
    if (this.selected !== entityId) {
      // Selection changed while loading
      return;
    }
    // A person's state is "home" for the home zone, the zone name otherwise
    const zoneState =
      entityId === "zone.home" ? "home" : computeStateName(zone);
    const entries: ActivityEntry[] = [];
    for (const personId of personIds) {
      let wasInZone: boolean | undefined;
      for (const entry of history?.[personId] || []) {
        if (entry.s === "unavailable") {
          continue;
        }
        const inZone = entry.s === zoneState;
        if (wasInZone !== undefined && inZone !== wasInZone) {
          entries.push({
            state: entry.s,
            personId,
            arrived: inZone,
            when: new Date(entry.lu * 1000),
          });
        }
        wasInZone = inZone;
      }
    }
    entries.sort((a, b) => b.when.getTime() - a.when.getTime());
    this._activity = entries.slice(0, ACTIVITY_MAX_ENTRIES);
  }

  protected render() {
    const people = this._getPeople();
    const devices = this._getDevices();
    const zones = this._getZones();

    if (!people.length && !devices.length && !zones.length) {
      return nothing;
    }

    const selectedStateObj = this.selected
      ? this._states[this.selected]
      : undefined;

    return html`
      <div class=${classMap({ panel: true, collapsed: !this._expanded })}>
        <button
          class="handle"
          type="button"
          aria-expanded=${this._expanded}
          aria-label=${this._i18n.localize(
            `ui.panel.lovelace.cards.map.overview.${
              this._expanded ? "hide_list" : "show_list"
            }`
          )}
          .title=${this._i18n.localize(
            `ui.panel.lovelace.cards.map.overview.${
              this._expanded ? "hide_list" : "show_list"
            }`
          )}
          @click=${this._toggleExpanded}
          @touchstart=${this._handleTouchStart}
          @touchend=${this._handleTouchEnd}
        >
          <span class="grip"></span>
        </button>
        ${
          selectedStateObj
            ? this._renderDetail(selectedStateObj)
            : this._renderList(people, devices, zones)
        }
      </div>
    `;
  }

  private _renderDetail(stateObj: HassEntity) {
    const isZone = computeStateDomain(stateObj) === "zone";
    const zoneCount = isZone ? Number(stateObj.state) : undefined;

    return html`
      <div class="detail-header">
        <ha-icon-button-prev
          .label=${this._i18n.localize("ui.common.back")}
          @click=${this._handleBack}
        ></ha-icon-button-prev>
        <div class="detail-title">
          <button
            type="button"
            class="detail-name"
            .title=${this._i18n.localize(
              "ui.panel.lovelace.cards.show_more_info"
            )}
            @click=${this._handleMoreInfo}
          >
            ${computeStateName(stateObj)}
          </button>
          <span class="detail-state">
            ${
              isZone
                ? zoneCount === undefined || Number.isNaN(zoneCount)
                  ? nothing
                  : this._i18n.localize(
                      "ui.panel.lovelace.cards.map.overview.people_in_zone",
                      { count: zoneCount }
                    )
                : html`${this._formatters.formatEntityState(stateObj)} ·
                    <ha-relative-time
                      .datetime=${stateObj.last_updated}
                      format="short"
                    ></ha-relative-time>`
            }
          </span>
        </div>
      </div>
      <div class="list">
        <div class="activity">
          <span class="activity-icon">
            <ha-svg-icon .path=${mdiHistory}></ha-svg-icon>
          </span>
          <span class="activity-title">
            ${this._i18n.localize(
              "ui.panel.lovelace.cards.map.overview.activity"
            )}
          </span>
          ${
            !this._activity
              ? html`<div class="activity-loading">
                  <ha-spinner size="small"></ha-spinner>
                </div>`
              : !this._activity.length
                ? html`<span class="activity-empty">
                    ${this._i18n.localize(
                      "ui.panel.lovelace.cards.map.overview.no_activity"
                    )}
                  </span>`
                : html`<ol class="timeline">
                    ${this._activity.map((entry) =>
                      this._renderActivityEntry(stateObj, entry)
                    )}
                  </ol>`
          }
        </div>
      </div>
    `;
  }

  private _renderActivityEntry(stateObj: HassEntity, entry: ActivityEntry) {
    const person = entry.personId ? this._states[entry.personId] : undefined;

    return html`
      <li>
        <span
          class="dot ${classMap({
            home: entry.personId ? !!entry.arrived : entry.state === "home",
            away: entry.personId
              ? !entry.arrived
              : entry.state === "not_home" || entry.state === "unknown",
          })}"
        ></span>
        <span class="entry-state">
          ${
            entry.personId
              ? this._i18n.localize(
                  `ui.panel.lovelace.cards.map.overview.${
                    entry.arrived ? "person_arrived" : "person_left"
                  }`,
                  {
                    name: person ? computeStateName(person) : entry.personId,
                  }
                )
              : this._formatters.formatEntityState(stateObj, entry.state)
          }
        </span>
        <span class="entry-time">
          ${formatTime(entry.when, this._i18n.locale, this._config)} ·
          <ha-relative-time
            .datetime=${entry.when}
            format="short"
          ></ha-relative-time>
        </span>
      </li>
    `;
  }

  private _renderList(
    people: HassEntity[],
    devices: HassEntity[],
    zones: HassEntity[]
  ) {
    const itemsPerTab: Partial<Record<OverviewTab, HassEntity[]>> = {
      people,
      // No devices tab without devices that have a location
      ...(devices.length ? { devices } : {}),
      zones,
    };
    const tabs = Object.keys(itemsPerTab) as OverviewTab[];
    const wanted = tabs.includes(this._tab) ? this._tab : "people";
    // An empty tab is disabled, so the selection falls back to the first tab
    // that has anything to show
    const tab = itemsPerTab[wanted]!.length
      ? wanted
      : (tabs.find((tabId) => itemsPerTab[tabId]!.length) ?? wanted);
    const items = itemsPerTab[tab]!;

    return html`
      <div class="tabs">
        <span
          class="pill"
          style=${styleMap({
            "--tab-count": String(tabs.length),
            "--tab-index": String(tabs.indexOf(tab)),
          })}
          aria-hidden="true"
        ></span>
        <div class="tablist" role="tablist" @keydown=${this._handleTabKeydown}>
          ${tabs.map(
            (tabId) => html`
              <button
                type="button"
                role="tab"
                id="tab-${tabId}"
                aria-controls="tabpanel"
                aria-selected=${tab === tabId}
                tabindex=${tab === tabId ? 0 : -1}
                data-tab=${tabId}
                .disabled=${!itemsPerTab[tabId]!.length}
                @click=${this._handleTabClick}
              >
                ${this._i18n.localize(
                  `ui.panel.lovelace.cards.map.overview.${tabId}`
                )}
              </button>
            `
          )}
        </div>
      </div>
      <div
        class="list"
        id="tabpanel"
        role="tabpanel"
        aria-labelledby="tab-${tab}"
      >
        <ha-md-list>
          ${items.map((stateObj) =>
            tab === "zones"
              ? this._renderZone(stateObj)
              : this._renderEntity(stateObj)
          )}
        </ha-md-list>
      </div>
    `;
  }

  private _renderEntity(stateObj: HassEntity) {
    const name = computeStateName(stateObj);
    const location = getEntityLocation(stateObj, this._states);
    const picture = stateObj.attributes.entity_picture;

    return html`
      <ha-md-list-item
        type="button"
        data-entity-id=${stateObj.entity_id}
        class=${classMap({ "no-location": !location })}
        @click=${this._handleItemClick}
      >
        <div slot="start" class="avatar">
          ${
            picture
              ? html`<img
                  src=${this._connection.hassUrl(picture)}
                  alt=""
                  loading="lazy"
                />`
              : computeStateDomain(stateObj) === "person"
                ? html`<span class="initials"
                    >${computeUserInitials(name)}</span
                  >`
                : html`<ha-state-icon .stateObj=${stateObj}></ha-state-icon>`
          }
        </div>
        <span slot="headline">${name}</span>
        <span slot="supporting-text">
          ${this._formatters.formatEntityState(stateObj)} ·
          <ha-relative-time
            .datetime=${stateObj.last_updated}
            format="short"
          ></ha-relative-time>
        </span>
      </ha-md-list-item>
    `;
  }

  private _renderZone(stateObj: HassEntity) {
    const count = Number(stateObj.state);
    // The same color as the zone's marker on the map
    const color = zoneColor(
      stateObj.entity_id,
      !!stateObj.attributes.passive,
      getComputedStyle(this)
    );

    return html`
      <ha-md-list-item
        type="button"
        data-entity-id=${stateObj.entity_id}
        @click=${this._handleItemClick}
      >
        <div
          slot="start"
          class="avatar zone"
          style=${styleMap({
            background: color,
            color: contrastingZoneContent(color),
          })}
        >
          <ha-state-icon .stateObj=${stateObj}></ha-state-icon>
        </div>
        <span slot="headline">${computeStateName(stateObj)}</span>
        <span slot="supporting-text">
          ${
            Number.isNaN(count)
              ? nothing
              : this._i18n.localize(
                  "ui.panel.lovelace.cards.map.overview.people_in_zone",
                  { count }
                )
          }
        </span>
      </ha-md-list-item>
    `;
  }

  private _handleTabClick(ev: Event) {
    this._tab = (ev.currentTarget as HTMLElement).dataset.tab as OverviewTab;
    this._expanded = true;
  }

  private _handleTabKeydown(ev: KeyboardEvent) {
    const step =
      ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : undefined;
    if (step === undefined) {
      return;
    }
    ev.preventDefault();
    const buttons = [...this._tabButtons].filter((button) => !button.disabled);
    const current = buttons.indexOf(ev.target as HTMLButtonElement);
    const rtl = getComputedStyle(this).direction === "rtl";
    const next =
      buttons[
        (current + (rtl ? -step : step) + buttons.length) % buttons.length
      ];
    if (next?.dataset.tab) {
      this._tab = next.dataset.tab as OverviewTab;
      next.focus();
    }
  }

  private _toggleExpanded() {
    this._expanded = !this._expanded;
  }

  private _handleTouchStart(ev: TouchEvent) {
    this._touchStartY = ev.touches[0]?.clientY;
  }

  private _handleTouchEnd(ev: TouchEvent) {
    if (this._touchStartY === undefined) {
      return;
    }
    const endY = ev.changedTouches[0]?.clientY;
    const deltaY = endY === undefined ? 0 : endY - this._touchStartY;
    this._touchStartY = undefined;
    if (Math.abs(deltaY) < 30) {
      return;
    }
    // Swiping is handled here; suppress the synthetic click that follows
    ev.preventDefault();
    this._expanded = deltaY < 0;
  }

  private _handleItemClick(ev: Event) {
    const entityId = (ev.currentTarget as HTMLElement).dataset.entityId;
    if (entityId) {
      fireEvent(this, "map-overview-select", { entityId });
    }
  }

  private _handleBack() {
    fireEvent(this, "map-overview-select", { entityId: undefined });
  }

  private _handleMoreInfo() {
    if (this.selected) {
      fireEvent(this, "hass-more-info", { entityId: this.selected });
    }
  }

  static styles = css`
    :host {
      display: block;
      pointer-events: none;
    }

    .panel {
      pointer-events: auto;
      box-sizing: border-box;
      width: 100%;
      max-height: 100%;
      display: flex;
      flex-direction: column;
      padding: var(--ha-space-3);
      border-radius: var(--ha-border-radius-xl);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      /* Floats over the map, so it keeps its shadow where cards lose theirs */
      box-shadow: var(--ha-box-shadow-m);
    }

    .handle {
      display: none;
      flex: none;
      width: 100%;
      padding: var(--ha-space-1) 0 var(--ha-space-3);
      margin: 0;
      border: none;
      background: none;
      cursor: pointer;
      touch-action: none;
    }

    .grip {
      display: block;
      width: 40px;
      height: 4px;
      margin: 0 auto;
      border-radius: 2px;
      background: var(--divider-color);
    }

    .tabs {
      position: relative;
      flex: none;
      padding: var(--ha-space-1);
      border-radius: var(--ha-border-radius-lg);
      background: var(--ha-color-fill-neutral-quiet-resting);
    }

    .tablist {
      display: flex;
      gap: var(--ha-space-1);
    }

    .tabs .pill {
      --segment-width: calc(
        (100% - (var(--tab-count) + 1) * var(--ha-space-1)) / var(--tab-count)
      );
      position: absolute;
      inset-block: var(--ha-space-1);
      inset-inline-start: calc(
        var(--ha-space-1) + var(--tab-index) *
          (var(--segment-width) + var(--ha-space-1))
      );
      width: var(--segment-width);
      border-radius: calc(var(--ha-border-radius-lg) - var(--ha-space-1));
      background: var(--card-background-color);
      box-shadow: var(--ha-box-shadow-s);
      transition: inset-inline-start 200ms ease;
    }

    .tabs button {
      position: relative;
      flex: 1;
      border: none;
      margin: 0;
      padding: var(--ha-space-2) var(--ha-space-3);
      border-radius: calc(var(--ha-border-radius-lg) - var(--ha-space-1));
      background: none;
      cursor: pointer;
      font-family: inherit;
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      color: var(--secondary-text-color);
      transition: color 180ms ease-in-out;
    }

    .tabs button[aria-selected="true"] {
      color: var(--primary-text-color);
    }

    @media (prefers-reduced-motion: reduce) {
      .tabs .pill {
        transition: none;
      }
    }

    .tabs button:disabled {
      cursor: default;
      opacity: 0.5;
    }

    .tabs button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: -2px;
    }

    .list {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    ha-md-list {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 0;
      margin-top: var(--ha-space-2);
      background: none;
      --md-list-item-leading-space: var(--ha-space-2);
      --md-list-item-trailing-space: var(--ha-space-2);
      --md-list-item-one-line-container-height: 56px;
      --md-list-item-two-line-container-height: 64px;
    }

    ha-md-list-item {
      border-radius: var(--ha-border-radius-lg);
      --md-list-item-supporting-text-size: var(--ha-font-size-s);
      --md-list-item-label-text-weight: var(--ha-font-weight-medium);
      --ha-md-list-item-gap: var(--ha-space-3);
    }

    ha-md-list-item.no-location {
      --md-sys-color-on-surface: var(--secondary-text-color);
    }

    .avatar {
      position: relative;
      width: 48px;
      height: 48px;
      border-radius: var(--ha-border-radius-lg);
      overflow: visible;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ha-color-fill-neutral-quiet-resting);
      color: var(--secondary-text-color);
      font-weight: var(--ha-font-weight-medium);
      box-sizing: border-box;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
    }

    .avatar.zone {
      border-radius: 50%;
      border: none;
      background: var(--accent-color);
      color: var(--text-accent-color, var(--text-primary-color));
    }

    ha-relative-time {
      display: inline;
    }

    .detail-header {
      flex: none;
      display: flex;
      align-items: center;
      gap: var(--ha-space-1);
      color: var(--primary-text-color);
    }

    .detail-title {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .detail-name {
      margin: 0;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
      text-align: start;
      font-family: inherit;
      color: inherit;
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
    }

    .detail-name:hover,
    .detail-name:focus-visible {
      text-decoration: underline;
    }

    .detail-state {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }

    .activity {
      margin-top: var(--ha-space-2);
      padding: var(--ha-space-3);
      border-radius: var(--ha-border-radius-lg);
      background: var(--ha-color-fill-neutral-quiet-resting);
    }

    .activity-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--ha-border-radius-md);
      background: var(--primary-color);
      color: var(--text-primary-color);
      --mdc-icon-size: 20px;
    }

    .activity-title {
      display: block;
      margin: var(--ha-space-2) 0;
      font-weight: var(--ha-font-weight-medium);
    }

    .activity-loading {
      display: flex;
      justify-content: center;
      padding: var(--ha-space-3);
    }

    .activity-empty {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }

    .timeline {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .timeline li {
      position: relative;
      padding-inline-start: var(--ha-space-6);
      padding-bottom: var(--ha-space-4);
      display: flex;
      flex-direction: column;
    }

    .timeline li:last-child {
      padding-bottom: 0;
    }

    .timeline li:not(:last-child)::after {
      content: "";
      position: absolute;
      inset-inline-start: 5px;
      top: 16px;
      bottom: 2px;
      width: 2px;
      background: var(--divider-color);
    }

    .dot {
      position: absolute;
      inset-inline-start: 0;
      top: 4px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent-color);
    }

    .dot.home {
      background: var(--success-color);
    }

    .dot.away {
      background: var(--secondary-text-color);
    }

    .entry-state {
      font-weight: var(--ha-font-weight-medium);
    }

    .entry-time {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }

    @media (max-width: 600px) {
      .panel {
        border-end-start-radius: 0;
        border-end-end-radius: 0;
        padding-top: 0;
        padding-bottom: max(var(--ha-space-3), env(safe-area-inset-bottom));
      }

      .handle {
        display: block;
      }

      .list {
        transition:
          max-height 250ms ease,
          opacity 250ms ease,
          visibility 250ms ease;
        max-height: 60vh;
        opacity: 1;
        visibility: visible;
        overflow: hidden;
      }

      .panel.collapsed .list {
        max-height: 0;
        opacity: 0;
        visibility: hidden;
      }

      .panel.collapsed ha-md-list {
        margin-top: 0;
      }

      @media (prefers-reduced-motion: reduce) {
        .list {
          transition: none;
        }
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-overview": HuiMapOverview;
  }
}
