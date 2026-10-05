import { mdiHistory } from "@mdi/js";
import type {
  HassConfig,
  HassEntities,
  HassEntity,
} from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import {
  customElement,
  property,
  query,
  queryAll,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import { contrastingZoneContent } from "../../../../common/map/zone-marker";
import {
  HOME_ZONE_ENTITY_ID,
  zoneColor,
} from "../../../../common/map/entity-map-colors";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { getEntityLocation } from "../../../../common/entity/get_entity_location";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-resizable-bottom-sheet";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-relative-time";
import "../../../../components/ha-spinner";
import "../../../../components/ha-state-icon";
import "../../../../components/ha-svg-icon";
import type { HaMapEntity } from "../../../../components/map/ha-map";
import "../../../../components/ha-button";
import { formatTime } from "../../../../common/datetime/format_time";
import type { ActivityEntry } from "./map-activity";
import { personActivity, zoneActivity } from "./map-activity";
import {
  apiContext,
  configContext,
  connectionContext,
  formattersContext,
  fullEntitiesContext,
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import type { EntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { HistoryStates } from "../../../../data/history";
import { fetchDateWS } from "../../../../data/history";
import { computeUserInitials } from "../../../../data/user";
import type {
  CurrentUser,
  HomeAssistantConfig,
  HomeAssistantApi,
  HomeAssistantConnection,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
} from "../../../../types";

export type OverviewTab = "people" | "devices" | "zones";

const ACTIVITY_HOURS = 24;
const ACTIVITY_INITIAL_ENTRIES = 5;

declare global {
  interface HASSDomEvents {
    "map-overview-select": { entityId?: string };
    "map-overview-tab": { tab: OverviewTab };
    /** Rendered size, so the host keeps controls and focused markers clear of it */
    "map-overview-resize": { width: number; height: number };
  }
}

@customElement("hui-map-overview")
export class HuiMapOverview extends LitElement {
  @property({ attribute: false }) public entities: HaMapEntity[] = [];

  @property({ attribute: false }) public selected?: string;

  @property({ attribute: false }) public tab: OverviewTab = "people";

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
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, CurrentUser | undefined>({
    transformer: ({ user }) => user,
  })
  private _user?: CurrentUser;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _config!: HassConfig;

  // Registry creation order decides the zone colors
  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  private _entityReg: EntityRegistryEntry[] = [];

  @queryAll(".tablist button")
  private _tabButtons!: NodeListOf<HTMLButtonElement>;

  // On phones the overview is a bottom sheet; elsewhere a floating panel
  @state() private _phone = false;

  private _phoneQuery = window.matchMedia("(max-width: 600px)");

  // The sheet never shrinks below the strip that stays useful when collapsed
  @state() private _sheetMinHeight?: number;

  @query(".panel.sheet") private _sheetPanel?: HTMLElement;

  @query(".peek") private _peek?: HTMLElement;

  @query(".detail-name") private _detailName?: HTMLElement;

  @queryAll("ha-md-list-item")
  private _listItems!: NodeListOf<HTMLElement>;

  private _peekObserver?: ResizeObserver;

  private _observedPeek?: HTMLElement;

  @state() private _activity?: ActivityEntry[];

  @state() private _activityFailed = false;

  @state() private _activityExpanded = false;

  // Counts activity loads so only the newest one may show its result, even
  // when the same entity is selected again while an older load is pending
  private _activityRequest = 0;

  private _resizeObserver?: ResizeObserver;

  public connectedCallback(): void {
    super.connectedCallback();
    this._phone = this._phoneQuery.matches;
    this._phoneQuery.addEventListener("change", this._handlePhoneChange);
    this._resizeObserver ??= new ResizeObserver(() => {
      // The sheet reports its own size
      if (this._phone) {
        return;
      }
      const { width, height } = this.getBoundingClientRect();
      fireEvent(this, "map-overview-resize", { width, height });
    });
    this._resizeObserver.observe(this);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._phoneQuery.removeEventListener("change", this._handlePhoneChange);
    this._resizeObserver?.disconnect();
    this._peekObserver?.disconnect();
    this._observedPeek = undefined;
    fireEvent(this, "map-overview-resize", { width: 0, height: 0 });
  }

  private _handlePhoneChange = () => {
    this._phone = this._phoneQuery.matches;
  };

  protected updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);
    this._watchPeek();
    // The host filters the map by the tab it set; tell it when that one is gone
    const tabs = Object.keys(
      this._itemsPerTab(this._getPeople(), this._getDevices(), this._getZones())
    ) as OverviewTab[];
    if (tabs.length && !tabs.includes(this.tab)) {
      fireEvent(this, "map-overview-tab", { tab: tabs[0] });
    }
    if (changedProps.has("selected")) {
      this._moveFocus(changedProps.get("selected"));
    }
  }

  // Selecting an item replaces the list with the detail view and going back
  // replaces it again; move focus with the content so keyboard and screen
  // reader users keep their place instead of losing it on the removed element.
  private _moveFocus(previous: string | undefined): void {
    if (this.selected) {
      this._detailName?.focus();
    } else if (previous) {
      const item = [...this._listItems].find(
        (listItem) => listItem.dataset.entityId === previous
      );
      // The row may be on another tab; fall back to the selected tab button.
      (
        item ??
        [...this._tabButtons].find(
          (button) => button.getAttribute("aria-selected") === "true"
        )
      )?.focus();
    }
  }

  // Measures the tabs or the detail header, whichever the sheet shows, plus
  // the panel's padding around it
  private _watchPeek(): void {
    const peek = this._phone ? this._peek : undefined;
    if (peek === this._observedPeek) {
      return;
    }
    this._peekObserver?.disconnect();
    this._observedPeek = peek;
    if (!peek) {
      this._sheetMinHeight = undefined;
      // The phone sheet is gone; clear the size so the host drops its inset.
      fireEvent(this, "map-overview-resize", { width: 0, height: 0 });
      return;
    }
    this._peekObserver = new ResizeObserver(() => {
      const panel = this._sheetPanel;
      if (!panel) {
        return;
      }
      const style = getComputedStyle(panel);
      this._sheetMinHeight =
        parseFloat(style.paddingTop) +
        peek.offsetHeight +
        parseFloat(style.paddingBottom);
    });
    this._peekObserver.observe(peek);
  }

  private _handleSheetResized(
    ev: HASSDomEvent<HASSDomEvents["bottom-sheet-resized"]>
  ) {
    fireEvent(this, "map-overview-resize", {
      width: window.innerWidth,
      height: ev.detail.height,
    });
  }

  private _getPeople(): HassEntity[] {
    return this.entities
      .map((entity) => this._states[entity.entity_id])
      .filter(
        (stateObj): stateObj is HassEntity =>
          !!stateObj && computeStateDomain(stateObj) === "person"
      )
      .sort((a, b) => {
        const aMe = this._isMe(a);
        if (aMe !== this._isMe(b)) {
          return aMe ? -1 : 1;
        }
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

  private _isMe(stateObj: HassEntity): boolean {
    return (
      !!this._user &&
      computeStateDomain(stateObj) === "person" &&
      stateObj.attributes.user_id === this._user.id
    );
  }

  private _personName(stateObj: HassEntity): string {
    return this._isMe(stateObj)
      ? this._i18n.localize("ui.panel.lovelace.cards.map.overview.me")
      : computeStateName(stateObj);
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
      .sort((a, b) => {
        // Home first
        if (
          (a.entity_id === HOME_ZONE_ENTITY_ID) !==
          (b.entity_id === HOME_ZONE_ENTITY_ID)
        ) {
          return a.entity_id === HOME_ZONE_ENTITY_ID ? -1 : 1;
        }
        return computeStateName(a).localeCompare(
          computeStateName(b),
          this._i18n.locale.language
        );
      });
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
      this._activityFailed = false;
      this._activityExpanded = false;
      const request = ++this._activityRequest;
      if (this.selected) {
        this._loadActivity(this.selected, request);
      }
    }
  }

  // The window's start; history before it only seeds the previous state
  private _activitySince(): number {
    return Date.now() - ACTIVITY_HOURS * 3600 * 1000;
  }

  /** Resolves to null when history could not be loaded */
  private async _fetchHistory(
    entityIds: string[],
    since: number
  ): Promise<HistoryStates | undefined | null> {
    try {
      return await fetchDateWS(
        { states: this._states, callWS: this._api.callWS },
        new Date(since),
        new Date(),
        entityIds
      );
    } catch (_err) {
      return null;
    }
  }

  private async _loadActivity(
    entityId: string,
    request: number
  ): Promise<void> {
    if (computeDomain(entityId) === "zone") {
      await this._loadZoneActivity(entityId, request);
    } else {
      await this._loadPersonActivity(entityId, request);
    }
  }

  private async _loadPersonActivity(
    entityId: string,
    request: number
  ): Promise<void> {
    const since = this._activitySince();
    const history = await this._fetchHistory([entityId], since);
    if (request !== this._activityRequest) {
      // A newer selection took over while loading
      return;
    }
    if (history === null) {
      this._activityFailed = true;
      this._activity = [];
      return;
    }
    this._activity = personActivity(history?.[entityId], since);
  }

  private async _loadZoneActivity(
    entityId: string,
    request: number
  ): Promise<void> {
    const zone = this._states[entityId];
    if (!zone) {
      this._activity = [];
      return;
    }
    const personIds = this._getPeople().map((person) => person.entity_id);
    const since = this._activitySince();
    const history = personIds.length
      ? await this._fetchHistory(personIds, since)
      : {};
    if (request !== this._activityRequest) {
      // A newer selection took over while loading
      return;
    }
    if (history === null) {
      this._activityFailed = true;
      this._activity = [];
      return;
    }
    // A person's state is "home" for the home zone, the zone name otherwise
    const zoneState =
      entityId === "zone.home" ? "home" : computeStateName(zone);
    this._activity = zoneActivity(history, personIds, zoneState, since);
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
    const content = selectedStateObj
      ? this._renderDetail(selectedStateObj)
      : this._renderList(people, devices, zones);

    return html`
      ${
        this._phone
          ? html`<ha-resizable-bottom-sheet
              persistent
              open-at-content-height
              open-max-viewport-height="45"
              .minHeight=${this._sheetMinHeight}
              @bottom-sheet-resized=${this._handleSheetResized}
            >
              <div class="panel sheet">${content}</div>
            </ha-resizable-bottom-sheet>`
          : html`<div class="panel">${content}</div>`
      }
    `;
  }

  private _renderDetail(stateObj: HassEntity) {
    const isZone = computeStateDomain(stateObj) === "zone";
    const zoneCount = isZone ? Number(stateObj.state) : undefined;

    return html`
      <div class="detail-header peek">
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
            ${this._personName(stateObj)}
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
                      this._activityFailed
                        ? "ui.panel.lovelace.cards.map.overview.activity_unavailable"
                        : "ui.panel.lovelace.cards.map.overview.no_activity"
                    )}
                  </span>`
                : this._renderTimeline(stateObj, this._activity)
          }
        </div>
      </div>
    `;
  }

  // The color of the zone a person's state names; undefined when away or unknown
  private _zoneColorForState(entityState: string): string | undefined {
    if (entityState === "not_home" || entityState === "unknown") {
      return undefined;
    }
    const zone =
      entityState === "home"
        ? this._states[HOME_ZONE_ENTITY_ID]
        : Object.values(this._states).find(
            (candidate) =>
              computeStateDomain(candidate) === "zone" &&
              computeStateName(candidate) === entityState
          );
    if (!zone) {
      return undefined;
    }
    return zoneColor(
      zone.entity_id,
      !!zone.attributes.passive,
      this._entityReg,
      getComputedStyle(this)
    );
  }

  private _renderTimeline(stateObj: HassEntity, activity: ActivityEntry[]) {
    const shown = this._activityExpanded
      ? activity
      : activity.slice(0, ACTIVITY_INITIAL_ENTRIES);
    return html`
      <div class="timeline">
        ${shown.map((entry, index) =>
          this._renderActivityEntry(stateObj, entry, index === shown.length - 1)
        )}
      </div>
      ${
        activity.length > shown.length
          ? html`<ha-button
              appearance="plain"
              size="s"
              class="show-more"
              @click=${this._showAllActivity}
            >
              ${this._i18n.localize(
                "ui.panel.lovelace.cards.map.overview.show_more"
              )}
            </ha-button>`
          : nothing
      }
    `;
  }

  private _renderActivityEntry(
    stateObj: HassEntity,
    entry: ActivityEntry,
    last: boolean
  ) {
    const person = entry.personId ? this._states[entry.personId] : undefined;
    const headline = entry.personId
      ? person
        ? this._personName(person)
        : entry.personId
      : this._formatters.formatEntityState(stateObj, entry.state);
    const color =
      entry.personId && !entry.arrived
        ? undefined
        : this._zoneColorForState(entry.state);
    return html`
      <div class=${classMap({ entry: true, last })}>
        <span
          class="dot"
          style=${styleMap({ "--dot-color": color })}
          aria-hidden="true"
        ></span>
        <span class="entry-headline">${headline}</span>
        <span class="entry-when">
          ${
            entry.personId
              ? html`${this._i18n.localize(
                  entry.arrived
                    ? "ui.panel.lovelace.cards.map.overview.entered"
                    : "ui.panel.lovelace.cards.map.overview.left"
                )}
                · `
              : nothing
          }
          ${formatTime(entry.when, this._i18n.locale, this._config)} ·
          <ha-relative-time .datetime=${entry.when}></ha-relative-time>
        </span>
      </div>
    `;
  }

  private _showAllActivity() {
    this._activityExpanded = true;
  }

  private _itemsPerTab(
    people: HassEntity[],
    devices: HassEntity[],
    zones: HassEntity[]
  ): Partial<Record<OverviewTab, HassEntity[]>> {
    return {
      ...(people.length ? { people } : {}),
      ...(devices.length ? { devices } : {}),
      ...(zones.length ? { zones } : {}),
    };
  }

  private _renderList(
    people: HassEntity[],
    devices: HassEntity[],
    zones: HassEntity[]
  ) {
    const itemsPerTab = this._itemsPerTab(people, devices, zones);
    const tabs = Object.keys(itemsPerTab) as OverviewTab[];
    const tab = tabs.includes(this.tab) ? this.tab : tabs[0];
    const items = itemsPerTab[tab]!;

    // A lone heading also serves as the phone sheet's peek strip
    if (tabs.length === 1) {
      return html`
        <div class="heading peek" id="tab-${tab}">
          ${this._i18n.localize(`ui.panel.lovelace.cards.map.overview.${tab}`)}
        </div>
        ${this._renderItems(tab, items)}
      `;
    }

    return html`
      <div class="tabs peek">
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
      ${this._renderItems(tab, items)}
    `;
  }

  private _renderItems(tab: OverviewTab, items: HassEntity[]) {
    return html`
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
    const name = this._personName(stateObj);
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
                    >${computeUserInitials(computeStateName(stateObj))}</span
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
      this._entityReg,
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

  private _handleTabClick(ev: HASSDomCurrentTargetEvent<HTMLButtonElement>) {
    fireEvent(this, "map-overview-tab", {
      tab: ev.currentTarget.dataset.tab as OverviewTab,
    });
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
      fireEvent(this, "map-overview-tab", {
        tab: next.dataset.tab as OverviewTab,
      });
      next.focus();
    }
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

    ha-resizable-bottom-sheet {
      pointer-events: auto;
      /* The tabs sit right under the handle */
      --ha-bottom-sheet-handle-padding: var(--ha-space-2);
      --ha-bottom-sheet-inset-left: 0px;
      --ha-bottom-sheet-inset-right: 0px;
    }

    .panel.sheet {
      flex: 1;
      min-height: 0;
      border-radius: 0;
      box-shadow: none;
      --sheet-bottom-space: max(
        var(--ha-space-3),
        var(--safe-area-inset-bottom)
      );
      padding-top: var(--ha-space-7);
      padding-right: max(var(--ha-space-3), var(--safe-area-inset-right));
      padding-bottom: var(--sheet-bottom-space);
      padding-left: max(var(--ha-space-3), var(--safe-area-inset-left));
    }

    .heading {
      flex: none;
      padding: var(--ha-space-2) var(--ha-space-3);
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
      color: var(--primary-text-color);
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
      margin-bottom: calc(-1 * var(--sheet-bottom-space, 0px));
      padding-bottom: var(--sheet-bottom-space, 0px);
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
      color: #fff;
    }

    .avatar.zone ha-state-icon {
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.4));
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
      /* Scrolls within the drawer's height instead of being clipped by it */
      min-height: 0;
      overflow-y: auto;
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
      margin-top: var(--ha-space-2);
      --rail-size: 10px;
    }

    .entry {
      position: relative;
      display: flex;
      flex-direction: column;
      padding-inline-start: calc(var(--rail-size) + var(--ha-space-3));
      padding-bottom: var(--ha-space-4);
    }
    .entry.last {
      padding-bottom: 0;
    }
    .entry::before {
      content: "";
      position: absolute;
      inset-inline-start: calc(var(--rail-size) / 2 - 1px);
      top: var(--rail-size);
      bottom: 0;
      width: 2px;
      background: var(--divider-color);
    }
    .entry.last::before {
      display: none;
    }
    .dot {
      position: absolute;
      inset-inline-start: 0;
      top: 4px;
      width: var(--rail-size);
      height: var(--rail-size);
      border-radius: var(--ha-border-radius-circle);
      background: var(--dot-color, var(--secondary-text-color));
    }
    .entry-headline {
      font-weight: var(--ha-font-weight-medium);
      color: var(--primary-text-color);
    }
    .entry-when {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
    .show-more {
      display: block;
      margin-top: var(--ha-space-3);
      padding-top: var(--ha-space-2);
      border-top: 1px solid var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-overview": HuiMapOverview;
  }
}
